import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const DistributionFilterSchema = z.object({
  entity_id: z.string().uuid("entity_id is required"),
  status: z
    .enum(["draft", "approved", "distributed", "cancelled"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreateDistributionSchema = z.object({
  entity_id: z.string().uuid(),
  total_amount: z.number().positive("Total amount must be positive"),
  distribution_type: z.enum([
    "return_of_capital",
    "preferred_return",
    "profit_distribution",
    "liquidating",
  ]),
  distribution_date: z.string().optional(),
  waterfall_structure_id: z.string().uuid().optional().nullable(),
  source_project_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: List distributions for entity
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
    const parsed = DistributionFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    let query = supabase
      .from("distributions")
      .select(
        `
        *,
        waterfall_structure:waterfall_structures!distributions_waterfall_structure_id_fkey(id, name, type),
        source_project:projects!distributions_source_project_id_fkey(id, name, project_number),
        approver:profiles!distributions_approved_by_fkey(id, first_name, last_name),
        allocations:distribution_allocations(
          id,
          investor_id,
          amount,
          allocation_type,
          payment_method,
          paid_date,
          investor:investors!distribution_allocations_investor_id_fkey(
            id,
            ownership_pct,
            contact:contacts!investors_contact_id_fkey(id, first_name, last_name, company)
          )
        )
      `,
        { count: "exact" }
      )
      .eq("entity_id", filters.entity_id)
      .order("distribution_date", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1)

    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Distributions fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch distributions" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (err) {
    console.error("Distributions GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create distribution with per-investor allocations
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
    const parsed = CreateDistributionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Fetch investors for this entity
    const { data: investors } = await supabase
      .from("investors")
      .select("id, ownership_pct")
      .eq("entity_id", input.entity_id)

    if (!investors || investors.length === 0) {
      return NextResponse.json(
        { error: "No investors found", details: "Entity has no investors for distribution." },
        { status: 400 }
      )
    }

    // If waterfall_structure_id provided, fetch the structure for tier-based allocation
    let waterfallTiers: { name: string; type: string; percentage: number; threshold?: number }[] | null = null
    if (input.waterfall_structure_id) {
      const { data: structure } = await supabase
        .from("waterfall_structures")
        .select("tiers")
        .eq("id", input.waterfall_structure_id)
        .single()

      if (structure?.tiers) {
        waterfallTiers = structure.tiers as typeof waterfallTiers
      }
    }

    // Create the distribution
    const { data: distribution, error: createError } = await supabase
      .from("distributions")
      .insert({
        entity_id: input.entity_id,
        distribution_date: input.distribution_date || new Date().toISOString().split("T")[0],
        total_amount: input.total_amount,
        distribution_type: input.distribution_type,
        waterfall_structure_id: input.waterfall_structure_id || null,
        source_project_id: input.source_project_id || null,
        notes: input.notes || null,
        status: "draft",
      })
      .select("*")
      .single()

    if (createError) {
      console.error("Create distribution error:", createError)
      return NextResponse.json(
        { error: "Failed to create distribution", details: createError.message },
        { status: 500 }
      )
    }

    // Create per-investor allocations
    // Simple pro-rata based on ownership % (waterfall calculation is separate)
    const allocationPayloads = investors.map((inv) => {
      const amount = Math.round(
        input.total_amount * ((inv.ownership_pct || 0) / 100) * 100
      ) / 100

      return {
        distribution_id: distribution.id,
        investor_id: inv.id,
        amount,
        allocation_type: input.distribution_type === "return_of_capital"
          ? "return_of_capital"
          : input.distribution_type === "preferred_return"
          ? "preferred_return"
          : "profit_share",
      }
    })

    const { data: allocations, error: allocError } = await supabase
      .from("distribution_allocations")
      .insert(allocationPayloads)
      .select("*")

    if (allocError) {
      console.error("Create allocations error:", allocError)
    }

    return NextResponse.json(
      { data: { ...distribution, allocations: allocations || [] } },
      { status: 201 }
    )
  } catch (err) {
    console.error("Distributions POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
