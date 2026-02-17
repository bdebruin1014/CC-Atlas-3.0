"use client"

import { useMemo, useRef, useState } from "react"
import { cn, formatDate } from "@/lib/utils/format"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { CONSTRUCTION_PHASES } from "@/lib/construction/types"
import type { Unit, Milestone } from "@/lib/construction/types"

interface GanttUnit {
  unit: Unit
  milestones: Milestone[]
}

interface GanttChartProps {
  units: GanttUnit[]
  startDate: string
  endDate: string
}

const SCHEDULE_COLORS = {
  on_schedule: "bg-green-500/80 hover:bg-green-500",
  behind_1_7: "bg-yellow-500/80 hover:bg-yellow-500",
  behind_8_plus: "bg-red-500/80 hover:bg-red-500",
  complete: "bg-blue-500/80 hover:bg-blue-500",
  not_started: "bg-gray-300/80 hover:bg-gray-400 dark:bg-gray-600/80 dark:hover:bg-gray-500",
}

const ROW_HEIGHT = 40
const HEADER_HEIGHT = 48
const LABEL_WIDTH = 140
const DAY_WIDTH = 4

function getWeeksBetween(start: Date, end: Date): Date[] {
  const weeks: Date[] = []
  const current = new Date(start)
  current.setDate(current.getDate() - current.getDay()) // start on Sunday
  while (current <= end) {
    weeks.push(new Date(current))
    current.setDate(current.getDate() + 7)
  }
  return weeks
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function GanttChart({ units, startDate, endDate }: GanttChartProps) {
  const [hoveredMilestone, setHoveredMilestone] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const chartStart = useMemo(() => new Date(startDate), [startDate])
  const chartEnd = useMemo(() => new Date(endDate), [endDate])
  const totalDays = useMemo(
    () => daysBetween(chartStart, chartEnd),
    [chartStart, chartEnd]
  )
  const chartWidth = totalDays * DAY_WIDTH
  const weeks = useMemo(
    () => getWeeksBetween(chartStart, chartEnd),
    [chartStart, chartEnd]
  )

  const today = new Date()
  const todayOffset = daysBetween(chartStart, today) * DAY_WIDTH

  const getBarPosition = (ms: Milestone) => {
    const msStart = new Date(ms.actual_start || ms.planned_start)
    const msEnd = new Date(ms.actual_end || ms.planned_end)
    const left = Math.max(0, daysBetween(chartStart, msStart) * DAY_WIDTH)
    const width = Math.max(
      DAY_WIDTH * 2,
      daysBetween(msStart, msEnd) * DAY_WIDTH
    )
    return { left, width }
  }

  const getMilestoneColor = (ms: Milestone, unit: Unit): string => {
    if (ms.status === "completed") return SCHEDULE_COLORS.complete
    if (ms.status === "not_started") return SCHEDULE_COLORS.not_started
    if (unit.schedule_status === "behind_8_plus")
      return SCHEDULE_COLORS.behind_8_plus
    if (unit.schedule_status === "behind_1_7")
      return SCHEDULE_COLORS.behind_1_7
    return SCHEDULE_COLORS.on_schedule
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="rounded-lg border border-border overflow-hidden">
        <ScrollArea className="w-full">
          <div
            className="relative"
            style={{ width: LABEL_WIDTH + chartWidth + 40 }}
            ref={containerRef}
          >
            {/* Header Row - Week Labels */}
            <div
              className="sticky top-0 z-20 flex border-b border-border bg-muted/80 backdrop-blur-sm"
              style={{ height: HEADER_HEIGHT }}
            >
              {/* Unit label column header */}
              <div
                className="sticky left-0 z-30 flex items-center border-r border-border bg-muted px-3 text-xs font-medium text-muted-foreground"
                style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
              >
                Unit
              </div>
              {/* Week columns */}
              <div className="relative flex-1">
                {weeks.map((week, i) => {
                  const offset = daysBetween(chartStart, week) * DAY_WIDTH
                  return (
                    <div
                      key={i}
                      className="absolute top-0 flex flex-col items-start border-l border-border/50 px-1"
                      style={{
                        left: offset,
                        height: HEADER_HEIGHT,
                        width: 7 * DAY_WIDTH,
                      }}
                    >
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {week.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-[9px] text-muted-foreground/70">
                        {week.toLocaleDateString("en-US", { year: "2-digit" })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Unit Rows */}
            {units.map(({ unit, milestones }, rowIdx) => (
              <div
                key={unit.id}
                className={cn(
                  "flex border-b border-border/50",
                  rowIdx % 2 === 0
                    ? "bg-background"
                    : "bg-muted/20"
                )}
                style={{ height: ROW_HEIGHT }}
              >
                {/* Unit Label */}
                <div
                  className="sticky left-0 z-10 flex items-center border-r border-border bg-inherit px-3"
                  style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                >
                  <div className="truncate">
                    <span className="text-xs font-medium">
                      {unit.unit_number}
                    </span>
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      {unit.floor_plan_name}
                    </span>
                  </div>
                </div>

                {/* Bars */}
                <div className="relative flex-1">
                  {/* Week grid lines */}
                  {weeks.map((week, i) => {
                    const offset = daysBetween(chartStart, week) * DAY_WIDTH
                    return (
                      <div
                        key={i}
                        className="absolute top-0 h-full border-l border-border/20"
                        style={{ left: offset }}
                      />
                    )
                  })}

                  {/* Today line */}
                  {todayOffset > 0 && todayOffset < chartWidth && (
                    <div
                      className="absolute top-0 h-full w-px bg-red-500/60 z-10"
                      style={{ left: todayOffset }}
                    />
                  )}

                  {/* Milestone bars */}
                  {milestones
                    .filter((ms) => ms.status !== "not_started" || ms.planned_start)
                    .map((ms) => {
                      const { left, width } = getBarPosition(ms)
                      const barColor = getMilestoneColor(ms, unit)
                      const barId = `${unit.id}-${ms.phase_number}`
                      const phase = CONSTRUCTION_PHASES.find(
                        (p) => p.number === ms.phase_number
                      )

                      return (
                        <Tooltip key={ms.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 rounded-sm cursor-pointer transition-all",
                                barColor,
                                hoveredMilestone === barId
                                  ? "ring-2 ring-foreground/30 scale-y-125"
                                  : "scale-y-100"
                              )}
                              style={{
                                left,
                                width,
                                height: ROW_HEIGHT * 0.55,
                              }}
                              onMouseEnter={() => setHoveredMilestone(barId)}
                              onMouseLeave={() => setHoveredMilestone(null)}
                            />
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">
                                {unit.unit_number} - Phase {ms.phase_number}:{" "}
                                {phase?.name}
                              </p>
                              <p className="text-xs capitalize">
                                Status: {ms.status.replace("_", " ")}
                              </p>
                              <p className="text-xs">
                                {formatDate(ms.actual_start || ms.planned_start)}{" "}
                                - {formatDate(ms.actual_end || ms.planned_end)}
                              </p>
                              {ms.planned_duration && (
                                <p className="text-xs">
                                  Duration: {ms.actual_duration ?? ms.planned_duration} days
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                </div>
              </div>
            ))}

            {/* Today marker in header */}
            {todayOffset > 0 && todayOffset < chartWidth && (
              <div
                className="absolute z-30 flex items-center"
                style={{
                  left: LABEL_WIDTH + todayOffset - 16,
                  top: 2,
                }}
              >
                <span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  Today
                </span>
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 bg-muted/30">
          <span className="text-xs text-muted-foreground">Legend:</span>
          {[
            { color: "bg-green-500", label: "On Schedule" },
            { color: "bg-yellow-500", label: "1-7 Days Behind" },
            { color: "bg-red-500", label: "8+ Days Behind" },
            { color: "bg-blue-500", label: "Complete" },
            { color: "bg-gray-400", label: "Not Started" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={cn("h-2.5 w-5 rounded-sm", item.color)} />
              <span className="text-[10px] text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
