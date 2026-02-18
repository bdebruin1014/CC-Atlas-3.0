import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const LaunchJobSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  superintendent_id: z.string().uuid().optional().nullable(),
  pm_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  units: z
    .array(
      z.object({
        unit_number: z.string().min(1),
        floor_plan_id: z.string().uuid().optional().nullable(),
        upgrade_package: z
          .enum(["standard", "classic", "elegance", "harmony"])
          .optional()
          .nullable(),
      })
    )
    .min(1, "At least one unit is required"),
})

// ---------------------------------------------------------------------------
// POST: Launch a construction job from a project
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerSupabaseClient()

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = user.user_metadata?.organization_id
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found for user" },
        { status: 400 }
      )
    }

    // Validate body
    const body = await request.json()
    const parsed = LaunchJobSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Validate project exists and is in a launchable status
    const { data: project, error: projError } = await supabase
      .from("projects")
      .select("id, name, status, type, address_state")
      .eq("id", projectId)
      .single()

    if (projError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    if (!["pre_construction", "active"].includes(project.status)) {
      return NextResponse.json(
        { error: "Project must be in pre_construction or active status to launch a job" },
        { status: 400 }
      )
    }

    // Generate job number
    const year = new Date().getFullYear().toString().slice(-2)
    const { count: jobCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })

    const seq = ((jobCount || 0) + 1).toString().padStart(4, "0")
    const jobNumber = `J${year}-${seq}`

    // Create job
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: jobRaw, error: createError } = await supabase
      .from("jobs")
      .insert({
        organization_id: orgId,
        job_number: jobNumber,
        name: input.name,
        client_type: "internal" as const,
        unit_count: input.units.length,
        linked_project_id: projectId,
        state: (project.address_state as "SC" | "NC") || "SC",
        superintendent_id: input.superintendent_id || null,
        pm_id: input.pm_id || null,
        start_date: input.start_date || null,
        status: "pre_construction",
      })
      .select("*")
      .single()

    const job = jobRaw as unknown as { id: string; name: string } | null

    if (createError || !job) {
      console.error("Create job error:", createError)
      return NextResponse.json(
        { error: "Failed to create job", details: createError?.message },
        { status: 500 }
      )
    }

    // Create units
    const unitPayloads = input.units.map((u) => ({
      job_id: job.id,
      unit_number: u.unit_number,
      floor_plan_id: u.floor_plan_id || null,
      upgrade_package: u.upgrade_package || null,
      current_milestone: 0,
      total_budget: 0,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: unitsRaw, error: unitError } = await supabase
      .from("units")
      .insert(unitPayloads)
      .select("*")

    const units = (unitsRaw ?? []) as unknown as { id: string }[]

    if (unitError) {
      console.error("Create units error:", unitError)
    }

    // Create milestones for each unit
    if (units && units.length > 0) {
      // Try to load phases from a construction workflow template
      let workflowPhases: { phase_number: number; phase_name: string; duration_days: number }[] | null = null

      const { data: constructionWorkflow } = await supabase
        .from("workflow_templates")
        .select("id")
        .eq("workflow_type", "construction")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (constructionWorkflow) {
        const { data: milestoneTemplates } = await supabase
          .from("milestone_templates")
          .select("sequence, name, duration_days")
          .eq("workflow_template_id", constructionWorkflow.id)
          .order("sequence", { ascending: true })

        if (milestoneTemplates && milestoneTemplates.length > 0) {
          workflowPhases = milestoneTemplates.map((m) => ({
            phase_number: m.sequence as number,
            phase_name: m.name as string,
            duration_days: (m.duration_days as number) || 7,
          }))
        }
      }

      // Default 6-milestone fallback (per v4 spec §3.6)
      const DEFAULT_PHASES = [
        { phase_number: 1, phase_name: "Permit", duration_days: 21 },
        { phase_number: 2, phase_name: "Foundation", duration_days: 21 },
        { phase_number: 3, phase_name: "Frame", duration_days: 28 },
        { phase_number: 4, phase_name: "Sheetrock", duration_days: 21 },
        { phase_number: 5, phase_name: "CO", duration_days: 42 },
        { phase_number: 6, phase_name: "Complete", duration_days: 14 },
      ]

      const phases = workflowPhases || DEFAULT_PHASES

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const milestonePayloads: any[] = []

      for (let i = 0; i < units.length; i++) {
        const unit = units[i]

        // Compute planned dates from start_date
        const startDate = input.start_date
          ? new Date(input.start_date)
          : new Date()
        let cursor = new Date(startDate)

        for (const phase of phases) {
          const plannedStart = new Date(cursor)
          cursor.setDate(cursor.getDate() + phase.duration_days)
          const plannedEnd = new Date(cursor)

          const isFirst = phase.phase_number === 1
          milestonePayloads.push({
            unit_id: unit.id,
            phase_number: phase.phase_number,
            name: phase.phase_name,
            standard_duration_days: phase.duration_days,
            planned_start_date: plannedStart.toISOString().slice(0, 10),
            planned_end_date: plannedEnd.toISOString().slice(0, 10),
            status: isFirst ? "in_progress" : "not_started",
            ...(isFirst ? { actual_start_date: plannedStart.toISOString().slice(0, 10) } : {}),
          })
        }
      }

      if (milestonePayloads.length > 0) {
        await supabase.from("unit_milestones").insert(milestonePayloads)
      }
    }

    // Create 5-draw schedule per job (draw_schedules is job-level, not unit-level)
    try {
      const DEFAULT_DRAWS = [
        { draw_number: 1, name: "Deposit", percentage: 20 },
        { draw_number: 2, name: "Foundation", percentage: 20 },
        { draw_number: 3, name: "Framing/Dry-In", percentage: 25 },
        { draw_number: 4, name: "Drywall/Trim", percentage: 25 },
        { draw_number: 5, name: "Final", percentage: 10 },
      ]

      const drawPayloads = DEFAULT_DRAWS.map((d) => ({
        job_id: job.id,
        draw_number: d.draw_number,
        name: d.name,
        percentage: d.percentage,
        amount: 0,
        status: "pending",
      }))

      await supabase.from("draw_schedules").insert(drawPayloads)
    } catch {
      // draw_schedules table may not exist yet — skip silently
    }

    // Update project status to 'active' if it was 'pre_construction'
    if (project.status === "pre_construction") {
      await supabase
        .from("projects")
        .update({ status: "active" })
        .eq("id", projectId)
    }

    // Activity log
    await supabase.from("activity_log").insert({
      organization_id: orgId,
      user_id: user.id,
      record_type: "job",
      record_id: job.id,
      action: "created",
      description: `Launched job "${job.name}" (${jobNumber}) from project`,
      metadata: {
        job_number: jobNumber,
        project_id: projectId,
        unit_count: input.units.length,
      },
    })

    return NextResponse.json(
      { data: { jobId: job.id, jobNumber } },
      { status: 201 }
    )
  } catch (err) {
    console.error("Launch job error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
