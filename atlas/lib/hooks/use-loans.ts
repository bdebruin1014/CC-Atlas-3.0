"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Loan, LoanDraw } from "@/lib/types/accounting"

interface LoanFilters {
  entity_id?: string
  loan_type?: string
  status?: string
  limit?: number
  offset?: number
}

async function fetchLoans(filters: LoanFilters): Promise<{ data: Loan[]; count: number }> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  })
  const res = await fetch(`/api/accounting/loans?${params}`)
  if (!res.ok) throw new Error("Failed to fetch loans")
  return res.json()
}

async function fetchLoanDraws(loanId: string): Promise<{ data: LoanDraw[] }> {
  const res = await fetch(`/api/accounting/loans/${loanId}/draws`)
  if (!res.ok) throw new Error("Failed to fetch loan draws")
  return res.json()
}

export function useLoans(filters: LoanFilters = {}) {
  return useQuery({
    queryKey: ["loans", filters],
    queryFn: () => fetchLoans(filters),
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useLoanDraws(loanId: string) {
  return useQuery({
    queryKey: ["loan-draws", loanId],
    queryFn: () => fetchLoanDraws(loanId),
    enabled: !!loanId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useCreateLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/accounting/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create loan")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
  })
}

export function useRequestLoanDraw() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      loanId,
      ...data
    }: {
      loanId: string
      amount: number
      description?: string
    }) => {
      const res = await fetch(`/api/accounting/loans/${loanId}/draws`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to request draw")
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loan-draws", variables.loanId] })
      queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
  })
}

export function useApproveLoanDraw() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ loanId, drawId }: { loanId: string; drawId: string }) => {
      const res = await fetch(`/api/accounting/loans/${loanId}/draws/${drawId}/approve`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to approve draw")
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loan-draws", variables.loanId] })
      queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
  })
}

export function useRunInterestAccrual() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { entity_id: string; period: string }) => {
      const res = await fetch("/api/accounting/loans/interest-accrual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to run interest accrual")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}
