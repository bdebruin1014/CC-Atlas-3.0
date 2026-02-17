"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  SkipForward,
  ChevronDown,
  ChevronRight,
  ClipboardList,
} from "lucide-react"
import { cn, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useProject,
  useProjectWorkflow,
  type ProjectMilestone,
  type ProjectTask,
} from "@/lib/hooks/use-projects"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTaskStatusIcon(status: ProjectTask["status"]) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case "in_progress":
      return <Clock className="h-4 w-4 text-blue-600" />
    case "skipped":
      return <SkipForward className="h-4 w-4 text-muted-foreground" />
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />
  }
}

function getMilestoneStatusColor(status: ProjectMilestone["status"]): string {
  const colors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    skipped: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  }
  return colors[status] ?? ""
}

function getStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function WorkflowSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-4 w-full max-w-md rounded-full" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProjectWorkflowPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId)
  const {
    milestones,
    loading: workflowLoading,
    error: workflowError,
    refetch,
    updateTaskStatus,
    updateMilestoneStatus,
  } = useProjectWorkflow(projectId)

  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())

  const loading = projectLoading || workflowLoading
  const error = projectError?.message || workflowError

  if (loading) return <WorkflowSkeleton />

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold">
          {!project ? "Project not found" : "Failed to load workflow"}
        </h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/projects")}>
            Back to Projects
          </Button>
          {workflowError && (
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Calculate overall progress
  const totalTasks = milestones.reduce(
    (sum, m) => sum + (m.tasks?.length ?? 0),
    0
  )
  const completedTasks = milestones.reduce(
    (sum, m) =>
      sum + (m.tasks?.filter((t) => t.status === "completed").length ?? 0),
    0
  )
  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const completedMilestones = milestones.filter(
    (m) => m.status === "completed"
  ).length
  const milestoneProgress =
    milestones.length > 0
      ? (completedMilestones / milestones.length) * 100
      : 0

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleTaskToggle = async (task: ProjectTask) => {
    const newStatus = task.status === "completed" ? "pending" : "completed"
    try {
      await updateTaskStatus(task.id, newStatus)
    } catch {
      // handled by mutation
    }
  }

  const handleMilestoneStatusChange = async (
    milestoneId: string,
    status: ProjectMilestone["status"]
  ) => {
    try {
      await updateMilestoneStatus(milestoneId, status)
    } catch {
      // handled by mutation
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}`)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Project
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Workflow</h1>
          <p className="text-sm text-muted-foreground">
            {project.project_number} &mdash; {project.name}
          </p>
        </div>
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Milestone Progress</span>
                <span className="font-medium">
                  {completedMilestones} / {milestones.length} ({formatPercent(milestoneProgress, 0)})
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${milestoneProgress}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Task Progress</span>
                <span className="font-medium">
                  {completedTasks} / {totalTasks} ({formatPercent(overallProgress, 0)})
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      {milestones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">No workflow configured</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Milestones and tasks will appear here once the project workflow is set up.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone) => {
            const isExpanded = expandedMilestones.has(milestone.id)
            const tasks = milestone.tasks ?? []
            const completedCount = tasks.filter(
              (t) => t.status === "completed"
            ).length
            const taskPct =
              tasks.length > 0
                ? (completedCount / tasks.length) * 100
                : 0

            return (
              <Card key={milestone.id}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleMilestone(milestone.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {milestone.name}
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              getMilestoneStatusColor(milestone.status)
                            )}
                          >
                            {getStatusLabel(milestone.status)}
                          </Badge>
                        </CardTitle>
                        {milestone.description && (
                          <CardDescription className="mt-0.5">
                            {milestone.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {tasks.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{ width: `${taskPct}%` }}
                            />
                          </div>
                          <span>
                            {completedCount}/{tasks.length}
                          </span>
                        </div>
                      )}

                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={milestone.status}
                          onValueChange={(val) =>
                            handleMilestoneStatusChange(
                              milestone.id,
                              val as ProjectMilestone["status"]
                            )
                          }
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="skipped">Skipped</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {milestone.due_date && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Due {formatDate(milestone.due_date, { short: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && tasks.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="space-y-1 border-t border-border pt-4">
                      {tasks
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50",
                              task.status === "completed" && "opacity-60"
                            )}
                          >
                            <Checkbox
                              checked={task.status === "completed"}
                              onCheckedChange={() => handleTaskToggle(task)}
                            />
                            <div className="flex-1 min-w-0">
                              <div
                                className={cn(
                                  "text-sm",
                                  task.status === "completed" && "line-through"
                                )}
                              >
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {task.description}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {task.assigned_to && (
                                <span className="text-xs text-muted-foreground">
                                  {task.assigned_to}
                                </span>
                              )}
                              {task.due_date && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDate(task.due_date, { short: true })}
                                </span>
                              )}
                              {getTaskStatusIcon(task.status)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                )}

                {isExpanded && tasks.length === 0 && (
                  <CardContent className="pt-0">
                    <div className="border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No tasks for this milestone.
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
