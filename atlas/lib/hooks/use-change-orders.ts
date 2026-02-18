import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { ChangeOrder, ApprovalThreshold } from "@/lib/supabase/types"
import type { Unit } from "@/lib/supabase/types"

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
const keys = {
  all: ["change-orders"] as const,
  listByJob: (jobId: string) => [...keys.all, "job", jobId] as const,
  detail: (id: string) => [...keys.all, "detail", id] as const,
}

// ---------------------------------------------------------------------------
// Approval threshold logic
// ---------------------------------------------------------------------------
export function getApprovalThreshold(totalAmount: number): ApprovalThreshold {
  if (totalAmount <= 5_000) return "cm"
  if (totalAmount <= 25_000) return "cm_principal"
  return "principal"
}

export function getApprovalLabel(threshold: ApprovalThreshold | null): string {
  switch (threshold) {
    case "cm":
      return "Pending CM Approval"
    case "cm_principal":
      return "Pending CM → Principal Approval"
    case "principal":
      return "Pending Principal Approval"
    default:
      return "Pending Approval"
  }
}

// ---------------------------------------------------------------------------
// useChangeOrders — list all COs for a job
// ---------------------------------------------------------------------------
export function useChangeOrders(jobId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.listByJob(jobId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_orders")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as ChangeOrder[]
    },
    enabled: !!jobId,
  })
}

// ---------------------------------------------------------------------------
// useChangeOrder — single CO detail
// ---------------------------------------------------------------------------
export function useChangeOrder(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_orders")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      return data as unknown as ChangeOrder
    },
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// useCreateChangeOrder
// ---------------------------------------------------------------------------
export interface CreateChangeOrderInput {
  job_id: string
  unit_id: string
  description: string
  reason_category: ChangeOrder["reason_category"]
  cost_impact: number
  markup_pct: number
  total_with_markup: number
  schedule_impact_days: number
  linked_po_id?: string | null
}

export function useCreateChangeOrder() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateChangeOrderInput) => {
      const threshold = getApprovalThreshold(input.total_with_markup)

      // Generate the next CO number for this job
      const { count } = await supabase
        .from("change_orders")
        .select("id", { count: "exact", head: true })
        .eq("job_id", input.job_id)

      const coNumber = `CO-${String((count ?? 0) + 1).padStart(3, "0")}`

      const { data, error } = await supabase
        .from("change_orders")
        .insert({
          ...input,
          co_number: coNumber,
          approval_status: "pending" as const,
          approval_threshold: threshold,
        })
        .select()
        .single()

      if (error) throw error
      return data as unknown as ChangeOrder
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.listByJob(vars.job_id) })
    },
  })
}

// ---------------------------------------------------------------------------
// useApproveChangeOrder — approve + apply side effects to unit budget
// ---------------------------------------------------------------------------
export function useApproveChangeOrder() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      jobId,
      approvedBy,
      notes,
    }: {
      id: string
      jobId: string
      approvedBy: string
      notes?: string
    }) => {
      const now = new Date().toISOString()

      // Update CO status
      const { data: co, error } = await supabase
        .from("change_orders")
        .update({
          approval_status: "approved" as const,
          approved_by: approvedBy,
          approved_at: now,
          approval_notes: notes ?? null,
          updated_at: now,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      const approvedCO = co as unknown as ChangeOrder

      // --- Side effects: update the affected unit ---
      const { data: unitData } = await supabase
        .from("units")
        .select("*")
        .eq("id", approvedCO.unit_id)
        .single()

      if (unitData) {
        const unit = unitData as unknown as Unit
        const updates: Record<string, unknown> = {
          updated_at: now,
        }

        // Add CO amount to total_budget (revised budget)
        if (approvedCO.total_with_markup) {
          updates.total_budget = (unit.total_budget ?? 0) + approvedCO.total_with_markup
        }

        // If schedule impact, shift projected_completion_date
        if (approvedCO.schedule_impact_days > 0 && unit.projected_completion_date) {
          const projected = new Date(unit.projected_completion_date)
          projected.setDate(projected.getDate() + approvedCO.schedule_impact_days)
          updates.projected_completion_date = projected.toISOString()
        }

        // Recalculate builder_fee if applicable
        // builder_fee = total_contract × fee_percentage
        // We don't have fee_percentage stored, so we derive it from current ratio
        if (unit.builder_fee && unit.total_budget && unit.total_budget > 0) {
          const feePercentage = unit.builder_fee / unit.total_budget
          const newBudget = (updates.total_budget as number) ?? unit.total_budget
          updates.builder_fee = Math.round(newBudget * feePercentage * 100) / 100
        }

        await supabase.from("units").update(updates).eq("id", approvedCO.unit_id)
      }

      return approvedCO
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.listByJob(vars.jobId) })
      qc.invalidateQueries({ queryKey: keys.detail(vars.id) })
      // Also invalidate units since budget changed
      qc.invalidateQueries({ queryKey: ["units"] })
    },
  })
}

// ---------------------------------------------------------------------------
// useRejectChangeOrder
// ---------------------------------------------------------------------------
export function useRejectChangeOrder() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      jobId,
      rejectedBy,
      notes,
    }: {
      id: string
      jobId: string
      rejectedBy: string
      notes?: string
    }) => {
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from("change_orders")
        .update({
          approval_status: "rejected" as const,
          approved_by: rejectedBy,
          approved_at: now,
          approval_notes: notes ?? null,
          updated_at: now,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as ChangeOrder
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.listByJob(vars.jobId) })
      qc.invalidateQueries({ queryKey: keys.detail(vars.id) })
    },
  })
}
