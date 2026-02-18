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
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { StatCard } from "@/components/construction/job-dashboard"
import { ChangeOrderForm } from "@/components/construction/change-order-form"
import { toast } from "@/lib/hooks/use-toast"
import { useJob } from "@/lib/hooks/use-jobs"
import { useUnits } from "@/lib/hooks/use-units"
import {
  useChangeOrders,
  useApproveChangeOrder,
  useRejectChangeOrder,
  getApprovalLabel,
} from "@/lib/hooks/use-change-orders"
import {
  CO_STATUS_CONFIG,
  CO_REASON_CONFIG,
} from "@/lib/construction/types"
import type { ChangeOrderStatus, ChangeOrderReason } from "@/lib/construction/types"
import type { ChangeOrder } from "@/lib/supabase/types"

// Map DB reason_category to display config key
function getReasonLabel(cat: ChangeOrder["reason_category"]): string {
  if (!cat) return "Other"
  if (cat === "other") return "Other"
  if (cat in CO_REASON_CONFIG) return CO_REASON_CONFIG[cat as ChangeOrderReason].label
  return cat
}

export default function ChangeOrdersPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const { data: job, isLoading: jobLoading } = useJob(jobId)
  const { data: units = [] } = useUnits(jobId)
  const { data: changeOrders = [], isLoading: cosLoading } = useChangeOrders(jobId)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ChangeOrderStatus | "all">("all")
  const [unitFilter, setUnitFilter] = useState<string>("all")
  const [selectedCO, setSelectedCO] = useState<ChangeOrder | null>(null)
  const [approvalNotes, setApprovalNotes] = useState("")

  const approveMutation = useApproveChangeOrder()
  const rejectMutation = useRejectChangeOrder()

  // Build a unit lookup map
  const unitMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of units) {
      m.set(u.id, u.unit_number ?? u.id.slice(0, 8))
    }
    return m
  }, [units])

  // Filtered list
  const filteredCOs = useMemo(() => {
    let cos = [...changeOrders]
    if (statusFilter !== "all") {
      cos = cos.filter((co) => co.approval_status === statusFilter)
    }
    if (unitFilter !== "all") {
      cos = cos.filter((co) => co.unit_id === unitFilter)
    }
    return cos.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [changeOrders, statusFilter, unitFilter])

  // Summary stats
  const totalApproved = changeOrders
    .filter((co) => co.approval_status === "approved")
    .reduce((s, co) => s + (co.total_with_markup ?? 0), 0)
  const pendingCount = changeOrders.filter(
    (co) => co.approval_status === "pending" || co.approval_status === "revised"
  ).length
  const totalScheduleImpact = changeOrders
    .filter((co) => co.approval_status === "approved")
    .reduce((s, co) => s + co.schedule_impact_days, 0)

  const handleApprove = async () => {
    if (!selectedCO) return
    try {
      await approveMutation.mutateAsync({
        id: selectedCO.id,
        jobId,
        approvedBy: "current-user",
        notes: approvalNotes || undefined,
      })
      toast({ title: `${selectedCO.co_number} approved` })
      setSelectedCO(null)
      setApprovalNotes("")
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" })
    }
  }

  const handleReject = async () => {
    if (!selectedCO) return
    try {
      await rejectMutation.mutateAsync({
        id: selectedCO.id,
        jobId,
        rejectedBy: "current-user",
        notes: approvalNotes || undefined,
      })
      toast({ title: `${selectedCO.co_number} rejected` })
      setSelectedCO(null)
      setApprovalNotes("")
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" })
    }
  }

  const isPending = approveMutation.isPending || rejectMutation.isPending

  if (jobLoading || cosLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
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
              Change Orders &mdash; {job.name}
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
          title="Pending Approval"
          value={pendingCount}
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <StatCard
          title="Approved Total"
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
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.unit_number ?? u.id.slice(0, 8)}
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
                Base Cost
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCOs.map((co) => (
              <tr
                key={co.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  setSelectedCO(co)
                  setApprovalNotes("")
                }}
              >
                <td className="px-4 py-3 font-mono text-xs">
                  {co.co_number ?? "--"}
                </td>
                <td className="px-4 py-3">
                  {unitMap.get(co.unit_id) ?? "--"}
                </td>
                <td className="px-4 py-3 max-w-[250px] truncate">
                  {co.description}
                </td>
                <td className="px-4 py-3 text-xs">
                  {getReasonLabel(co.reason_category)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(co.cost_impact ?? 0)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatPercent(co.markup_pct ?? 0, 0)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(co.total_with_markup ?? 0)}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={cn(
                      "text-xs",
                      CO_STATUS_CONFIG[co.approval_status]?.bgColor ?? ""
                    )}
                  >
                    {CO_STATUS_CONFIG[co.approval_status]?.label ??
                      co.approval_status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(co.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedCO(co)
                      setApprovalNotes("")
                    }}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {filteredCOs.length === 0 && (
              <tr>
                <td
                  colSpan={10}
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
      <ChangeOrderForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        jobId={jobId}
        units={units}
      />

      {/* CO Detail Sheet */}
      <Sheet
        open={!!selectedCO}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCO(null)
            setApprovalNotes("")
          }
        }}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedCO && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono">{selectedCO.co_number}</span>
                  <Badge
                    className={cn(
                      "text-xs",
                      CO_STATUS_CONFIG[selectedCO.approval_status]?.bgColor ?? ""
                    )}
                  >
                    {CO_STATUS_CONFIG[selectedCO.approval_status]?.label ??
                      selectedCO.approval_status}
                  </Badge>
                </SheetTitle>
                <SheetDescription>{selectedCO.description}</SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-6">
                {/* Detail Fields */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Unit</p>
                    <p className="font-medium">
                      {unitMap.get(selectedCO.unit_id) ?? "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reason</p>
                    <p className="font-medium">
                      {getReasonLabel(selectedCO.reason_category)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Base Cost</p>
                    <p className="font-medium">
                      {formatCurrency(selectedCO.cost_impact ?? 0, { decimals: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Markup</p>
                    <p className="font-medium">
                      {formatPercent(selectedCO.markup_pct ?? 0, 0)}
                      {" "}({formatCurrency(
                        (selectedCO.total_with_markup ?? 0) - (selectedCO.cost_impact ?? 0),
                        { decimals: 2 }
                      )})
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(selectedCO.total_with_markup ?? 0, { decimals: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Schedule Impact</p>
                    <p className="font-medium">
                      {selectedCO.schedule_impact_days} day
                      {selectedCO.schedule_impact_days !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium">
                      {formatDate(selectedCO.created_at)}
                    </p>
                  </div>
                  {selectedCO.approval_threshold && (
                    <div>
                      <p className="text-muted-foreground">Approval Route</p>
                      <p className="font-medium">
                        {getApprovalLabel(selectedCO.approval_threshold)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Approval decision details (if already decided) */}
                {selectedCO.approval_status !== "pending" &&
                  selectedCO.approval_status !== "revised" &&
                  selectedCO.approved_at && (
                    <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
                      <p className="font-medium">
                        {selectedCO.approval_status === "approved"
                          ? "Approved"
                          : "Rejected"}{" "}
                        on {formatDate(selectedCO.approved_at)}
                      </p>
                      {selectedCO.approval_notes && (
                        <p className="text-muted-foreground">
                          {selectedCO.approval_notes}
                        </p>
                      )}
                    </div>
                  )}

                {/* Approval actions (only for pending/revised) */}
                {(selectedCO.approval_status === "pending" ||
                  selectedCO.approval_status === "revised") && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <p className="text-sm font-medium">Approval Decision</p>
                    <div className="space-y-2">
                      <Label htmlFor="approval-notes">Notes (optional)</Label>
                      <Textarea
                        id="approval-notes"
                        placeholder="Add approval or rejection notes..."
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer with approve/reject buttons */}
              {(selectedCO.approval_status === "pending" ||
                selectedCO.approval_status === "revised") && (
                <SheetFooter className="flex gap-2">
                  <Button
                    variant="destructive"
                    disabled={isPending}
                    onClick={handleReject}
                    className="flex-1"
                  >
                    {rejectMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    Reject
                  </Button>
                  <Button
                    disabled={isPending}
                    onClick={handleApprove}
                    className="flex-1"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Approve
                  </Button>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
