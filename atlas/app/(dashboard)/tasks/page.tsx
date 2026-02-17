"use client"

import React from "react"
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  startOfWeek,
  endOfWeek,
  addWeeks,
  isWithinInterval,
  startOfDay,
  subDays,
} from "date-fns"
import {
  Plus,
  List,
  LayoutGrid,
  Search,
  X,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  Clock,
  GripVertical,
  ChevronDown,
  ClipboardList,
} from "lucide-react"

import { cn } from "@/lib/utils/format"
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  type StandaloneTask,
  type TaskFilters,
  type CreateTaskInput,
} from "@/lib/hooks/use-tasks"
import { useOrgProfiles, type OrgProfile } from "@/lib/hooks/use-workflow"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardContent,
} from "@/components/ui/card"

// ===========================================================================
// Constants
// ===========================================================================
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-400",
}

const PRIORITY_BADGE_VARIANT: Record<string, "destructive" | "warning" | "secondary" | "blue"> = {
  urgent: "destructive",
  high: "warning",
  medium: "secondary",
  low: "blue",
}

const MODULE_COLORS: Record<string, string> = {
  opportunity: "bg-blue-100 text-blue-800",
  project: "bg-green-100 text-green-800",
  construction: "bg-orange-100 text-orange-800",
  disposition: "bg-purple-100 text-purple-800",
  general: "bg-gray-100 text-gray-800",
}

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Complete",
  cancelled: "Cancelled",
}

const MODULE_LABELS: Record<string, string> = {
  opportunity: "Opportunity",
  project: "Project",
  construction: "Construction",
  disposition: "Disposition",
  general: "General",
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
}

// ===========================================================================
// Helper functions
// ===========================================================================
function getInitials(
  firstName?: string | null,
  lastName?: string | null
): string {
  return [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"
}

function isOverdue(task: StandaloneTask): boolean {
  if (!task.due_date) return false
  if (task.status === "completed" || task.status === "cancelled") return false
  return isPast(startOfDay(new Date(task.due_date))) && !isToday(new Date(task.due_date))
}

type DateGroup =
  | "Overdue"
  | "Today"
  | "Tomorrow"
  | "This Week"
  | "Next Week"
  | "Later"
  | "No Due Date"

function getDateGroup(task: StandaloneTask): DateGroup {
  if (!task.due_date) return "No Due Date"
  const d = new Date(task.due_date)
  const now = new Date()
  if (isOverdue(task)) return "Overdue"
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"

  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
  if (isWithinInterval(d, { start: now, end: thisWeekEnd })) return "This Week"

  const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 })
  const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 })
  if (isWithinInterval(d, { start: nextWeekStart, end: nextWeekEnd }))
    return "Next Week"

  return "Later"
}

const DATE_GROUP_ORDER: DateGroup[] = [
  "Overdue",
  "Today",
  "Tomorrow",
  "This Week",
  "Next Week",
  "Later",
  "No Due Date",
]

function groupTasksByDate(
  tasks: StandaloneTask[]
): Map<DateGroup, StandaloneTask[]> {
  const groups = new Map<DateGroup, StandaloneTask[]>()
  for (const g of DATE_GROUP_ORDER) groups.set(g, [])
  for (const task of tasks) {
    const group = getDateGroup(task)
    groups.get(group)!.push(task)
  }
  // Remove empty groups
  for (const [key, val] of groups) {
    if (val.length === 0) groups.delete(key)
  }
  return groups
}

// ===========================================================================
// Main Page Component
// ===========================================================================
export default function TasksPage() {
  // ---- State ----
  const [viewMode, setViewMode] = React.useState<"list" | "board">("list")
  const [taskScope, setTaskScope] = React.useState<
    "my" | "all" | "unassigned"
  >("my")
  const [filters, setFilters] = React.useState<TaskFilters>({})
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [detailSheetTask, setDetailSheetTask] =
    React.useState<StandaloneTask | null>(null)

  // ---- Data ----
  const effectiveFilters: TaskFilters = React.useMemo(() => {
    const f = { ...filters }
    if (taskScope === "unassigned") {
      f.assigned_to = "unassigned"
    }
    return f
  }, [filters, taskScope])

  const {
    data: allTasks = [],
    isLoading,
    isError,
    error,
  } = useTasks(effectiveFilters)
  const { data: orgProfiles = [] } = useOrgProfiles()

  // For "My Tasks" we need the current user id
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  React.useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        setCurrentUserId(data.user?.id ?? null)
      })
    })
  }, [])

  const displayedTasks = React.useMemo(() => {
    if (taskScope === "my" && currentUserId) {
      return allTasks.filter((t) => t.assigned_to === currentUserId)
    }
    return allTasks
  }, [allTasks, taskScope, currentUserId])

  // ---- Stats ----
  const stats = React.useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    const weekAgo = subDays(new Date(), 7).toISOString()

    const dueToday = allTasks.filter(
      (t) => t.due_date === today && t.status !== "completed" && t.status !== "cancelled"
    ).length

    const overdue = allTasks.filter((t) => isOverdue(t)).length

    const inProgress = allTasks.filter(
      (t) => t.status === "in_progress"
    ).length

    const completedThisWeek = allTasks.filter(
      (t) =>
        t.status === "completed" &&
        t.completed_at &&
        t.completed_at >= weekAgo
    ).length

    return { dueToday, overdue, inProgress, completedThisWeek }
  }, [allTasks])

  // ---- Mutations ----
  const updateTask = useUpdateTask()

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

  // ---- Filter helpers ----
  const updateFilter = <K extends keyof TaskFilters>(
    key: K,
    value: TaskFilters[K]
  ) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      // Clean up empty arrays / undefined
      if (Array.isArray(next[key]) && (next[key] as string[]).length === 0) {
        delete next[key]
      }
      if (next[key] === undefined || next[key] === "") {
        delete next[key]
      }
      return next
    })
  }

  const toggleFilterValue = (
    key: "status" | "priority" | "module",
    value: string
  ) => {
    setFilters((prev) => {
      const arr = prev[key] ? [...prev[key]!] : []
      const idx = arr.indexOf(value)
      if (idx >= 0) arr.splice(idx, 1)
      else arr.push(value)
      const next = { ...prev, [key]: arr }
      if (arr.length === 0) delete next[key]
      return next
    })
  }

  const clearFilters = () => setFilters({})

  const hasActiveFilters = Object.keys(filters).length > 0

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ====== HEADER ====== */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-[#1a5632] text-white hover:bg-[#1a5632]/90"
        >
          <Plus className="mr-1 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* ====== STATS ROW ====== */}
      <div className="grid grid-cols-4 gap-3">
        <StatMiniCard
          label="Due Today"
          value={stats.dueToday}
          color="blue"
          loading={isLoading}
        />
        <StatMiniCard
          label="Overdue"
          value={stats.overdue}
          color="red"
          highlight={stats.overdue > 0}
          loading={isLoading}
        />
        <StatMiniCard
          label="In Progress"
          value={stats.inProgress}
          color="green"
          loading={isLoading}
        />
        <StatMiniCard
          label="Completed This Week"
          value={stats.completedThisWeek}
          color="gray"
          loading={isLoading}
        />
      </div>

      {/* ====== MAIN LAYOUT ====== */}
      <div className="flex flex-1 gap-0 overflow-hidden rounded-lg border border-border">
        {/* LEFT: Task list */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            {/* Scope toggle */}
            <div className="inline-flex rounded-full bg-muted p-0.5">
              {(["my", "all", "unassigned"] as const).map((scope) => (
                <button
                  key={scope}
                  onClick={() => setTaskScope(scope)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    taskScope === scope
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {scope === "my"
                    ? "My Tasks"
                    : scope === "all"
                      ? "All Tasks"
                      : "Unassigned"}
                </button>
              ))}
            </div>
            {/* View toggle */}
            <div className="inline-flex rounded-md border border-border">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1 rounded-l-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "list"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                onClick={() => setViewMode("board")}
                className={cn(
                  "flex items-center gap-1 rounded-r-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "board"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Board
              </button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <LoadingSkeleton />
            ) : isError ? (
              <ErrorBanner message={(error as Error)?.message} />
            ) : displayedTasks.length === 0 ? (
              <EmptyState />
            ) : viewMode === "list" ? (
              <TaskListView
                tasks={displayedTasks}
                onToggleComplete={handleToggleComplete}
                onClickTask={setDetailSheetTask}
              />
            ) : (
              <TaskBoardView
                tasks={displayedTasks}
                orgProfiles={orgProfiles}
                onUpdateStatus={(task, status) =>
                  updateTask.mutate({ id: task.id, status })
                }
                onClickTask={setDetailSheetTask}
              />
            )}
          </ScrollArea>
        </div>

        {/* RIGHT: Filter panel */}
        <div className="w-[280px] shrink-0 border-l border-border bg-white">
          <FilterPanel
            filters={filters}
            hasActiveFilters={hasActiveFilters}
            orgProfiles={orgProfiles}
            onToggleFilterValue={toggleFilterValue}
            onUpdateFilter={updateFilter}
            onClearFilters={clearFilters}
          />
        </div>
      </div>

      {/* ====== DIALOGS / SHEETS ====== */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        orgProfiles={orgProfiles}
      />

      <TaskDetailSheet
        task={detailSheetTask}
        onClose={() => setDetailSheetTask(null)}
        orgProfiles={orgProfiles}
      />
    </div>
  )
}

// ===========================================================================
// StatMiniCard
// ===========================================================================
function StatMiniCard({
  label,
  value,
  color,
  highlight,
  loading,
}: {
  label: string
  value: number
  color: "blue" | "red" | "green" | "gray"
  highlight?: boolean
  loading?: boolean
}) {
  const colorMap = {
    blue: "border-blue-200 bg-blue-50",
    red: highlight ? "border-red-300 bg-red-500 text-white" : "border-red-200 bg-red-50",
    green: "border-[#1a5632]/20 bg-[#1a5632]/5",
    gray: "border-gray-200 bg-gray-50",
  }
  const valueColorMap = {
    blue: "text-blue-700",
    red: highlight ? "text-white" : "text-red-700",
    green: "text-[#1a5632]",
    gray: "text-gray-700",
  }
  const labelColorMap = {
    blue: "text-blue-600",
    red: highlight ? "text-white/80" : "text-red-600",
    green: "text-[#1a5632]/80",
    gray: "text-gray-500",
  }

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        colorMap[color]
      )}
    >
      {loading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-8" />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : (
        <>
          <p className={cn("text-xl font-bold", valueColorMap[color])}>
            {value}
          </p>
          <p className={cn("text-xs font-medium", labelColorMap[color])}>
            {label}
          </p>
        </>
      )}
    </div>
  )
}

// ===========================================================================
// TaskListView
// ===========================================================================
function TaskListView({
  tasks,
  onToggleComplete,
  onClickTask,
}: {
  tasks: StandaloneTask[]
  onToggleComplete: (task: StandaloneTask) => void
  onClickTask: (task: StandaloneTask) => void
}) {
  const grouped = groupTasksByDate(tasks)

  return (
    <div className="divide-y divide-border">
      {DATE_GROUP_ORDER.filter((g) => grouped.has(g)).map((group) => (
        <div key={group}>
          <div
            className={cn(
              "sticky top-0 z-10 bg-muted/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm",
              group === "Overdue" && "bg-red-50 text-red-700"
            )}
          >
            {group}{" "}
            <span className="ml-1 text-muted-foreground font-normal normal-case">
              ({grouped.get(group)!.length})
            </span>
          </div>
          {grouped.get(group)!.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggleComplete={() => onToggleComplete(task)}
              onClick={() => onClickTask(task)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ===========================================================================
// TaskRow
// ===========================================================================
function TaskRow({
  task,
  onToggleComplete,
  onClick,
}: {
  task: StandaloneTask
  onToggleComplete: () => void
  onClick: () => void
}) {
  const overdue = isOverdue(task)

  return (
    <div className="flex h-10 items-center gap-3 border-b border-[#E5E7EB] px-4 hover:bg-muted/30 transition-colors">
      {/* Checkbox */}
      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={onToggleComplete}
        className="shrink-0"
      />
      {/* Priority dot */}
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          PRIORITY_COLORS[task.priority]
        )}
      />
      {/* Title */}
      <button
        onClick={onClick}
        className={cn(
          "flex-1 truncate text-left text-sm font-medium hover:underline",
          task.status === "completed" && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </button>
      {/* Module badge */}
      <span
        className={cn(
          "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-block",
          MODULE_COLORS[task.module]
        )}
      >
        {MODULE_LABELS[task.module]}
      </span>
      {/* Assignee avatar */}
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
      {/* Due date */}
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
// TaskBoardView (Kanban)
// ===========================================================================
function TaskBoardView({
  tasks,
  orgProfiles: _orgProfiles,
  onUpdateStatus,
  onClickTask,
}: {
  tasks: StandaloneTask[]
  orgProfiles: OrgProfile[]
  onUpdateStatus: (
    task: StandaloneTask,
    status: StandaloneTask["status"]
  ) => void
  onClickTask: (task: StandaloneTask) => void
}) {
  const columns: {
    status: StandaloneTask["status"]
    label: string
    color: string
  }[] = [
    { status: "not_started", label: "Not Started", color: "bg-gray-400" },
    { status: "in_progress", label: "In Progress", color: "bg-blue-500" },
    { status: "completed", label: "Complete", color: "bg-green-600" },
  ]

  return (
    <div className="flex gap-4 p-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status)
        return (
          <div key={col.status} className="flex w-1/3 flex-col">
            <div className="mb-2 flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", col.color)} />
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="text-xs text-muted-foreground">
                {colTasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {colTasks.map((task) => (
                <BoardCard
                  key={task.id}
                  task={task}
                  columns={columns}
                  onMoveTo={(status) => onUpdateStatus(task, status)}
                  onClick={() => onClickTask(task)}
                />
              ))}
              {colTasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No tasks
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ===========================================================================
// BoardCard
// ===========================================================================
function BoardCard({
  task,
  columns,
  onMoveTo,
  onClick,
}: {
  task: StandaloneTask
  columns: { status: StandaloneTask["status"]; label: string }[]
  onMoveTo: (status: StandaloneTask["status"]) => void
  onClick: () => void
}) {
  const overdue = isOverdue(task)

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40 cursor-grab" />
          <div className="flex-1 min-w-0">
            <button
              onClick={onClick}
              className="text-sm font-medium text-left hover:underline truncate block w-full"
            >
              {task.title}
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge
                variant={PRIORITY_BADGE_VARIANT[task.priority] ?? "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {PRIORITY_LABELS[task.priority]}
              </Badge>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  MODULE_COLORS[task.module]
                )}
              >
                {MODULE_LABELS[task.module]}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {task.assigned_user && (
                  <Avatar className="h-4 w-4">
                    <AvatarImage
                      src={task.assigned_user.avatar_url ?? undefined}
                    />
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
                      "text-[11px]",
                      overdue
                        ? "font-medium text-red-600"
                        : "text-muted-foreground"
                    )}
                  >
                    {format(new Date(task.due_date), "MMM d")}
                  </span>
                )}
              </div>
              {/* Move dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {columns
                    .filter((c) => c.status !== task.status)
                    .map((c) => (
                      <DropdownMenuItem
                        key={c.status}
                        onClick={() => onMoveTo(c.status)}
                      >
                        Move to {c.label}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ===========================================================================
// FilterPanel
// ===========================================================================
function FilterPanel({
  filters,
  hasActiveFilters,
  orgProfiles,
  onToggleFilterValue,
  onUpdateFilter,
  onClearFilters,
}: {
  filters: TaskFilters
  hasActiveFilters: boolean
  orgProfiles: OrgProfile[]
  onToggleFilterValue: (
    key: "status" | "priority" | "module",
    value: string
  ) => void
  onUpdateFilter: <K extends keyof TaskFilters>(
    key: K,
    value: TaskFilters[K]
  ) => void
  onClearFilters: () => void
}) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Filter Tasks</h3>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Search */}
        <div>
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={filters.search ?? ""}
              onChange={(e) => onUpdateFilter("search", e.target.value || undefined)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Status */}
        <FilterCheckboxGroup
          label="Status"
          options={[
            { value: "not_started", label: "Not Started" },
            { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Complete" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          selected={filters.status ?? []}
          onToggle={(v) => onToggleFilterValue("status", v)}
        />

        {/* Priority */}
        <FilterCheckboxGroup
          label="Priority"
          options={[
            { value: "urgent", label: "Urgent" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
          selected={filters.priority ?? []}
          onToggle={(v) => onToggleFilterValue("priority", v)}
        />

        {/* Module */}
        <FilterCheckboxGroup
          label="Module"
          options={[
            { value: "opportunity", label: "Opportunity" },
            { value: "project", label: "Project" },
            { value: "construction", label: "Construction" },
            { value: "disposition", label: "Disposition" },
          ]}
          selected={filters.module ?? []}
          onToggle={(v) => onToggleFilterValue("module", v)}
        />

        {/* Assignee */}
        <div>
          <Label className="text-xs text-muted-foreground">Assignee</Label>
          <Select
            value={filters.assigned_to ?? ""}
            onValueChange={(v) =>
              onUpdateFilter("assigned_to", v || undefined)
            }
          >
            <SelectTrigger className="mt-1 h-8 text-xs">
              <SelectValue placeholder="Anyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anyone">Anyone</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {orgProfiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {[p.first_name, p.last_name].filter(Boolean).join(" ") ||
                    p.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Due Date Range */}
        <div>
          <Label className="text-xs text-muted-foreground">Due Date</Label>
          <div className="mt-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-8">
                From
              </span>
              <Input
                type="date"
                value={filters.due_date_from ?? ""}
                onChange={(e) =>
                  onUpdateFilter("due_date_from", e.target.value || undefined)
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-8">To</span>
              <Input
                type="date"
                value={filters.due_date_to ?? ""}
                onChange={(e) =>
                  onUpdateFilter("due_date_to", e.target.value || undefined)
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

// ===========================================================================
// FilterCheckboxGroup
// ===========================================================================
function FilterCheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1.5 space-y-1.5">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2"
          >
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => onToggle(opt.value)}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ===========================================================================
// CreateTaskDialog
// ===========================================================================
function CreateTaskDialog({
  open,
  onOpenChange,
  orgProfiles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgProfiles: OrgProfile[]
}) {
  const createTask = useCreateTask()
  const [form, setForm] = React.useState<CreateTaskInput>({
    title: "",
    description: "",
    priority: "medium",
    module: "general",
    tags: [],
  })
  const [tagInput, setTagInput] = React.useState("")

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      priority: "medium",
      module: "general",
      tags: [],
    })
    setTagInput("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return

    const input: CreateTaskInput = {
      ...form,
      tags: tagInput
        ? tagInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    }

    createTask.mutate(input, {
      onSuccess: () => {
        toast({ title: "Task created successfully" })
        onOpenChange(false)
        resetForm()
      },
      onError: (err) =>
        toast({
          title: "Error creating task",
          description: (err as Error).message,
          variant: "destructive",
        }),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>
            Create a new task for your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Label>
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Task title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="mt-1"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Describe the task..."
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Assigned To */}
            <div>
              <Label>Assigned To</Label>
              <Select
                value={form.assigned_to ?? ""}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    assigned_to: v === "none" ? null : v,
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select assignee" />
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

            {/* Priority */}
            <div>
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    priority: v as CreateTaskInput["priority"],
                  }))
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

          <div className="grid grid-cols-2 gap-3">
            {/* Due Date */}
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    due_date: e.target.value || null,
                  }))
                }
                className="mt-1"
              />
            </div>

            {/* Module */}
            <div>
              <Label>Module</Label>
              <Select
                value={form.module}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    module: v as CreateTaskInput["module"],
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="disposition">Disposition</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <Input
              placeholder="Comma-separated tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
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
              disabled={createTask.isPending || !form.title.trim()}
              className="bg-[#1a5632] text-white hover:bg-[#1a5632]/90"
            >
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ===========================================================================
// TaskDetailSheet
// ===========================================================================
function TaskDetailSheet({
  task,
  onClose,
  orgProfiles,
}: {
  task: StandaloneTask | null
  onClose: () => void
  orgProfiles: OrgProfile[]
}) {
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    status: "not_started" as StandaloneTask["status"],
    priority: "medium" as StandaloneTask["priority"],
    assigned_to: null as string | null,
    due_date: "",
    module: "general" as StandaloneTask["module"],
  })

  React.useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to,
        due_date: task.due_date ?? "",
        module: task.module,
      })
    }
  }, [task])

  const handleSave = () => {
    if (!task) return
    updateTask.mutate(
      {
        id: task.id,
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        assigned_to: form.assigned_to,
        due_date: form.due_date || null,
        module: form.module,
      },
      {
        onSuccess: () => {
          toast({ title: "Task updated" })
          onClose()
        },
        onError: (err) =>
          toast({
            title: "Error updating task",
            description: (err as Error).message,
            variant: "destructive",
          }),
      }
    )
  }

  const handleDelete = () => {
    if (!task) return
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast({ title: "Task deleted" })
        onClose()
      },
      onError: (err) =>
        toast({
          title: "Error deleting task",
          description: (err as Error).message,
          variant: "destructive",
        }),
    })
  }

  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Task Details</SheetTitle>
          <SheetDescription>View and edit task information.</SheetDescription>
        </SheetHeader>

        {task && (
          <div className="mt-6 space-y-4">
            {/* Title */}
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Status */}
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as StandaloneTask["status"],
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Complete</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      priority: v as StandaloneTask["priority"],
                    }))
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

            <div className="grid grid-cols-2 gap-3">
              {/* Assigned To */}
              <div>
                <Label>Assigned To</Label>
                <Select
                  value={form.assigned_to ?? "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      assigned_to: v === "none" ? null : v,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {orgProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {[p.first_name, p.last_name]
                          .filter(Boolean)
                          .join(" ") || p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, due_date: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {/* Module */}
            <div>
              <Label>Module</Label>
              <Select
                value={form.module}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    module: v as StandaloneTask["module"],
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="disposition">Disposition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags display */}
            {task.tags && task.tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t pt-4 space-y-1 text-xs text-muted-foreground">
              <p>
                Created:{" "}
                {format(new Date(task.created_at), "MMM d, yyyy h:mm a")}
              </p>
              {task.completed_at && (
                <p>
                  Completed:{" "}
                  {format(
                    new Date(task.completed_at),
                    "MMM d, yyyy h:mm a"
                  )}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={updateTask.isPending}
                className="flex-1 bg-[#1a5632] text-white hover:bg-[#1a5632]/90"
              >
                {updateTask.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteTask.isPending}
              >
                {deleteTask.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ===========================================================================
// Loading / Error / Empty states
// ===========================================================================
function LoadingSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex h-10 items-center gap-3 px-4 border-b border-[#E5E7EB]">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}

function ErrorBanner({ message }: { message?: string }) {
  return (
    <div className="m-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
      <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
      <div>
        <p className="text-sm font-medium text-red-800">
          Failed to load tasks
        </p>
        {message && (
          <p className="text-xs text-red-600 mt-0.5">{message}</p>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <ClipboardList className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">
        No tasks found
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Create a new task or adjust your filters.
      </p>
    </div>
  )
}
