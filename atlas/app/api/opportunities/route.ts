import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const OpportunityFilterSchema = z.object({
  type: z.string().optional(),
  stage: z.string().optional(),
  entity: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  status: z.enum(["active", "archived", "converted"]).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreateOpportunitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    "scattered_lot",
    "lot_development",
    "community_development",
    "lot_purchase",
    "other",
  ]),
  current_stage: z.string().min(1, "Stage is required"),
  source: z
    .enum([
      "mls",
      "direct_mail",
      "referral",
      "driving_for_dollars",
      "auction",
      "wholesaler",
      "builder_referral",
      "agent_relationship",
      "online_listing",
      "other",
    ])
    .optional()
    .nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  owner_entity_id: z.string().uuid().optional().nullable(),
  // Address
  address_street: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_state: z.string().optional().nullable(),
  address_zip: z.string().optional().nullable(),
  address_county: z.string().optional().nullable(),
  parcel_tms_number: z.string().optional().nullable(),
  // Financial
  projected_purchase_price: z.number().optional().nullable(),
  projected_sale_price: z.number().optional().nullable(),
  // Dates
  date_identified: z.string().optional().nullable(),
  due_diligence_deadline: z.string().optional().nullable(),
  projected_close_date: z.string().optional().nullable(),
  // Scattered lot fields
  zoning_current: z.string().optional().nullable(),
  build_type: z.enum(["spec", "pre_sale", "custom", "model"]).optional().nullable(),
  water_available: z.boolean().optional().nullable(),
  sewer_available: z.boolean().optional().nullable(),
  electric_available: z.boolean().optional().nullable(),
  gas_available: z.boolean().optional().nullable(),
  floor_plan_id: z.string().uuid().optional().nullable(),
  lot_width: z.number().optional().nullable(),
  lot_depth: z.number().optional().nullable(),
  lot_sqft: z.number().optional().nullable(),
  // Lot development fields
  total_acreage: z.number().optional().nullable(),
  estimated_total_lots: z.number().int().optional().nullable(),
  infrastructure_scope_estimate: z.number().optional().nullable(),
  // Notes
  buildable_description: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: List opportunities
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
    const parsed = OpportunityFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    let query = supabase
      .from("opportunities")
      .select(
        `
        *,
        assigned_user:profiles!opportunities_assigned_to_fkey(
          id, first_name, last_name, avatar_url
        ),
        entity:entities!opportunities_owner_entity_id_fkey(
          id, name
        ),
        floor_plan:floor_plans!fk_opportunities_floor_plan(
          id, name, heated_sf, base_cost
        )
      `,
        { count: "exact" }
      )
      .order("updated_at", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1)

    // Apply filters
    if (filters.type) {
      query = query.eq("type", filters.type)
    }
    if (filters.stage) {
      query = query.eq("current_stage", filters.stage)
    }
    if (filters.entity) {
      query = query.eq("owner_entity_id", filters.entity)
    }
    if (filters.assigned_to) {
      query = query.eq("assigned_to", filters.assigned_to)
    }
    if (filters.status) {
      query = query.eq("status", filters.status)
    } else {
      // Default: exclude archived
      query = query.neq("status", "archived")
    }
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,address_street.ilike.%${filters.search}%,address_city.ilike.%${filters.search}%,parcel_tms_number.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Opportunities fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch opportunities" },
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
    console.error("Opportunities GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create opportunity
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
    const parsed = CreateOpportunitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const orgId = user.user_metadata?.organization_id
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found for user" },
        { status: 400 }
      )
    }

    const payload = {
      ...parsed.data,
      organization_id: orgId,
      status: "active" as const,
    }

    const { data: opportunity, error: createError } = await supabase
      .from("opportunities")
      .insert(payload)
      .select("*")
      .single()

    if (createError) {
      console.error("Create opportunity error:", createError)
      return NextResponse.json(
        { error: "Failed to create opportunity", details: createError.message },
        { status: 500 }
      )
    }

    // Create activity log entry
    await supabase.from("activity_log").insert({
      organization_id: orgId,
      user_id: user.id,
      record_type: "opportunity",
      record_id: opportunity.id,
      action: "created",
      description: `Created opportunity: ${opportunity.name}`,
      metadata: {
        type: opportunity.type,
        stage: opportunity.current_stage,
      },
    })

    return NextResponse.json({ data: opportunity }, { status: 201 })
  } catch (err) {
    console.error("Opportunities POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
