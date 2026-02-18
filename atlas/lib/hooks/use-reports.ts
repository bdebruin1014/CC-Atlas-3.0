"use client"

import { useQuery } from "@tanstack/react-query"

interface ReportFilters {
  entity_id: string
  report_type: string
  period_start?: string
  period_end?: string
  comparative?: boolean
}

async function fetchReport(filters: ReportFilters): Promise<{ data: Record<string, unknown> }> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  })
  const res = await fetch(`/api/accounting/reports?${params}`)
  if (!res.ok) throw new Error("Failed to fetch report")
  return res.json()
}

export function useFinancialReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ["financial-report", filters],
    queryFn: () => fetchReport(filters),
    enabled: !!filters.entity_id && !!filters.report_type,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useConsolidatedReport(filters: {
  parent_entity_id: string
  report_type: string
  period_start?: string
  period_end?: string
}) {
  return useQuery({
    queryKey: ["consolidated-report", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value))
        }
      })
      const res = await fetch(`/api/accounting/reports/consolidated?${params}`)
      if (!res.ok) throw new Error("Failed to fetch consolidated report")
      return res.json()
    },
    enabled: !!filters.parent_entity_id && !!filters.report_type,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useProjectPL(projectId: string) {
  return useQuery({
    queryKey: ["project-pl", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/accounting/reports/project-pl?project_id=${projectId}`)
      if (!res.ok) throw new Error("Failed to fetch project P&L")
      return res.json()
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useInvestorStatement(filters: {
  entity_id: string
  investor_id: string
  period?: string
}) {
  return useQuery({
    queryKey: ["investor-statement", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value))
        }
      })
      const res = await fetch(`/api/accounting/reports/investor-statement?${params}`)
      if (!res.ok) throw new Error("Failed to fetch investor statement")
      return res.json()
    },
    enabled: !!filters.entity_id && !!filters.investor_id,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}
