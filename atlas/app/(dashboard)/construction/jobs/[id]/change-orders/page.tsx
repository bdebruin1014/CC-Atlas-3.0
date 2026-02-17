"use client"

import { useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  DollarSign,
  Calendar,
  FileText,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { StatCard } from "@/components/construction/job-dashboard"
import {
  MOCK_JOBS,
  MOCK_UNITS_JOB001,
  MOCK_CHANGE_ORDERS,
} from "@/lib/construction/mock-data"
import {
  CO_STATUS_CONFIG,
  CO_REASON_CONFIG,
} from "@/lib/construction/types"
import type {
  ChangeOrder,
  ChangeOrderStatus,
  ChangeOrderReason,
} from "@/lib/construction/types"

export default function ChangeOrdersPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const job = MOCK_JOBS.find((j) => j.id === jobId)
  const units = jobId === "job-001" ? MOCK_UNITS_JOB001 : []

  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>(
    MOCK_CHANGE_ORDERS.filter((co) => co.job_id === jobId)
  )
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ChangeOrderStatus | "all">(
    "all"
  )
  const [unitFilter, setUnitFilter] = useState<string>("all")

  // Form state
  const [formUnitId, setFormUnitId] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formReason, setFormReason] = useState<ChangeOrderReason | "">("" as ChangeOrderReason | "")
  const [formCostImpact, setFormCostImpact] = useState("")
  const [formScheduleImpact, setFormScheduleImpact] = useState("0")
  const [formLinkedPO, setFormLinkedPO] = useState("")

  const parsedCost = parseFloat(formCostImpact) || 0
  const markupPercent = formReason
    ? CO_REASON_CONFIG[formReason].markupPercent
    : 0
  const markupAmount = parsedCost * (markupPercent / 100)
  const totalAmount = parsedCost + markupAmount

  const filteredCOs = useMemo(() => {
    let cos = [...changeOrders]
    if (statusFilter !== "all") {
      cos = cos.filter((co) => co.status === statusFilter)
    }
    if (unitFilter !== "all") {
      cos = cos.filter((co) => co.unit_id === unitFilter)
    }
    return cos.sort(
      (a, b) =>
        new Date(b.submitted_date).getTime() -
        new Date(a.submitted_date).getTime()
    )
  }, [changeOrders, statusFilter, unitFilter])

  // Summary stats
  const totalApproved = changeOrders
    .filter((co) => co.status === "approved")
    .reduce((s, co) => s + co.total_amount, 0)
  const openCount = changeOrders.filter(
    (co) => co.status === "submitted" || co.status === "under_review"
  ).length
  const totalScheduleImpact = changeOrders
    .filter((co) => co.status === "approved")
    .reduce((s, co) => s + co.schedule_impact_days, 0)

  const handleCreate = () => {
    if (!formUnitId || !formDescription || !formReason || !parsedCost) return

    const selectedUnit = units.find((u) => u.id === formUnitId)
    const coNum = `CO-${String(changeOrders.length + 1).padStart(3, "0")}`

    const newCO: ChangeOrder = {
      id: `co-new-${Date.now()}`,
      co_number: coNum,
      job_id: jobId,
      unit_id: formUnitId,
      unit_number: selectedUnit?.unit_number,
      linked_po_id: formLinkedPO || undefined,
      description: formDescription,
      reason: formReason,
      cost_impact: parsedCost,
      markup_percent: markupPercent,
      total_amount: totalAmount,
      schedule_impact_days: parseInt(formScheduleImpact) || 0,
      status: "submitted",
      submitted_by: "Current User",
      submitted_date: new Date().toISOString().split("T")[0],
    }

    setChangeOrders((prev) => [newCO, ...prev])
    setShowCreateDialog(false)
    resetForm()
  }

  const resetForm = () => {
    setFormUnitId("")
    setFormDescription("")
    setFormReason("" as ChangeOrderReason | "")
    setFormCostImpact("")
    setFormScheduleImpact("0")
    setFormLinkedPO("")
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold">Job not found</h2>
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
          onClick={() => router.push(`/construction/jobs/${jobId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {job.name}
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Change Orders - {job.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage change orders across all units in this job
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Change Order
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Change Orders"
          value={changeOrders.length}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Open COs"
          value={openCount}
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <StatCard
          title="Approved Impact"
          value={formatCurrency(totalApproved, { compact: true })}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Schedule Impact"
          value={`${totalScheduleImpact} days`}
          subtitle="From approved COs"
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as ChangeOrderStatus | "all")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(CO_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {units.slice(0, 20).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.unit_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {filteredCOs.length} change order
          {filteredCOs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
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
                Cost Impact
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Markup %
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
            {filteredCOs.map((co) => (
              <tr
                key={co.id}
                className="border-b border-border last:border-0 hover:bg-muted/50"
              >
                <td className="px-4 py-3 font-mono text-xs">
                  {co.co_number}
                </td>
                <td className="px-4 py-3">{co.unit_number || "--"}</td>
                <td className="px-4 py-3 max-w-[250px] truncate">
                  {co.description}
                </td>
                <td className="px-4 py-3 text-xs">
                  {CO_REASON_CONFIG[co.reason].label}
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
            {filteredCOs.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No change orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create CO Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Change Order</DialogTitle>
            <DialogDescription>
              Submit a new change order for review and approval.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select value={formUnitId} onValueChange={setFormUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {units.slice(0, 24).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.unit_number} - {u.floor_plan_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Linked PO (optional)</Label>
              <Input
                placeholder="PO number..."
                value={formLinkedPO}
                onChange={(e) => setFormLinkedPO(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe the change order..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason Category *</Label>
              <Select
                value={formReason}
                onValueChange={(v) =>
                  setFormReason(v as ChangeOrderReason)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CO_REASON_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label} ({config.markupPercent}% markup)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Impact *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formCostImpact}
                    onChange={(e) => setFormCostImpact(e.target.value)}
                    className="pl-7"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Schedule Impact (days)</Label>
                <Input
                  type="number"
                  value={formScheduleImpact}
                  onChange={(e) => setFormScheduleImpact(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            {/* Auto-calculated summary */}
            {parsedCost > 0 && formReason && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost Impact</span>
                  <span className="font-medium">
                    {formatCurrency(parsedCost, { decimals: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Markup ({markupPercent}% -{" "}
                    {CO_REASON_CONFIG[formReason].label})
                  </span>
                  <span>
                    {formatCurrency(markupAmount, { decimals: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="font-medium">Total Amount</span>
                  <span className="font-bold">
                    {formatCurrency(totalAmount, { decimals: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !formUnitId || !formDescription || !formReason || !parsedCost
              }
            >
              Submit Change Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
