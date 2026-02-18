"use client"

import { useQuery } from "@tanstack/react-query"
import type { JobCostReport } from "@/lib/construction/accounting-types"

async function fetchJobCostReport(jobId: string): Promise<{ data: JobCostReport }> {
  const res = await fetch(`/api/construction/job-cost?job_id=${jobId}`)
  if (!res.ok) throw new Error("Failed to fetch job cost report")
  return res.json()
}

export function useJobCostReport(jobId: string) {
  return useQuery({
    queryKey: ["job-cost", jobId],
    queryFn: () => fetchJobCostReport(jobId),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}
