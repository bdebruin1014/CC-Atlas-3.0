import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Unit {
  id: string
  unit_number: string
  job_id: string
  lot_number: string | null
  block: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip: string | null
  plan_name: string | null
  elevation: string | null
  square_footage: number | null
  bedrooms: number | null
  bathrooms: number | null
  garage_spaces: number | null
  status: string
  contract_price: number | null
  buyer_name: string | null
  buyer_contact_id: string | null
  start_date: string | null
  estimated_completion: string | null
  actual_completion: string | null
  current_milestone: string | null
  progress_percentage: number
  created_at: string
  updated_at: string
  metadata: Record<string, unknown> | null
}

export interface UnitMilestone {
  id: string
  unit_id: string
  milestone_template_id: string | null
  name: string
  description: string | null
  order: number
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped'
  planned_date: string | null
  actual_start_date: string | null
  actual_completion_date: string | null
  assigned_to: string | null
  assigned_to_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateUnitData {
  job_id: string
  lot_number?: string | null
  block?: string | null
  address_line1?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  plan_name?: string | null
  elevation?: string | null
  square_footage?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  garage_spaces?: number | null
  status?: string
  contract_price?: number | null
  buyer_name?: string | null
  buyer_contact_id?: string | null
  start_date?: string | null
  estimated_completion?: string | null
  metadata?: Record<string, unknown> | null
}

export interface UpdateUnitData extends Partial<CreateUnitData> {
  id: string
}

export interface UpdateMilestoneData {
  id: string
  status?: 'not_started' | 'in_progress' | 'completed' | 'skipped'
  actual_start_date?: string | null
  actual_completion_date?: string | null
  assigned_to?: string | null
  notes?: string | null
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
      return (data ?? []) as Unit[]
    },
    enabled: !!jobId,
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
      return data as Unit
    },
    enabled: !!id,
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
          ...input,
          status: input.status ?? 'planned',
          progress_percentage: 0,
        })
        .select()
        .single()

      if (error) throw error
      return data as Unit
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
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Unit
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.listByJob(data.job_id) })
      queryClient.invalidateQueries({ queryKey: keys.detail(data.id) })
      queryClient.invalidateQueries({
        queryKey: ['jobs', 'detail', data.job_id],
      })
    },
    onError: (error) => {
      console.error('Failed to update unit:', error)
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
        .order('order', { ascending: true })

      if (error) throw error
      return (data ?? []) as UnitMilestone[]
    },
    enabled: !!unitId,
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
      if (updates.status === 'completed' && !updates.actual_completion_date) {
        updateData.actual_completion_date = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('unit_milestones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as UnitMilestone
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
