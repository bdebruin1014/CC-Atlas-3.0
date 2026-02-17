"use client"

import { useMemo } from "react"
import { CheckCircle2, ListTodo } from "lucide-react"
import { cn } from "@/lib/utils/format"
import { TaskCard, type TaskInstance } from "@/components/workflow/task-card"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface TaskListProps {
  milestoneInstanceId: string
  tasks: TaskInstance[]
  onStatusChange?: (taskId: string, newStatus: TaskInstance["status"]) => void
  onAssign?: (taskId: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TaskList({
  milestoneInstanceId,
  tasks,
  onStatusChange,
  onAssign,
}: TaskListProps) {
  // Group tasks by task_list_name
  const groupedTasks = useMemo(() => {
    const groups: Record<string, TaskInstance[]> = {}

    const sorted = [...tasks].sort((a, b) => a.sequence - b.sequence)

    for (const task of sorted) {
      const groupName = task.task_list_name || "General Tasks"
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(task)
    }

    return groups
  }, [tasks])

  const groupNames = Object.keys(groupedTasks)

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ListTodo className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No tasks for this milestone</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groupNames.map((groupName) => {
        const groupTasks = groupedTasks[groupName]
        const completedCount = groupTasks.filter(
          (t) => t.status === "completed"
        ).length
        const totalCount = groupTasks.length
        const allComplete = completedCount === totalCount
        const progressPct =
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

        return (
          <div key={groupName} className="space-y-3">
            {/* Group header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {allComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                )}
                <h4 className="text-sm font-semibold">{groupName}</h4>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-medium",
                    allComplete
                      ? "text-green-600"
                      : "text-muted-foreground"
                  )}
                >
                  {completedCount}/{totalCount} tasks complete
                </span>
                {/* Mini progress bar */}
                <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      allComplete ? "bg-green-500" : "bg-blue-500"
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Task cards */}
            <div className="space-y-2 pl-1">
              {groupTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                  onAssign={onAssign}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
