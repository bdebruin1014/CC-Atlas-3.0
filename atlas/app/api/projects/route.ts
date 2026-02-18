import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const ProjectFilterSchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  entity: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z
    .enum([
      "scattered_lot",
      "lot_development",
      "community_development",
      "lot_purchase",
      "other",
    ])
    .optional()
    .nullable(),
  status: z
    .enum([
      "pre_construction",
      "active",
      "under_contract",
      "complete",
      "warranty",
      "closed",
    ])
    .default("pre_construction"),
  owner_entity_id: z.string().uuid().optional().nullable(),
  builder_entity_id: z.string().uuid().optional().nullable(),
  // Address
  address_street: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_state: z.string().optional().nullable(),
  address_zip: z.string().optional().nullable(),
  address_county: z.string().optional().nullable(),
  // Budget
  budget_land_acquisition: z.number().optional().nullable(),
  budget_site_work: z.number().optional().nullable(),
  budget_vertical_construction: z.number().optional().nullable(),
  budget_soft_costs: z.number().optional().nullable(),
  budget_contingency: z.number().optional().nullable(),
  budget_total: z.number().optional().nullable(),
  // Contract
  contract_amount: z.number().optional().nullable(),
  // Lot data
  floor_plan_id: z.string().uuid().optional().nullable(),
  upgrade_package: z
    .enum(["standard", "classic", "elegance", "harmony"])
    .optional()
    .nullable(),
  municipality_id: z.string().uuid().optional().nullable(),
  lot_width: z.number().optional().nullable(),
  lot_depth: z.number().optional().nullable(),
  lot_sqft: z.number().optional().nullable(),
  zoning: z.string().optional().nullable(),
  // Dates
  acquisition_date: z.string().optional().nullable(),
  projected_completion_date: z.string().optional().nullable(),
  // Conversion from opportunity
  source_opportunity_id: z.string().uuid().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: List projects
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
    const parsed = ProjectFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    let query = supabase
      .from("projects")
      .select(
        `
        *,
        owner_entity:entities!projects_owner_entity_id_fkey(id, name),
        builder_entity:entities!projects_builder_entity_id_fkey(id, name),
        floor_plan:floor_plans!fk_projects_floor_plan(id, name, heated_sf, base_cost),
        source_opportunity:opportunities!projects_source_opportunity_id_fkey(id, name)
      `,
        { count: "exact" }
      )
      .order("updated_at", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1)

    if (filters.type) {
      query = query.eq("type", filters.type as any)
    }
    if (filters.status) {
      query = query.eq("status", filters.status as any)
    }
    if (filters.entity) {
      query = query.or(
        `owner_entity_id.eq.${filters.entity},builder_entity_id.eq.${filters.entity}`
      )
    }
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,project_number.ilike.%${filters.search}%,address_street.ilike.%${filters.search}%,address_city.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Projects fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch projects" },
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
    console.error("Projects GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create project (or convert from opportunity)
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
    const parsed = CreateProjectSchema.safeParse(body)
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

    const input = parsed.data

    // If converting from an opportunity, pull forward data
    let opportunityData: Record<string, unknown> | null = null
    if (input.source_opportunity_id) {
      const { data: opp } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", input.source_opportunity_id)
        .single()

      if (opp) {
        opportunityData = opp as any
      }
    }

    // Generate project number via DB function if available
    let projectNumber: string | null = null
    try {
      const { data: pnResult } = await supabase.rpc("generate_project_number")
      if (pnResult) {
        projectNumber = pnResult
      }
    } catch {
      // Function may not exist yet, generate client-side fallback
      const year = new Date().getFullYear().toString().slice(-2)
      const seq = Math.floor(Math.random() * 999)
        .toString()
        .padStart(3, "0")
      projectNumber = `${year}-${seq}`
    }

    // Build project payload, merging opportunity data if converting
    const payload: Record<string, unknown> = {
      organization_id: orgId,
      project_number: projectNumber,
      name: input.name,
      type: input.type || (opportunityData?.type as string) || null,
      status: input.status,
      owner_entity_id:
        input.owner_entity_id ||
        (opportunityData?.owner_entity_id as string) ||
        null,
      builder_entity_id: input.builder_entity_id || null,
      address_street:
        input.address_street ||
        (opportunityData?.address_street as string) ||
        null,
      address_city:
        input.address_city ||
        (opportunityData?.address_city as string) ||
        null,
      address_state:
        input.address_state ||
        (opportunityData?.address_state as string) ||
        null,
      address_zip:
        input.address_zip ||
        (opportunityData?.address_zip as string) ||
        null,
      address_county:
        input.address_county ||
        (opportunityData?.address_county as string) ||
        null,
      budget_land_acquisition:
        input.budget_land_acquisition ||
        (opportunityData?.projected_purchase_price as number) ||
        null,
      budget_site_work: input.budget_site_work || null,
      budget_vertical_construction: input.budget_vertical_construction || null,
      budget_soft_costs: input.budget_soft_costs || null,
      budget_contingency: input.budget_contingency || null,
      budget_total: input.budget_total || null,
      contract_amount: input.contract_amount || null,
      floor_plan_id:
        input.floor_plan_id ||
        (opportunityData?.floor_plan_id as string) ||
        null,
      upgrade_package: input.upgrade_package || null,
      municipality_id: input.municipality_id || null,
      lot_width:
        input.lot_width || (opportunityData?.lot_width as number) || null,
      lot_depth:
        input.lot_depth || (opportunityData?.lot_depth as number) || null,
      lot_sqft:
        input.lot_sqft || (opportunityData?.lot_sqft as number) || null,
      zoning:
        input.zoning ||
        (opportunityData?.zoning_current as string) ||
        null,
      acquisition_date: input.acquisition_date || null,
      projected_completion_date: input.projected_completion_date || null,
      source_opportunity_id: input.source_opportunity_id || null,
    }

    const { data: rawProject, error: createError } = await supabase
      .from("projects")
      .insert(payload as any)
      .select("*")
      .single()
    const project = rawProject as any

    if (createError) {
      console.error("Create project error:", createError)
      return NextResponse.json(
        { error: "Failed to create project", details: createError.message },
        { status: 500 }
      )
    }

    // If converting, update the opportunity
    if (input.source_opportunity_id) {
      await supabase
        .from("opportunities")
        .update({
          status: "converted",
          converted_to_project_id: project.id,
        })
        .eq("id", input.source_opportunity_id)

      // Carry forward contact assignments
      const { data: contactAssignments } = await supabase
        .from("contact_assignments")
        .select("*")
        .eq("record_type", "opportunity")
        .eq("record_id", input.source_opportunity_id)

      if (contactAssignments && contactAssignments.length > 0) {
        const projectAssignments = contactAssignments.map((ca) => ({
          contact_id: ca.contact_id,
          record_type: "project" as const,
          record_id: project.id,
          role_on_record: ca.role_on_record,
        }))
        await supabase.from("contact_assignments").insert(projectAssignments)
      }
    }

    // Create activity log entry
    await supabase.from("activity_log").insert({
      organization_id: orgId,
      user_id: user.id,
      record_type: "project",
      record_id: project.id,
      action: input.source_opportunity_id
        ? "converted_from_opportunity"
        : "created",
      description: input.source_opportunity_id
        ? `Converted opportunity to project: ${project.name}`
        : `Created project: ${project.name}`,
      metadata: {
        type: project.type,
        status: project.status,
        project_number: project.project_number,
        source_opportunity_id: input.source_opportunity_id || null,
      },
    })

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (err) {
    console.error("Projects POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
