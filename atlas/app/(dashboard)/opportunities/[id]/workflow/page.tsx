'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate } from '@/lib/utils/format'
import {
  useWorkflowInstance,
  useUpdateTaskStatus,
  useAssignTask,
  useOrgProfiles,
  type MilestoneInstance,
  type TaskInstance,
} from '@/lib/hooks/use-workflow'
import { toast } from '@/lib/hooks/use-toast'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  Flag,
  Loader2,
  Ban,
  SkipForward,
  User,
} from 'lucide-react'
import { TaskCard } from '@/components/workflow/task-card'
import type { TaskInstance as TaskCardInstance } from '@/components/workflow/task-card'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    color: string
    bg: string
    icon: typeof Circle
  }
> = {
  not_started: {
    label: 'Not Started',
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    icon: Circle,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    icon: Clock,
  },
  completed: {
    label: 'Complete',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    icon: CheckCircle2,
  },
  skipped: {
    label: 'Skipped',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950',
    icon: Ban,
  },
  blocked: {
    label: 'Blocked',
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950',
    icon: AlertCircle,
  },
}

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      icon: Circle,
    }
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function WorkflowPage() {
  const params = useParams()
  const opportunityId = params.id as string

  const {
    data: workflowInstance,
    isLoading: loading,
    refetch,
  } = useWorkflowInstance('opportunity', opportunityId)

  const updateTaskMutation = useUpdateTaskStatus()
  const assignTaskMutation = useAssignTask()
  const { data: orgProfiles } = useOrgProfiles()

  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(
    new Set()
  )

  // Auto-expand current milestone when data loads
  useEffect(() => {
    if (workflowInstance?.milestone_instances) {
      const currentMilestone = workflowInstance.milestone_instances.find(
        (m) => m.status === 'in_progress'
      )
      if (currentMilestone) {
        setExpandedMilestones(new Set([currentMilestone.id]))
      }
    }
  }, [workflowInstance])

  // ---- Toggle milestone expand ----
  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ---- Update task status ----
  const handleTaskStatusChange = useCallback(
    async (taskId: string, newStatus: TaskInstance['status']) => {
      try {
        await updateTaskMutation.mutateAsync({
          id: taskId,
          status: newStatus,
        })
        toast({ title: 'Task Updated' })
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to update task status.',
          variant: 'destructive',
        })
      }
    },
    [updateTaskMutation]
  )

  // ---- Skip task ----
  const handleTaskSkip = useCallback(
    async (taskId: string, reason: string) => {
      try {
        await updateTaskMutation.mutateAsync({
          id: taskId,
          status: 'skipped',
          skip_reason: reason,
        })
        toast({ title: 'Task Skipped' })
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to skip task.',
          variant: 'destructive',
        })
      }
    },
    [updateTaskMutation]
  )

  // ---- Assign task ----
  const handleTaskAssign = useCallback(
    async (taskId: string, userId: string | null) => {
      try {
        await assignTaskMutation.mutateAsync({
          taskId,
          assignedTo: userId,
        })
        toast({ title: 'Task Assigned' })
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to assign task.',
          variant: 'destructive',
        })
      }
    },
    [assignTaskMutation]
  )

  // ---- Milestone progress ----
  const milestones = workflowInstance?.milestone_instances ?? []
  const completedCount = milestones.filter(
    (m) => m.status === 'completed'
  ).length

  // ---- Task progress ----
  const allTasks = milestones.flatMap((m) => m.task_instances ?? [])
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter(
    (t) => t.status === 'completed' || t.status === 'skipped'
  ).length
  const taskPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const overdueTasks = allTasks.filter(
    (t) =>
      t.due_date &&
      t.status !== 'completed' &&
      t.status !== 'skipped' &&
      new Date(t.due_date) < new Date()
  ).length

  // ---- Loading ----
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  // ---- Empty state ----
  if (!workflowInstance || milestones.length === 0) {
    return (
      <div className="space-y-6">
        <Link
          href={`/opportunities/${opportunityId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Opportunity
        </Link>

        <div className="flex flex-col items-center justify-center py-20">
          <Flag className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-lg font-medium">No Workflow</p>
          <p className="text-sm text-muted-foreground">
            No workflow has been set up for this opportunity yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/opportunities/${opportunityId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Opportunity
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflow</h1>
          <p className="text-sm text-muted-foreground">
            Track milestones and tasks for this opportunity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overdueTasks > 0 && (
            <Badge
              variant="secondary"
              className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
            >
              {overdueTasks} overdue
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {completedTasks}/{totalTasks} tasks ({taskPct}%)
          </Badge>
        </div>
      </div>

      {/* Milestone progress bar */}
      <div className="rounded-lg border border-border p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">
            Milestones ({completedCount} / {milestones.length})
          </p>
          <p className="text-xs text-muted-foreground">
            {milestones.length > 0
              ? `${Math.round((completedCount / milestones.length) * 100)}% complete`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {milestones.map((m) => {
            const isComplete = m.status === 'completed'
            const isCurrent = m.status === 'in_progress'

            return (
              <div key={m.id} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    'h-2.5 w-full rounded-full transition-all',
                    isComplete && 'bg-emerald-500',
                    isCurrent && 'bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-800',
                    !isComplete && !isCurrent && 'bg-muted'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] leading-tight text-center',
                    isCurrent && 'font-semibold text-foreground',
                    isComplete && 'text-emerald-600',
                    !isComplete && !isCurrent && 'text-muted-foreground/50'
                  )}
                >
                  {m.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Milestones list */}
      <div className="space-y-3">
        {milestones.map((milestone) => {
          const isExpanded = expandedMilestones.has(milestone.id)
          const statusCfg = getStatusConfig(milestone.status)
          const StatusIcon = statusCfg.icon
          const tasks = milestone.task_instances ?? []
          const mTotalTasks = tasks.length
          const mCompletedTasks = tasks.filter(
            (t) => t.status === 'completed' || t.status === 'skipped'
          ).length
          const mOverdueTasks = tasks.filter(
            (t) =>
              t.due_date &&
              t.status !== 'completed' &&
              t.status !== 'skipped' &&
              new Date(t.due_date) < new Date()
          ).length

          return (
            <Card key={milestone.id}>
              {/* Milestone header */}
              <CardHeader
                className={cn(
                  'cursor-pointer select-none pb-3',
                  milestone.status === 'completed' && 'opacity-75'
                )}
                onClick={() => toggleMilestone(milestone.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon
                      className={cn('h-5 w-5', statusCfg.color)}
                    />
                    <div>
                      <CardTitle className="text-base">
                        {milestone.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {mCompletedTasks} / {mTotalTasks} tasks complete
                        {mOverdueTasks > 0 && (
                          <span className="ml-1 text-red-600 font-medium">
                            ({mOverdueTasks} overdue)
                          </span>
                        )}
                        {milestone.planned_start_date && (
                          <>
                            {' '}
                            | Planned:{' '}
                            {formatDate(milestone.planned_start_date, { short: true })}
                            {milestone.planned_end_date
                              ? ` - ${formatDate(milestone.planned_end_date, { short: true })}`
                              : ''}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        statusCfg.color,
                        statusCfg.bg
                      )}
                    >
                      {statusCfg.label}
                    </Badge>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Expanded tasks */}
              {isExpanded && (
                <CardContent className="pt-0">
                  {tasks.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No tasks in this milestone.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => {
                        const isUpdating =
                          updateTaskMutation.isPending &&
                          updateTaskMutation.variables?.id === task.id

                        return (
                          <TaskCard
                            key={task.id}
                            task={task as unknown as TaskCardInstance}
                            onStatusChange={handleTaskStatusChange}
                            onSkip={handleTaskSkip}
                            onAssign={handleTaskAssign}
                            orgProfiles={orgProfiles ?? []}
                            isUpdating={isUpdating}
                          />
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
