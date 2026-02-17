import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const InstantiateWorkflowSchema = z.object({
  workflow_template_id: z.string().uuid(),
  record_type: z.string().min(1),
  record_id: z.string().uuid(),
  name: z.string().optional(),
  start_date: z.string().optional().nullable(),
  role_user_mapping: z.record(z.string()).optional(),
})

const UpdateTaskSchema = z.object({
  task_instance_id: z.string().uuid(),
  status: z
    .enum(["not_started", "in_progress", "completed", "skipped", "blocked"])
    .optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  skip_reason: z.string().optional().nullable(),
})

const AdvanceMilestoneSchema = z.object({
  milestone_instance_id: z.string().uuid(),
  action: z.enum(["complete", "skip", "block", "reset"]),
  notes: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// POST: Instantiate workflow from template
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
    const parsed = InstantiateWorkflowSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Check for existing workflow on this record
    const { data: existing } = await supabase
      .from("workflow_instances")
      .select("id")
      .eq("record_type", input.record_type)
      .eq("record_id", input.record_id)
      .neq("status", "cancelled")
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "A workflow already exists for this record" },
        { status: 409 }
      )
    }

    // Fetch template with milestones, task lists, and tasks
    const { data: template, error: tplError } = await supabase
      .from("workflow_templates")
      .select("*")
      .eq("id", input.workflow_template_id)
      .eq("is_active", true)
      .single()

    if (tplError || !template) {
      return NextResponse.json(
        { error: "Workflow template not found or inactive" },
        { status: 404 }
      )
    }

    const { data: milestoneTemplates } = await supabase
      .from("milestone_templates")
      .select("*")
      .eq("workflow_template_id", template.id)
      .order("sequence", { ascending: true })

    if (!milestoneTemplates || milestoneTemplates.length === 0) {
      return NextResponse.json(
        { error: "Template has no milestones defined" },
        { status: 400 }
      )
    }

    // Create workflow instance
    const workflowName = input.name || template.name
    const { data: workflowInstance, error: wiError } = await supabase
      .from("workflow_instances")
      .insert({
        workflow_template_id: template.id,
        record_type: input.record_type,
        record_id: input.record_id,
        name: workflowName,
        status: "not_started",
        started_by: user.id,
        progress_pct: 0,
      })
      .select("*")
      .single()

    if (wiError) {
      console.error("Create workflow instance error:", wiError)
      return NextResponse.json(
        { error: "Failed to create workflow instance" },
        { status: 500 }
      )
    }

    // Create milestone instances
    const startDate = input.start_date
      ? new Date(input.start_date)
      : new Date()
    let currentDate = new Date(startDate)

    const milestonePayloads = milestoneTemplates.map(
      (mt: Record<string, unknown>) => {
        const plannedStart = new Date(currentDate)
        const durationDays = (mt.duration_days as number) || 7
        currentDate.setDate(currentDate.getDate() + durationDays)
        const plannedEnd = new Date(currentDate)

        return {
          workflow_instance_id: workflowInstance.id,
          milestone_template_id: mt.id as string,
          name: mt.name as string,
          sequence: mt.sequence as number,
          status: "not_started" as const,
          planned_start_date: plannedStart.toISOString().slice(0, 10),
          planned_end_date: plannedEnd.toISOString().slice(0, 10),
        }
      }
    )

    const { data: milestoneInstances, error: miError } = await supabase
      .from("milestone_instances")
      .insert(milestonePayloads)
      .select("*")

    if (miError) {
      console.error("Create milestone instances error:", miError)
      return NextResponse.json(
        { error: "Failed to create milestone instances" },
        { status: 500 }
      )
    }

    // Set the first milestone as current
    if (milestoneInstances && milestoneInstances.length > 0) {
      const firstMilestone = milestoneInstances[0]
      await supabase
        .from("workflow_instances")
        .update({ current_milestone_id: firstMilestone.id })
        .eq("id", workflowInstance.id)
    }

    // Create task instances for each milestone
    const allTaskPayloads: Record<string, unknown>[] = []

    for (const mi of milestoneInstances || []) {
      // Get task list templates for this milestone
      const { data: taskListTemplates } = await supabase
        .from("task_list_templates")
        .select("*")
        .eq("milestone_template_id", mi.milestone_template_id)
        .order("sequence", { ascending: true })

      if (taskListTemplates) {
        for (const tlt of taskListTemplates) {
          // Get task templates
          const { data: taskTemplates } = await supabase
            .from("task_templates")
            .select("*")
            .eq("task_list_template_id", tlt.id)
            .order("sequence", { ascending: true })

          if (taskTemplates) {
            for (const tt of taskTemplates) {
              // Calculate due date based on duration
              let dueDate: string | null = null
              if (tt.duration_days && mi.planned_start_date) {
                const d = new Date(mi.planned_start_date)
                d.setDate(d.getDate() + tt.duration_days)
                dueDate = d.toISOString().slice(0, 10)
              }

              // Resolve assignee from role mapping
              let assignedTo: string | null = null
              if (
                input.role_user_mapping &&
                tt.default_assignee_role &&
                input.role_user_mapping[tt.default_assignee_role]
              ) {
                assignedTo =
                  input.role_user_mapping[tt.default_assignee_role]
              }

              allTaskPayloads.push({
                milestone_instance_id: mi.id,
                task_template_id: tt.id,
                task_list_name: tlt.name,
                name: tt.name,
                description: tt.description,
                sequence: tt.sequence,
                status: "not_started",
                due_date: dueDate,
                assigned_to: assignedTo,
              })
            }
          }
        }
      }
    }

    if (allTaskPayloads.length > 0) {
      await supabase.from("task_instances").insert(allTaskPayloads)
    }

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: input.record_type,
        record_id: input.record_id,
        action: "workflow_instantiated",
        description: `Workflow "${workflowName}" instantiated from template`,
        metadata: {
          workflow_instance_id: workflowInstance.id,
          template_id: template.id,
          milestone_count: milestoneInstances?.length || 0,
          task_count: allTaskPayloads.length,
        },
      })
    }

    return NextResponse.json(
      {
        data: {
          workflow_instance: workflowInstance,
          milestones: milestoneInstances,
          task_count: allTaskPayloads.length,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("Workflow POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH: Update task status or advance milestone
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
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

    // Determine which action: task update or milestone advance
    if (body.task_instance_id) {
      // ---- Update task ----
      const parsed = UpdateTaskSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const input = parsed.data
      const updates: Record<string, unknown> = {}

      if (input.status !== undefined) {
        updates.status = input.status
        if (input.status === "completed") {
          updates.completed_at = new Date().toISOString()
          updates.completed_by = user.id
        } else {
          updates.completed_at = null
          updates.completed_by = null
        }
      }
      if (input.assigned_to !== undefined) {
        updates.assigned_to = input.assigned_to
      }
      if (input.notes !== undefined) {
        updates.notes = input.notes
      }
      if (input.due_date !== undefined) {
        updates.due_date = input.due_date
      }
      if (input.skip_reason !== undefined) {
        updates.notes = input.skip_reason
          ? `Skip reason: ${input.skip_reason}${input.notes ? `\n${input.notes}` : ''}`
          : updates.notes
      }

      const { data: task, error: updateError } = await supabase
        .from("task_instances")
        .update(updates)
        .eq("id", input.task_instance_id)
        .select("*, milestone_instance_id")
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update task", details: updateError.message },
          { status: 500 }
        )
      }

      // After task update, recalculate milestone progress
      if (task) {
        await recalculateWorkflowProgress(supabase, task.milestone_instance_id)
      }

      return NextResponse.json({ data: task })
    } else if (body.milestone_instance_id) {
      // ---- Advance milestone ----
      const parsed = AdvanceMilestoneSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const input = parsed.data

      // Fetch the milestone
      const { data: milestone, error: mError } = await supabase
        .from("milestone_instances")
        .select("*")
        .eq("id", input.milestone_instance_id)
        .single()

      if (mError || !milestone) {
        return NextResponse.json(
          { error: "Milestone not found" },
          { status: 404 }
        )
      }

      const updates: Record<string, unknown> = {
        notes: input.notes ?? milestone.notes,
      }

      switch (input.action) {
        case "complete":
          updates.status = "completed"
          updates.actual_end_date = new Date().toISOString().slice(0, 10)
          updates.completed_by = user.id
          if (!milestone.actual_start_date) {
            updates.actual_start_date = new Date().toISOString().slice(0, 10)
          }
          break
        case "skip":
          updates.status = "skipped"
          break
        case "block":
          updates.status = "blocked"
          break
        case "reset":
          updates.status = "not_started"
          updates.actual_start_date = null
          updates.actual_end_date = null
          updates.completed_by = null
          break
      }

      const { data: updatedMilestone, error: updateError } = await supabase
        .from("milestone_instances")
        .update(updates)
        .eq("id", input.milestone_instance_id)
        .select("*")
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update milestone", details: updateError.message },
          { status: 500 }
        )
      }

      // If completed, advance the workflow current_milestone to the next one
      if (input.action === "complete" || input.action === "skip") {
        const { data: nextMilestone } = await supabase
          .from("milestone_instances")
          .select("id")
          .eq("workflow_instance_id", milestone.workflow_instance_id)
          .gt("sequence", milestone.sequence)
          .order("sequence", { ascending: true })
          .limit(1)
          .single()

        if (nextMilestone) {
          await supabase
            .from("workflow_instances")
            .update({
              current_milestone_id: nextMilestone.id,
              status: "in_progress",
              started_at:
                (
                  await supabase
                    .from("workflow_instances")
                    .select("started_at")
                    .eq("id", milestone.workflow_instance_id)
                    .single()
                ).data?.started_at || new Date().toISOString(),
            })
            .eq("id", milestone.workflow_instance_id)

          // Auto-set next milestone's actual_start_date
          await supabase
            .from("milestone_instances")
            .update({
              status: "in_progress",
              actual_start_date: new Date().toISOString().slice(0, 10),
            })
            .eq("id", nextMilestone.id)
        } else {
          // No more milestones - workflow is complete
          await supabase
            .from("workflow_instances")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              progress_pct: 100,
            })
            .eq("id", milestone.workflow_instance_id)
        }
      }

      // Recalculate workflow progress
      await recalculateWorkflowProgress(
        supabase,
        input.milestone_instance_id
      )

      return NextResponse.json({ data: updatedMilestone })
    }

    return NextResponse.json(
      {
        error:
          "Request must include either task_instance_id or milestone_instance_id",
      },
      { status: 400 }
    )
  } catch (err) {
    console.error("Workflow PATCH error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Helper: Recalculate workflow progress
// ---------------------------------------------------------------------------
async function recalculateWorkflowProgress(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  milestoneInstanceId: string
) {
  try {
    // Get the workflow instance id from this milestone
    const { data: milestone } = await supabase
      .from("milestone_instances")
      .select("workflow_instance_id")
      .eq("id", milestoneInstanceId)
      .single()

    if (!milestone) return

    // Count all milestones and completed milestones
    const { data: allMilestones } = await supabase
      .from("milestone_instances")
      .select("status")
      .eq("workflow_instance_id", milestone.workflow_instance_id)

    if (!allMilestones) return

    const total = allMilestones.length
    const completed = allMilestones.filter(
      (m) => m.status === "completed" || m.status === "skipped"
    ).length

    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

    await supabase
      .from("workflow_instances")
      .update({ progress_pct: progressPct })
      .eq("id", milestone.workflow_instance_id)
  } catch (err) {
    console.error("Recalculate progress error:", err)
  }
}
