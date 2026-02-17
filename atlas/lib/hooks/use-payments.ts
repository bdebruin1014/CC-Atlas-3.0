"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { APPayment } from "@/lib/construction/accounting-types"

interface PaymentFilters {
  vendor_contact_id?: string
  date_from?: string
  date_to?: string
  payment_method?: string
  status?: string
  batch_id?: string
  limit?: number
  offset?: number
}

async function fetchPayments(filters: PaymentFilters): Promise<{ data: APPayment[]; count: number }> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  })
  const res = await fetch(`/api/construction/payments?${params}`)
  if (!res.ok) throw new Error("Failed to fetch payments")
  return res.json()
}

export function usePayments(filters: PaymentFilters = {}) {
  return useQuery({
    queryKey: ["ap-payments", filters],
    queryFn: () => fetchPayments(filters),
  })
}

export function useCreatePaymentRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      invoice_ids: string[]
      payment_method: string
      payment_date: string
      bank_account?: string
    }) => {
      const res = await fetch("/api/construction/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to process payment run")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] })
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] })
    },
  })
}

export function useVoidPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await fetch(`/api/construction/payments/${paymentId}/void`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to void payment")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] })
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] })
    },
  })
}
