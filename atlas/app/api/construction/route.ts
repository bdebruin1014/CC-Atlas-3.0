import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const JobFilterSchema = z.object({
  status: z.string().optional(),
  client_type: z.enum(["internal", "third_party"]).optional(),
  state: z.enum(["SC", "NC"]).optional(),
  superintendent_id: z.string().uuid().optional(),
  pm_id: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreateJobSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  client_type: z.enum(["internal", "third_party"]),
  client_entity_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  contract_type: z
    .enum([
      "cost_plus",
      "fixed_price",
      "time_and_materials",
      "guaranteed_maximum",
      "unit_price",
    ])
    .optional()
    .nullable(),
  contract_amount: z.number().optional().nullable(),
  builder_fee: z.number().optional().nullable(),
  unit_count: z.number().int().min(1).default(1),
  linked_project_id: z.string().uuid().optional().nullable(),
  state: z.enum(["SC", "NC"]),
  superintendent_id: z.string().uuid().optional().nullable(),
  pm_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  projected_completion: z.string().optional().nullable(),
  // Auto-create units
  units: z
    .array(
      z.object({
        unit_number: z.string().optional(),
        lot_address: z.string().optional().nullable(),
        floor_plan_id: z.string().uuid().optional().nullable(),
        upgrade_package: z
          .enum(["standard", "classic", "elegance", "harmony"])
          .optional()
          .nullable(),
        total_budget: z.number().optional().nullable(),
      })
    )
    .optional(),
})

// ---------------------------------------------------------------------------
// GET: List jobs
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
    const parsed = JobFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    let query = supabase
      .from("jobs")
      .select(
        `
        *,
        superintendent:profiles!jobs_superintendent_id_fkey(id, first_name, last_name, avatar_url),
        project_manager:profiles!jobs_pm_id_fkey(id, first_name, last_name, avatar_url),
        linked_project:projects!jobs_linked_project_id_fkey(id, name, project_number),
        client_entity:entities!jobs_client_entity_id_fkey(id, name),
        units:units(id, unit_number, current_milestone, total_budget, total_actual)
      `,
        { count: "exact" }
      )
      .order("updated_at", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1)

    if (filters.status) {
      query = query.eq("status", filters.status as any)
    }
    if (filters.client_type) {
      query = query.eq("client_type", filters.client_type)
    }
    if (filters.state) {
      query = query.eq("state", filters.state)
    }
    if (filters.superintendent_id) {
      query = query.eq("superintendent_id", filters.superintendent_id)
    }
    if (filters.pm_id) {
      query = query.eq("pm_id", filters.pm_id)
    }
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Jobs fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch jobs" },
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
    console.error("Construction GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create job with auto unit creation
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
    const parsed = CreateJobSchema.safeParse(body)
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

    // Generate job number
    const year = new Date().getFullYear().toString().slice(-2)
    const { count: jobCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })

    const seq = ((jobCount || 0) + 1).toString().padStart(4, "0")
    const jobNumber = `J${year}-${seq}`

    // Create job
    const { data: rawJob, error: createError } = await supabase
      .from("jobs")
      .insert({
        organization_id: orgId,
        job_number: jobNumber,
        name: input.name,
        client_type: input.client_type,
        client_entity_id: input.client_entity_id || null,
        client_id: input.client_id || null,
        contract_type: input.contract_type || null,
        contract_amount: input.contract_amount || null,
        builder_fee: input.builder_fee || null,
        unit_count: input.unit_count,
        linked_project_id: input.linked_project_id || null,
        state: input.state,
        superintendent_id: input.superintendent_id || null,
        pm_id: input.pm_id || null,
        start_date: input.start_date || null,
        projected_completion: input.projected_completion || null,
        status: "pre_construction",
      } as any)
      .select("*")
      .single()
    const job = rawJob as any

    if (createError) {
      console.error("Create job error:", createError)
      return NextResponse.json(
        { error: "Failed to create job", details: createError.message },
        { status: 500 }
      )
    }

    // Auto-create units
    const unitPayloads: Record<string, unknown>[] = []
    if (input.units && input.units.length > 0) {
      for (const u of input.units) {
        unitPayloads.push({
          job_id: job.id,
          unit_number: u.unit_number || `Unit ${unitPayloads.length + 1}`,
          lot_address: u.lot_address || null,
          floor_plan_id: u.floor_plan_id || null,
          upgrade_package: u.upgrade_package || null,
          total_budget: u.total_budget || 0,
          current_milestone: 0,
        })
      }
    } else {
      // Create default units based on unit_count
      for (let i = 1; i <= input.unit_count; i++) {
        unitPayloads.push({
          job_id: job.id,
          unit_number: input.unit_count === 1 ? "Unit 1" : `Unit ${i}`,
          current_milestone: 0,
          total_budget: 0,
        })
      }
    }

    const { data: rawUnits, error: unitError } = await supabase
      .from("units")
      .insert(unitPayloads as any)
      .select("*")
    const units = rawUnits as any[]

    if (unitError) {
      console.error("Create units error:", unitError)
      // Job was created but units failed - don't fail the whole request
    }

    // Create 16-phase milestones for each unit
    if (units && units.length > 0) {
      const PHASES = [
        { number: 1, name: "Pre-Construction", duration: 14 },
        { number: 2, name: "Permitting", duration: 21 },
        { number: 3, name: "Site Work", duration: 7 },
        { number: 4, name: "Foundation", duration: 10 },
        { number: 5, name: "Framing", duration: 14 },
        { number: 6, name: "Roofing", duration: 5 },
        { number: 7, name: "MEP Rough-In", duration: 10 },
        { number: 8, name: "Insulation", duration: 3 },
        { number: 9, name: "Drywall", duration: 10 },
        { number: 10, name: "Interior Trim", duration: 10 },
        { number: 11, name: "Cabinets & Countertops", duration: 7 },
        { number: 12, name: "MEP Finish", duration: 5 },
        { number: 13, name: "Paint & Flooring", duration: 10 },
        { number: 14, name: "Exterior Finish", duration: 7 },
        { number: 15, name: "Final Punch & Clean", duration: 5 },
        { number: 16, name: "Certificate of Occupancy", duration: 3 },
      ]

      const milestonePayloads: Record<string, unknown>[] = []
      for (const unit of units) {
        for (const phase of PHASES) {
          milestonePayloads.push({
            unit_id: unit.id,
            phase_number: phase.number,
            name: phase.name,
            standard_duration_days: phase.duration,
            status: "not_started",
          })
        }
      }

      await supabase.from("unit_milestones").insert(milestonePayloads as any)
    }

    // Activity log
    await supabase.from("activity_log").insert({
      organization_id: orgId,
      user_id: user.id,
      record_type: "job",
      record_id: job.id,
      action: "created",
      description: `Created job: ${job.name} (${jobNumber})`,
      metadata: {
        job_number: jobNumber,
        unit_count: input.unit_count,
        client_type: input.client_type,
      },
    })

    return NextResponse.json(
      { data: { ...(job as any), units: units || [] } },
      { status: 201 }
    )
  } catch (err) {
    console.error("Construction POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
