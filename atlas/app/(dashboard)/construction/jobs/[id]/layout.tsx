"use client"

import { createContext, useContext } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  HardHat,
  Loader2,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/construction/job-dashboard"
import { useJob } from "@/lib/hooks/use-jobs"
import type { Job } from "@/lib/hooks/use-jobs"
import { useUnits } from "@/lib/hooks/use-units"
import type { Unit } from "@/lib/hooks/use-units"
import { JOB_STATUS_CONFIG } from "@/lib/construction/types"
import type { JobStatus } from "@/lib/construction/types"
import { useTabNavigation } from "@/lib/hooks/use-tab-navigation"

// ---------------------------------------------------------------------------
// Job Context
// ---------------------------------------------------------------------------

export interface JobContextValue {
  job: Job
  units: Unit[]
  jobId: string
  isLoading: boolean
}

export const JobContext = createContext<JobContextValue | null>(null)

export function useJobContext() {
  const ctx = useContext(JobContext)
  if (!ctx) {
    throw new Error("useJobContext must be used within a JobContext provider (job detail layout)")
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function JobDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const { data: job, isLoading: jobLoading } = useJob(jobId)
  const { data: units = [], isLoading: unitsLoading } = useUnits(jobId)

  // Register open-records tab
  useTabNavigation({
    id: jobId,
    label: job?.name || "Loading...",
    module: "job",
  })

  if (jobLoading || unitsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold">Job not found</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/construction")}
        >
          Back to Construction
        </Button>
      </div>
    )
  }

  const statusConfig =
    JOB_STATUS_CONFIG[(job.status as JobStatus) ?? "active"] ??
    JOB_STATUS_CONFIG.active

  const unitsComplete = units.filter(
    (u) => (u.current_milestone ?? 0) >= 6
  ).length
  const unitsInProgress = units.filter(
    (u) => (u.current_milestone ?? 0) > 0 && (u.current_milestone ?? 0) < 6
  ).length

  return (
    <JobContext.Provider value={{ job, units, jobId, isLoading: false }}>
      <div className="flex flex-col gap-6 p-6">
        {/* Job Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/construction")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-mono text-muted-foreground">
                {job.job_number}
              </span>
              <h1 className="text-2xl font-bold tracking-tight">{job.name}</h1>
              <Badge className={cn("text-xs", statusConfig.bgColor)}>
                {statusConfig.label}
              </Badge>
              {job.state && <Badge variant="outline">{job.state}</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {job.unit_count} units
                {unitsComplete > 0 && ` (${unitsComplete} complete`}
                {unitsComplete > 0 && unitsInProgress > 0 && `, ${unitsInProgress} active`}
                {unitsComplete > 0 && ")"}
              </span>
              {job.superintendent_id && (
                <span className="flex items-center gap-1">
                  <HardHat className="h-3.5 w-3.5" />
                  Superintendent assigned
                </span>
              )}
              {(job.start_date || job.projected_completion) && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {job.start_date && formatDate(job.start_date)}
                  {job.start_date && job.projected_completion && " - "}
                  {job.projected_completion && formatDate(job.projected_completion)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Contract Value"
            value={formatCurrency(job.contract_amount ?? 0, { compact: true })}
            icon={<Building2 className="h-4 w-4" />}
            subtitle={
              job.builder_fee
                ? `Fee: ${formatCurrency(job.builder_fee, { compact: true })}`
                : undefined
            }
          />
          <StatCard
            title="Units"
            value={`${unitsComplete}/${job.unit_count}`}
            icon={<HardHat className="h-4 w-4" />}
            subtitle={`${unitsInProgress} in progress`}
          />
          <StatCard
            title="Status"
            value={statusConfig.label}
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <StatCard
            title="State"
            value={job.state ?? "N/A"}
            icon={<Building2 className="h-4 w-4" />}
          />
        </div>

        {/* Page Content */}
        {children}
      </div>
    </JobContext.Provider>
  )
}
