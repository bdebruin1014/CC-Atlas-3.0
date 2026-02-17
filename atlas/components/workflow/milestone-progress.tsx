"use client"

import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils/format"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface MilestoneProgressItem {
  id: string
  name: string
  sequence: number
  status: "not_started" | "in_progress" | "completed" | "skipped" | "blocked"
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface MilestoneProgressProps {
  milestones: MilestoneProgressItem[]
  currentMilestoneId?: string | null
  onMilestoneClick?: (milestoneId: string) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function MilestoneProgress({
  milestones,
  currentMilestoneId,
  onMilestoneClick,
  className,
}: MilestoneProgressProps) {
  const sorted = [...milestones].sort((a, b) => a.sequence - b.sequence)
  const totalMilestones = sorted.length
  const completedCount = sorted.filter(
    (m) => m.status === "completed" || m.status === "skipped"
  ).length
  const progressPct =
    totalMilestones > 0
      ? Math.round((completedCount / totalMilestones) * 100)
      : 0

  if (totalMilestones === 0) return null

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("space-y-3", className)}>
        {/* Overall progress label */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">
            Milestone Progress
          </span>
          <span className="text-xs text-muted-foreground">
            {completedCount} of {totalMilestones} complete ({progressPct}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Milestone steps */}
        <div className="relative flex items-start justify-between px-2">
          {/* Connecting line */}
          <div className="absolute top-3 left-5 right-5 h-0.5 bg-muted" />
          <div
            className="absolute top-3 left-5 h-0.5 bg-green-500 transition-all duration-500"
            style={{
              width:
                totalMilestones > 1
                  ? `${(completedCount / (totalMilestones - 1)) * 100}%`
                  : "0%",
              maxWidth: "calc(100% - 2.5rem)",
            }}
          />

          {sorted.map((milestone) => {
            const isCurrent = milestone.id === currentMilestoneId
            const isComplete = milestone.status === "completed"
            const isActive = milestone.status === "in_progress"
            const isBlocked = milestone.status === "blocked"
            const isSkipped = milestone.status === "skipped"

            return (
              <Tooltip key={milestone.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onMilestoneClick?.(milestone.id)}
                    className={cn(
                      "relative z-10 flex flex-col items-center gap-1.5 transition-colors",
                      "min-w-[3rem] max-w-[5rem]",
                      onMilestoneClick && "cursor-pointer hover:opacity-80"
                    )}
                  >
                    {/* Circle icon */}
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                        isComplete &&
                          "border-green-500 bg-green-500 text-white",
                        isActive &&
                          "border-blue-500 bg-blue-500 text-white animate-pulse",
                        isCurrent &&
                          !isComplete &&
                          !isActive &&
                          "border-blue-500 bg-blue-50 dark:bg-blue-950",
                        isBlocked &&
                          "border-red-500 bg-red-50 dark:bg-red-950",
                        isSkipped &&
                          "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
                        !isComplete &&
                          !isActive &&
                          !isCurrent &&
                          !isBlocked &&
                          !isSkipped &&
                          "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : isActive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {milestone.sequence}
                        </span>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={cn(
                        "text-[10px] leading-tight text-center break-words",
                        isComplete && "text-green-700 dark:text-green-400 font-medium",
                        isActive && "text-blue-700 dark:text-blue-400 font-semibold",
                        !isComplete &&
                          !isActive &&
                          "text-muted-foreground"
                      )}
                    >
                      {milestone.name}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">{milestone.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {milestone.status.replace("_", " ")}
                  </p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
