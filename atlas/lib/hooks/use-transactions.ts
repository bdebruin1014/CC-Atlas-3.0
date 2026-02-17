import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Transaction {
  id: string
  transaction_number: string
  entity_type: string
  entity_id: string
  type: 'income' | 'expense'
  category: string
  subcategory: string | null
  amount: number
  description: string
  date: string
  payment_method: string | null
  reference_number: string | null
  vendor_name: string | null
  vendor_contact_id: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'voided'
  approved_by: string | null
  approved_by_name: string | null
  approved_at: string | null
  notes: string | null
  receipt_url: string | null
  reconciled: boolean
  reconciled_at: string | null
  plaid_transaction_id: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
  metadata: Record<string, unknown> | null
}

export interface TransactionFilters {
  type?: 'income' | 'expense'
  category?: string
  status?: string
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
  search?: string
  reconciled?: boolean
}

export interface CreateTransactionData {
  entity_type: string
  entity_id: string
  type: 'income' | 'expense'
  category: string
  subcategory?: string | null
  amount: number
  description: string
  date: string
  payment_method?: string | null
  reference_number?: string | null
  vendor_name?: string | null
  vendor_contact_id?: string | null
  status?: string
  notes?: string | null
  receipt_url?: string | null
  metadata?: Record<string, unknown> | null
}

export interface ApproveTransactionData {
  id: string
  action: 'approve' | 'reject'
  notes?: string
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  all: ['transactions'] as const,
  lists: () => [...keys.all, 'list'] as const,
  listByEntity: (entityType: string, entityId: string, filters?: TransactionFilters) =>
    [...keys.lists(), entityType, entityId, filters] as const,
  details: () => [...keys.all, 'detail'] as const,
  detail: (id: string) => [...keys.details(), id] as const,
  summary: (entityType: string, entityId: string) =>
    [...keys.all, 'summary', entityType, entityId] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useTransactions(
  entityType: string,
  entityId: string,
  filters?: TransactionFilters
) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.listByEntity(entityType, entityId, filters),
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('date', { ascending: false })

      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.category) {
        query = query.eq('category', filters.category)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate)
      }
      if (filters?.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount)
      }
      if (filters?.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount)
      }
      if (filters?.search) {
        query = query.or(
          `description.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%,transaction_number.ilike.%${filters.search}%`
        )
      }
      if (filters?.reconciled !== undefined) {
        query = query.eq('reconciled', filters.reconciled)
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as Transaction[]
    },
    enabled: !!entityType && !!entityId,
  })
}

export function useCreateTransaction() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTransactionData) => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...input,
          status: input.status ?? 'draft',
          reconciled: false,
          created_by: user?.id ?? null,
          created_by_name: user?.user_metadata?.full_name ?? user?.email ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data as Transaction
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: keys.listByEntity(data.entity_type, data.entity_id),
      })
      queryClient.invalidateQueries({
        queryKey: keys.summary(data.entity_type, data.entity_id),
      })
    },
    onError: (error) => {
      console.error('Failed to create transaction:', error)
    },
  })
}

export function useApproveTransaction() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, action, notes }: ApproveTransactionData) => {
      const { data: { user } } = await supabase.auth.getUser()

      const updateData: Record<string, unknown> = {
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: user?.id ?? null,
        approved_by_name: user?.user_metadata?.full_name ?? user?.email ?? null,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (notes) {
        updateData.notes = notes
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Log the approval/rejection
      await supabase.from('activity_log').insert({
        record_type: data.entity_type,
        record_id: data.entity_id,
        action: 'updated',
        description: `Transaction ${data.transaction_number} ${action === 'approve' ? 'approved' : 'rejected'}`,
        user_name: user?.user_metadata?.full_name ?? user?.email ?? 'Unknown',
        metadata: {
          transaction_id: id,
          action,
          amount: data.amount,
        },
      })

      return data as Transaction
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: keys.listByEntity(data.entity_type, data.entity_id),
      })
      queryClient.invalidateQueries({
        queryKey: keys.detail(data.id),
      })
      queryClient.invalidateQueries({
        queryKey: keys.summary(data.entity_type, data.entity_id),
      })
    },
    onError: (error) => {
      console.error('Failed to approve/reject transaction:', error)
    },
  })
}
