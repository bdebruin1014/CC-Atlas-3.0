"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Entity } from "@/lib/types/accounting"

interface EntityFilters {
  use_type?: string
  status?: string
  parent_entity_id?: string
  search?: string
  limit?: number
  offset?: number
}

async function fetchEntities(filters: EntityFilters): Promise<{ data: Entity[]; count: number }> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  })
  const res = await fetch(`/api/accounting/entities?${params}`)
  if (!res.ok) throw new Error("Failed to fetch entities")
  return res.json()
}

async function fetchEntity(id: string): Promise<{ data: Entity }> {
  const res = await fetch(`/api/accounting/entities/${id}`)
  if (!res.ok) throw new Error("Failed to fetch entity")
  return res.json()
}

export function useEntities(filters: EntityFilters = {}) {
  return useQuery({
    queryKey: ["entities", filters],
    queryFn: () => fetchEntities(filters),
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useEntity(id: string) {
  return useQuery({
    queryKey: ["entity", id],
    queryFn: () => fetchEntity(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useCreateEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/accounting/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create entity")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] })
    },
  })
}

export function useUpdateEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/accounting/entities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update entity")
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entity", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["entities"] })
    },
  })
}
