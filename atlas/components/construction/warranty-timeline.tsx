"use client"

import { useMemo } from "react"
import { Shield, Check, Clock, AlertTriangle, ChevronRight } from "lucide-react"
import { cn, formatDate } from "@/lib/utils/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WARRANTY_TIMELINE } from "@/lib/construction/types"

interface WarrantyTimelineProps {
  coDate: string | null | undefined
  unitId: string
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function WarrantyTimeline({ coDate, unitId }: WarrantyTimelineProps) {
  const milestones = useMemo(() => {
    if (!coDate) return []
    const co = new Date(coDate)
    const now = new Date()

    return WARRANTY_TIMELINE.map((wm) => {
      const dueDate = addDays(co, wm.offsetDays)
      const isPast = now > dueDate
      const isUpcoming = !isPast && dueDate.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000
      return {
        ...wm,
        dueDate,
        isPast,
        isUpcoming,
      }
    })
  }, [coDate])

  if (!coDate) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-1 text-lg font-semibold">Warranty starts after CO</h3>
          <p className="text-sm text-muted-foreground">
            Warranty tracking begins once Certificate of Occupancy is issued.
          </p>
        </CardContent>
      </Card>
    )
  }

  const warrantyExpiration = addDays(new Date(coDate), 365)
  const systemsExpiration = addDays(new Date(coDate), 730)
  const structuralExpiration = addDays(new Date(coDate), 1825)
  const now = new Date()
  const workmanshipActive = now <= warrantyExpiration
  const daysRemaining = workmanshipActive
    ? Math.ceil((warrantyExpiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="space-y-4">
      {/* Warranty Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn(workmanshipActive ? "border-green-200 dark:border-green-800" : "border-gray-200")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {workmanshipActive ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
              ) : (
                <Badge variant="outline">Expired</Badge>
              )}
            </div>
            <p className="text-sm font-medium">1-Year Workmanship</p>
            <p className="text-xs text-muted-foreground">
              Expires: {formatDate(warrantyExpiration.toISOString())}
            </p>
            {workmanshipActive && (
              <p className="text-xs font-medium text-green-700 mt-1">{daysRemaining} days remaining</p>
            )}
          </CardContent>
        </Card>

        <Card className={cn(now <= systemsExpiration ? "border-blue-200 dark:border-blue-800" : "border-gray-200")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {now <= systemsExpiration ? (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Active</Badge>
              ) : (
                <Badge variant="outline">Expired</Badge>
              )}
            </div>
            <p className="text-sm font-medium">2-Year Systems</p>
            <p className="text-xs text-muted-foreground">
              Expires: {formatDate(systemsExpiration.toISOString())}
            </p>
          </CardContent>
        </Card>

        <Card className={cn(now <= structuralExpiration ? "border-purple-200 dark:border-purple-800" : "border-gray-200")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {now <= structuralExpiration ? (
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Active</Badge>
              ) : (
                <Badge variant="outline">Expired</Badge>
              )}
            </div>
            <p className="text-sm font-medium">5-Year Structural</p>
            <p className="text-xs text-muted-foreground">
              Expires: {formatDate(structuralExpiration.toISOString())}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Warranty Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {/* CO Date entry */}
          <div className="flex items-center gap-3 py-3 border-b">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shrink-0">
              <Check className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Certificate of Occupancy Issued</p>
              <p className="text-xs text-muted-foreground">Warranty start date</p>
            </div>
            <span className="text-sm font-medium">{formatDate(coDate)}</span>
          </div>

          {milestones.map((wm, idx) => (
            <div key={idx} className={cn("flex items-center gap-3 py-3", idx < milestones.length - 1 && "border-b")}>
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                wm.isPast
                  ? "bg-gray-200 text-gray-500 dark:bg-gray-700"
                  : wm.isUpcoming
                  ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400 ring-offset-2"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
              )}>
                {wm.isPast ? (
                  <Check className="h-4 w-4" />
                ) : wm.isUpcoming ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", wm.isPast && "text-muted-foreground")}>
                  {wm.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  CO + {wm.offsetDays} days
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">{formatDate(wm.dueDate.toISOString())}</p>
                {wm.isUpcoming && (
                  <Badge className="text-xs bg-yellow-100 text-yellow-800">Upcoming</Badge>
                )}
                {wm.isPast && (
                  <Badge variant="outline" className="text-xs">Past</Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
