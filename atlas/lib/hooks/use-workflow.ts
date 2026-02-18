import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  workflow_type: string
  trigger_event: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowMilestoneTemplate {
  id: string
  workflow_template_id: string
  name: string
  description: string | null
  order: number
  default_duration_days: number | null
  tasks: WorkflowTaskTemplate[]
}

export interface WorkflowTaskTemplate {
  id: string
  milestone_template_id: string
  name: string
  description: string | null
  order: number
  is_required: boolean
  default_assignee_role: string | null
  estimated_hours: number | null
  dependencies: string[]
}

export interface WorkflowInstance {
  id: string
  workflow_template_id: string
  record_type: string
  record_id: string
  name: string
  status: string
  started_at: string | null
  completed_at: string | null
  current_milestone_id: string | null
  progress_pct: number
  milestone_instances: MilestoneInstance[]
  created_at: string
  updated_at: string
}

export interface MilestoneInstance {
  id: string
  workflow_instance_id: string
  milestone_template_id: string | null
  name: string
  sequence: number
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'blocked'
  planned_start_date: string | null
  planned_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  notes: string | null
  task_instances: TaskInstance[]
  created_at: string
  updated_at: string
}

export interface TaskInstance {
  id: string
  milestone_instance_id: string
  task_template_id: string | null
  task_list_name: string | null
  name: string
  description: string | null
  sequence: number
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'blocked'
  assigned_to: string | null
  assigned_to_name: string | null
  assigned_user?: {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
  is_required: boolean
  due_date: string | null
  completed_at: string | null
  notes: string | null
  skip_reason: string | null
  dependencies: string[]
  created_at: string
  updated_at: string
}

export interface UpdateTaskStatusData {
  id: string
  status: TaskInstance['status']
  notes?: string | null
  assigned_to?: string | null
  due_date?: string | null
  skip_reason?: string | null
}

export interface InstantiateWorkflowData {
  templateId: string
  recordType: string
  recordId: string
  startDate?: string
  name?: string
  roleUserMapping?: Record<string, string>
}

export interface OrgProfile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url: string | null
  role: string | null
}

// ---------------------------------------------------------------------------
// Query keys (exported for external invalidation)
// ---------------------------------------------------------------------------

export const workflowKeys = {
  all: ['workflow'] as const,
  instances: () => [...workflowKeys.all, 'instance'] as const,
  instance: (recordType: string, recordId: string) =>
    [...workflowKeys.instances(), recordType, recordId] as const,
  tasks: (milestoneInstanceId: string) =>
    [...workflowKeys.all, 'tasks', milestoneInstanceId] as const,
  templates: () => [...workflowKeys.all, 'templates'] as const,
  template: (id: string) => [...workflowKeys.templates(), id] as const,
  profiles: () => [...workflowKeys.all, 'profiles'] as const,
}

// Keep backward-compat alias
const keys = workflowKeys

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the workflow instance (with milestones + tasks) for a given record.
 */
export function useWorkflowInstance(recordType: string, recordId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.instance(recordType, recordId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_instances')
        .select(
          `
          *,
          milestone_instances:milestone_instances (
            *,
            task_instances:task_instances (
              *,
              assigned_user:profiles!task_instances_assigned_to_fkey(
                id, first_name, last_name, avatar_url
              )
            )
          )
        `
        )
        .eq('record_type', recordType)
        .eq('record_id', recordId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = data as any

      // Sort milestone instances by sequence
      if (result.milestone_instances) {
        result.milestone_instances.sort(
          (a: { sequence: number }, b: { sequence: number }) =>
            a.sequence - b.sequence
        )
        // Sort task instances within each milestone
        for (const milestone of result.milestone_instances) {
          if (milestone.task_instances) {
            milestone.task_instances.sort(
              (a: { sequence: number }, b: { sequence: number }) =>
                a.sequence - b.sequence
            )
          }
        }
      }

      return result as WorkflowInstance
    },
    enabled: !!recordType && !!recordId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

/**
 * Fetch task instances for a specific milestone.
 */
export function useTaskInstances(milestoneInstanceId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.tasks(milestoneInstanceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_instances')
        .select(
          `
          *,
          assigned_user:profiles!task_instances_assigned_to_fkey(
            id, first_name, last_name, avatar_url
          )
        `
        )
        .eq('milestone_instance_id', milestoneInstanceId)
        .order('sequence', { ascending: true })

      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any as TaskInstance[]
    },
    enabled: !!milestoneInstanceId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

/**
 * Fetch organization profiles for task assignment dropdowns.
 */
export function useOrgProfiles() {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.profiles(),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) return []

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, role')
        .eq('organization_id', profile.organization_id)
        .order('first_name', { ascending: true })

      if (error) throw error
      return (data ?? []) as OrgProfile[]
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

/**
 * Fetch available workflow templates.
 */
export function useWorkflowTemplates(workflowType?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: [...keys.templates(), workflowType],
    queryFn: async () => {
      let query = supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (workflowType) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = query.eq('workflow_type', workflowType as any)
      }

      const { data, error } = await query
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any) as WorkflowTemplate[]
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

// ---------------------------------------------------------------------------
// Update task status with milestone auto-advance
// ---------------------------------------------------------------------------

export function useUpdateTaskStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
      assigned_to,
      due_date,
      skip_reason,
    }: UpdateTaskStatusData) => {
      // Call the API route for task update + auto recalculation
      const res = await fetch('/api/workflow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_instance_id: id,
          status,
          notes,
          assigned_to,
          due_date,
          skip_reason,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update task')
      }

      const { data } = await res.json()

      // If the task was completed or skipped, check if milestone should auto-advance
      if (status === 'completed' || status === 'skipped') {
        const milestoneInstanceId = data.milestone_instance_id
        await checkAndAdvanceMilestone(supabase, milestoneInstanceId)
      }

      return data as TaskInstance
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all })
    },
    onError: (error) => {
      console.error('Failed to update task status:', error)
    },
  })
}

// ---------------------------------------------------------------------------
// Assign task to a user
// ---------------------------------------------------------------------------

export function useAssignTask() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      assignedTo,
    }: {
      taskId: string
      assignedTo: string | null
    }) => {
      const { data, error } = await supabase
        .from('task_instances')
        .update({ assigned_to: assignedTo })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      return data as unknown as TaskInstance
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all })
    },
  })
}

// ---------------------------------------------------------------------------
// Instantiate workflow from template (via API route)
// ---------------------------------------------------------------------------

export function useInstantiateWorkflow() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      templateId,
      recordType,
      recordId,
      startDate,
      name,
      roleUserMapping,
    }: InstantiateWorkflowData) => {
      // Call the server API route which handles the full template → instance pipeline
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_template_id: templateId,
          record_type: recordType,
          record_id: recordId,
          start_date: startDate ?? new Date().toISOString(),
          name,
          role_user_mapping: roleUserMapping,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to instantiate workflow')
      }

      const { data } = await res.json()

      // If role_user_mapping is provided and the API didn't handle it,
      // assign tasks based on their default_assignee_role
      if (roleUserMapping && data.workflow_instance) {
        const workflowInstanceId = data.workflow_instance.id
        await assignTasksByRole(supabase, workflowInstanceId, roleUserMapping)
      }

      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.instance(variables.recordType, variables.recordId),
      })
    },
    onError: (error) => {
      console.error('Failed to instantiate workflow:', error)
    },
  })
}

// ---------------------------------------------------------------------------
// Helper: Auto-instantiate workflow for a record (called from create mutations)
// ---------------------------------------------------------------------------

export async function autoInstantiateWorkflow(
  recordType: string,
  recordId: string,
  subtype: string
): Promise<void> {
  try {
    const supabase = createClient()
    const triggerEvent = `${recordType}_created_${subtype}`

    const { data: templates } = await supabase
      .from('workflow_templates')
      .select('id')
      .eq('trigger_event', triggerEvent)
      .eq('is_active', true)
      .limit(1)

    if (!templates || templates.length === 0) return

    await fetch('/api/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow_template_id: templates[0].id,
        record_type: recordType,
        record_id: recordId,
      }),
    })
  } catch (err) {
    // Auto-instantiation is best-effort; don't fail the parent operation
    console.error('Auto-instantiate workflow failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Helper: check milestone completion and auto-advance
// ---------------------------------------------------------------------------

async function checkAndAdvanceMilestone(
  supabase: ReturnType<typeof createClient>,
  milestoneInstanceId: string
) {
  try {
    // Get the milestone and its tasks
    const { data: milestone } = await supabase
      .from('milestone_instances')
      .select('id, workflow_instance_id, sequence, status')
      .eq('id', milestoneInstanceId)
      .single()

    if (!milestone || milestone.status === 'completed') return

    // Check if all tasks are complete
    const { data: tasks } = await supabase
      .from('task_instances')
      .select('status')
      .eq('milestone_instance_id', milestoneInstanceId)

    if (!tasks || tasks.length === 0) return

    const allDone = tasks.every(
      (t) => t.status === 'completed' || t.status === 'skipped'
    )

    if (!allDone) return

    // Mark milestone as completed
    const now = new Date().toISOString().slice(0, 10)
    await supabase
      .from('milestone_instances')
      .update({
        status: 'completed',
        actual_end_date: now,
      })
      .eq('id', milestoneInstanceId)

    // Find and activate next milestone
    const { data: nextMilestone } = await supabase
      .from('milestone_instances')
      .select('id, planned_start_date, planned_end_date')
      .eq('workflow_instance_id', milestone.workflow_instance_id)
      .gt('sequence', milestone.sequence)
      .eq('status', 'not_started')
      .order('sequence', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextMilestone) {
      await supabase
        .from('milestone_instances')
        .update({
          status: 'in_progress',
          actual_start_date: now,
        })
        .eq('id', nextMilestone.id)

      // Update workflow current milestone
      await supabase
        .from('workflow_instances')
        .update({
          current_milestone_id: nextMilestone.id,
          status: 'in_progress',
        })
        .eq('id', milestone.workflow_instance_id)

      // Recalculate downstream milestone dates if this one finished early/late
      await recalculateDownstreamDates(
        supabase,
        milestone.workflow_instance_id,
        milestone.sequence,
        now
      )
    } else {
      // No more milestones → workflow complete
      const { data: allMilestones } = await supabase
        .from('milestone_instances')
        .select('status')
        .eq('workflow_instance_id', milestone.workflow_instance_id)

      const allComplete = allMilestones?.every(
        (m) => m.status === 'completed' || m.status === 'skipped'
      )

      if (allComplete) {
        await supabase
          .from('workflow_instances')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            progress_pct: 100,
          })
          .eq('id', milestone.workflow_instance_id)
      }
    }

    // Recalculate overall progress
    const { data: allMs } = await supabase
      .from('milestone_instances')
      .select('status')
      .eq('workflow_instance_id', milestone.workflow_instance_id)

    if (allMs) {
      const total = allMs.length
      const completed = allMs.filter(
        (m) => m.status === 'completed' || m.status === 'skipped'
      ).length
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0

      await supabase
        .from('workflow_instances')
        .update({ progress_pct: pct })
        .eq('id', milestone.workflow_instance_id)
    }
  } catch (err) {
    console.error('Milestone auto-advance error:', err)
  }
}

// ---------------------------------------------------------------------------
// Helper: recalculate downstream milestone planned dates
// ---------------------------------------------------------------------------

async function recalculateDownstreamDates(
  supabase: ReturnType<typeof createClient>,
  workflowInstanceId: string,
  completedSequence: number,
  completionDate: string
) {
  try {
    const { data: downstream } = await supabase
      .from('milestone_instances')
      .select('id, sequence, planned_start_date, planned_end_date')
      .eq('workflow_instance_id', workflowInstanceId)
      .gt('sequence', completedSequence)
      .in('status', ['not_started'])
      .order('sequence', { ascending: true })

    if (!downstream || downstream.length === 0) return

    let currentDate = new Date(completionDate)

    for (const ms of downstream) {
      // Calculate duration from original planned dates
      let duration = 7 // default
      if (ms.planned_start_date && ms.planned_end_date) {
        const start = new Date(ms.planned_start_date)
        const end = new Date(ms.planned_end_date)
        duration = Math.max(
          1,
          Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
        )
      }

      const newStart = new Date(currentDate)
      const newEnd = new Date(currentDate)
      newEnd.setDate(newEnd.getDate() + duration)

      await supabase
        .from('milestone_instances')
        .update({
          planned_start_date: newStart.toISOString().slice(0, 10),
          planned_end_date: newEnd.toISOString().slice(0, 10),
        })
        .eq('id', ms.id)

      // Also recalculate task due dates within this milestone
      const { data: tasks } = await supabase
        .from('task_instances')
        .select('id, due_date')
        .eq('milestone_instance_id', ms.id)
        .not('status', 'in', '("completed","skipped")')

      if (tasks) {
        for (const task of tasks) {
          if (task.due_date) {
            // Shift the due date by the same offset
            const origDue = new Date(task.due_date)
            const origStart = ms.planned_start_date
              ? new Date(ms.planned_start_date)
              : origDue
            const dayOffset = Math.max(
              0,
              Math.round(
                (origDue.getTime() - origStart.getTime()) /
                  (24 * 60 * 60 * 1000)
              )
            )
            const newDue = new Date(newStart)
            newDue.setDate(newDue.getDate() + dayOffset)

            await supabase
              .from('task_instances')
              .update({ due_date: newDue.toISOString().slice(0, 10) })
              .eq('id', task.id)
          }
        }
      }

      currentDate = newEnd
    }
  } catch (err) {
    console.error('Recalculate downstream dates error:', err)
  }
}

// ---------------------------------------------------------------------------
// Helper: assign tasks based on role → user mapping
// ---------------------------------------------------------------------------

async function assignTasksByRole(
  supabase: ReturnType<typeof createClient>,
  workflowInstanceId: string,
  roleUserMapping: Record<string, string>
) {
  try {
    // Get all task instances for this workflow that have a template
    const { data: milestones } = await supabase
      .from('milestone_instances')
      .select('id')
      .eq('workflow_instance_id', workflowInstanceId)

    if (!milestones) return

    const milestoneIds = milestones.map((m) => m.id)

    const { data: tasks } = await supabase
      .from('task_instances')
      .select('id, task_template_id')
      .in('milestone_instance_id', milestoneIds)

    if (!tasks) return

    // Fetch templates to get default_assignee_role
    const templateIds = tasks
      .map((t) => t.task_template_id)
      .filter((id): id is string => id != null)

    if (templateIds.length === 0) return

    const { data: templates } = await supabase
      .from('task_templates')
      .select('id, default_assignee_role')
      .in('id', templateIds)

    if (!templates) return

    const templateRoles = new Map(
      templates.map((t) => [t.id, t.default_assignee_role])
    )

    // Assign each task based on its template's role
    for (const task of tasks) {
      if (!task.task_template_id) continue
      const role = templateRoles.get(task.task_template_id)
      if (!role) continue
      const userId = roleUserMapping[role]
      if (!userId) continue

      await supabase
        .from('task_instances')
        .update({ assigned_to: userId })
        .eq('id', task.id)
    }
  } catch (err) {
    console.error('Assign tasks by role error:', err)
  }
}
