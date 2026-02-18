"use client"

import { useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  DollarSign,
  TrendingDown,
  Building2,
  Clock,
  FileText,
  ClipboardCheck,
  AlertCircle,
  ChevronRight,
  CalendarDays,
  Plus,
  HardHat,
  MapPin,
  Camera,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import {
  StatCard,
  StackedBar,
  SimpleBarChart,
} from "@/components/construction/job-dashboard"
import {
  MOCK_JOBS,
  MOCK_UNITS_JOB001,
  MOCK_PURCHASE_ORDERS,
  MOCK_CHANGE_ORDERS,
  MOCK_ACTIVITY_FEED,
  generateMilestones,
} from "@/lib/construction/mock-data"
import {
  JOB_STATUS_CONFIG,
  CO_STATUS_CONFIG,
  PO_STATUS_CONFIG,
  CONSTRUCTION_PHASES,
} from "@/lib/construction/types"
import type { ChangeOrderStatus, JobStatus } from "@/lib/construction/types"
import { RecordTasksPanel, useRecordTaskCount } from "@/components/shared/record-tasks-panel"
import { PhotoGallery } from "@/components/construction/photo-gallery"
import {
  usePunchItemsByJob,
  PUNCH_ROOM_CONFIG,
  PUNCH_STATUS_CONFIG,
} from "@/lib/hooks/use-punch-items"
import { useJob } from "@/lib/hooks/use-jobs"
import { useUnits } from "@/lib/hooks/use-units"

export default function JobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const taskCount = useRecordTaskCount("job", jobId)

  // Fetch real data from Supabase
  const { data: dbJob, isLoading: jobLoading } = useJob(jobId)
  const { data: dbUnits = [] } = useUnits(jobId)

  // Fall back to mock data for legacy job IDs (e.g. "job-001")
  const mockJob = MOCK_JOBS.find((j) => j.id === jobId)

  // Merge: prefer real DB job, fall back to mock
  const job = dbJob
    ? {
        ...dbJob,
        // Map DB field names to the shape the template expects
        superintendent: dbJob.superintendent_id ?? "TBD",
        project_manager: dbJob.pm_id ?? "TBD",
        client_entity: "",
        client_name: "",
        contract_amount: dbJob.contract_amount ?? 0,
        builder_fee: dbJob.builder_fee ?? 0,
        units_completed: 0,
      }
    : mockJob

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold">Job not found</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/construction")}
        >
          Back to Construction
        </Button>
      </div>
    )
  }

  const statusConfig = JOB_STATUS_CONFIG[(job.status as JobStatus) ?? "active"] ?? JOB_STATUS_CONFIG.active

  // Use real units if available, fall back to mock for legacy IDs
  const units = dbUnits.length > 0
    ? dbUnits.map((u) => ({
        id: u.id,
        unit_number: u.unit_number,
        address: u.lot_address ?? "",
        floor_plan_name: "",
        floor_plan_specs: "",
        upgrade_package: u.upgrade_package,
        status: (u.current_milestone ?? 0) >= 16 ? "complete" as const : (u.current_milestone ?? 0) > 0 ? "in_progress" as const : "not_started" as const,
        current_phase: u.current_milestone ?? 0,
        total_budget: u.total_budget ?? 0,
        committed: u.total_committed ?? 0,
        actual: u.total_actual ?? 0,
        schedule_status: "on_schedule" as const,
        permit_date: u.permit_date,
        construction_start: u.start_date,
        projected_completion: u.projected_completion_date,
        co_date: u.co_date,
      }))
    : jobId === "job-001" ? MOCK_UNITS_JOB001 : []

  const purchaseOrders = MOCK_PURCHASE_ORDERS.filter(
    (po) => po.job_id === jobId
  )
  const changeOrders = MOCK_CHANGE_ORDERS.filter(
    (co) => co.job_id === jobId
  )

  // Compute metrics
  const costToDate = purchaseOrders
    .filter((po) => ["approved", "scheduled", "paid"].includes(po.status))
    .reduce((sum, po) => sum + po.amount, 0)
  const budgetRemaining = job.contract_amount - costToDate

  const unitsByStatus = {
    complete: units.filter((u) => u.status === "complete").length,
    in_progress: units.filter((u) => u.status === "in_progress").length,
    not_started: units.filter((u) => u.status === "not_started").length,
  }

  // Unit milestone distribution for stacked bar
  const milestoneDist = CONSTRUCTION_PHASES.map((phase) => ({
    phase: phase.number,
    name: phase.shortName,
    count: units.filter(
      (u) => u.current_phase === phase.number && u.status === "in_progress"
    ).length,
  }))

  const unitStatusSegments = [
    { label: "Complete", value: unitsByStatus.complete, color: "bg-blue-500" },
    {
      label: "In Progress",
      value: unitsByStatus.in_progress,
      color: "bg-green-500",
    },
    {
      label: "Not Started",
      value: unitsByStatus.not_started,
      color: "bg-gray-300 dark:bg-gray-600",
    },
  ]

  // Open POs (top 10 by amount)
  const openPOs = purchaseOrders
    .filter((po) =>
      ["issued", "work_complete", "invoiced", "approved", "scheduled"].includes(
        po.status
      )
    )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Pending inspections
  const pendingInspections = units
    .filter((u) => u.status === "in_progress")
    .slice(0, 5)
    .map((u) => ({
      unit: u.unit_number,
      type: "Phase Inspection",
      phase: CONSTRUCTION_PHASES.find((p) => p.number === u.current_phase)
        ?.name,
      due: "TBD",
    }))

  // Punch items summary
  const { data: punchItems = [] } = usePunchItemsByJob(jobId)
  const punchSummary = (() => {
    const open = punchItems.filter((i) => i.status === "open").length
    const inProgress = punchItems.filter((i) => i.status === "in_progress").length
    const complete = punchItems.filter((i) => i.status === "complete").length
    const verified = punchItems.filter((i) => i.status === "verified").length
    return { total: punchItems.length, open, inProgress, complete, verified }
  })()

  // Units with open punch items
  const unitsWithOpenPunch = (() => {
    const openItems = punchItems.filter(
      (i) => i.status === "open" || i.status === "in_progress" || i.status === "disputed"
    )
    const byUnit = new Map<string, { unitId: string; rooms: Set<string>; count: number; lastActivity: string }>()
    for (const item of openItems) {
      if (!byUnit.has(item.unit_id)) {
        byUnit.set(item.unit_id, {
          unitId: item.unit_id,
          rooms: new Set(),
          count: 0,
          lastActivity: item.updated_at,
        })
      }
      const entry = byUnit.get(item.unit_id)!
      entry.rooms.add(item.room)
      entry.count++
      if (item.updated_at > entry.lastActivity) {
        entry.lastActivity = item.updated_at
      }
    }
    return Array.from(byUnit.values()).sort((a, b) => b.count - a.count)
  })()

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/construction")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-mono text-muted-foreground">
              {job.job_number}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">{job.name}</h1>
            <Badge className={cn("text-xs", statusConfig.bgColor)}>
              {statusConfig.label}
            </Badge>
            <Badge variant="outline">{job.state}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {job.client_type === "internal"
                ? job.client_entity
                : job.client_name}
            </span>
            <span className="flex items-center gap-1">
              <HardHat className="h-3.5 w-3.5" />
              {job.superintendent}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(job.start_date)} - {formatDate(job.projected_completion)}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Contract Value"
          value={formatCurrency(job.contract_amount, { compact: true })}
          subtitle={`Fee: ${formatCurrency(job.builder_fee, { compact: true })}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Cost to Date"
          value={formatCurrency(costToDate, { compact: true })}
          subtitle={formatPercent(
            job.contract_amount > 0
              ? (costToDate / job.contract_amount) * 100
              : 0,
            0
          )}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <StatCard
          title="Budget Remaining"
          value={formatCurrency(budgetRemaining, { compact: true })}
          icon={<DollarSign className="h-4 w-4" />}
          className={
            budgetRemaining < 0
              ? "border-red-200 dark:border-red-800"
              : undefined
          }
        />
        <StatCard
          title="Units by Status"
          value={`${unitsByStatus.complete}/${job.unit_count}`}
          subtitle={`${unitsByStatus.in_progress} in progress, ${unitsByStatus.not_started} not started`}
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks{taskCount > 0 ? ` (${taskCount})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* ============ DASHBOARD TAB ============ */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Unit Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Unit Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StackedBar
                segments={unitStatusSegments}
                total={job.unit_count}
                height={36}
              />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Open POs Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  Open Purchase Orders
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  Top 10 by amount
                </span>
              </CardHeader>
              <CardContent>
                {openPOs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No open purchase orders
                  </p>
                ) : (
                  <div className="space-y-2">
                    {openPOs.map((po) => (
                      <div
                        key={po.id}
                        className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-xs text-muted-foreground mr-2">
                            {po.po_number}
                          </span>
                          <span className="truncate">{po.vendor_name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            className={cn(
                              "text-xs",
                              PO_STATUS_CONFIG[po.status].bgColor
                            )}
                          >
                            {PO_STATUS_CONFIG[po.status].label}
                          </Badge>
                          <span className="font-medium w-20 text-right">
                            {formatCurrency(po.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_ACTIVITY_FEED.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div
                        className={cn(
                          "mt-1 h-2 w-2 rounded-full shrink-0",
                          item.type === "milestone"
                            ? "bg-green-500"
                            : item.type === "po"
                            ? "bg-blue-500"
                            : item.type === "inspection"
                            ? "bg-purple-500"
                            : item.type === "change_order"
                            ? "bg-orange-500"
                            : "bg-gray-400"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{item.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.user} &middot; {formatDate(item.timestamp, { includeTime: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pending Inspections */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Pending Inspections
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingInspections.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No pending inspections
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingInspections.map((insp, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0"
                      >
                        <div>
                          <span className="font-medium">{insp.unit}</span>
                          <span className="ml-2 text-muted-foreground">
                            {insp.phase}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Open Change Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  Open Change Orders
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(`/construction/jobs/${jobId}/change-orders`)
                  }
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {changeOrders.filter(
                  (co) =>
                    co.status === "pending" || co.status === "revised"
                ).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No open change orders
                  </p>
                ) : (
                  <div className="space-y-2">
                    {changeOrders
                      .filter(
                        (co) =>
                          co.status === "pending" ||
                          co.status === "revised"
                      )
                      .map((co) => (
                        <div
                          key={co.id}
                          className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-mono text-xs text-muted-foreground mr-2">
                              {co.co_number}
                            </span>
                            <span className="truncate">
                              {co.description.slice(0, 50)}...
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              className={cn(
                                "text-xs",
                                CO_STATUS_CONFIG[co.status].bgColor
                              )}
                            >
                              {CO_STATUS_CONFIG[co.status].label}
                            </Badge>
                            <span className="font-medium">
                              {formatCurrency(co.total_amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Punch List Summary */}
          {punchSummary.total > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Punch List Summary</CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    {punchSummary.open} Open
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {punchSummary.inProgress} In Progress
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {punchSummary.complete} Complete
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800">
                    {punchSummary.verified} Verified
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {unitsWithOpenPunch.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    All punch items resolved
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Unit
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Rooms
                          </th>
                          <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                            Open Items
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Last Activity
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitsWithOpenPunch.slice(0, 10).map((entry) => {
                          const unit = units.find((u) => u.id === entry.unitId)
                          return (
                            <tr
                              key={entry.unitId}
                              className="border-b last:border-0 cursor-pointer hover:bg-muted/30"
                              onClick={() =>
                                router.push(
                                  `/construction/jobs/${jobId}/units/${entry.unitId}`
                                )
                              }
                            >
                              <td className="px-4 py-2 font-medium">
                                {unit?.unit_number ?? entry.unitId.slice(0, 8)}
                              </td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">
                                {Array.from(entry.rooms)
                                  .map(
                                    (r) =>
                                      PUNCH_ROOM_CONFIG[
                                        r as keyof typeof PUNCH_ROOM_CONFIG
                                      ]?.label ?? r
                                  )
                                  .join(", ")}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className="font-medium text-red-600">
                                  {entry.count}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">
                                {formatDate(entry.lastActivity)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============ UNITS TAB ============ */}
        <TabsContent value="units" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {units.length} unit{units.length !== 1 ? "s" : ""} in this job
            </p>
          </div>

          {units.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-1 text-lg font-semibold">No units yet</h3>
                <p className="text-sm text-muted-foreground">
                  Units will be created when the job is set up.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((unit) => {
                const variance = unit.total_budget - unit.actual
                const scheduleColor =
                  unit.schedule_status === "complete"
                    ? "border-l-blue-500"
                    : unit.schedule_status === "on_schedule"
                    ? "border-l-green-500"
                    : unit.schedule_status === "behind_1_7"
                    ? "border-l-yellow-500"
                    : unit.schedule_status === "behind_8_plus"
                    ? "border-l-red-500"
                    : "border-l-gray-300"

                const phaseName =
                  unit.current_phase > 0
                    ? CONSTRUCTION_PHASES.find(
                        (p) => p.number === unit.current_phase
                      )?.shortName
                    : "Not Started"

                return (
                  <Card
                    key={unit.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md hover:border-primary/30 border-l-4",
                      scheduleColor
                    )}
                    onClick={() =>
                      router.push(
                        `/construction/jobs/${jobId}/units/${unit.id}`
                      )
                    }
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          {unit.unit_number}
                        </span>
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
                          {phaseName}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {unit.address}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium">
                          {unit.floor_plan_name}
                        </span>
                        {unit.floor_plan_specs && (
                          <span className="text-muted-foreground">
                            {unit.floor_plan_specs}
                          </span>
                        )}
                      </div>
                      {unit.upgrade_package && (
                        <Badge variant="secondary" className="text-xs">
                          {unit.upgrade_package}
                        </Badge>
                      )}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">
                          Budget: {formatCurrency(unit.total_budget, { compact: true })}
                        </span>
                        <span className="text-muted-foreground">
                          Actual: {formatCurrency(unit.actual, { compact: true })}
                        </span>
                        <span
                          className={cn(
                            "font-medium",
                            variance >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          {variance >= 0 ? "+" : ""}
                          {formatCurrency(variance, { compact: true })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ============ SCHEDULE TAB ============ */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Gantt schedule view for all units
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/construction/jobs/${jobId}/schedule`)
              }
            >
              Full Screen View
            </Button>
          </div>

          {units.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                No units to display
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                {/* Simplified inline schedule */}
                <div className="space-y-1">
                  <div className="flex items-center text-xs text-muted-foreground border-b border-border pb-2 mb-2">
                    <span className="w-24">Unit</span>
                    <span className="w-28">Plan</span>
                    <span className="flex-1">Phase Progress</span>
                    <span className="w-20 text-right">Status</span>
                  </div>
                  {units.slice(0, 15).map((unit) => {
                    const progress =
                      unit.current_phase > 0
                        ? (unit.current_phase / 16) * 100
                        : 0
                    const phaseName =
                      unit.current_phase > 0
                        ? CONSTRUCTION_PHASES.find(
                            (p) => p.number === unit.current_phase
                          )?.shortName
                        : "N/A"

                    return (
                      <div
                        key={unit.id}
                        className="flex items-center text-sm py-1.5"
                      >
                        <span className="w-24 font-mono text-xs">
                          {unit.unit_number}
                        </span>
                        <span className="w-28 text-xs text-muted-foreground truncate">
                          {unit.floor_plan_name}
                        </span>
                        <div className="flex-1 px-2">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={progress}
                              className={cn(
                                "h-2 flex-1",
                                unit.schedule_status === "behind_8_plus" &&
                                  "[&>div]:bg-red-500",
                                unit.schedule_status === "behind_1_7" &&
                                  "[&>div]:bg-yellow-500",
                                unit.schedule_status === "complete" &&
                                  "[&>div]:bg-blue-500"
                              )}
                            />
                            <span className="text-xs text-muted-foreground w-8">
                              {phaseName}
                            </span>
                          </div>
                        </div>
                        <span className="w-20 text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              unit.schedule_status === "complete"
                                ? "border-blue-400 text-blue-700"
                                : unit.schedule_status === "on_schedule"
                                ? "border-green-400 text-green-700"
                                : unit.schedule_status === "behind_1_7"
                                ? "border-yellow-400 text-yellow-700"
                                : unit.schedule_status === "behind_8_plus"
                                ? "border-red-400 text-red-700"
                                : ""
                            )}
                          >
                            {unit.schedule_status === "complete"
                              ? "Done"
                              : unit.schedule_status === "on_schedule"
                              ? "On Time"
                              : unit.schedule_status === "behind_1_7"
                              ? "Delayed"
                              : unit.schedule_status === "behind_8_plus"
                              ? "Critical"
                              : "Pending"}
                          </Badge>
                        </span>
                      </div>
                    )
                  })}
                  {units.length > 15 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{units.length - 15} more units. Open full-screen view
                      to see all.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============ CHANGE ORDERS TAB ============ */}
        <TabsContent value="change-orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {changeOrders.length} change order
              {changeOrders.length !== 1 ? "s" : ""}
            </p>
            <Button
              size="sm"
              onClick={() =>
                router.push(`/construction/jobs/${jobId}/change-orders`)
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              New Change Order
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    CO#
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Markup
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {changeOrders.map((co) => (
                  <tr
                    key={co.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {co.co_number}
                    </td>
                    <td className="px-4 py-3">{co.unit_number}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      {co.description}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">
                      {co.reason.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(co.cost_impact)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPercent(co.markup_percent, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(co.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "text-xs",
                          CO_STATUS_CONFIG[co.status].bgColor
                        )}
                      >
                        {CO_STATUS_CONFIG[co.status].label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ============ FINANCIALS TAB ============ */}
        <TabsContent value="financials" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Contract Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(job.contract_amount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Builder Fee: {formatCurrency(job.builder_fee)} (
                  {formatPercent(
                    (job.builder_fee / job.contract_amount) * 100,
                    1
                  )}
                  )
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Total Committed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    purchaseOrders
                      .filter((po) => po.status !== "draft")
                      .reduce((s, po) => s + po.amount, 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {purchaseOrders.filter((po) => po.status !== "draft").length}{" "}
                  purchase orders issued
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Change Orders Net Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    changeOrders
                      .filter((co) => co.status === "approved")
                      .reduce((s, co) => s + co.total_amount, 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {changeOrders.filter((co) => co.status === "approved").length}{" "}
                  approved COs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* PO breakdown by status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PO Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                items={Object.entries(
                  purchaseOrders.reduce<Record<string, number>>((acc, po) => {
                    const label = PO_STATUS_CONFIG[po.status].label
                    acc[label] = (acc[label] || 0) + po.amount
                    return acc
                  }, {})
                ).map(([label, value]) => ({
                  label,
                  value,
                  color: "bg-primary",
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ PHOTOS TAB ============ */}
        <TabsContent value="photos" className="space-y-4">
          <PhotoGallery
            jobId={jobId}
            units={units.map((u) => ({ id: u.id, unit_number: u.unit_number }))}
          />
        </TabsContent>

        {/* ============ TASKS TAB ============ */}
        <TabsContent value="tasks" className="space-y-4">
          <RecordTasksPanel
            recordType="job"
            recordId={jobId}
            recordName={job.name}
            recordUrl={`/construction/jobs/${jobId}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
