"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Investor, CapitalCall } from "@/lib/types/accounting"

async function fetchInvestors(entityId: string): Promise<{ data: Investor[] }> {
  const res = await fetch(`/api/accounting/investors?entity_id=${entityId}`)
  if (!res.ok) throw new Error("Failed to fetch investors")
  return res.json()
}

async function fetchCapitalCalls(entityId: string): Promise<{ data: CapitalCall[] }> {
  const res = await fetch(`/api/accounting/capital-calls?entity_id=${entityId}`)
  if (!res.ok) throw new Error("Failed to fetch capital calls")
  return res.json()
}

export function useInvestors(entityId: string) {
  return useQuery({
    queryKey: ["investors", entityId],
    queryFn: () => fetchInvestors(entityId),
    enabled: !!entityId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useCapitalCalls(entityId: string) {
  return useQuery({
    queryKey: ["capital-calls", entityId],
    queryFn: () => fetchCapitalCalls(entityId),
    enabled: !!entityId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useCreateInvestor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/accounting/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create investor")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] })
    },
  })
}

export function useCreateCapitalCall() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/accounting/capital-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create capital call")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capital-calls"] })
    },
  })
}

export function useIssueCapitalCall() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (callId: string) => {
      const res = await fetch(`/api/accounting/capital-calls/${callId}/issue`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to issue capital call")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capital-calls"] })
    },
  })
}

export function useRecordCapitalCallResponse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      callId,
      responseId,
      ...data
    }: {
      callId: string
      responseId: string
      amount_received: number
      received_date: string
    }) => {
      const res = await fetch(
        `/api/accounting/capital-calls/${callId}/responses/${responseId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to record response")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capital-calls"] })
      queryClient.invalidateQueries({ queryKey: ["investors"] })
    },
  })
}
