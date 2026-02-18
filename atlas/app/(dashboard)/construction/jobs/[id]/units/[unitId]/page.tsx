"use client"

import { useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Building2,
  FileText,
  ClipboardCheck,
  Wrench,
  Shield,
  ChevronRight,
  Home,
  MapPin,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { MilestoneTracker } from "@/components/construction/milestone-tracker"
import { StatCard } from "@/components/construction/job-dashboard"
import {
  MOCK_UNITS_JOB001,
  MOCK_PURCHASE_ORDERS,
  MOCK_CHANGE_ORDERS,
  MOCK_SELECTIONS,
  generateMilestones,
} from "@/lib/construction/mock-data"
import {
  CONSTRUCTION_PHASES,
  PO_STATUS_CONFIG,
  SELECTION_STATUS_CONFIG,
  INSPECTION_RESULT_CONFIG,
} from "@/lib/construction/types"
import type { Inspection } from "@/lib/construction/types"
import { RecordTasksPanel, useRecordTaskCount } from "@/components/shared/record-tasks-panel"
import { PhotoGallery } from "@/components/construction/photo-gallery"
import { PunchListTab } from "@/components/construction/punch-list-tab"
import { PreCOChecklist } from "@/components/construction/pre-co-checklist"
import { WarrantyTimeline } from "@/components/construction/warranty-timeline"
import { useUnit, useUnitMilestones } from "@/lib/hooks/use-units"
import { useCompleteMilestone } from "@/lib/hooks/use-milestones"

export default function UnitDetailPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const unitId = params.unitId as string

  const taskCount = useRecordTaskCount("unit", unitId)

  // Fetch real data from Supabase
  const { data: dbUnit, isLoading: unitLoading } = useUnit(unitId)
  const { data: dbMilestones = [] } = useUnitMilestones(unitId)
  const completeMilestone = useCompleteMilestone()

  // Fall back to mock data for legacy unit IDs
  const mockUnit = MOCK_UNITS_JOB001.find((u) => u.id === unitId)

  // Merge: prefer real DB unit, fall back to mock
  const unit = dbUnit
    ? {
        id: dbUnit.id,
        unit_number: dbUnit.unit_number,
        address: dbUnit.lot_address ?? "",
        floor_plan_name: "",
        floor_plan_specs: "",
        upgrade_package: dbUnit.upgrade_package,
        status: (dbUnit.current_milestone ?? 0) >= 6 ? "complete" as const : (dbUnit.current_milestone ?? 0) > 0 ? "in_progress" as const : "not_started" as const,
        current_phase: dbUnit.current_milestone ?? 0,
        total_budget: dbUnit.total_budget ?? 0,
        committed: dbUnit.total_committed ?? 0,
        actual: dbUnit.total_actual ?? 0,
        schedule_status: "on_schedule" as const,
        permit_date: dbUnit.permit_date,
        construction_start: dbUnit.start_date,
        projected_completion: dbUnit.projected_completion_date,
        co_date: dbUnit.co_date,
      }
    : mockUnit

  if (unitLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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

  // Use real milestones if available, fall back to generated mock milestones
  const milestones = dbMilestones.length > 0
    ? dbMilestones.map((m) => ({
        id: m.id,
        unit_id: unitId,
        phase_number: m.phase_number,
        phase_name: m.phase_name ?? CONSTRUCTION_PHASES.find((p) => p.number === m.phase_number)?.name ?? `Phase ${m.phase_number}`,
        status: m.status === "completed" ? "completed" as const : m.status === "in_progress" ? "in_progress" as const : "not_started" as const,
        planned_start: m.planned_start_date ?? "",
        planned_end: m.planned_end_date ?? "",
        actual_start: m.actual_start_date ?? undefined,
        actual_end: m.actual_end_date ?? undefined,
        planned_duration: 0,
        inspections: [] as Inspection[],
      }))
    : generateMilestones(unitId, unit.current_phase)

  const purchaseOrders = MOCK_PURCHASE_ORDERS.filter(
    (po) => po.unit_id === unitId
  )
  const changeOrders = MOCK_CHANGE_ORDERS.filter(
    (co) => co.unit_id === unitId
  )
  const selections = MOCK_SELECTIONS.filter((s) => s.unit_id === unitId)

  const allInspections = milestones.flatMap((m) => m.inspections)
  const variance = unit.total_budget - unit.actual

  const currentPhaseName =
    unit.current_phase > 0
      ? CONSTRUCTION_PHASES.find((p) => p.number === unit.current_phase)?.name
      : "Not Started"

  const handleAdvance = (phaseNumber: number) => {
    // Find the milestone to complete
    const milestone = milestones.find((m) => m.phase_number === phaseNumber)
    if (milestone && dbMilestones.length > 0) {
      completeMilestone.mutate({ id: milestone.id, unitId })
    } else {
      alert(`Advancing from Phase ${phaseNumber} to Phase ${phaseNumber + 1}`)
    }
  }

  const handleOverride = (phaseNumber: number, note: string) => {
    const milestone = milestones.find((m) => m.phase_number === phaseNumber)
    if (milestone && dbMilestones.length > 0) {
      completeMilestone.mutate({ id: milestone.id, unitId, overrideNote: note })
    } else {
      alert(`Override Phase ${phaseNumber}: ${note}`)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/construction/jobs/${jobId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job
          </Button>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                Unit {unit.unit_number}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  unit.status === "complete"
                    ? "border-blue-400 text-blue-700"
                    : unit.status === "in_progress"
                    ? "border-green-400 text-green-700"
                    : "border-gray-300 text-gray-500"
                )}
              >
                Phase {unit.current_phase}: {currentPhaseName}
              </Badge>
              {unit.upgrade_package && (
                <Badge variant="secondary" className="text-xs">
                  {unit.upgrade_package}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {unit.address}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                {unit.floor_plan_name}
              </span>
              {unit.floor_plan_specs && <span>{unit.floor_plan_specs}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Milestone Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Construction Progress</CardTitle>
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

      {/* Key Dates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Permit Issued</p>
            <p className="text-sm font-medium mt-1">
              {unit.permit_date ? formatDate(unit.permit_date) : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Construction Start</p>
            <p className="text-sm font-medium mt-1">
              {unit.construction_start
                ? formatDate(unit.construction_start)
                : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Projected Completion
            </p>
            <p className="text-sm font-medium mt-1">
              {unit.projected_completion
                ? formatDate(unit.projected_completion)
                : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">CO Date</p>
            <p className="text-sm font-medium mt-1">
              {unit.co_date ? formatDate(unit.co_date) : "--"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Budget"
          value={formatCurrency(unit.total_budget, { compact: true })}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Committed"
          value={formatCurrency(unit.committed, { compact: true })}
          subtitle={formatPercent(
            unit.total_budget > 0
              ? (unit.committed / unit.total_budget) * 100
              : 0,
            0
          )}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Actual"
          value={formatCurrency(unit.actual, { compact: true })}
          subtitle={formatPercent(
            unit.total_budget > 0
              ? (unit.actual / unit.total_budget) * 100
              : 0,
            0
          )}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Variance"
          value={formatCurrency(Math.abs(variance), { compact: true })}
          subtitle={variance >= 0 ? "Under budget" : "Over budget"}
          icon={<DollarSign className="h-4 w-4" />}
          className={
            variance < 0
              ? "border-red-200 dark:border-red-800"
              : "border-green-200 dark:border-green-800"
          }
        />
      </div>

      {/* Disposition prompt — shown when unit reaches final milestone (CO) */}
      {unit.current_phase >= 6 && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">This unit is complete. Create a listing?</p>
              <p className="text-xs text-green-600">Unit has received Certificate of Occupancy and is ready for sale.</p>
            </div>
          </div>
          <Link href={`/disposition?unit_id=${unitId}&job_id=${jobId}`}>
            <Button size="sm" className="bg-[#1a5632] text-white hover:bg-[#164528]">Create Listing</Button>
          </Link>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="milestones" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="selections">Selections</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="punch-list">Punch List</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks{taskCount > 0 ? ` (${taskCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="warranty">Warranty</TabsTrigger>
        </TabsList>

        {/* ---- Milestones Tab ---- */}
        <TabsContent value="milestones" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              6-milestone construction progress
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/construction/jobs/${jobId}/units/${unitId}/milestones`
                )
              }
            >
              Full Milestone View
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {milestones.map((ms) => {
              const phase = CONSTRUCTION_PHASES.find(
                (p) => p.number === ms.phase_number
              )
              return (
                <div
                  key={ms.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-4 py-3 text-sm",
                    ms.status === "in_progress" &&
                      "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30",
                    ms.status === "completed" && "opacity-70"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        ms.status === "completed"
                          ? "bg-green-500 text-white"
                          : ms.status === "in_progress"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-500 dark:bg-gray-700"
                      )}
                    >
                      {ms.phase_number}
                    </span>
                    <span
                      className={cn(
                        ms.status === "in_progress" && "font-semibold"
                      )}
                    >
                      {phase?.name}
                    </span>
                    {ms.inspections.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <ClipboardCheck className="mr-1 h-3 w-3" />
                        {ms.inspections.filter((i) => i.result === "pass")
                          .length}
                        /{ms.inspections.length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(ms.planned_start, { short: true })} -{" "}
                      {formatDate(ms.planned_end, { short: true })}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs capitalize",
                        ms.status === "completed"
                          ? "border-green-400 text-green-700"
                          : ms.status === "in_progress"
                          ? "border-blue-400 text-blue-700"
                          : ""
                      )}
                    >
                      {ms.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* ---- Purchase Orders Tab ---- */}
        <TabsContent value="purchase-orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {purchaseOrders.length} purchase order
              {purchaseOrders.length !== 1 ? "s" : ""}
            </p>
            <Button
              size="sm"
              onClick={() =>
                router.push(
                  `/construction/jobs/${jobId}/units/${unitId}/pos`
                )
              }
            >
              Manage POs
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    PO#
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Trade
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr
                    key={po.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {po.po_number}
                    </td>
                    <td className="px-4 py-3 text-xs">{po.trade_category}</td>
                    <td className="px-4 py-3">{po.vendor_name}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(po.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "text-xs",
                          PO_STATUS_CONFIG[po.status].bgColor
                        )}
                      >
                        {PO_STATUS_CONFIG[po.status].label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ---- Selections Tab ---- */}
        <TabsContent value="selections" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {selections.length} selection{selections.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Total upgrade cost:{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(
                    selections.reduce((s, sel) => s + sel.upgrade_delta, 0)
                  )}
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/construction/jobs/${jobId}/units/${unitId}/selections`
                )
              }
            >
              Manage Selections
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selections.map((sel) => (
              <Card key={sel.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {sel.category}
                    </span>
                    <Badge
                      className={cn(
                        "text-xs",
                        SELECTION_STATUS_CONFIG[sel.status].bgColor
                      )}
                    >
                      {SELECTION_STATUS_CONFIG[sel.status].label}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm">{sel.item_name}</p>
                  {sel.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {sel.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                    <span>Base: {formatCurrency(sel.base_cost)}</span>
                    {sel.upgrade_delta > 0 && (
                      <span className="text-orange-600 font-medium">
                        +{formatCurrency(sel.upgrade_delta)} upgrade
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ---- Inspections Tab ---- */}
        <TabsContent value="inspections" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {allInspections.length} inspection
              {allInspections.length !== 1 ? "s" : ""}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/construction/jobs/${jobId}/units/${unitId}/inspections`
                )
              }
            >
              Manage Inspections
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {allInspections.map((insp) => (
              <div
                key={insp.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{insp.type}</p>
                    <p className="text-xs text-muted-foreground">
                      Phase {insp.phase_number} &middot;{" "}
                      {insp.is_required ? "Required" : "Optional"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {insp.actual_date
                      ? formatDate(insp.actual_date)
                      : `Sched: ${formatDate(insp.scheduled_date)}`}
                  </span>
                  {insp.result ? (
                    <Badge
                      className={cn(
                        "text-xs",
                        INSPECTION_RESULT_CONFIG[insp.result].bgColor
                      )}
                    >
                      {INSPECTION_RESULT_CONFIG[insp.result].label}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ---- Issues Tab ---- */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Wrench className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">No open issues</h3>
              <p className="text-sm text-muted-foreground">
                Issues and punch list items will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Photos Tab ---- */}
        <TabsContent value="photos" className="space-y-4">
          <PhotoGallery jobId={jobId} unitId={unitId} />
        </TabsContent>

        {/* ---- Punch List Tab ---- */}
        <TabsContent value="punch-list" className="space-y-4">
          <div className="grid md:grid-cols-[1fr_300px] gap-4">
            <PunchListTab jobId={jobId} unitId={unitId} />
            <PreCOChecklist unitId={unitId} />
          </div>
        </TabsContent>

        {/* ---- Tasks Tab ---- */}
        <TabsContent value="tasks" className="space-y-4">
          <RecordTasksPanel
            recordType="unit"
            recordId={unitId}
            recordName={`Unit ${unit.unit_number}`}
            recordUrl={`/construction/jobs/${jobId}/units/${unitId}`}
          />
        </TabsContent>

        {/* ---- Warranty Tab ---- */}
        <TabsContent value="warranty" className="space-y-4">
          <WarrantyTimeline coDate={unit.co_date ?? null} unitId={unitId} />
          {unit.status === "complete" && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/construction/warranty")}
              >
                View Warranty Claims
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
