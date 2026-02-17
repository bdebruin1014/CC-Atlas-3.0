import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const WaterfallCalculateSchema = z.object({
  entity_id: z.string().uuid(),
  waterfall_structure_id: z.string().uuid(),
  amount: z.number().positive("Amount must be positive"),
})

// ---------------------------------------------------------------------------
// Tier type definition
// ---------------------------------------------------------------------------
interface WaterfallTier {
  name: string
  type: "preferred_return" | "catch_up" | "residual_split"
  rate?: number
  percentage?: number
  gp_split?: number
  lp_split?: number
  threshold?: number
}

interface TierResult {
  tier_name: string
  tier_type: string
  amount_allocated: number
  gp_amount: number
  lp_amount: number
  investor_allocations: {
    investor_id: string
    investor_name: string
    ownership_pct: number
    amount: number
  }[]
}

// ---------------------------------------------------------------------------
// POST: Preview waterfall calculation (no persistence)
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = WaterfallCalculateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Fetch waterfall structure
    const { data: structure, error: structError } = await supabase
      .from("waterfall_structures")
      .select("*")
      .eq("id", input.waterfall_structure_id)
      .eq("entity_id", input.entity_id)
      .single()

    if (structError || !structure) {
      return NextResponse.json(
        { error: "Waterfall structure not found" },
        { status: 404 }
      )
    }

    const tiers = (structure.tiers || []) as WaterfallTier[]

    // Fetch investors
    const { data: investors } = await supabase
      .from("investors")
      .select(
        `
        id,
        ownership_pct,
        capital_commitment,
        contributed_to_date,
        distributions_to_date,
        preferred_return_rate,
        contact:contacts!investors_contact_id_fkey(id, first_name, last_name, company)
      `
      )
      .eq("entity_id", input.entity_id)
      .order("ownership_pct", { ascending: false })

    if (!investors || investors.length === 0) {
      return NextResponse.json(
        { error: "No investors found for this entity" },
        { status: 400 }
      )
    }

    // Calculate waterfall
    let remainingAmount = input.amount
    const tierResults: TierResult[] = []

    for (const tier of tiers) {
      if (remainingAmount <= 0) break

      const tierResult: TierResult = {
        tier_name: tier.name,
        tier_type: tier.type,
        amount_allocated: 0,
        gp_amount: 0,
        lp_amount: 0,
        investor_allocations: [],
      }

      if (tier.type === "preferred_return") {
        // Calculate preferred return owed to each investor
        let tierTotal = 0
        for (const inv of investors) {
          const prefRate = tier.rate || inv.preferred_return_rate || 0
          const contributed = inv.contributed_to_date || 0
          const prefReturnOwed = Math.round(contributed * (prefRate / 100) * 100) / 100
          const alreadyDistributed = inv.distributions_to_date || 0
          const prefReturnRemaining = Math.max(0, prefReturnOwed - alreadyDistributed)
          tierTotal += prefReturnRemaining
        }

        const tierAllocation = Math.min(remainingAmount, tierTotal)
        remainingAmount -= tierAllocation
        tierResult.amount_allocated = Math.round(tierAllocation * 100) / 100
        tierResult.lp_amount = tierResult.amount_allocated

        // Allocate pro-rata among investors based on their pref return owed
        for (const inv of investors) {
          const prefRate = tier.rate || inv.preferred_return_rate || 0
          const contributed = inv.contributed_to_date || 0
          const prefReturnOwed = contributed * (prefRate / 100)
          const share = tierTotal > 0 ? prefReturnOwed / tierTotal : 0
          const contact = inv.contact as { first_name?: string; last_name?: string; company?: string } | null

          tierResult.investor_allocations.push({
            investor_id: inv.id,
            investor_name: contact
              ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || contact.company || "Unknown"
              : "Unknown",
            ownership_pct: inv.ownership_pct || 0,
            amount: Math.round(tierAllocation * share * 100) / 100,
          })
        }
      } else if (tier.type === "catch_up") {
        // GP catch-up: allocate to GP until GP reaches target percentage
        const gpSplit = (tier.gp_split || tier.percentage || 100) / 100
        const tierAllocation = Math.min(
          remainingAmount,
          tier.threshold ? tier.threshold : remainingAmount
        )
        remainingAmount -= tierAllocation
        tierResult.amount_allocated = Math.round(tierAllocation * 100) / 100
        tierResult.gp_amount = Math.round(tierAllocation * gpSplit * 100) / 100
        tierResult.lp_amount = Math.round(tierAllocation * (1 - gpSplit) * 100) / 100

        // LP portion allocated pro-rata
        for (const inv of investors) {
          const contact = inv.contact as { first_name?: string; last_name?: string; company?: string } | null
          const totalOwnership = investors.reduce((s, i) => s + (i.ownership_pct || 0), 0)
          const share = totalOwnership > 0 ? (inv.ownership_pct || 0) / totalOwnership : 0

          tierResult.investor_allocations.push({
            investor_id: inv.id,
            investor_name: contact
              ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || contact.company || "Unknown"
              : "Unknown",
            ownership_pct: inv.ownership_pct || 0,
            amount: Math.round(tierResult.lp_amount * share * 100) / 100,
          })
        }
      } else if (tier.type === "residual_split") {
        // Split remaining amount between GP and LP
        const gpSplit = (tier.gp_split || 20) / 100
        const lpSplit = (tier.lp_split || 80) / 100
        const tierAllocation = remainingAmount
        remainingAmount = 0

        tierResult.amount_allocated = Math.round(tierAllocation * 100) / 100
        tierResult.gp_amount = Math.round(tierAllocation * gpSplit * 100) / 100
        tierResult.lp_amount = Math.round(tierAllocation * lpSplit * 100) / 100

        // LP portion allocated pro-rata among investors
        const totalOwnership = investors.reduce((s, i) => s + (i.ownership_pct || 0), 0)
        for (const inv of investors) {
          const contact = inv.contact as { first_name?: string; last_name?: string; company?: string } | null
          const share = totalOwnership > 0 ? (inv.ownership_pct || 0) / totalOwnership : 0

          tierResult.investor_allocations.push({
            investor_id: inv.id,
            investor_name: contact
              ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || contact.company || "Unknown"
              : "Unknown",
            ownership_pct: inv.ownership_pct || 0,
            amount: Math.round(tierResult.lp_amount * share * 100) / 100,
          })
        }
      }

      tierResults.push(tierResult)
    }

    const totalGP = tierResults.reduce((s, t) => s + t.gp_amount, 0)
    const totalLP = tierResults.reduce((s, t) => s + t.lp_amount, 0)

    return NextResponse.json({
      data: {
        structure_name: structure.name,
        structure_type: structure.type,
        input_amount: input.amount,
        total_gp: Math.round(totalGP * 100) / 100,
        total_lp: Math.round(totalLP * 100) / 100,
        unallocated: Math.round(remainingAmount * 100) / 100,
        tiers: tierResults,
      },
    })
  } catch (err) {
    console.error("Waterfall calculate error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
