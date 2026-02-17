import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Opportunity {
  id: string
  opportunity_number: string
  name: string
  type: string
  stage: string
  status: string
  estimated_value: number | null
  probability: number | null
  expected_close_date: string | null
  source: string | null
  description: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  assigned_to: string | null
  assigned_to_name: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  metadata: Record<string, unknown> | null
}

export interface OpportunityFilters {
  type?: string
  stage?: string
  status?: string
  assignedTo?: string
  search?: string
  minValue?: number
  maxValue?: number
}

export interface CreateOpportunityData {
  organization_id: string
  name: string
  type: string
  current_stage?: string
  status?: string
  source?: string | null
  address_line1?: string | null
  address_city?: string | null
  address_county?: string | null
  address_state?: string | null
  address_zip?: string | null
  assigned_to?: string | null
  owner_entity_id?: string | null
  projected_purchase_price?: number | null
  projected_sale_price?: number | null
  offer_date?: string | null
  contract_date?: string | null
  dd_expiration_date?: string | null
  closing_date?: string | null
  notes?: string | null
  [key: string]: unknown
}

export interface UpdateOpportunityData extends Partial<CreateOpportunityData> {
  id: string
}

export interface OpportunityStage {
  id: string
  name: string
  order: number
  color: string
  opportunity_type: string
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  all: ['opportunities'] as const,
  lists: () => [...keys.all, 'list'] as const,
  list: (filters?: OpportunityFilters) => [...keys.lists(), filters] as const,
  details: () => [...keys.all, 'detail'] as const,
  detail: (id: string) => [...keys.details(), id] as const,
  stages: (type: string) => [...keys.all, 'stages', type] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useOpportunities(filters?: OpportunityFilters) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.stage) {
        query = query.eq('stage', filters.stage)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,opportunity_number.ilike.%${filters.search}%,address_line1.ilike.%${filters.search}%`
        )
      }
      if (filters?.minValue !== undefined) {
        query = query.gte('estimated_value', filters.minValue)
      }
      if (filters?.maxValue !== undefined) {
        query = query.lte('estimated_value', filters.maxValue)
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as Opportunity[]
    },
  })
}

export function useOpportunity(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Opportunity
    },
    enabled: !!id,
  })
}

export function useCreateOpportunity() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateOpportunityData) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from('opportunities')
        .insert({
          ...input,
          status: input.status ?? 'active',
          current_stage: input.current_stage ?? 'lead',
        } as any)
        .select()
        .single()

      if (error) throw error
      return data as unknown as Opportunity
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
    },
    onError: (error) => {
      console.error('Failed to create opportunity:', error)
    },
  })
}

export function useUpdateOpportunity() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateOpportunityData) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from('opportunities')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as Opportunity
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
      queryClient.invalidateQueries({ queryKey: keys.detail(data.id) })
    },
    onError: (error) => {
      console.error('Failed to update opportunity:', error)
    },
  })
}

export function useDeleteOpportunity() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
      queryClient.removeQueries({ queryKey: keys.detail(id) })
    },
    onError: (error) => {
      console.error('Failed to delete opportunity:', error)
    },
  })
}

export function useOpportunityStages(type: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.stages(type),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunity_stages')
        .select('*')
        .eq('opportunity_type', type)
        .order('order', { ascending: true })

      if (error) throw error
      return (data ?? []) as OpportunityStage[]
    },
    enabled: !!type,
  })
}
