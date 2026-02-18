import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const InvestorStatementSchema = z.object({
  entity_id: z.string().uuid("entity_id is required"),
  investor_id: z.string().uuid("investor_id is required"),
  period_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "period_start must be YYYY-MM-DD")
    .optional(),
  period_end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "period_end must be YYYY-MM-DD")
    .optional(),
})

// ---------------------------------------------------------------------------
// GET: Investor capital account statement
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())
    const parsed = InvestorStatementSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    // Fetch investor details
    const { data: rawInvestor, error: investorError } = await supabase
      .from("investors")
      .select(
        `
        *,
        contact:contacts!investors_contact_id_fkey(id, first_name, last_name, company, email)
      `
      )
      .eq("id", filters.investor_id)
      .eq("entity_id", filters.entity_id)
      .single()
    const investor = rawInvestor as any

    if (investorError || !investor) {
      return NextResponse.json(
        { error: "Investor not found" },
        { status: 404 }
      )
    }

    // Fetch entity info
    const { data: entity } = await supabase
      .from("entities")
      .select("id, name")
      .eq("id", filters.entity_id)
      .single()

    // Calculate beginning balance from capital calls received before period
    let beginningContributions = 0
    let beginningDistributions = 0

    if (filters.period_start) {
      // Contributions before period start
      const { data: priorContributions } = await supabase
        .from("capital_call_responses")
        .select(
          `
          amount_received,
          capital_call:capital_calls!capital_call_responses_capital_call_id_fkey(entity_id)
        `
        )
        .eq("investor_id", filters.investor_id)
        .eq("status", "received")
        .lt("received_date", filters.period_start)

      if (priorContributions) {
        for (const resp of priorContributions) {
          const capitalCall = resp.capital_call as unknown as { entity_id: string } | null
          if (capitalCall && capitalCall.entity_id === filters.entity_id) {
            beginningContributions += resp.amount_received || 0
          }
        }
      }

      // Distributions before period start
      const { data: priorDistributions } = await supabase
        .from("distribution_allocations")
        .select(
          `
          amount,
          distribution:distributions!distribution_allocations_distribution_id_fkey(entity_id, status, distribution_date)
        `
        )
        .eq("investor_id", filters.investor_id)

      if (priorDistributions) {
        for (const alloc of priorDistributions) {
          const dist = alloc.distribution as unknown as {
            entity_id: string
            status: string
            distribution_date: string
          } | null
          if (
            dist &&
            dist.entity_id === filters.entity_id &&
            dist.status === "processed" &&
            dist.distribution_date < filters.period_start
          ) {
            beginningDistributions += alloc.amount || 0
          }
        }
      }
    }

    const beginningBalance = beginningContributions - beginningDistributions

    // Fetch contributions within period
    let contribQuery = supabase
      .from("capital_call_responses")
      .select(
        `
        id,
        amount_received,
        received_date,
        capital_call:capital_calls!capital_call_responses_capital_call_id_fkey(id, entity_id, call_date, description)
      `
      )
      .eq("investor_id", filters.investor_id)
      .eq("status", "received")

    if (filters.period_start) {
      contribQuery = contribQuery.gte("received_date", filters.period_start)
    }
    if (filters.period_end) {
      contribQuery = contribQuery.lte("received_date", filters.period_end)
    }

    const { data: periodContributions } = await contribQuery

    // Filter contributions to this entity
    const contributions = (periodContributions || [])
      .filter((resp) => {
        const capitalCall = resp.capital_call as unknown as { entity_id: string } | null
        return capitalCall && capitalCall.entity_id === filters.entity_id
      })
      .map((resp) => {
        const capitalCall = resp.capital_call as unknown as {
          id: string
          call_date: string
          description: string
        }
        return {
          id: resp.id,
          date: resp.received_date,
          amount: resp.amount_received || 0,
          capital_call_id: capitalCall.id,
          description: capitalCall.description || `Capital call ${capitalCall.call_date}`,
        }
      })

    const totalContributions = contributions.reduce((s, c) => s + c.amount, 0)

    // Fetch distributions within period
    const { data: periodAllocations } = await supabase
      .from("distribution_allocations")
      .select(
        `
        id,
        amount,
        distribution:distributions!distribution_allocations_distribution_id_fkey(id, entity_id, status, distribution_date, distribution_type, description)
      `
      )
      .eq("investor_id", filters.investor_id)

    const distributions = (periodAllocations || [])
      .filter((alloc) => {
        const dist = alloc.distribution as unknown as {
          entity_id: string
          status: string
          distribution_date: string
        } | null
        if (!dist || dist.entity_id !== filters.entity_id || dist.status !== "processed") {
          return false
        }
        if (filters.period_start && dist.distribution_date < filters.period_start) {
          return false
        }
        if (filters.period_end && dist.distribution_date > filters.period_end) {
          return false
        }
        return true
      })
      .map((alloc) => {
        const dist = alloc.distribution as unknown as {
          id: string
          distribution_date: string
          distribution_type: string
          description: string
        }
        return {
          id: alloc.id,
          date: dist.distribution_date,
          amount: alloc.amount || 0,
          distribution_id: dist.id,
          distribution_type: dist.distribution_type,
          description: dist.description || `Distribution ${dist.distribution_date}`,
        }
      })

    const totalDistributions = distributions.reduce((s, d) => s + d.amount, 0)

    const endingBalance = beginningBalance + totalContributions - totalDistributions

    // Investor contact info
    const contact = investor.contact as {
      first_name?: string
      last_name?: string
      company?: string
      email?: string
    } | null

    const investorName = contact
      ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || contact.company || "Unknown"
      : "Unknown"

    return NextResponse.json({
      data: {
        entity_id: filters.entity_id,
        entity_name: entity?.name || null,
        investor_id: filters.investor_id,
        investor_name: investorName,
        investor_email: contact?.email || null,
        ownership_pct: investor.ownership_pct || 0,
        capital_commitment: investor.capital_commitment || 0,
        period_start: filters.period_start || null,
        period_end: filters.period_end || null,
        generated_at: new Date().toISOString(),
        beginning_balance: Math.round(beginningBalance * 100) / 100,
        contributions: {
          items: contributions,
          total: Math.round(totalContributions * 100) / 100,
        },
        distributions: {
          items: distributions,
          total: Math.round(totalDistributions * 100) / 100,
        },
        ending_balance: Math.round(endingBalance * 100) / 100,
        lifetime_contributed: Math.round((investor.contributed_to_date || 0) * 100) / 100,
        lifetime_distributed: Math.round((investor.distributions_to_date || 0) * 100) / 100,
      },
    })
  } catch (err) {
    console.error("Investor statement error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
