import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Job {
  id: string
  job_number: string
  project_id: string
  name: string
  type: string
  status: string
  description: string | null
  start_date: string | null
  estimated_completion: string | null
  actual_completion: string | null
  budget: number | null
  contract_value: number | null
  superintendent_id: string | null
  superintendent_name: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip: string | null
  unit_count: number
  completed_unit_count: number
  created_at: string
  updated_at: string
  metadata: Record<string, unknown> | null
}

export interface JobFilters {
  projectId?: string
  type?: string
  status?: string
  superintendentId?: string
  search?: string
}

export interface CreateJobData {
  project_id: string
  name: string
  type: string
  status?: string
  description?: string | null
  start_date?: string | null
  estimated_completion?: string | null
  budget?: number | null
  contract_value?: number | null
  superintendent_id?: string | null
  address_line1?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  metadata?: Record<string, unknown> | null
}

export interface UpdateJobData extends Partial<CreateJobData> {
  id: string
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  all: ['jobs'] as const,
  lists: () => [...keys.all, 'list'] as const,
  list: (filters?: JobFilters) => [...keys.lists(), filters] as const,
  details: () => [...keys.all, 'detail'] as const,
  detail: (id: string) => [...keys.details(), id] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useJobs(filters?: JobFilters) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.superintendentId) {
        query = query.eq('superintendent_id', filters.superintendentId)
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%,address_line1.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as Job[]
    },
  })
}

export function useJob(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Job
    },
    enabled: !!id,
  })
}

export function useCreateJob() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateJobData) => {
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          ...input,
          status: input.status ?? 'planned',
        })
        .select()
        .single()

      if (error) throw error
      return data as Job
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
      // Also invalidate parent project to refresh its data
      queryClient.invalidateQueries({
        queryKey: ['projects', 'detail', data.project_id],
      })
    },
    onError: (error) => {
      console.error('Failed to create job:', error)
    },
  })
}

export function useUpdateJob() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateJobData) => {
      const { data, error } = await supabase
        .from('jobs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Job
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
      queryClient.invalidateQueries({ queryKey: keys.detail(data.id) })
      // Also invalidate parent project
      queryClient.invalidateQueries({
        queryKey: ['projects', 'detail', data.project_id],
      })
    },
    onError: (error) => {
      console.error('Failed to update job:', error)
    },
  })
}
