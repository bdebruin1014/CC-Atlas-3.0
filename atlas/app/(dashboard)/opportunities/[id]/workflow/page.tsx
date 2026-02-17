'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import {
  useWorkflowInstance,
  useUpdateTaskStatus,
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
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | undefined | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

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
// Task Status Cycle
// ---------------------------------------------------------------------------

function nextStatus(current: string): TaskInstance['status'] {
  if (current === 'not_started') return 'in_progress'
  if (current === 'in_progress') return 'completed'
  return 'not_started'
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
    async (task: TaskInstance) => {
      const newStatus = nextStatus(task.status)
      try {
        await updateTaskMutation.mutateAsync({
          id: task.id,
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

  // ---- Milestone progress ----
  const milestones = workflowInstance?.milestone_instances ?? []
  const completedCount = milestones.filter(
    (m) => m.status === 'completed'
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workflow</h1>
        <p className="text-sm text-muted-foreground">
          Track milestones and tasks for this opportunity.
          {workflowInstance.progress_percentage != null && (
            <span className="ml-2 font-medium">
              Overall progress: {Math.round(workflowInstance.progress_percentage)}%
            </span>
          )}
        </p>
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
          const totalTasks = tasks.length
          const completedTasks = tasks.filter(
            (t) => t.status === 'completed'
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
                        {completedTasks} / {totalTasks} tasks complete
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
                    <div className="rounded-lg border border-border divide-y divide-border">
                      {tasks.map((task) => {
                        const taskStatus = getStatusConfig(task.status)
                        const TaskIcon = taskStatus.icon
                        const isUpdating =
                          updateTaskMutation.isPending &&
                          updateTaskMutation.variables?.id === task.id

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              'flex items-center gap-3 px-4 py-2.5',
                              task.is_required && 'border-l-2 border-l-primary'
                            )}
                          >
                            {/* Status toggle */}
                            <button
                              className="flex-shrink-0"
                              onClick={() => handleTaskStatusChange(task)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <TaskIcon
                                  className={cn(
                                    'h-4 w-4',
                                    taskStatus.color
                                  )}
                                />
                              )}
                            </button>

                            {/* Task info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p
                                  className={cn(
                                    'text-sm',
                                    task.status === 'completed' &&
                                      'line-through text-muted-foreground'
                                  )}
                                >
                                  {task.name}
                                </p>
                                {task.is_required && (
                                  <span className="text-[10px] text-primary font-medium">
                                    Required
                                  </span>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {task.due_date && (
                                <span
                                  className={cn(
                                    'text-xs',
                                    new Date(task.due_date) < new Date() &&
                                      task.status !== 'completed'
                                      ? 'text-destructive font-medium'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {formatDate(task.due_date, {
                                    short: true,
                                  })}
                                </span>
                              )}

                              {task.assigned_to_name && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {task.assigned_to_name}
                                </Badge>
                              )}
                            </div>
                          </div>
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
