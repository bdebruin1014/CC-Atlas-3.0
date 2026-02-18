"use client"

import { useRouter, useParams } from "next/navigation"
import {
  Building2,
  Clock,
  DollarSign,
  TrendingDown,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  StatCard,
  StackedBar,
} from "@/components/construction/job-dashboard"
import {
  MOCK_PURCHASE_ORDERS,
  MOCK_CHANGE_ORDERS,
  MOCK_ACTIVITY_FEED,
} from "@/lib/construction/mock-data"
import {
  CO_STATUS_CONFIG,
  PO_STATUS_CONFIG,
  CONSTRUCTION_PHASES,
} from "@/lib/construction/types"
import {
  usePunchItemsByJob,
  PUNCH_ROOM_CONFIG,
} from "@/lib/hooks/use-punch-items"
import { useJobContext } from "./layout"

export default function JobDashboardPage() {
  const router = useRouter()
  const { job, units, jobId } = useJobContext()

  // Map DB units to the shape the dashboard template expects
  const displayUnits = units.map((u) => ({
    id: u.id,
    unit_number: u.unit_number,
    address: u.lot_address ?? "",
    status:
      (u.current_milestone ?? 0) >= 6
        ? ("complete" as const)
        : (u.current_milestone ?? 0) > 0
        ? ("in_progress" as const)
        : ("not_started" as const),
    current_phase: u.current_milestone ?? 0,
    total_budget: u.total_budget ?? 0,
    actual: u.total_actual ?? 0,
  }))

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
  const budgetRemaining = (job.contract_amount ?? 0) - costToDate

  const unitsByStatus = {
    complete: displayUnits.filter((u) => u.status === "complete").length,
    in_progress: displayUnits.filter((u) => u.status === "in_progress").length,
    not_started: displayUnits.filter((u) => u.status === "not_started").length,
  }

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
  const pendingInspections = displayUnits
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
      (i) =>
        i.status === "open" ||
        i.status === "in_progress" ||
        i.status === "disputed"
    )
    const byUnit = new Map<
      string,
      { unitId: string; rooms: Set<string>; count: number; lastActivity: string }
    >()
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
    <div className="space-y-6">
      {/* Unit Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit Status Overview</CardTitle>
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
            <CardTitle className="text-base">Open Purchase Orders</CardTitle>
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
                      {item.user} &middot;{" "}
                      {formatDate(item.timestamp, { includeTime: true })}
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
            <CardTitle className="text-base">Pending Inspections</CardTitle>
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
            <CardTitle className="text-base">Open Change Orders</CardTitle>
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
              (co) => co.status === "pending" || co.status === "revised"
            ).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No open change orders
              </p>
            ) : (
              <div className="space-y-2">
                {changeOrders
                  .filter(
                    (co) =>
                      co.status === "pending" || co.status === "revised"
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
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800"
              >
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
                      const unit = displayUnits.find(
                        (u) => u.id === entry.unitId
                      )
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
                            {unit?.unit_number ??
                              entry.unitId.slice(0, 8)}
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
    </div>
  )
}
