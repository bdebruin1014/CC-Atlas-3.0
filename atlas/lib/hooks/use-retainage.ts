"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { RetainageEntry } from "@/lib/construction/accounting-types"

interface RetainageFilters {
  job_id?: string
  vendor_contact_id?: string
  status?: string
}

async function fetchRetainage(filters: RetainageFilters): Promise<{ data: RetainageEntry[] }> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  })
  const res = await fetch(`/api/construction/retainage?${params}`)
  if (!res.ok) throw new Error("Failed to fetch retainage")
  return res.json()
}

export function useRetainage(filters: RetainageFilters = {}) {
  return useQuery({
    queryKey: ["retainage", filters],
    queryFn: () => fetchRetainage(filters),
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useReleaseRetainage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      retainage_ids: string[]
      payment_method: string
    }) => {
      const res = await fetch("/api/construction/retainage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to release retainage")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retainage"] })
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] })
    },
  })
}
