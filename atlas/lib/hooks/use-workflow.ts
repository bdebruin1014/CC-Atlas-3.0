import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  record_type: string
  milestones: WorkflowMilestoneTemplate[]
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
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  started_at: string
  completed_at: string | null
  current_milestone_id: string | null
  progress_percentage: number
  milestone_instances: MilestoneInstance[]
  created_at: string
  updated_at: string
}

export interface MilestoneInstance {
  id: string
  workflow_instance_id: string
  milestone_template_id: string
  name: string
  description: string | null
  order: number
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped'
  planned_start_date: string | null
  planned_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  task_instances: TaskInstance[]
  created_at: string
  updated_at: string
}

export interface TaskInstance {
  id: string
  milestone_instance_id: string
  task_template_id: string | null
  name: string
  description: string | null
  order: number
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'blocked'
  is_required: boolean
  assigned_to: string | null
  assigned_to_name: string | null
  due_date: string | null
  actual_start_date: string | null
  actual_completion_date: string | null
  notes: string | null
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
}

export interface InstantiateWorkflowData {
  workflowTemplateId: string
  recordType: string
  recordId: string
  startDate?: string
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  all: ['workflow'] as const,
  instances: () => [...keys.all, 'instance'] as const,
  instance: (recordType: string, recordId: string) =>
    [...keys.instances(), recordType, recordId] as const,
  tasks: (milestoneInstanceId: string) =>
    [...keys.all, 'tasks', milestoneInstanceId] as const,
  templates: () => [...keys.all, 'templates'] as const,
  template: (id: string) => [...keys.templates(), id] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

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
              *
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

      // Sort milestone instances by order
      if (data.milestone_instances) {
        data.milestone_instances.sort(
          (a: MilestoneInstance, b: MilestoneInstance) => a.order - b.order
        )
        // Sort task instances within each milestone
        for (const milestone of data.milestone_instances) {
          if (milestone.task_instances) {
            milestone.task_instances.sort(
              (a: TaskInstance, b: TaskInstance) => a.order - b.order
            )
          }
        }
      }

      return data as WorkflowInstance
    },
    enabled: !!recordType && !!recordId,
  })
}

export function useTaskInstances(milestoneInstanceId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.tasks(milestoneInstanceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_instances')
        .select('*')
        .eq('milestone_instance_id', milestoneInstanceId)
        .order('order', { ascending: true })

      if (error) throw error
      return (data ?? []) as TaskInstance[]
    },
    enabled: !!milestoneInstanceId,
  })
}

export function useUpdateTaskStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, notes, assigned_to, due_date }: UpdateTaskStatusData) => {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (notes !== undefined) updateData.notes = notes
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to
      if (due_date !== undefined) updateData.due_date = due_date

      // Auto-set dates based on status
      if (status === 'in_progress') {
        updateData.actual_start_date = new Date().toISOString()
      }
      if (status === 'completed') {
        updateData.actual_completion_date = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('task_instances')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Recalculate milestone progress
      const milestoneInstanceId = data.milestone_instance_id

      const { data: allTasks } = await supabase
        .from('task_instances')
        .select('status, is_required')
        .eq('milestone_instance_id', milestoneInstanceId)

      if (allTasks) {
        const requiredTasks = allTasks.filter((t) => t.is_required)
        const allRequiredCompleted = requiredTasks.every(
          (t) => t.status === 'completed' || t.status === 'skipped'
        )
        const anyStarted = allTasks.some(
          (t) => t.status === 'in_progress' || t.status === 'completed'
        )

        let milestoneStatus: string = 'not_started'
        if (allRequiredCompleted && requiredTasks.length > 0) {
          milestoneStatus = 'completed'
        } else if (anyStarted) {
          milestoneStatus = 'in_progress'
        }

        const milestoneUpdate: Record<string, unknown> = {
          status: milestoneStatus,
          updated_at: new Date().toISOString(),
        }

        if (milestoneStatus === 'in_progress') {
          // Only set start date if not already set
          const { data: milestoneData } = await supabase
            .from('milestone_instances')
            .select('actual_start_date')
            .eq('id', milestoneInstanceId)
            .single()

          if (milestoneData && !milestoneData.actual_start_date) {
            milestoneUpdate.actual_start_date = new Date().toISOString()
          }
        }
        if (milestoneStatus === 'completed') {
          milestoneUpdate.actual_end_date = new Date().toISOString()
        }

        await supabase
          .from('milestone_instances')
          .update(milestoneUpdate)
          .eq('id', milestoneInstanceId)
      }

      return data as TaskInstance
    },
    onSuccess: () => {
      // Broadly invalidate workflow queries since progress may have changed
      queryClient.invalidateQueries({ queryKey: keys.all })
    },
    onError: (error) => {
      console.error('Failed to update task status:', error)
    },
  })
}

export function useInstantiateWorkflow() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workflowTemplateId,
      recordType,
      recordId,
      startDate,
    }: InstantiateWorkflowData) => {
      // 1. Fetch the workflow template with milestones and tasks
      const { data: template, error: templateError } = await supabase
        .from('workflow_templates')
        .select(
          `
          *,
          milestones:workflow_milestone_templates (
            *,
            tasks:workflow_task_templates (
              *
            )
          )
        `
        )
        .eq('id', workflowTemplateId)
        .single()

      if (templateError) throw templateError
      if (!template) throw new Error('Workflow template not found')

      // 2. Create the workflow instance
      const { data: instance, error: instanceError } = await supabase
        .from('workflow_instances')
        .insert({
          workflow_template_id: workflowTemplateId,
          record_type: recordType,
          record_id: recordId,
          status: 'active',
          started_at: startDate ?? new Date().toISOString(),
          progress_percentage: 0,
        })
        .select()
        .single()

      if (instanceError) throw instanceError

      // 3. Create milestone instances
      const milestones = (template.milestones ?? []).sort(
        (a: WorkflowMilestoneTemplate, b: WorkflowMilestoneTemplate) => a.order - b.order
      )

      let currentDate = new Date(startDate ?? new Date().toISOString())

      for (const milestone of milestones) {
        const plannedStart = currentDate.toISOString()
        const durationDays = milestone.default_duration_days ?? 7
        const plannedEnd = new Date(
          currentDate.getTime() + durationDays * 24 * 60 * 60 * 1000
        ).toISOString()

        const { data: milestoneInstance, error: milestoneError } = await supabase
          .from('milestone_instances')
          .insert({
            workflow_instance_id: instance.id,
            milestone_template_id: milestone.id,
            name: milestone.name,
            description: milestone.description,
            order: milestone.order,
            status: 'not_started',
            planned_start_date: plannedStart,
            planned_end_date: plannedEnd,
          })
          .select()
          .single()

        if (milestoneError) throw milestoneError

        // 4. Create task instances for this milestone
        const tasks = (milestone.tasks ?? []).sort(
          (a: WorkflowTaskTemplate, b: WorkflowTaskTemplate) => a.order - b.order
        )

        for (const task of tasks) {
          await supabase.from('task_instances').insert({
            milestone_instance_id: milestoneInstance.id,
            task_template_id: task.id,
            name: task.name,
            description: task.description,
            order: task.order,
            status: 'not_started',
            is_required: task.is_required,
            dependencies: task.dependencies ?? [],
          })
        }

        // Move to next milestone date
        currentDate = new Date(plannedEnd)
      }

      // 5. Set the current milestone to the first one
      const { data: firstMilestone } = await supabase
        .from('milestone_instances')
        .select('id')
        .eq('workflow_instance_id', instance.id)
        .order('order', { ascending: true })
        .limit(1)
        .single()

      if (firstMilestone) {
        await supabase
          .from('workflow_instances')
          .update({ current_milestone_id: firstMilestone.id })
          .eq('id', instance.id)
      }

      // 6. Log activity
      await supabase.from('activity_log').insert({
        record_type: recordType,
        record_id: recordId,
        action: 'created',
        description: `Workflow "${template.name}" started`,
        metadata: {
          workflow_instance_id: instance.id,
          workflow_template_id: workflowTemplateId,
        },
      })

      return instance as WorkflowInstance
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
