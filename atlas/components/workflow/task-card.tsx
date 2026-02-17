"use client"

import { useState } from "react"
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
  SkipForward,
  Loader2,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OrgProfile } from "@/lib/hooks/use-workflow"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TaskInstance {
  id: string
  milestone_instance_id: string
  task_template_id: string | null
  task_list_name: string | null
  name: string
  description: string | null
  sequence: number
  assigned_to: string | null
  assigned_user?: {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
  status: "not_started" | "in_progress" | "completed" | "skipped" | "blocked"
  due_date: string | null
  completed_at: string | null
  notes: string | null
  priority?: "low" | "medium" | "high" | "urgent"
}

// ---------------------------------------------------------------------------
// Priority configuration
// ---------------------------------------------------------------------------
const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200",
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  },
}

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_started: {
    label: "Not Started",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  },
  completed: {
    label: "Complete",
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
  },
  skipped: {
    label: "Skipped",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200",
  },
  blocked: {
    label: "Blocked",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  },
}

// ---------------------------------------------------------------------------
// Status cycle: not_started -> in_progress -> completed
// ---------------------------------------------------------------------------
function getNextStatus(
  current: TaskInstance["status"]
): TaskInstance["status"] {
  switch (current) {
    case "not_started":
      return "in_progress"
    case "in_progress":
      return "completed"
    case "completed":
      return "not_started"
    default:
      return current
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface TaskCardProps {
  task: TaskInstance
  onStatusChange?: (taskId: string, newStatus: TaskInstance["status"]) => void
  onSkip?: (taskId: string, reason: string) => void
  onAssign?: (taskId: string, userId: string | null) => void
  orgProfiles?: OrgProfile[]
  isUpdating?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TaskCard({
  task,
  onStatusChange,
  onSkip,
  onAssign,
  orgProfiles,
  isUpdating,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showSkipInput, setShowSkipInput] = useState(false)
  const [skipReason, setSkipReason] = useState("")

  const isOverdue =
    task.due_date &&
    task.status !== "completed" &&
    task.status !== "skipped" &&
    new Date(task.due_date) < new Date()

  const assigneeName = task.assigned_user
    ? [task.assigned_user.first_name, task.assigned_user.last_name]
        .filter(Boolean)
        .join(" ")
    : null

  const assigneeInitials = task.assigned_user
    ? [task.assigned_user.first_name?.[0], task.assigned_user.last_name?.[0]]
        .filter(Boolean)
        .join("")
    : null

  function handleCheckboxChange() {
    if (onStatusChange && !isUpdating) {
      const nextStatus = getNextStatus(task.status)
      onStatusChange(task.id, nextStatus)
    }
  }

  function handleSkipSubmit() {
    if (onSkip && skipReason.trim()) {
      onSkip(task.id, skipReason.trim())
      setShowSkipInput(false)
      setSkipReason("")
    }
  }

  function handleAssignChange(userId: string) {
    if (onAssign) {
      onAssign(task.id, userId === "_unassign" ? null : userId)
    }
  }

  return (
    <div
      className={cn(
        "group rounded-lg border border-border p-3 transition-colors hover:bg-muted/30",
        task.status === "completed" && "opacity-60",
        task.status === "skipped" && "opacity-50",
        isOverdue && "border-red-300 dark:border-red-800"
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="mt-0.5">
          {isUpdating ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Checkbox
              checked={task.status === "completed"}
              onCheckedChange={handleCheckboxChange}
              disabled={
                task.status === "blocked" || task.status === "skipped" || isUpdating
              }
              className="h-5 w-5"
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-medium",
                task.status === "completed" && "line-through text-muted-foreground",
                task.status === "skipped" && "line-through text-muted-foreground"
              )}
            >
              {task.name}
            </span>

            {/* Priority badge */}
            {task.priority && task.priority !== "medium" && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  PRIORITY_CONFIG[task.priority]?.className
                )}
              >
                {PRIORITY_CONFIG[task.priority]?.label}
              </Badge>
            )}

            {/* Status badge */}
            {task.status !== "not_started" && task.status !== "completed" && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  STATUS_CONFIG[task.status]?.className
                )}
              >
                {STATUS_CONFIG[task.status]?.label}
              </Badge>
            )}

            {/* Overdue badge */}
            {isOverdue && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
              >
                Overdue
              </Badge>
            )}
          </div>

          {/* Meta row */}
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            {/* Assignee dropdown or display */}
            {onAssign && orgProfiles && orgProfiles.length > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                    {assigneeName ? (
                      <>
                        <Avatar className="h-4 w-4">
                          <AvatarImage
                            src={task.assigned_user?.avatar_url || undefined}
                          />
                          <AvatarFallback className="text-[8px]">
                            {assigneeInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span>{assigneeName}</span>
                      </>
                    ) : (
                      <>
                        <User className="h-3.5 w-3.5" />
                        <span>Assign</span>
                      </>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="start">
                  <Select
                    value={task.assigned_to ?? "_unassign"}
                    onValueChange={handleAssignChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_unassign">Unassigned</SelectItem>
                      {orgProfiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {[p.first_name, p.last_name].filter(Boolean).join(" ") ||
                            p.email ||
                            "Unknown"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </PopoverContent>
              </Popover>
            ) : assigneeName ? (
              <span className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage
                    src={task.assigned_user?.avatar_url || undefined}
                  />
                  <AvatarFallback className="text-[8px]">
                    {assigneeInitials}
                  </AvatarFallback>
                </Avatar>
                <span>{assigneeName}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>Unassigned</span>
              </span>
            )}

            {/* Due date */}
            {task.due_date && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-600 dark:text-red-400 font-medium"
                )}
              >
                <Clock className="h-3 w-3" />
                {isOverdue ? "Overdue: " : "Due: "}
                {formatDate(task.due_date, { short: true })}
              </span>
            )}

            {/* Skip button */}
            {onSkip &&
              task.status !== "completed" &&
              task.status !== "skipped" && (
                <button
                  onClick={() => setShowSkipInput(true)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors text-muted-foreground"
                >
                  <SkipForward className="h-3 w-3" />
                  <span>Skip</span>
                </button>
              )}
          </div>
        </div>

        {/* Expand toggle */}
        {(task.description || task.notes) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Skip reason input */}
      {showSkipInput && (
        <div className="mt-3 ml-8 space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            Reason for skipping (required)
          </p>
          <Textarea
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            placeholder="Why is this task being skipped?"
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowSkipInput(false)
                setSkipReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSkipSubmit}
              disabled={!skipReason.trim()}
              className="bg-yellow-600 text-white hover:bg-yellow-700"
            >
              <SkipForward className="mr-1 h-3.5 w-3.5" />
              Skip Task
            </Button>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && !showSkipInput && (task.description || task.notes) && (
        <div className="mt-3 ml-8 space-y-2 border-t border-border pt-3">
          {task.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Description
              </p>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}
          {task.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Notes
              </p>
              <p className="text-sm whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
