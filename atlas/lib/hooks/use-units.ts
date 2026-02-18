import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Unit {
  id: string
  job_id: string
  unit_number: string
  lot_address: string | null
  floor_plan_id: string | null
  upgrade_package: string | null
  current_milestone: number | null
  base_sticks_bricks: number | null
  upgrade_cost: number | null
  lot_preparation_cost: number | null
  site_specific_adjustments: number | null
  soft_costs: number | null
  builder_fee: number | null
  contingency: number | null
  total_budget: number | null
  total_committed: number | null
  total_actual: number | null
  variance: number | null
  permit_date: string | null
  start_date: string | null
  projected_completion_date: string | null
  actual_completion_date: string | null
  co_date: string | null
  created_at: string
  updated_at: string
}

export interface UnitMilestone {
  id: string
  unit_id: string
  phase_number: number
  phase_name: string
  description: string | null
  planned_start_date: string | null
  planned_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped'
  notes: string | null
  inspection_required: boolean | null
  inspection_passed: boolean | null
  created_at: string
  updated_at: string
}

export interface CreateUnitData {
  job_id: string
  unit_number?: string
  lot_address?: string | null
  floor_plan_id?: string | null
  upgrade_package?: string | null
  current_milestone?: number | null
  base_sticks_bricks?: number | null
  upgrade_cost?: number | null
  lot_preparation_cost?: number | null
  site_specific_adjustments?: number | null
  soft_costs?: number | null
  builder_fee?: number | null
  contingency?: number | null
  total_budget?: number | null
  total_committed?: number | null
  total_actual?: number | null
  variance?: number | null
  permit_date?: string | null
  start_date?: string | null
  projected_completion_date?: string | null
  actual_completion_date?: string | null
  co_date?: string | null
}

export interface UpdateUnitData extends Partial<CreateUnitData> {
  id: string
}

export interface UpdateMilestoneData {
  id: string
  status?: 'not_started' | 'in_progress' | 'completed' | 'skipped'
  actual_start_date?: string | null
  actual_end_date?: string | null
  notes?: string | null
  inspection_required?: boolean | null
  inspection_passed?: boolean | null
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  all: ['units'] as const,
  lists: () => [...keys.all, 'list'] as const,
  listByJob: (jobId: string) => [...keys.lists(), 'job', jobId] as const,
  details: () => [...keys.all, 'detail'] as const,
  detail: (id: string) => [...keys.details(), id] as const,
  milestones: (unitId: string) => [...keys.all, 'milestones', unitId] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useUnits(jobId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.listByJob(jobId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('job_id', jobId)
        .order('unit_number', { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as Unit[]
    },
    enabled: !!jobId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useUnit(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as unknown as Unit
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useCreateUnit() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateUnitData) => {
      const { data, error } = await supabase
        .from('units')
        .insert({
          ...(input as any),
        } as any)
        .select()
        .single()

      if (error) throw error
      return data as unknown as Unit
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.listByJob(data.job_id) })
      // Also invalidate parent job
      queryClient.invalidateQueries({
        queryKey: ['jobs', 'detail', data.job_id],
      })
    },
    onError: (error) => {
      console.error('Failed to create unit:', error)
    },
  })
}

export function useUpdateUnit() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateUnitData) => {
      const { data, error } = await supabase
        .from('units')
        .update({ ...(updates as any), updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as Unit
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: keys.detail(id) })
      const previous = queryClient.getQueryData(keys.detail(id))
      queryClient.setQueryData(keys.detail(id), (old: Unit | undefined) =>
        old ? { ...old, ...updates } : old
      )
      return { previous }
    },
    onError: (error, { id }, context) => {
      console.error('Failed to update unit:', error)
      if (context?.previous) {
        queryClient.setQueryData(keys.detail(id), context.previous)
      }
    },
    onSettled: (data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: keys.detail(id) })
      if (data?.job_id) {
        queryClient.invalidateQueries({ queryKey: keys.listByJob(data.job_id) })
        queryClient.invalidateQueries({
          queryKey: ['jobs', 'detail', data.job_id],
        })
      }
    },
  })
}

export function useUnitMilestones(unitId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.milestones(unitId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unit_milestones')
        .select('*')
        .eq('unit_id', unitId)
        .order('phase_number', { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as UnitMilestone[]
    },
    enabled: !!unitId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useUpdateMilestone() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateMilestoneData) => {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Auto-set dates based on status changes
      if (updates.status === 'in_progress' && !updates.actual_start_date) {
        updateData.actual_start_date = new Date().toISOString()
      }
      if (updates.status === 'completed' && !updates.actual_end_date) {
        updateData.actual_end_date = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('unit_milestones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as UnitMilestone
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: keys.milestones(data.unit_id),
      })
      queryClient.invalidateQueries({
        queryKey: keys.detail(data.unit_id),
      })
      // Invalidate the parent unit list as progress may have changed
      queryClient.invalidateQueries({ queryKey: keys.lists() })
    },
    onError: (error) => {
      console.error('Failed to update milestone:', error)
    },
  })
}
