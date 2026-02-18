import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { DailyLog } from "@/lib/supabase/types"

const keys = {
  all: ["daily-logs"] as const,
  byJob: (jobId: string) => [...keys.all, "job", jobId] as const,
  byDate: (jobId: string, date: string) => [...keys.all, "job", jobId, date] as const,
  byMonth: (jobId: string, year: number, month: number) =>
    [...keys.all, "job", jobId, "month", year, month] as const,
  compliance: () => [...keys.all, "compliance"] as const,
}

export function useDailyLogs(jobId: string, year?: number, month?: number) {
  const supabase = createClient()

  return useQuery({
    queryKey: year && month ? keys.byMonth(jobId, year, month) : keys.byJob(jobId),
    queryFn: async () => {
      let query = supabase
        .from("daily_logs")
        .select("*")
        .eq("job_id", jobId)
        .order("log_date", { ascending: false })

      if (year && month) {
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`
        const endMonth = month === 12 ? 1 : month + 1
        const endYear = month === 12 ? year + 1 : year
        const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`
        query = query.gte("log_date", startDate).lt("log_date", endDate)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as DailyLog[]
    },
    enabled: !!jobId,
  })
}

export function useDailyLog(jobId: string, date: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.byDate(jobId, date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("job_id", jobId)
        .eq("log_date", date)
        .maybeSingle()

      if (error) throw error
      return data as unknown as DailyLog | null
    },
    enabled: !!jobId && !!date,
  })
}

export function useCreateDailyLog() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      organization_id?: string
      job_id: string
      log_date: string
      weather?: string
      temperature_high?: number
      temperature_low?: number
      wind?: string
      crew_count?: number
      subcontractors_on_site?: string[]
      work_performed: string
      materials_delivered?: string
      equipment_on_site?: string
      safety_incidents?: string
      visitor_log?: string
      delays?: string
      delay_reason?: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from("daily_logs")
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data as unknown as DailyLog
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.byJob(vars.job_id) })
      qc.invalidateQueries({ queryKey: keys.compliance() })
    },
  })
}

export function useUpdateDailyLog() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      jobId,
      ...updates
    }: Partial<DailyLog> & { id: string; jobId: string }) => {
      const { data, error } = await supabase
        .from("daily_logs")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as DailyLog
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.byJob(vars.jobId) })
      qc.invalidateQueries({ queryKey: keys.compliance() })
    },
  })
}

// Compliance data: for each active job, get log counts for a given month
export function useComplianceSummary(jobIds: string[], year: number, month: number) {
  const supabase = createClient()

  return useQuery({
    queryKey: [...keys.compliance(), year, month],
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`
      const endMonth = month === 12 ? 1 : month + 1
      const endYear = month === 12 ? year + 1 : year
      const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`

      const { data, error } = await supabase
        .from("daily_logs")
        .select("job_id, log_date")
        .in("job_id", jobIds)
        .gte("log_date", startDate)
        .lt("log_date", endDate)

      if (error) throw error
      return (data ?? []) as { job_id: string; log_date: string }[]
    },
    enabled: jobIds.length > 0,
  })
}

// Photo counts per job for a given month
export function usePhotoCountsByJob(jobIds: string[], year: number, month: number) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["construction-photos", "compliance", year, month],
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`
      const endMonth = month === 12 ? 1 : month + 1
      const endYear = month === 12 ? year + 1 : year
      const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`

      const { data, error } = await supabase
        .from("construction_photos")
        .select("job_id, id")
        .in("job_id", jobIds)
        .gte("taken_date", startDate)
        .lt("taken_date", endDate)

      if (error) throw error
      return (data ?? []) as { job_id: string; id: string }[]
    },
    enabled: jobIds.length > 0,
  })
}
