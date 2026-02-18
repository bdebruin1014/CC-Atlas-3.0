"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react"
import { usePunchItems, PUNCH_ROOM_CONFIG } from "@/lib/hooks/use-punch-items"
import type { PunchItemRoom } from "@/lib/supabase/types"

interface PreCOChecklistProps {
  unitId: string
  onNavigateToRoom?: (room: PunchItemRoom) => void
}

export function PreCOChecklist({
  unitId,
  onNavigateToRoom,
}: PreCOChecklistProps) {
  const { data: items = [], isLoading } = usePunchItems(unitId)

  // Current round items only
  const currentRound = useMemo(
    () => (items.length > 0 ? Math.max(...items.map((i) => i.round)) : 1),
    [items]
  )

  const roundItems = useMemo(
    () => items.filter((i) => i.round === currentRound),
    [items, currentRound]
  )

  // Summary counts
  const summary = useMemo(() => {
    return {
      total: roundItems.length,
      open: roundItems.filter((i) => i.status === "open").length,
      inProgress: roundItems.filter((i) => i.status === "in_progress").length,
      complete: roundItems.filter((i) => i.status === "complete").length,
      verified: roundItems.filter((i) => i.status === "verified").length,
      disputed: roundItems.filter((i) => i.status === "disputed").length,
    }
  }, [roundItems])

  const allVerified = summary.total > 0 && summary.verified === summary.total
  const remaining =
    summary.total - summary.verified
  const verifiedPct =
    summary.total > 0 ? (summary.verified / summary.total) * 100 : 100

  // Room breakdown
  const roomBreakdown = useMemo(() => {
    const map = new Map<
      PunchItemRoom,
      { total: number; open: number; verified: number }
    >()

    for (const item of roundItems) {
      if (!map.has(item.room)) {
        map.set(item.room, { total: 0, open: 0, verified: 0 })
      }
      const entry = map.get(item.room)!
      entry.total++
      if (
        item.status === "open" ||
        item.status === "in_progress" ||
        item.status === "disputed"
      ) {
        entry.open++
      }
      if (item.status === "verified") {
        entry.verified++
      }
    }

    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.open - a.open) // sort by open count desc
  }, [roundItems])

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Loading checklist...
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pre-CO Checklist</CardTitle>
          {allVerified ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Ready for CO
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
              {remaining} item{remaining !== 1 ? "s" : ""} remaining
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {summary.verified} / {summary.total} verified
            </span>
            <span className="font-medium">
              {Math.round(verifiedPct)}%
            </span>
          </div>
          <Progress value={verifiedPct} className="h-2" />
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-5 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-600">{summary.open}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-600">
              {summary.inProgress}
            </p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-600">
              {summary.complete}
            </p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-700">
              {summary.verified}
            </p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </div>
        </div>

        {/* Room-by-room breakdown */}
        {roomBreakdown.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              By Room
            </p>
            {roomBreakdown.map(([room, counts]) => {
              const roomVerifiedPct =
                counts.total > 0
                  ? (counts.verified / counts.total) * 100
                  : 100

              return (
                <button
                  key={room}
                  onClick={() => onNavigateToRoom?.(room)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                    counts.open > 0 && "bg-red-50/50 dark:bg-red-950/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        counts.open > 0 ? "bg-red-500" : "bg-green-500"
                      )}
                    />
                    <span>{PUNCH_ROOM_CONFIG[room].label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {counts.open > 0 && (
                      <span className="text-xs text-red-600 font-medium">
                        {counts.open} open
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {counts.verified}/{counts.total}
                    </span>
                    {onNavigateToRoom && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* No items state */}
        {roundItems.length === 0 && (
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
            <p className="text-sm text-muted-foreground">
              No punch items recorded. Unit is clear for CO.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
