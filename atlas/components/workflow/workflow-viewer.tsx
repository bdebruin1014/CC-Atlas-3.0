"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  SkipForward,
  Loader2,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils/format"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import {
  MilestoneProgress,
  type MilestoneProgressItem,
} from "@/components/workflow/milestone-progress"
import { TaskList } from "@/components/workflow/task-list"
import type { TaskInstance } from "@/components/workflow/task-card"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MilestoneInstance {
  id: string
  workflow_instance_id: string
  milestone_template_id: string | null
  name: string
  sequence: number
  status: "not_started" | "in_progress" | "completed" | "skipped" | "blocked"
  planned_start_date: string | null
  planned_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  notes: string | null
  tasks: TaskInstance[]
}

interface WorkflowInstance {
  id: string
  workflow_template_id: string
  record_type: string | null
  record_id: string | null
  name: string
  status: string
  started_at: string | null
  completed_at: string | null
  current_milestone_id: string | null
  progress_pct: number
  milestones: MilestoneInstance[]
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface WorkflowViewerProps {
  recordType: string
  recordId: string
  className?: string
}

// ---------------------------------------------------------------------------
// Milestone status icon
// ---------------------------------------------------------------------------
function MilestoneStatusIcon({
  status,
}: {
  status: MilestoneInstance["status"]
}) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />
    case "in_progress":
      return <Clock className="h-5 w-5 text-blue-600" />
    case "blocked":
      return <AlertTriangle className="h-5 w-5 text-red-500" />
    case "skipped":
      return <SkipForward className="h-5 w-5 text-yellow-500" />
    default:
      return <Circle className="h-5 w-5 text-gray-400" />
  }
}

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
  skipped: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function WorkflowViewer({
  recordType,
  recordId,
  className,
}: WorkflowViewerProps) {
  const supabase = createClient()
  const { toast } = useToast()

  const [workflow, setWorkflow] = useState<WorkflowInstance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(
    new Set()
  )

  // Fetch workflow
  const fetchWorkflow = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch workflow instance for this record
      const { data: instances, error: wiError } = await supabase
        .from("workflow_instances")
        .select("*")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (wiError) throw wiError

      if (!instances || instances.length === 0) {
        setWorkflow(null)
        setLoading(false)
        return
      }

      const wi = instances[0]

      // Fetch milestones
      const { data: milestones, error: mError } = await supabase
        .from("milestone_instances")
        .select("*")
        .eq("workflow_instance_id", wi.id)
        .order("sequence", { ascending: true })

      if (mError) throw mError

      // Fetch tasks for all milestones
      const milestoneIds = (milestones || []).map((m: Record<string, unknown>) => m.id as string)

      let tasks: Record<string, unknown>[] = []
      if (milestoneIds.length > 0) {
        const { data: taskData, error: tError } = await supabase
          .from("task_instances")
          .select(
            `
            *,
            assigned_user:profiles!task_instances_assigned_to_fkey(
              id, first_name, last_name, avatar_url
            )
          `
          )
          .in("milestone_instance_id", milestoneIds)
          .order("sequence", { ascending: true })

        if (tError) throw tError
        tasks = taskData || []
      }

      // Group tasks by milestone
      const tasksByMilestone: Record<string, TaskInstance[]> = {}
      for (const t of tasks) {
        const mid = t.milestone_instance_id as string
        if (!tasksByMilestone[mid]) tasksByMilestone[mid] = []
        tasksByMilestone[mid].push({
          id: t.id as string,
          milestone_instance_id: mid,
          task_template_id: t.task_template_id as string | null,
          task_list_name: t.task_list_name as string | null,
          name: t.name as string,
          description: t.description as string | null,
          sequence: t.sequence as number,
          assigned_to: t.assigned_to as string | null,
          assigned_user: t.assigned_user as TaskInstance["assigned_user"],
          status: t.status as TaskInstance["status"],
          due_date: t.due_date as string | null,
          completed_at: t.completed_at as string | null,
          notes: t.notes as string | null,
        })
      }

      // Assemble the complete workflow
      const milestonesWithTasks: MilestoneInstance[] = (milestones || []).map(
        (m: Record<string, unknown>) => ({
          id: m.id as string,
          workflow_instance_id: m.workflow_instance_id as string,
          milestone_template_id: m.milestone_template_id as string | null,
          name: m.name as string,
          sequence: m.sequence as number,
          status: m.status as MilestoneInstance["status"],
          planned_start_date: m.planned_start_date as string | null,
          planned_end_date: m.planned_end_date as string | null,
          actual_start_date: m.actual_start_date as string | null,
          actual_end_date: m.actual_end_date as string | null,
          notes: m.notes as string | null,
          tasks: tasksByMilestone[m.id as string] || [],
        })
      )

      const fullWorkflow: WorkflowInstance = {
        id: wi.id,
        workflow_template_id: wi.workflow_template_id,
        record_type: wi.record_type,
        record_id: wi.record_id,
        name: wi.name,
        status: wi.status,
        started_at: wi.started_at,
        completed_at: wi.completed_at,
        current_milestone_id: wi.current_milestone_id,
        progress_pct: wi.progress_pct,
        milestones: milestonesWithTasks,
      }

      setWorkflow(fullWorkflow)

      // Auto-expand the current/active milestone
      const activeMilestone = milestonesWithTasks.find(
        (m) =>
          m.id === wi.current_milestone_id || m.status === "in_progress"
      )
      if (activeMilestone) {
        setExpandedMilestones(new Set([activeMilestone.id]))
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load workflow"
      setError(message)
      console.error("Workflow fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase, recordType, recordId])

  useEffect(() => {
    fetchWorkflow()
  }, [fetchWorkflow])

  // Toggle milestone expand/collapse
  function toggleMilestone(milestoneId: string) {
    setExpandedMilestones((prev) => {
      const next = new Set(prev)
      if (next.has(milestoneId)) {
        next.delete(milestoneId)
      } else {
        next.add(milestoneId)
      }
      return next
    })
  }

  // Task status change handler
  async function handleTaskStatusChange(
    taskId: string,
    newStatus: TaskInstance["status"]
  ) {
    try {
      const updates: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === "completed") {
        updates.completed_at = new Date().toISOString()
      } else {
        updates.completed_at = null
      }

      const { error } = await supabase
        .from("task_instances")
        .update(updates)
        .eq("id", taskId)

      if (error) throw error

      toast({
        title: "Task updated",
        description: `Task marked as ${newStatus.replace("_", " ")}.`,
      })

      // Refresh workflow data
      fetchWorkflow()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update task"
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    }
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // ---- Error state ----
  if (error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={fetchWorkflow}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  // ---- No workflow ----
  if (!workflow) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Circle className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No workflow assigned</p>
          <p className="text-xs mt-1">
            A workflow has not been instantiated for this record yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  // ---- Build progress items ----
  const progressItems: MilestoneProgressItem[] = workflow.milestones.map(
    (m) => ({
      id: m.id,
      name: m.name,
      sequence: m.sequence,
      status: m.status,
    })
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Workflow header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{workflow.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            Status: {workflow.status.replace("_", " ")}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            workflow.status === "completed"
              ? "bg-green-100 text-green-700"
              : workflow.status === "in_progress"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600"
          )}
        >
          {Math.round(workflow.progress_pct)}% complete
        </Badge>
      </div>

      {/* Progress bar */}
      <MilestoneProgress
        milestones={progressItems}
        currentMilestoneId={workflow.current_milestone_id}
        onMilestoneClick={toggleMilestone}
      />

      {/* Milestone list */}
      <div className="space-y-3">
        {workflow.milestones.map((milestone) => {
          const isExpanded = expandedMilestones.has(milestone.id)
          const isCurrent = milestone.id === workflow.current_milestone_id
          const taskCount = milestone.tasks.length
          const completedTasks = milestone.tasks.filter(
            (t) => t.status === "completed"
          ).length

          return (
            <Card
              key={milestone.id}
              className={cn(
                "transition-all",
                isCurrent && "ring-2 ring-blue-500/50",
                milestone.status === "completed" && "opacity-75"
              )}
            >
              {/* Milestone header */}
              <button
                onClick={() => toggleMilestone(milestone.id)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors rounded-t-lg"
              >
                {/* Expand icon */}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}

                {/* Status icon */}
                <MilestoneStatusIcon status={milestone.status} />

                {/* Name and meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {milestone.sequence}. {milestone.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        MILESTONE_STATUS_COLORS[milestone.status]
                      )}
                    >
                      {milestone.status.replace("_", " ")}
                    </Badge>
                    {isCurrent && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                      >
                        Current
                      </Badge>
                    )}
                  </div>

                  {/* Date range */}
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    {milestone.planned_start_date && (
                      <span>
                        Planned: {formatDate(milestone.planned_start_date, { short: true })}
                        {milestone.planned_end_date &&
                          ` - ${formatDate(milestone.planned_end_date, { short: true })}`}
                      </span>
                    )}
                    {milestone.actual_start_date && (
                      <span>
                        Actual: {formatDate(milestone.actual_start_date, { short: true })}
                        {milestone.actual_end_date &&
                          ` - ${formatDate(milestone.actual_end_date, { short: true })}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Task count */}
                {taskCount > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {completedTasks}/{taskCount} tasks
                  </span>
                )}
              </button>

              {/* Expanded task list */}
              {isExpanded && (
                <CardContent className="border-t border-border pt-4">
                  {milestone.notes && (
                    <div className="mb-4 rounded-md bg-muted/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Milestone Notes
                      </p>
                      <p className="text-sm">{milestone.notes}</p>
                    </div>
                  )}

                  <TaskList
                    milestoneInstanceId={milestone.id}
                    tasks={milestone.tasks}
                    onStatusChange={handleTaskStatusChange}
                  />
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
