"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { APInvoice } from "@/lib/construction/accounting-types"

interface APInvoiceFilters {
  job_id?: string
  unit_id?: string
  vendor_contact_id?: string
  status?: string
  due_date_from?: string
  due_date_to?: string
  aging_bucket?: string
  search?: string
  limit?: number
  offset?: number
}

async function fetchAPInvoices(filters: APInvoiceFilters): Promise<{ data: APInvoice[]; count: number }> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  })
  const res = await fetch(`/api/construction/invoices?${params}`)
  if (!res.ok) throw new Error("Failed to fetch invoices")
  return res.json()
}

export function useAPInvoices(filters: APInvoiceFilters = {}) {
  return useQuery({
    queryKey: ["ap-invoices", filters],
    queryFn: () => fetchAPInvoices(filters),
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useCreateAPInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/construction/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create invoice")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] })
    },
  })
}

export function useApproveAPInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await fetch(`/api/construction/invoices/${invoiceId}/approve`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to approve invoice")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] })
    },
  })
}
