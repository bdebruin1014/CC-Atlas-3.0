import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface StandaloneTask {
  id: string
  organization_id: string
  title: string
  description: string | null
  status: "not_started" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  assigned_to: string | null
  created_by: string
  due_date: string | null
  completed_at: string | null
  completed_by: string | null
  module: "opportunity" | "project" | "construction" | "disposition" | "general"
  linked_record_id: string | null
  tags: string[]
  created_at: string
  updated_at: string
  assigned_user?: {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
  creator?: {
    id: string
    first_name: string | null
    last_name: string | null
  } | null
}

export interface TaskFilters {
  status?: string[]
  priority?: string[]
  module?: string[]
  assigned_to?: string
  due_date_from?: string
  due_date_to?: string
  search?: string
  overdue?: boolean
  due_today?: boolean
}

export interface CreateTaskInput {
  title: string
  description?: string | null
  assigned_to?: string | null
  priority?: "low" | "medium" | "high" | "urgent"
  due_date?: string | null
  module?: "opportunity" | "project" | "construction" | "disposition" | "general"
  linked_record_id?: string | null
  tags?: string[]
}

export interface UpdateTaskInput {
  id: string
  title?: string
  description?: string | null
  status?: "not_started" | "in_progress" | "completed" | "cancelled"
  priority?: "low" | "medium" | "high" | "urgent"
  assigned_to?: string | null
  due_date?: string | null
  module?: "opportunity" | "project" | "construction" | "disposition" | "general"
  linked_record_id?: string | null
  tags?: string[]
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  my: (userId: string) => [...taskKeys.all, "my", userId] as const,
  overdue: () => [...taskKeys.all, "overdue"] as const,
  stats: () => [...taskKeys.all, "stats"] as const,
}

// ---------------------------------------------------------------------------
// Helper: build query string from filters
// ---------------------------------------------------------------------------
function buildQueryString(filters: TaskFilters): string {
  const params = new URLSearchParams()
  if (filters.status?.length) params.set("status", filters.status.join(","))
  if (filters.priority?.length)
    params.set("priority", filters.priority.join(","))
  if (filters.module?.length) params.set("module", filters.module.join(","))
  if (filters.assigned_to) params.set("assigned_to", filters.assigned_to)
  if (filters.due_date_from) params.set("due_date_from", filters.due_date_from)
  if (filters.due_date_to) params.set("due_date_to", filters.due_date_to)
  if (filters.search) params.set("search", filters.search)
  if (filters.overdue) params.set("overdue", "true")
  if (filters.due_today) params.set("due_today", "true")
  return params.toString()
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch tasks with optional filters.
 */
export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      const qs = buildQueryString(filters)
      const res = await fetch(`/api/tasks${qs ? `?${qs}` : ""}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to fetch tasks")
      }
      const { data } = await res.json()
      return data as StandaloneTask[]
    },
  })
}

/**
 * Fetch tasks assigned to the current user.
 */
export function useMyTasks() {
  const supabase = createClient()

  return useQuery({
    queryKey: taskKeys.all,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      const res = await fetch(`/api/tasks?assigned_to=${user.id}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to fetch tasks")
      }
      const { data } = await res.json()
      return data as StandaloneTask[]
    },
  })
}

/**
 * Fetch overdue tasks.
 */
export function useOverdueTasks() {
  return useQuery({
    queryKey: taskKeys.overdue(),
    queryFn: async () => {
      const res = await fetch("/api/tasks?overdue=true")
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to fetch tasks")
      }
      const { data } = await res.json()
      return data as StandaloneTask[]
    },
  })
}

/**
 * Create a new standalone task.
 */
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create task")
      }
      const { data } = await res.json()
      return data as StandaloneTask
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

/**
 * Update a standalone task.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update task")
      }
      const { data } = await res.json()
      return data as StandaloneTask
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

/**
 * Delete a standalone task.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete task")
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}
