"use client"

import { useMemo, useState } from "react"
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

const ACTUAL_COLORS = {
  on_schedule: "#22c55e",
  behind_1_7: "#eab308",
  behind_8_plus: "#ef4444",
  complete: "#3b82f6",
  blocked: "#f59e0b",
  not_started: "#d1d5db",
}

const PLANNED_BORDER = "#94a3b8"
const OVERDUE_COLOR = "#ef4444"

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

  const getPlannedBar = (ms: Milestone) => {
    const start = new Date(ms.planned_start)
    const end = new Date(ms.planned_end)
    const left = Math.max(0, daysBetween(chartStart, start) * DAY_WIDTH)
    const width = Math.max(DAY_WIDTH * 2, daysBetween(start, end) * DAY_WIDTH)
    return { left, width }
  }

  const getActualBar = (ms: Milestone) => {
    if (ms.status === "not_started" && !ms.actual_start) return null
    const start = new Date(ms.actual_start || ms.planned_start)
    const end = ms.actual_end ? new Date(ms.actual_end) : today
    const left = Math.max(0, daysBetween(chartStart, start) * DAY_WIDTH)
    const width = Math.max(DAY_WIDTH * 2, daysBetween(start, end) * DAY_WIDTH)
    return { left, width }
  }

  const isOverdue = (ms: Milestone): boolean => {
    if (ms.status === "completed") return false
    if (ms.status === "not_started") return false
    return today > new Date(ms.planned_end)
  }

  const getOverdueBar = (ms: Milestone) => {
    if (!isOverdue(ms)) return null
    const plannedEnd = new Date(ms.planned_end)
    const actualEnd = ms.actual_end ? new Date(ms.actual_end) : today
    if (actualEnd <= plannedEnd) return null
    const left = daysBetween(chartStart, plannedEnd) * DAY_WIDTH
    const width = Math.max(DAY_WIDTH, daysBetween(plannedEnd, actualEnd) * DAY_WIDTH)
    return { left, width }
  }

  const getActualColor = (ms: Milestone): string => {
    if (ms.status === "completed") return ACTUAL_COLORS.complete
    if (ms.status === "blocked") return ACTUAL_COLORS.blocked
    if (ms.status === "not_started") return ACTUAL_COLORS.not_started
    if (isOverdue(ms)) {
      const daysOver = daysBetween(new Date(ms.planned_end), today)
      return daysOver >= 8 ? ACTUAL_COLORS.behind_8_plus : ACTUAL_COLORS.behind_1_7
    }
    return ACTUAL_COLORS.on_schedule
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="rounded-lg border border-border overflow-hidden">
        <ScrollArea className="w-full">
          <div
            className="relative"
            style={{ width: LABEL_WIDTH + chartWidth + 40 }}
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

                  {/* Milestone bars — dual: planned (outline) + actual (solid) */}
                  {milestones
                    .filter((ms) => ms.planned_start)
                    .map((ms) => {
                      const planned = getPlannedBar(ms)
                      const actual = getActualBar(ms)
                      const overdue = getOverdueBar(ms)
                      const barId = `${unit.id}-${ms.phase_number}`
                      const phase = CONSTRUCTION_PHASES.find(
                        (p) => p.number === ms.phase_number
                      )
                      const isHovered = hoveredMilestone === barId
                      const barH = ROW_HEIGHT * 0.5
                      const halfH = barH / 2

                      return (
                        <Tooltip key={ms.id}>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute inset-0"
                              onMouseEnter={() => setHoveredMilestone(barId)}
                              onMouseLeave={() => setHoveredMilestone(null)}
                            >
                              {/* Planned bar — hollow/outline */}
                              <div
                                className={cn(
                                  "absolute rounded-sm border-2 border-dashed transition-all",
                                  isHovered ? "opacity-100" : "opacity-70"
                                )}
                                style={{
                                  left: planned.left,
                                  width: planned.width,
                                  height: halfH,
                                  top: `calc(50% - ${halfH + 1}px)`,
                                  borderColor: PLANNED_BORDER,
                                  backgroundColor: "transparent",
                                }}
                              />

                              {/* Actual bar — filled/solid */}
                              {actual && (
                                <div
                                  className={cn(
                                    "absolute rounded-sm transition-all",
                                    isHovered ? "ring-1 ring-foreground/30" : ""
                                  )}
                                  style={{
                                    left: actual.left,
                                    width: actual.width,
                                    height: halfH,
                                    top: `calc(50% + 1px)`,
                                    backgroundColor: getActualColor(ms),
                                  }}
                                />
                              )}

                              {/* Overdue extension — red bar past planned end */}
                              {overdue && (
                                <div
                                  className="absolute rounded-r-sm"
                                  style={{
                                    left: overdue.left,
                                    width: overdue.width,
                                    height: halfH,
                                    top: `calc(50% + 1px)`,
                                    backgroundColor: OVERDUE_COLOR,
                                    opacity: 0.5,
                                  }}
                                />
                              )}
                            </div>
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
                              <div className="text-xs space-y-0.5">
                                <p>
                                  Planned: {formatDate(ms.planned_start)} – {formatDate(ms.planned_end)}
                                </p>
                                {ms.actual_start && (
                                  <p>
                                    Actual: {formatDate(ms.actual_start)} – {ms.actual_end ? formatDate(ms.actual_end) : "In Progress"}
                                  </p>
                                )}
                              </div>
                              {ms.planned_duration && (
                                <p className="text-xs">
                                  Duration: {ms.actual_duration ?? ms.planned_duration} days
                                  {ms.actual_duration && ms.actual_duration !== ms.planned_duration && (
                                    <span className={ms.actual_duration > ms.planned_duration ? " text-red-400" : " text-green-400"}>
                                      {" "}({ms.actual_duration > ms.planned_duration ? "+" : ""}{ms.actual_duration - ms.planned_duration}d)
                                    </span>
                                  )}
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2 bg-muted/30">
          <span className="text-xs text-muted-foreground">Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-5 rounded-sm border-2 border-dashed" style={{ borderColor: PLANNED_BORDER }} />
            <span className="text-[10px] text-muted-foreground">Planned</span>
          </div>
          {[
            { color: "bg-green-500", label: "On Schedule" },
            { color: "bg-yellow-500", label: "1-7 Days Behind" },
            { color: "bg-red-500", label: "8+ Days Behind" },
            { color: "bg-blue-500", label: "Complete" },
            { color: "bg-gray-300", label: "Not Started" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={cn("h-2.5 w-5 rounded-sm", item.color)} />
              <span className="text-[10px] text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-5 rounded-sm bg-red-500/50" />
            <span className="text-[10px] text-muted-foreground">Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-px w-5 bg-red-500" />
            <span className="text-[10px] text-muted-foreground">Today</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
