"use client"

import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useProject } from "@/lib/hooks/use-projects"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineEvent {
  key: string
  label: string
  date: string | null
  status: "past" | "upcoming" | "overdue" | "none"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTimelineStatus(date: string | null): TimelineEvent["status"] {
  if (!date) return "none"
  const d = new Date(date)
  const now = new Date()
  if (d <= now) return "past"
  return "upcoming"
}

function getStatusIcon(status: TimelineEvent["status"]) {
  switch (status) {
    case "past":
      return <Check className="h-4 w-4 text-green-600" />
    case "upcoming":
      return <Clock className="h-4 w-4 text-blue-600" />
    case "overdue":
      return <AlertCircle className="h-4 w-4 text-red-600" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function getStatusBadge(status: TimelineEvent["status"]) {
  switch (status) {
    case "past":
      return (
        <Badge
          variant="secondary"
          className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        >
          Completed
        </Badge>
      )
    case "upcoming":
      return (
        <Badge
          variant="secondary"
          className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        >
          Upcoming
        </Badge>
      )
    case "overdue":
      return (
        <Badge
          variant="secondary"
          className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        >
          Overdue
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="text-[10px]">
          Not Set
        </Badge>
      )
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="space-y-6 pl-8">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProjectTimelinePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const { data: project, isLoading, error } = useProject(projectId)

  if (isLoading) return <TimelineSkeleton />

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold">Project not found</h2>
        <p className="text-sm text-muted-foreground">
          {error?.message ?? "The project could not be loaded."}
        </p>
        <Button variant="outline" onClick={() => router.push("/projects")}>
          Back to Projects
        </Button>
      </div>
    )
  }

  // Build timeline events
  const events: TimelineEvent[] = [
    {
      key: "acquisition",
      label: "Acquisition Date",
      date: project.acquisition_date,
      status: getTimelineStatus(project.acquisition_date),
    },
    {
      key: "permit",
      label: "Permit Issued",
      date: project.permit_date,
      status: getTimelineStatus(project.permit_date),
    },
    {
      key: "construction_start",
      label: "Construction Start",
      date: project.construction_start_date,
      status: getTimelineStatus(project.construction_start_date),
    },
    {
      key: "projected_completion",
      label: "Projected Completion",
      date: project.projected_completion_date,
      status: getTimelineStatus(project.projected_completion_date),
    },
    {
      key: "co",
      label: "Certificate of Occupancy",
      date: project.co_date,
      status: getTimelineStatus(project.co_date),
    },
    {
      key: "sale",
      label: "Sale Date",
      date: project.sale_date,
      status: getTimelineStatus(project.sale_date),
    },
    {
      key: "warranty",
      label: "Warranty Expiration",
      date: project.warranty_expiration_date,
      status: getTimelineStatus(project.warranty_expiration_date),
    },
  ]

  // Check for overdue dates
  const eventsWithOverdue = events.map((evt) => {
    if (
      evt.date &&
      evt.status === "past" &&
      evt.key === "projected_completion" &&
      project.status !== "complete" &&
      project.status !== "closed"
    ) {
      return { ...evt, status: "overdue" as const }
    }
    return evt
  })

  const hasAnyDates = eventsWithOverdue.some((e) => e.date !== null)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}`)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Project
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Timeline</h1>
          <p className="text-sm text-muted-foreground">
            {project.project_number} &mdash; {project.name}
          </p>
        </div>
      </div>

      {!hasAnyDates ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">No dates set</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Edit the project to add key dates and milestones.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}`)}
            >
              Edit Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-8">
                {eventsWithOverdue.map((evt) => (
                  <div key={evt.key} className="relative flex items-start gap-6 pl-2">
                    {/* Dot */}
                    <div
                      className={cn(
                        "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-background",
                        evt.status === "past"
                          ? "border-green-500"
                          : evt.status === "overdue"
                            ? "border-red-500"
                            : evt.status === "upcoming"
                              ? "border-blue-500"
                              : "border-muted-foreground/30"
                      )}
                    >
                      {getStatusIcon(evt.status)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{evt.label}</span>
                        {getStatusBadge(evt.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {evt.date ? formatDate(evt.date) : "Date not set"}
                      </div>
                      {evt.status === "overdue" && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          This milestone is overdue. The project has not been marked complete.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase timeline for lot development */}
      {(project.type === "lot_development" || project.type === "community_development") &&
        project.total_lots != null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Development Phases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Phase tracking for {project.total_lots} lots across the development.
                Individual lot phases are managed in the Budget & Actuals page under the Lot table.
              </p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/projects/${projectId}/budget`)}
                >
                  View Lot Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  )
}
