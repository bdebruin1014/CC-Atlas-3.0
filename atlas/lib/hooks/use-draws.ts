"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { DrawScheduleItem } from "@/lib/construction/accounting-types"

async function fetchDrawSchedule(jobId: string): Promise<{ data: DrawScheduleItem[] }> {
  const res = await fetch(`/api/construction/draws?job_id=${jobId}`)
  if (!res.ok) throw new Error("Failed to fetch draw schedule")
  return res.json()
}

export function useDrawSchedule(jobId: string) {
  return useQuery({
    queryKey: ["draw-schedule", jobId],
    queryFn: () => fetchDrawSchedule(jobId),
    enabled: !!jobId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useInitializeDrawSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { job_id: string; contract_amount: number }) => {
      const res = await fetch("/api/construction/draws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to initialize draw schedule")
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["draw-schedule", variables.job_id] })
    },
  })
}

export function useRequestDraw() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (drawId: string) => {
      const res = await fetch(`/api/construction/draws/${drawId}/request`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to request draw")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draw-schedule"] })
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] })
    },
  })
}
