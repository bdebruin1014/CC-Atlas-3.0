"use client"

import { useRouter, useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MilestoneTracker } from "@/components/construction/milestone-tracker"
import {
  MOCK_UNITS_JOB001,
  generateMilestones,
} from "@/lib/construction/mock-data"
import { CONSTRUCTION_PHASES } from "@/lib/construction/types"
import { cn, formatDate } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  Loader2,
  Lock,
  Clock,
  AlertTriangle,
  ClipboardCheck,
  FileText,
} from "lucide-react"
import type { MilestoneStatus } from "@/lib/construction/types"

export default function MilestonesPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const unitId = params.unitId as string

  const unit = MOCK_UNITS_JOB001.find((u) => u.id === unitId)

  if (!unit) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold">Unit not found</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/construction/jobs/${jobId}`)}
        >
          Back to Job
        </Button>
      </div>
    )
  }

  const milestones = generateMilestones(unitId, unit.current_phase)

  const handleAdvance = (phaseNumber: number) => {
    alert(`Advancing from Phase ${phaseNumber} to Phase ${phaseNumber + 1}`)
  }

  const handleOverride = (phaseNumber: number, note: string) => {
    alert(`Override Phase ${phaseNumber}: ${note}`)
  }

  const statusIcons: Record<MilestoneStatus, React.ReactNode> = {
    completed: <Check className="h-4 w-4 text-green-600" />,
    in_progress: <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />,
    not_started: <Lock className="h-4 w-4 text-gray-400" />,
    overdue: <Clock className="h-4 w-4 text-red-600" />,
    blocked: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push(`/construction/jobs/${jobId}/units/${unitId}`)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Unit {unit.unit_number}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Milestone Tracker - {unit.unit_number}
        </h1>
        <p className="text-sm text-muted-foreground">
          {unit.floor_plan_name} &middot; {unit.address}
        </p>
      </div>

      {/* Visual Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Construction Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MilestoneTracker
            unitId={unitId}
            milestones={milestones}
            onAdvance={handleAdvance}
            onOverride={handleOverride}
          />
        </CardContent>
      </Card>

      {/* Detailed Phase List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Milestone Details</h2>
        {milestones.map((ms) => {
          const phase = CONSTRUCTION_PHASES.find(
            (p) => p.number === ms.phase_number
          )
          if (!phase) return null

          const plannedDays = ms.planned_duration
          const actualDays = ms.actual_duration
          const daysDiff =
            actualDays != null ? actualDays - plannedDays : null
          const isOverdue =
            ms.status === "in_progress" &&
            new Date(ms.planned_end) < new Date()

          return (
            <Card
              key={ms.id}
              className={cn(
                ms.status === "in_progress" &&
                  "border-blue-200 dark:border-blue-800",
                isOverdue && "border-red-200 dark:border-red-800"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">{statusIcons[ms.status]}</div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">
                          Phase {phase.number}: {phase.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize",
                            ms.status === "completed" &&
                              "border-green-400 text-green-700",
                            ms.status === "in_progress" &&
                              "border-blue-400 text-blue-700",
                            ms.status === "overdue" &&
                              "border-red-400 text-red-700",
                            ms.status === "blocked" &&
                              "border-yellow-400 text-yellow-700"
                          )}
                        >
                          {ms.status.replace("_", " ")}
                        </Badge>
                        {isOverdue && (
                          <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Overdue
                          </Badge>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            Planned Start:
                          </span>{" "}
                          <span className="font-medium">
                            {formatDate(ms.planned_start, { short: true })}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Planned End:
                          </span>{" "}
                          <span className="font-medium">
                            {formatDate(ms.planned_end, { short: true })}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Actual Start:
                          </span>{" "}
                          <span className="font-medium">
                            {ms.actual_start
                              ? formatDate(ms.actual_start, { short: true })
                              : "--"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Actual End:
                          </span>{" "}
                          <span className="font-medium">
                            {ms.actual_end
                              ? formatDate(ms.actual_end, { short: true })
                              : "--"}
                          </span>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">
                          Duration: {plannedDays}d planned
                          {actualDays != null && (
                            <span
                              className={cn(
                                "ml-1 font-medium",
                                daysDiff != null && daysDiff > 2
                                  ? "text-red-600"
                                  : daysDiff != null && daysDiff > 0
                                  ? "text-yellow-600"
                                  : "text-green-600"
                              )}
                            >
                              / {actualDays}d actual (
                              {daysDiff != null && daysDiff > 0 ? "+" : ""}
                              {daysDiff}d)
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Inspections */}
                      {ms.inspections.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <ClipboardCheck className="h-3 w-3" />
                            Required Inspections:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {ms.inspections.map((insp) => (
                              <Badge
                                key={insp.id}
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  insp.result === "pass"
                                    ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                    : insp.result === "fail"
                                    ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                                    : insp.result === "conditional"
                                    ? "border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                                    : ""
                                )}
                              >
                                {insp.type}
                                {insp.result === "pass" && (
                                  <Check className="ml-1 h-3 w-3" />
                                )}
                                {!insp.result && " - Pending"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
