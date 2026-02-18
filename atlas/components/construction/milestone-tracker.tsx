"use client"

import { useState, useMemo, useCallback } from "react"
import {
  Check, Loader2, Lock, Clock, AlertTriangle, ChevronDown, ChevronUp,
  ShieldAlert, Play, CheckCircle2, Ban, Unlock, ClipboardCheck, FileText,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/lib/hooks/use-toast"
import type { Milestone, MilestoneStatus } from "@/lib/construction/types"
import { CONSTRUCTION_PHASES, PHASE_INSPECTIONS } from "@/lib/construction/types"
import {
  useStartMilestone, useCompleteMilestone, useBlockMilestone, useUnblockMilestone,
  INSPECTION_GATED_PHASES,
} from "@/lib/hooks/use-milestones"

interface MilestoneTrackerProps {
  unitId: string
  milestones: Milestone[]
  onAdvance?: (phaseNumber: number) => void
  onOverride?: (phaseNumber: number, note: string) => void
  compact?: boolean
}

const STATUS_ICON: Record<MilestoneStatus, React.ReactNode> = {
  completed: <Check className="h-3.5 w-3.5" />,
  in_progress: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  not_started: <Lock className="h-3.5 w-3.5" />,
  overdue: <Clock className="h-3.5 w-3.5" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5" />,
}

function getCardColor(ms: Milestone): string {
  if (ms.status === "completed") return "bg-green-500 text-white border-green-600"
  if (ms.status === "blocked") return "bg-gray-900 text-white border-gray-800 ring-2 ring-yellow-400 ring-offset-2"
  if (ms.status === "not_started") return "bg-gray-200 text-gray-500 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"
  // in_progress or overdue — calculate schedule variance
  if (ms.actual_start && ms.planned_end) {
    const daysBehind = Math.round(
      (new Date().getTime() - new Date(ms.planned_end).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysBehind >= 8) return "bg-red-500 text-white border-red-600 ring-2 ring-red-300 ring-offset-2"
    if (daysBehind >= 1) return "bg-yellow-500 text-white border-yellow-600 ring-2 ring-yellow-300 ring-offset-2"
  }
  return "bg-blue-500 text-white border-blue-600 ring-2 ring-blue-300 ring-offset-2"
}

const STATUS_LINE_COLORS: Record<MilestoneStatus, string> = {
  completed: "bg-green-500", in_progress: "bg-blue-500",
  not_started: "bg-gray-200 dark:bg-gray-700", overdue: "bg-red-500", blocked: "bg-yellow-500",
}

export function MilestoneTracker({ unitId, milestones, onAdvance, onOverride, compact = false }: MilestoneTrackerProps) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null)
  const [dialog, setDialog] = useState<{ type: "override" | "block" | "complete_override"; phase: number } | null>(null)
  const [dialogNote, setDialogNote] = useState("")

  const startMutation = useStartMilestone()
  const completeMutation = useCompleteMilestone()
  const blockMutation = useBlockMilestone()
  const unblockMutation = useUnblockMilestone()

  const getMilestone = useCallback(
    (phaseNum: number) => milestones.find((m) => m.phase_number === phaseNum),
    [milestones]
  )
  const currentPhase = milestones.find((m) => m.status === "in_progress")

  // Velocity metric: days ahead/behind schedule across completed milestones
  const velocity = useMemo(() => {
    const completed = milestones.filter((m) => m.status === "completed" && m.actual_end && m.planned_end)
    if (!completed.length) return null
    const totalVariance = completed.reduce((sum, m) => {
      const planned = new Date(m.planned_end).getTime()
      const actual = new Date(m.actual_end!).getTime()
      return sum + Math.round((planned - actual) / (1000 * 60 * 60 * 24))
    }, 0)
    return totalVariance
  }, [milestones])

  const handleStart = useCallback(async (ms: Milestone) => {
    try {
      await startMutation.mutateAsync({ id: ms.id, unitId })
      toast({ title: `Phase ${ms.phase_number} started` })
    } catch { toast({ title: "Failed to start milestone", variant: "destructive" }) }
  }, [startMutation, unitId])

  const handleComplete = useCallback(async (ms: Milestone) => {
    if (INSPECTION_GATED_PHASES.includes(ms.phase_number)) {
      const requiredInspections = ms.inspections.filter((i) => i.is_required)
      const allPassed = requiredInspections.every((i) => i.result === "pass" || i.result === "conditional")
      if (!allPassed) {
        setDialog({ type: "complete_override", phase: ms.phase_number })
        return
      }
    }
    try {
      await completeMutation.mutateAsync({ id: ms.id, unitId })
      onAdvance?.(ms.phase_number)
      toast({ title: `Phase ${ms.phase_number} completed` })
    } catch { toast({ title: "Failed to complete milestone", variant: "destructive" }) }
  }, [completeMutation, unitId, onAdvance])

  const handleCompleteWithOverride = useCallback(async () => {
    if (!dialog || !dialogNote.trim()) return
    const ms = getMilestone(dialog.phase)
    if (!ms) return
    try {
      await completeMutation.mutateAsync({ id: ms.id, unitId, overrideNote: dialogNote })
      onOverride?.(dialog.phase, dialogNote)
      toast({ title: `Phase ${dialog.phase} completed (inspection override)` })
    } catch { toast({ title: "Failed to complete milestone", variant: "destructive" }) }
    setDialog(null); setDialogNote("")
  }, [dialog, dialogNote, completeMutation, unitId, onOverride, getMilestone])

  const handleBlock = useCallback(async () => {
    if (!dialog || !dialogNote.trim()) return
    const ms = getMilestone(dialog.phase)
    if (!ms) return
    try {
      await blockMutation.mutateAsync({ id: ms.id, unitId, reason: dialogNote })
      toast({ title: `Phase ${dialog.phase} blocked` })
    } catch { toast({ title: "Failed to block milestone", variant: "destructive" }) }
    setDialog(null); setDialogNote("")
  }, [dialog, dialogNote, blockMutation, unitId, getMilestone])

  const handleUnblock = useCallback(async (ms: Milestone) => {
    try {
      await unblockMutation.mutateAsync({ id: ms.id, unitId })
      toast({ title: `Phase ${ms.phase_number} unblocked` })
    } catch { toast({ title: "Failed to unblock milestone", variant: "destructive" }) }
  }, [unblockMutation, unitId])

  const getDaysInfo = (ms: Milestone) => {
    if (ms.status === "completed" && ms.actual_duration != null) {
      const diff = ms.actual_duration - ms.planned_duration
      return { text: `${ms.actual_duration}d (${diff > 0 ? "+" : ""}${diff}d)`, color: diff > 2 ? "text-red-600" : diff > 0 ? "text-yellow-600" : "text-green-600" }
    }
    return { text: `${ms.planned_duration}d planned`, color: "text-muted-foreground" }
  }

  const isPending = startMutation.isPending || completeMutation.isPending || blockMutation.isPending || unblockMutation.isPending

  // --- Compact mode ---
  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {CONSTRUCTION_PHASES.map((phase, idx) => {
            const ms = getMilestone(phase.number)
            const status = ms?.status ?? "not_started"
            return (
              <Tooltip key={phase.number}>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium", ms ? getCardColor(ms) : "bg-gray-200 text-gray-500 border-gray-300")}>
                      {status === "completed" ? <Check className="h-3 w-3" /> : phase.number}
                    </div>
                    {idx < CONSTRUCTION_PHASES.length - 1 && <div className={cn("h-0.5 w-2", STATUS_LINE_COLORS[status])} />}
                  </div>
                </TooltipTrigger>
                <TooltipContent><p className="font-medium">{phase.name}</p><p className="text-xs capitalize">{status.replace("_", " ")}</p></TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <div className="space-y-6">
      {/* Velocity Metric */}
      {velocity !== null && (
        <div className={cn("flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium", velocity >= 0 ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700")}>
          <Clock className="h-4 w-4" />
          {Math.abs(velocity)} day{Math.abs(velocity) !== 1 ? "s" : ""} {velocity >= 0 ? "ahead of" : "behind"} schedule
        </div>
      )}

      {/* Horizontal Progress Track */}
      <div className="relative">
        <div className="flex items-start gap-0 overflow-x-auto pb-4">
          {CONSTRUCTION_PHASES.map((phase, idx) => {
            const ms = getMilestone(phase.number)
            const status = ms?.status ?? "not_started"
            const isExpanded = expandedPhase === phase.number
            const hasInspections = (PHASE_INSPECTIONS[phase.number] || []).length > 0
            return (
              <div key={phase.number} className="flex flex-col items-center min-w-[72px] relative">
                {idx > 0 && (
                  <div className={cn("absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2", STATUS_LINE_COLORS[getMilestone(CONSTRUCTION_PHASES[idx - 1].number)?.status ?? "not_started"])} style={{ zIndex: 0 }} />
                )}
                <button onClick={() => setExpandedPhase(isExpanded ? null : phase.number)}
                  className={cn("relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all hover:scale-110 cursor-pointer", ms ? getCardColor(ms) : "bg-gray-200 text-gray-500 border-gray-300")}>
                  {status === "blocked" ? <AlertTriangle className="h-3.5 w-3.5" /> : STATUS_ICON[status]}
                </button>
                <span className={cn("mt-1.5 text-[10px] leading-tight text-center max-w-[64px]", status === "in_progress" ? "font-semibold text-foreground" : "text-muted-foreground")}>{phase.shortName}</span>
                {hasInspections && <div className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", status === "completed" ? "bg-green-500" : status === "in_progress" ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600")} />}
                {isExpanded && <ChevronDown className="mt-0.5 h-3 w-3 text-muted-foreground" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Phase Banner */}
      {currentPhase && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500 text-white">Phase {currentPhase.phase_number}</Badge>
                  <span className="font-semibold text-lg">{currentPhase.phase_name}</span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Started: {formatDate(currentPhase.actual_start || currentPhase.planned_start)}</span>
                  <span>Target: {formatDate(currentPhase.planned_end)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-yellow-700 border-yellow-400" disabled={isPending}
                  onClick={() => { setDialog({ type: "block", phase: currentPhase.phase_number }); setDialogNote("") }}>
                  <Ban className="mr-1 h-4 w-4" />Block
                </Button>
                <Button size="sm" disabled={isPending} onClick={() => handleComplete(currentPhase)}>
                  <CheckCircle2 className="mr-1 h-4 w-4" />Complete
                </Button>
              </div>
            </div>
            {currentPhase.inspections.length > 0 && (
              <div className="mt-3 border-t border-blue-200 dark:border-blue-800 pt-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Required Inspections</p>
                <div className="flex flex-wrap gap-2">
                  {currentPhase.inspections.map((insp) => (
                    <Badge key={insp.id} variant="outline" className={cn("text-xs",
                      insp.result === "pass" ? "border-green-400 bg-green-50 text-green-700" :
                      insp.result === "fail" ? "border-red-400 bg-red-50 text-red-700" :
                      insp.result === "conditional" ? "border-yellow-400 bg-yellow-50 text-yellow-700" :
                      "border-gray-300 bg-white text-gray-600"
                    )}>
                      <ClipboardCheck className="mr-1 h-3 w-3" />{insp.type}
                      {insp.result === "pass" && <Check className="ml-1 h-3 w-3 text-green-600" />}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expanded Phase Detail */}
      {expandedPhase !== null && (() => {
        const phase = CONSTRUCTION_PHASES.find((p) => p.number === expandedPhase)
        const ms = getMilestone(expandedPhase)
        if (!phase || !ms) return null
        const daysInfo = getDaysInfo(ms)

        return (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("capitalize",
                    ms.status === "completed" ? "border-green-400 text-green-700" :
                    ms.status === "in_progress" ? "border-blue-400 text-blue-700" :
                    ms.status === "blocked" ? "border-yellow-400 text-yellow-700" :
                    ms.status === "overdue" ? "border-red-400 text-red-700" :
                    "border-gray-300 text-gray-600"
                  )}>{ms.status.replace("_", " ")}</Badge>
                  <span className="text-lg font-semibold">Phase {phase.number}: {phase.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setExpandedPhase(null)}><ChevronUp className="h-4 w-4" /></Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-muted-foreground">Planned Start</p><p className="font-medium">{formatDate(ms.planned_start)}</p></div>
                <div><p className="text-muted-foreground">Planned End</p><p className="font-medium">{formatDate(ms.planned_end)}</p></div>
                <div><p className="text-muted-foreground">Actual Start</p><p className="font-medium">{ms.actual_start ? formatDate(ms.actual_start) : "--"}</p></div>
                <div><p className="text-muted-foreground">Actual End</p><p className="font-medium">{ms.actual_end ? formatDate(ms.actual_end) : "--"}</p></div>
              </div>

              <div className="flex items-center gap-1 text-sm"><Clock className="h-4 w-4 text-muted-foreground" /><span className={daysInfo.color}>{daysInfo.text}</span></div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 border-t pt-3">
                {ms.status === "not_started" && (
                  <Button size="sm" disabled={isPending} onClick={() => handleStart(ms)}>
                    <Play className="mr-1 h-4 w-4" />Start Phase
                  </Button>
                )}
                {ms.status === "in_progress" && (
                  <>
                    <Button size="sm" disabled={isPending} onClick={() => handleComplete(ms)}>
                      <CheckCircle2 className="mr-1 h-4 w-4" />Complete
                    </Button>
                    <Button variant="outline" size="sm" className="text-yellow-700 border-yellow-400" disabled={isPending}
                      onClick={() => { setDialog({ type: "block", phase: ms.phase_number }); setDialogNote("") }}>
                      <Ban className="mr-1 h-4 w-4" />Block
                    </Button>
                  </>
                )}
                {ms.status === "blocked" && (
                  <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleUnblock(ms)}>
                    <Unlock className="mr-1 h-4 w-4" />Unblock
                  </Button>
                )}
                {ms.status === "completed" && (
                  <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Completed {ms.actual_end ? formatDate(ms.actual_end) : ""}</span>
                )}
              </div>

              {/* Inspections */}
              {ms.inspections.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Inspections</p>
                  <div className="space-y-2">
                    {ms.inspections.map((insp) => (
                      <div key={insp.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-muted-foreground" /><span>{insp.type}</span>
                          {insp.is_required && <Badge variant="outline" className="text-xs">Required</Badge>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{insp.actual_date ? formatDate(insp.actual_date) : `Sched: ${formatDate(insp.scheduled_date)}`}</span>
                          {insp.result && (
                            <Badge className={cn("text-xs",
                              insp.result === "pass" ? "bg-green-100 text-green-800" :
                              insp.result === "fail" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                            )}>{insp.result === "pass" ? "Pass" : insp.result === "fail" ? "Fail" : "Conditional"}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" /><span>View linked purchase orders and issues in unit detail tabs</span>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Block Dialog */}
      <Dialog open={dialog?.type === "block"} onOpenChange={(open) => { if (!open) setDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Milestone</DialogTitle>
            <DialogDescription>This will pause the schedule. Downstream dates will not shift until unblocked.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="block-reason">Block Reason *</Label>
            <Textarea id="block-reason" placeholder="Describe why this phase is blocked…" value={dialogNote} onChange={(e) => setDialogNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!dialogNote.trim() || isPending} onClick={handleBlock}>
              <Ban className="mr-2 h-4 w-4" />Block Phase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inspection Override Dialog */}
      <Dialog open={dialog?.type === "complete_override"} onOpenChange={(open) => { if (!open) setDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Inspection Gate</DialogTitle>
            <DialogDescription>This milestone requires a passed inspection before completion. Do you want to override?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-800"><AlertTriangle className="h-4 w-4" />Authorized Personnel Only</div>
              <p className="mt-1 text-xs text-yellow-700">This override will be recorded with your name, timestamp, and justification note in the audit log.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-note">Justification Note *</Label>
              <Textarea id="override-note" placeholder="Explain why this inspection gate is being overridden…" value={dialogNote} onChange={(e) => setDialogNote(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(null); setDialogNote("") }}>Cancel</Button>
            <Button variant="destructive" disabled={!dialogNote.trim() || isPending} onClick={handleCompleteWithOverride}>
              <ShieldAlert className="mr-2 h-4 w-4" />Override & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
