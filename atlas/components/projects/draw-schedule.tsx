"use client"

import {
  Check,
  Clock,
  CircleDot,
  Send,
  AlertTriangle,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useProjectDraws,
  DEFAULT_DRAWS,
  type DrawStatus,
} from "@/lib/hooks/use-projects"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DrawScheduleProps {
  projectId: string
  contractAmount: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDrawStatusIcon(status: DrawStatus) {
  switch (status) {
    case "paid":
      return <Check className="h-4 w-4 text-green-600" />
    case "approved":
      return <CircleDot className="h-4 w-4 text-blue-600" />
    case "requested":
      return <Send className="h-4 w-4 text-orange-600" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function getDrawStatusColor(status: DrawStatus): string {
  const colors: Record<DrawStatus, string> = {
    pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    requested: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  }
  return colors[status] ?? ""
}

function getDrawStatusLabel(status: DrawStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DrawSchedule({ projectId, contractAmount }: DrawScheduleProps) {
  const { draws, loading, error, refetch, updateDrawStatus } = useProjectDraws(projectId)

  // If no draws exist in DB, show the default template
  const displayDraws =
    draws.length > 0
      ? draws
      : DEFAULT_DRAWS.map((d) => ({
          id: `default-${d.draw_number}`,
          project_id: projectId,
          draw_number: d.draw_number,
          name: d.name,
          percentage: d.percentage,
          amount: (contractAmount * d.percentage) / 100,
          status: "pending" as DrawStatus,
          requested_date: null,
          paid_date: null,
          created_at: "",
        }))

  const totalPaid = displayDraws
    .filter((d) => d.status === "paid")
    .reduce((sum, d) => sum + d.amount, 0)

  const paidPct = contractAmount > 0 ? (totalPaid / contractAmount) * 100 : 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 p-6">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="text-sm text-destructive">{error}</div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Draw Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatCurrency(totalPaid)} of {formatCurrency(contractAmount)} paid
            </span>
            <span className="font-medium">{formatPercent(paidPct, 0)}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            {displayDraws.map((draw) => {
              const segmentWidth = (draw.percentage / 100) * 100
              const isPaid = draw.status === "paid"
              return (
                <div
                  key={draw.id}
                  className={cn(
                    "h-full float-left transition-all",
                    isPaid
                      ? "bg-green-500"
                      : draw.status === "approved"
                        ? "bg-blue-300"
                        : draw.status === "requested"
                          ? "bg-orange-300"
                          : "bg-muted-foreground/20"
                  )}
                  style={{ width: `${segmentWidth}%` }}
                />
              )
            })}
          </div>
        </div>

        {/* Draw list */}
        <div className="space-y-3">
          {displayDraws.map((draw) => {
            const isDefault = draw.id.startsWith("default-")

            return (
              <div
                key={draw.id}
                className={cn(
                  "flex items-center gap-4 rounded-lg border border-border p-4 transition-colors",
                  draw.status === "paid" && "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                )}
              >
                {/* Status icon */}
                <div className="flex-shrink-0">{getDrawStatusIcon(draw.status)}</div>

                {/* Draw info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      Draw {draw.draw_number}: {draw.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px]", getDrawStatusColor(draw.status))}
                    >
                      {getDrawStatusLabel(draw.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                    <span>{draw.percentage}%</span>
                    <span className="font-medium">{formatCurrency(draw.amount)}</span>
                    {draw.paid_date && (
                      <span>Paid {formatDate(draw.paid_date, { short: true })}</span>
                    )}
                    {draw.requested_date && draw.status !== "paid" && (
                      <span>
                        Requested {formatDate(draw.requested_date, { short: true })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isDefault && (
                  <div className="flex-shrink-0">
                    {draw.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateDrawStatus(draw.id, "requested")}
                      >
                        <Send className="mr-1.5 h-3 w-3" />
                        Request
                      </Button>
                    )}
                    {draw.status === "requested" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateDrawStatus(draw.id, "approved")}
                      >
                        Approve
                      </Button>
                    )}
                    {draw.status === "approved" && (
                      <Button
                        size="sm"
                        onClick={() => updateDrawStatus(draw.id, "paid")}
                      >
                        <Check className="mr-1.5 h-3 w-3" />
                        Mark Paid
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
