"use client"

import React, { useState, useMemo } from "react"
import { format, isPast, startOfDay, isToday } from "date-fns"
import { Plus, ClipboardList, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils/format"
import {
  useRecordTasks,
  useCreateTask,
  useUpdateTask,
  type StandaloneTask,
  type CreateTaskInput,
} from "@/lib/hooks/use-tasks"
import {
  useWorkflowInstance,
  useOrgProfiles,
  type TaskInstance,
} from "@/lib/hooks/use-workflow"
import { toast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// ===========================================================================
// Types
// ===========================================================================

export interface RecordTasksPanelProps {
  recordType: string
  recordId: string
  recordName: string
  recordUrl: string
  workflowInstanceId?: string
}

type RecordModule =
  | "opportunity"
  | "project"
  | "construction"
  | "disposition"
  | "general"

const RECORD_TYPE_TO_MODULE: Record<string, RecordModule> = {
  opportunity: "opportunity",
  project: "project",
  job: "construction",
  unit: "construction",
  listing: "disposition",
  entity: "general",
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-400",
}

// ===========================================================================
// Helpers
// ===========================================================================
function getInitials(
  firstName?: string | null,
  lastName?: string | null
): string {
  return (
    [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() ||
    "?"
  )
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false
  if (status === "completed" || status === "cancelled" || status === "skipped")
    return false
  return (
    isPast(startOfDay(new Date(dueDate))) && !isToday(new Date(dueDate))
  )
}

// ===========================================================================
// Main Component
// ===========================================================================

export function RecordTasksPanel({
  recordType,
  recordId,
  recordName,
  recordUrl,
  workflowInstanceId,
}: RecordTasksPanelProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Fetch standalone tasks linked to this record
  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
  } = useRecordTasks(recordType, recordId)

  // Fetch workflow instance if provided
  const { data: workflowInstance } = useWorkflowInstance(
    workflowInstanceId ? recordType : "",
    workflowInstanceId ? recordId : ""
  )

  const { data: orgProfiles = [] } = useOrgProfiles()
  const updateTask = useUpdateTask()

  // Flatten workflow tasks from all milestones
  const workflowTasks = useMemo(() => {
    if (!workflowInstance?.milestone_instances) return []
    return workflowInstance.milestone_instances.flatMap(
      (mi) => mi.task_instances ?? []
    )
  }, [workflowInstance])

  // Count incomplete standalone tasks
  const incompleteCount = useMemo(() => {
    const standaloneIncomplete = tasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled"
    ).length
    const workflowIncomplete = workflowTasks.filter(
      (t) => t.status !== "completed" && t.status !== "skipped"
    ).length
    return standaloneIncomplete + workflowIncomplete
  }, [tasks, workflowTasks])

  const handleToggleComplete = (task: StandaloneTask) => {
    const newStatus =
      task.status === "completed" ? "not_started" : "completed"
    updateTask.mutate(
      { id: task.id, status: newStatus },
      {
        onError: (err) =>
          toast({
            title: "Error",
            description: (err as Error).message,
            variant: "destructive",
          }),
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Tasks
          </h3>
          {incompleteCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 min-w-[20px] px-1.5 text-xs"
            >
              {incompleteCount}
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Task
        </Button>
      </div>

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">
            {(error as Error)?.message || "Failed to load tasks"}
          </p>
        </div>
      )}

      {/* Workflow Tasks Section */}
      {workflowTasks.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workflow Tasks
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            {workflowTasks.map((task) => (
              <WorkflowTaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Standalone Tasks Section */}
      <div>
        {workflowTasks.length > 0 && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Standalone Tasks
          </p>
        )}

        {isLoading ? (
          <div className="space-y-0 rounded-lg border border-border overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex h-10 items-center gap-3 px-3 border-b border-border last:border-b-0"
              >
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
            <ClipboardList className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              No tasks found
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add a task to track work for this record.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            {tasks.map((task) => (
              <StandaloneTaskRow
                key={task.id}
                task={task}
                onToggleComplete={() => handleToggleComplete(task)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <AddTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        recordType={recordType}
        recordId={recordId}
        recordName={recordName}
        orgProfiles={orgProfiles}
      />
    </div>
  )
}

/**
 * Returns the incomplete task count for use in tab labels.
 * Call this hook from the parent page to get the count.
 */
export function useRecordTaskCount(recordType: string, recordId: string) {
  const { data: tasks = [] } = useRecordTasks(recordType, recordId)
  return tasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled"
  ).length
}

// ===========================================================================
// StandaloneTaskRow
// ===========================================================================
function StandaloneTaskRow({
  task,
  onToggleComplete,
}: {
  task: StandaloneTask
  onToggleComplete: () => void
}) {
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div className="flex h-10 items-center gap-3 border-b border-border px-3 last:border-b-0 hover:bg-muted/30 transition-colors">
      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={onToggleComplete}
        className="shrink-0"
      />
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          PRIORITY_COLORS[task.priority]
        )}
      />
      <span
        className={cn(
          "flex-1 truncate text-sm",
          task.status === "completed" && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </span>
      {task.assigned_user && (
        <Avatar className="h-4 w-4 shrink-0">
          <AvatarImage src={task.assigned_user.avatar_url ?? undefined} />
          <AvatarFallback className="text-[8px]">
            {getInitials(
              task.assigned_user.first_name,
              task.assigned_user.last_name
            )}
          </AvatarFallback>
        </Avatar>
      )}
      {task.due_date && (
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            overdue ? "font-medium text-red-600" : "text-muted-foreground"
          )}
        >
          {format(new Date(task.due_date), "MMM d")}
        </span>
      )}
    </div>
  )
}

// ===========================================================================
// WorkflowTaskRow (read-only display)
// ===========================================================================
function WorkflowTaskRow({ task }: { task: TaskInstance }) {
  const overdue = isOverdue(task.due_date, task.status)
  const isComplete = task.status === "completed" || task.status === "skipped"

  return (
    <div className="flex h-10 items-center gap-3 border-b border-border px-3 last:border-b-0 hover:bg-muted/30 transition-colors">
      <Checkbox checked={isComplete} disabled className="shrink-0" />
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          task.status === "completed"
            ? "bg-green-500"
            : task.status === "in_progress"
              ? "bg-blue-500"
              : task.status === "blocked"
                ? "bg-red-500"
                : "bg-gray-300"
        )}
      />
      <span
        className={cn(
          "flex-1 truncate text-sm",
          isComplete && "line-through text-muted-foreground"
        )}
      >
        {task.name}
      </span>
      {task.assigned_user && (
        <Avatar className="h-4 w-4 shrink-0">
          <AvatarImage src={task.assigned_user.avatar_url ?? undefined} />
          <AvatarFallback className="text-[8px]">
            {getInitials(
              task.assigned_user.first_name,
              task.assigned_user.last_name
            )}
          </AvatarFallback>
        </Avatar>
      )}
      {task.due_date && (
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            overdue ? "font-medium text-red-600" : "text-muted-foreground"
          )}
        >
          {format(new Date(task.due_date), "MMM d")}
        </span>
      )}
    </div>
  )
}

// ===========================================================================
// AddTaskDialog (simplified create dialog pre-filled for this record)
// ===========================================================================
function AddTaskDialog({
  open,
  onOpenChange,
  recordType,
  recordId,
  recordName,
  orgProfiles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recordType: string
  recordId: string
  recordName: string
  orgProfiles: { id: string; first_name: string | null; last_name: string | null; email: string | null }[]
}) {
  const createTask = useCreateTask()
  const module = RECORD_TYPE_TO_MODULE[recordType] ?? "general"

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [priority, setPriority] = useState<CreateTaskInput["priority"]>("medium")
  const [dueDate, setDueDate] = useState("")

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setAssignedTo("")
    setPriority("medium")
    setDueDate("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    createTask.mutate(
      {
        title: title.trim(),
        description: description || null,
        assigned_to: assignedTo && assignedTo !== "none" ? assignedTo : null,
        priority,
        due_date: dueDate || null,
        module,
        linked_record_id: recordId,
      },
      {
        onSuccess: () => {
          toast({ title: "Task created" })
          onOpenChange(false)
          resetForm()
        },
        onError: (err) =>
          toast({
            title: "Error creating task",
            description: (err as Error).message,
            variant: "destructive",
          }),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>
            Create a task linked to {recordName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assigned To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {orgProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {[p.first_name, p.last_name].filter(Boolean).join(" ") ||
                        p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) =>
                  setPriority(v as CreateTaskInput["priority"])
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTask.isPending || !title.trim()}
            >
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
