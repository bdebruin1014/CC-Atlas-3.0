"use client"

import { useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GanttChart } from "@/components/construction/gantt-chart"
import {
  MOCK_JOBS,
  MOCK_UNITS_JOB001,
  generateMilestones,
} from "@/lib/construction/mock-data"

export default function SchedulePage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const job = MOCK_JOBS.find((j) => j.id === jobId)
  const units = jobId === "job-001" ? MOCK_UNITS_JOB001 : []

  const ganttData = useMemo(
    () =>
      units
        .filter((u) => u.status !== "not_started")
        .map((unit) => ({
          unit,
          milestones: generateMilestones(unit.id, unit.current_phase),
        })),
    [units]
  )

  const startDate = job?.start_date || "2025-03-01"
  const endDate = job?.projected_completion || "2026-12-31"

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

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/construction/jobs/${jobId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {job.name}
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Schedule - {job.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Gantt chart showing all unit milestones across the project
              timeline
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span>
          {units.length} total units &middot;{" "}
          {units.filter((u) => u.status === "in_progress").length} in progress
          &middot;{" "}
          {units.filter((u) => u.status === "complete").length} complete
        </span>
      </div>

      {/* Gantt Chart */}
      {ganttData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="mb-1 text-lg font-semibold">
              No active units to display
            </h3>
            <p className="text-sm text-muted-foreground">
              Units must be in progress to appear on the Gantt chart.
            </p>
          </CardContent>
        </Card>
      ) : (
        <GanttChart
          units={ganttData}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  )
}
