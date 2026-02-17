"use client"

import { useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  FileText,
  DollarSign,
  ChevronRight,
  ArrowRightCircle,
  Download,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { POForm } from "@/components/construction/po-form"
import { StatCard } from "@/components/construction/job-dashboard"
import { MOCK_PURCHASE_ORDERS, MOCK_UNITS_JOB001 } from "@/lib/construction/mock-data"
import {
  PO_STATUS_CONFIG,
  PO_STATUS_FLOW,
} from "@/lib/construction/types"
import type { PurchaseOrder, POStatus } from "@/lib/construction/types"

const LIEN_WAIVER_CONFIG = {
  not_received: {
    label: "Not Received",
    bgColor: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
  partial: {
    label: "Partial",
    bgColor:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  final: {
    label: "Final",
    bgColor:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
}

const STATUS_ACTION_LABELS: Record<POStatus, string> = {
  draft: "Issue PO",
  issued: "Mark Work Complete",
  work_complete: "Enter Invoice",
  invoiced: "Approve for Payment",
  approved: "Schedule Payment",
  scheduled: "Mark as Paid",
  paid: "",
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const unitId = params.unitId as string

  const unit = MOCK_UNITS_JOB001.find((u) => u.id === unitId)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(
    MOCK_PURCHASE_ORDERS.filter((po) => po.unit_id === unitId)
  )
  const [showCreatePO, setShowCreatePO] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [statusFilter, setStatusFilter] = useState<POStatus | "all">("all")

  const filteredPOs = useMemo(() => {
    let pos = [...purchaseOrders]
    if (statusFilter !== "all") {
      pos = pos.filter((po) => po.status === statusFilter)
    }
    return pos.sort(
      (a, b) =>
        PO_STATUS_CONFIG[a.status].order - PO_STATUS_CONFIG[b.status].order
    )
  }, [purchaseOrders, statusFilter])

  // Summary calculations
  const totalBudget = unit?.total_budget ?? 0
  const totalCommitted = purchaseOrders
    .filter((po) => po.status !== "draft")
    .reduce((s, po) => s + po.amount, 0)
  const totalActual = purchaseOrders
    .filter((po) => po.status === "paid")
    .reduce((s, po) => s + po.amount, 0)
  const remaining = totalBudget - totalCommitted

  const handleCreatePO = (data: Partial<PurchaseOrder>) => {
    setPurchaseOrders((prev) => [...prev, data as PurchaseOrder])
  }

  const handleAdvanceStatus = (po: PurchaseOrder) => {
    const nextStatus = PO_STATUS_FLOW[po.status]
    if (!nextStatus) return

    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === po.id ? { ...p, status: nextStatus } : p
      )
    )
    setSelectedPO((prev) =>
      prev?.id === po.id ? { ...prev, status: nextStatus } : prev
    )
  }

  const handleUpdateLienWaiver = (
    po: PurchaseOrder,
    status: PurchaseOrder["lien_waiver_status"]
  ) => {
    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === po.id ? { ...p, lien_waiver_status: status } : p
      )
    )
    setSelectedPO((prev) =>
      prev?.id === po.id
        ? { ...prev, lien_waiver_status: status }
        : prev
    )
  }

  if (!unit) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold">Unit not found</h2>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push(`/construction/jobs/${jobId}/units/${unitId}`)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Unit {unit.unit_number}
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Purchase Orders - {unit.unit_number}
            </h1>
            <p className="text-sm text-muted-foreground">
              {unit.floor_plan_name} &middot; {unit.address}
            </p>
          </div>
          <Button onClick={() => setShowCreatePO(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create PO
          </Button>
        </div>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Budget"
          value={formatCurrency(totalBudget, { compact: true })}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Committed (Issued POs)"
          value={formatCurrency(totalCommitted, { compact: true })}
          subtitle={formatPercent(
            totalBudget > 0 ? (totalCommitted / totalBudget) * 100 : 0,
            0
          )}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Actual (Paid POs)"
          value={formatCurrency(totalActual, { compact: true })}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Remaining"
          value={formatCurrency(remaining, { compact: true })}
          icon={<DollarSign className="h-4 w-4" />}
          className={remaining < 0 ? "border-red-200 dark:border-red-800" : undefined}
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as POStatus | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(PO_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredPOs.length} PO{filteredPOs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* PO Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                PO#
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Trade Category
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Vendor
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Description
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Amount
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Lien Waiver
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.map((po) => (
              <tr
                key={po.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer"
                onClick={() => setSelectedPO(po)}
              >
                <td className="px-4 py-3 font-mono text-xs">
                  {po.po_number}
                </td>
                <td className="px-4 py-3 text-xs">{po.trade_category}</td>
                <td className="px-4 py-3">{po.vendor_name}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">
                  {po.description}
                </td>
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
                <td className="px-4 py-3">
                  <Badge
                    className={cn(
                      "text-xs",
                      LIEN_WAIVER_CONFIG[po.lien_waiver_status].bgColor
                    )}
                  >
                    {LIEN_WAIVER_CONFIG[po.lien_waiver_status].label}
                  </Badge>
                </td>
              </tr>
            ))}
            {filteredPOs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No purchase orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create PO Dialog */}
      <POForm
        unitId={unitId}
        jobId={jobId}
        open={showCreatePO}
        onOpenChange={setShowCreatePO}
        onSubmit={handleCreatePO}
      />

      {/* PO Detail Sheet */}
      <Sheet
        open={!!selectedPO}
        onOpenChange={(open) => !open && setSelectedPO(null)}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedPO && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedPO.po_number}
                  <Badge
                    className={cn(
                      "text-xs",
                      PO_STATUS_CONFIG[selectedPO.status].bgColor
                    )}
                  >
                    {PO_STATUS_CONFIG[selectedPO.status].label}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {selectedPO.trade_category} - {selectedPO.vendor_name}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Trade</p>
                      <p className="font-medium">
                        {selectedPO.trade_category}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vendor</p>
                      <p className="font-medium">{selectedPO.vendor_name}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Description</p>
                      <p className="font-medium">{selectedPO.description}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {formatDate(selectedPO.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Financial */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Financial
                  </h3>
                  <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PO Amount</span>
                      <span className="font-medium">
                        {formatCurrency(selectedPO.amount, { decimals: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Retainage ({selectedPO.retainage_percent}%)
                      </span>
                      <span className="text-red-600">
                        -
                        {formatCurrency(selectedPO.retainage_amount, {
                          decimals: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="font-medium">Net Payable</span>
                      <span className="font-bold">
                        {formatCurrency(selectedPO.net_amount, {
                          decimals: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {selectedPO.invoice_number && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Invoice #</p>
                        <p className="font-medium">
                          {selectedPO.invoice_number}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Invoice Date</p>
                        <p className="font-medium">
                          {formatDate(selectedPO.invoice_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Lien Waiver Status */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Lien Waiver
                  </h3>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedPO.lien_waiver_status}
                      onValueChange={(v) =>
                        handleUpdateLienWaiver(
                          selectedPO,
                          v as PurchaseOrder["lien_waiver_status"]
                        )
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_received">
                          Not Received
                        </SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Status Workflow */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Workflow
                  </h3>
                  {PO_STATUS_FLOW[selectedPO.status] ? (
                    <Button
                      className="w-full"
                      onClick={() => handleAdvanceStatus(selectedPO)}
                    >
                      <ArrowRightCircle className="mr-2 h-4 w-4" />
                      {STATUS_ACTION_LABELS[selectedPO.status]}
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      This PO has been fully paid. No further actions available.
                    </p>
                  )}

                  {/* Status timeline */}
                  <div className="space-y-1">
                    {Object.entries(PO_STATUS_CONFIG).map(
                      ([key, config]) => {
                        const status = key as POStatus
                        const isCurrent = selectedPO.status === status
                        const isPast =
                          config.order <
                          PO_STATUS_CONFIG[selectedPO.status].order

                        return (
                          <div
                            key={key}
                            className={cn(
                              "flex items-center gap-2 rounded px-3 py-1.5 text-xs",
                              isCurrent &&
                                "bg-primary/10 font-semibold",
                              isPast && "text-muted-foreground"
                            )}
                          >
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                isPast
                                  ? "bg-green-500"
                                  : isCurrent
                                  ? "bg-blue-500"
                                  : "bg-gray-300 dark:bg-gray-600"
                              )}
                            />
                            <span>{config.label}</span>
                            {isCurrent && (
                              <Badge
                                variant="outline"
                                className="ml-auto text-xs"
                              >
                                Current
                              </Badge>
                            )}
                          </div>
                        )
                      }
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
