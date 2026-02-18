import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { autoInstantiateWorkflow } from '@/lib/hooks/use-workflow'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Job {
  id: string
  organization_id: string
  job_number: string
  name: string
  client_type: string
  client_entity_id: string | null
  client_id: string | null
  contract_type: string | null
  contract_amount: number | null
  builder_fee: number | null
  status: string
  unit_count: number
  linked_project_id: string | null
  start_date: string | null
  projected_completion: string | null
  superintendent_id: string | null
  pm_id: string | null
  state: string | null
  created_at: string
  updated_at: string
}

export interface JobFilters {
  linkedProjectId?: string
  clientType?: string
  status?: string
  superintendentId?: string
  search?: string
}

export interface CreateJobData {
  organization_id?: string
  job_number?: string
  name: string
  client_type: string
  client_entity_id?: string | null
  client_id?: string | null
  contract_type?: string | null
  contract_amount?: number | null
  builder_fee?: number | null
  status?: string
  unit_count?: number
  linked_project_id?: string | null
  start_date?: string | null
  projected_completion?: string | null
  superintendent_id?: string | null
  pm_id?: string | null
  state?: string | null
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

      if (filters?.linkedProjectId) {
        query = query.eq('linked_project_id', filters.linkedProjectId)
      }
      if (filters?.clientType) {
        query = query.eq('client_type', filters.clientType as any)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status as any)
      }
      if (filters?.superintendentId) {
        query = query.eq('superintendent_id', filters.superintendentId)
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as unknown as Job[]
    },
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
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
      return data as unknown as Job
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
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
          ...(input as any),
          status: input.status ?? 'pre_construction',
        } as any)
        .select()
        .single()

      if (error) throw error
      return data as unknown as Job
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
      // Also invalidate parent project to refresh its data
      if (data.linked_project_id) {
        queryClient.invalidateQueries({
          queryKey: ['projects', 'detail', data.linked_project_id],
        })
      }
      // Auto-instantiate the construction workflow
      if (data.client_type) {
        autoInstantiateWorkflow('job', data.id, data.client_type)
      }
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
        .update({ ...(updates as any), updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as Job
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: keys.detail(id) })
      const previous = queryClient.getQueryData(keys.detail(id))
      queryClient.setQueryData(keys.detail(id), (old: Job | undefined) =>
        old ? { ...old, ...updates } : old
      )
      return { previous }
    },
    onError: (error, { id }, context) => {
      console.error('Failed to update job:', error)
      if (context?.previous) {
        queryClient.setQueryData(keys.detail(id), context.previous)
      }
    },
    onSettled: (data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
      queryClient.invalidateQueries({ queryKey: keys.detail(id) })
      if (data?.linked_project_id) {
        queryClient.invalidateQueries({
          queryKey: ['projects', 'detail', data.linked_project_id],
        })
      }
    },
  })
}
