"use client"

import { useState, useMemo } from "react"
import {
  ShieldCheck,
  Plus,
  FileText,
  Clock,
  AlertTriangle,
  Check,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FolderOpen,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useJobContext } from "../layout"
import { MOCK_PERMITS, MOCK_UNITS_JOB001 } from "@/lib/construction/mock-data"
import type { Permit, PermitType, PermitStatus, PermitDocument } from "@/lib/construction/types"
import {
  PERMIT_TYPE_LABELS,
  PERMIT_STATUS_CONFIG,
  PERMIT_STATUS_FLOW,
} from "@/lib/construction/types"

// ---- Document category labels ----
const DOC_CATEGORY_LABELS: Record<PermitDocument["category"], string> = {
  application: "Application",
  plans: "Submitted Plans",
  comments: "Reviewer Comments",
  resubmittal: "Resubmittal",
  approved_plans: "Approved Plans",
  permit_card: "Permit Card",
}

// ---- Helper: days in review ----
function daysInReview(permit: Permit): number | null {
  if (permit.status !== "in_review" && permit.status !== "revisions_requested") return null
  const start = new Date(permit.application_date)
  const now = new Date()
  return Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

// ---- Helper: days until expiration ----
function daysUntilExpiration(permit: Permit): number | null {
  if (!permit.expiration_date) return null
  const exp = new Date(permit.expiration_date)
  const now = new Date()
  return Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function PermittingPage() {
  const { job } = useJobContext()
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [expandedPermit, setExpandedPermit] = useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)

  // Get permits for this job
  const permits = useMemo(
    () => MOCK_PERMITS.filter((p) => p.job_id === job.id),
    [job.id]
  )

  // Filtered permits
  const filteredPermits = useMemo(() => {
    return permits.filter((p) => {
      if (filterType !== "all" && p.permit_type !== filterType) return false
      if (filterStatus !== "all" && p.status !== filterStatus) return false
      if (search) {
        const q = search.toLowerCase()
        const unitNum = p.unit_id
          ? MOCK_UNITS_JOB001.find((u) => u.id === p.unit_id)?.unit_number ?? ""
          : "Job-wide"
        return (
          (p.permit_number ?? "").toLowerCase().includes(q) ||
          PERMIT_TYPE_LABELS[p.permit_type].toLowerCase().includes(q) ||
          unitNum.toLowerCase().includes(q) ||
          p.jurisdiction.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [permits, filterType, filterStatus, search])

  // ---- Dashboard metrics ----
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of permits) {
      counts[p.status] = (counts[p.status] || 0) + 1
    }
    return counts
  }, [permits])

  const totalFees = permits.reduce((s, p) => s + p.fee_amount, 0)
  const feesPaid = permits.filter((p) => p.fee_paid).reduce((s, p) => s + p.fee_amount, 0)
  const feesUnpaid = totalFees - feesPaid

  const permitsInReview = permits.filter(
    (p) => p.status === "in_review" || p.status === "revisions_requested" || p.status === "applied" || p.status === "resubmitted"
  )
  const avgDaysInReview = permitsInReview.length > 0
    ? Math.round(permitsInReview.reduce((s, p) => s + (daysInReview(p) ?? 0), 0) / permitsInReview.length)
    : 0

  const expiringPermits = permits.filter((p) => {
    const days = daysUntilExpiration(p)
    return days !== null && days > 0 && days <= 90
  })

  // Required permit types for a building job
  const requiredTypes: PermitType[] = ["building", "electrical", "plumbing", "mechanical"]
  // Which units have all required permits? Check unit_id-based permits
  const unitIds = MOCK_UNITS_JOB001.filter((u) => u.status !== "not_started").map((u) => u.id)
  const unitsMissingPermits = unitIds.filter((uid) => {
    const unitPermits = permits.filter((p) => p.unit_id === uid)
    return requiredTypes.some(
      (rt) => !unitPermits.some((up) => up.permit_type === rt)
    )
  })

  function getUnitLabel(unitId?: string) {
    if (!unitId) return "Job-wide"
    const u = MOCK_UNITS_JOB001.find((u) => u.id === unitId)
    return u ? u.unit_number : unitId
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Permitting</h1>
          <p className="text-sm text-muted-foreground">
            Track all permits for {job.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FolderOpen className="mr-2 h-4 w-4" />
            SharePoint: 02. Permitting
            <ExternalLink className="ml-1 h-3 w-3 opacity-50" />
          </Button>
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Permit
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Permits</p>
            <p className="text-2xl font-bold">{permits.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">In Review</p>
            <p className="text-2xl font-bold text-purple-600">{permitsInReview.length}</p>
            {avgDaysInReview > 0 && (
              <p className="text-xs text-muted-foreground">{avgDaysInReview}d avg</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-600">{statusCounts["active"] ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Expiring &lt;90d</p>
            <p className={cn("text-2xl font-bold", expiringPermits.length > 0 ? "text-yellow-600" : "")}>
              {expiringPermits.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Fees Paid</p>
            <p className="text-lg font-bold">{formatCurrency(feesPaid)}</p>
            {feesUnpaid > 0 && (
              <p className="text-xs text-red-600">{formatCurrency(feesUnpaid)} unpaid</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Missing Permits</p>
            <p className={cn("text-2xl font-bold", unitsMissingPermits.length > 0 ? "text-red-600" : "text-green-600")}>
              {unitsMissingPermits.length}
            </p>
            <p className="text-xs text-muted-foreground">units</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(expiringPermits.length > 0 || unitsMissingPermits.length > 0) && (
        <div className="space-y-2">
          {expiringPermits.map((p) => {
            const days = daysUntilExpiration(p)!
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm",
                  days <= 30
                    ? "border-red-200 bg-red-50 text-red-800"
                    : days <= 60
                    ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                    : "border-blue-200 bg-blue-50 text-blue-800"
                )}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {PERMIT_TYPE_LABELS[p.permit_type]} permit {p.permit_number ?? ""} ({getUnitLabel(p.unit_id)}) expires in{" "}
                  <strong>{days} days</strong> ({formatDate(p.expiration_date!)})
                </span>
              </div>
            )
          })}
          {unitsMissingPermits.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {unitsMissingPermits.length} active unit{unitsMissingPermits.length !== 1 ? "s" : ""} missing required permits (Building, Electrical, Plumbing, or Mechanical)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search permits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Permit Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(Object.keys(PERMIT_TYPE_LABELS) as PermitType[]).map((t) => (
              <SelectItem key={t} value={t}>{PERMIT_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.keys(PERMIT_STATUS_CONFIG) as PermitStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{PERMIT_STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filteredPermits.length} permit{filteredPermits.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Permit Tracking Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8" />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jurisdiction</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Permit #</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Applied</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issued</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Fee</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Docs</th>
            </tr>
          </thead>
          <tbody>
            {filteredPermits.map((permit) => {
              const isExpanded = expandedPermit === permit.id
              const reviewDays = daysInReview(permit)
              const expDays = daysUntilExpiration(permit)
              return (
                <TooltipProvider key={permit.id} delayDuration={200}>
                  {/* Main row */}
                  <tr
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors",
                      isExpanded && "bg-muted/30"
                    )}
                    onClick={() => setExpandedPermit(isExpanded ? null : permit.id)}
                  >
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {PERMIT_TYPE_LABELS[permit.permit_type]}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {getUnitLabel(permit.unit_id)}
                    </td>
                    <td className="px-4 py-3 text-xs">{permit.jurisdiction}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {permit.permit_number ?? "--"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {formatDate(permit.application_date, { short: true })}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {permit.issued_date ? formatDate(permit.issued_date, { short: true }) : "--"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {permit.expiration_date ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn(
                              expDays !== null && expDays <= 30 && expDays > 0 && "text-red-600 font-medium",
                              expDays !== null && expDays > 30 && expDays <= 90 && "text-yellow-600",
                              expDays !== null && expDays <= 0 && "text-red-600 line-through"
                            )}>
                              {formatDate(permit.expiration_date, { short: true })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {expDays !== null && expDays > 0
                              ? `${expDays} days remaining`
                              : "Expired"}
                          </TooltipContent>
                        </Tooltip>
                      ) : "--"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <span className={cn(!permit.fee_paid && "text-red-600")}>
                        {formatCurrency(permit.fee_amount)}
                      </span>
                      {!permit.fee_paid && (
                        <Badge variant="outline" className="ml-1 text-[9px] text-red-600 border-red-300">
                          Unpaid
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs", PERMIT_STATUS_CONFIG[permit.status].bgColor)}>
                        {PERMIT_STATUS_CONFIG[permit.status].label}
                      </Badge>
                      {reviewDays !== null && reviewDays > 14 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Clock className="inline ml-1 h-3 w-3 text-yellow-600" />
                          </TooltipTrigger>
                          <TooltipContent>{reviewDays} days in review</TooltipContent>
                        </Tooltip>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                      {permit.documents.length > 0 ? (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="mr-1 h-3 w-3" />
                          {permit.documents.length}
                        </Badge>
                      ) : "--"}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr className="border-b border-border bg-muted/10">
                      <td colSpan={11} className="px-6 py-4">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Left: Permit details + workflow */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-semibold mb-2">Permit Details</h3>
                              <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Type:</span>{" "}
                                  <span className="font-medium">{PERMIT_TYPE_LABELS[permit.permit_type]}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Jurisdiction:</span>{" "}
                                  <span className="font-medium">{permit.jurisdiction}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Permit #:</span>{" "}
                                  <span className="font-medium font-mono">{permit.permit_number ?? "Pending"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Fee:</span>{" "}
                                  <span className="font-medium">{formatCurrency(permit.fee_amount)}</span>
                                  {!permit.fee_paid && <span className="text-red-600 ml-1">(Unpaid)</span>}
                                </div>
                              </div>
                              {permit.notes && (
                                <p className="mt-2 text-xs text-muted-foreground border-l-2 border-muted pl-2">
                                  {permit.notes}
                                </p>
                              )}
                            </div>

                            {/* Status workflow */}
                            <div>
                              <h3 className="text-sm font-semibold mb-2">Permitting Workflow</h3>
                              <div className="flex items-center gap-1 flex-wrap">
                                {(Object.keys(PERMIT_STATUS_CONFIG) as PermitStatus[]).map((s, idx, arr) => {
                                  const isActive = s === permit.status
                                  const isPast = PERMIT_STATUS_CONFIG[s].order < PERMIT_STATUS_CONFIG[permit.status].order
                                  // Don't show "expired" for active permits
                                  if (s === "expired" && permit.status !== "expired") return null
                                  if (s === "closed" && permit.status !== "closed") return null
                                  return (
                                    <div key={s} className="flex items-center gap-1">
                                      <div
                                        className={cn(
                                          "flex h-6 items-center rounded-full px-2 text-[10px] font-medium border",
                                          isActive
                                            ? "bg-blue-500 text-white border-blue-600"
                                            : isPast
                                            ? "bg-green-100 text-green-700 border-green-300"
                                            : "bg-gray-100 text-gray-500 border-gray-200"
                                        )}
                                      >
                                        {isPast && <Check className="mr-0.5 h-3 w-3" />}
                                        {PERMIT_STATUS_CONFIG[s].label}
                                      </div>
                                      {idx < arr.length - 1 && s !== "expired" && s !== "closed" && (
                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2">
                              {PERMIT_STATUS_FLOW[permit.status]?.map((next) => (
                                <Button key={next} size="sm" variant="outline">
                                  Move to {PERMIT_STATUS_CONFIG[next].label}
                                </Button>
                              ))}
                              {!permit.fee_paid && (
                                <Button size="sm" variant="outline" className="text-green-700 border-green-400">
                                  Mark Fee Paid
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Right: Documents / submittals */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-semibold">Documents & Submittals</h3>
                              <Button variant="ghost" size="sm" className="text-xs h-7">
                                <FolderOpen className="mr-1 h-3 w-3" />
                                Open SharePoint Folder
                                <ExternalLink className="ml-1 h-3 w-3 opacity-50" />
                              </Button>
                            </div>
                            {permit.documents.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-4 text-center">
                                No documents uploaded yet
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {permit.documents.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs hover:bg-muted/50"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <div className="min-w-0">
                                        <p className="truncate font-medium">{doc.name}</p>
                                        <p className="text-muted-foreground">
                                          {DOC_CATEGORY_LABELS[doc.category]} &middot; {formatDate(doc.uploaded_date, { short: true })}
                                        </p>
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs shrink-0">
                                      View
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <Button variant="outline" size="sm" className="mt-3 w-full text-xs">
                              <Plus className="mr-1 h-3 w-3" />
                              Upload Document
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </TooltipProvider>
              )
            })}
            {filteredPermits.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  No permits match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Permit Status by Unit Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permit Coverage by Unit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">Unit</th>
                  {requiredTypes.map((t) => (
                    <th key={t} className="px-2 py-2 text-center font-medium text-muted-foreground">
                      {PERMIT_TYPE_LABELS[t]}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-medium text-muted-foreground">Other</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_UNITS_JOB001.filter((u) => u.status !== "not_started")
                  .slice(0, 12)
                  .map((unit) => {
                    const unitPermits = permits.filter((p) => p.unit_id === unit.id)
                    return (
                      <tr key={unit.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-2 py-2 font-medium">{unit.unit_number}</td>
                        {requiredTypes.map((t) => {
                          const p = unitPermits.find((up) => up.permit_type === t)
                          if (!p) {
                            return (
                              <td key={t} className="px-2 py-2 text-center">
                                <span className="text-red-500">--</span>
                              </td>
                            )
                          }
                          return (
                            <td key={t} className="px-2 py-2 text-center">
                              <Badge
                                className={cn(
                                  "text-[9px] px-1.5",
                                  PERMIT_STATUS_CONFIG[p.status].bgColor
                                )}
                              >
                                {p.status === "active" || p.status === "issued"
                                  ? <Check className="h-3 w-3" />
                                  : PERMIT_STATUS_CONFIG[p.status].label}
                              </Badge>
                            </td>
                          )
                        })}
                        <td className="px-2 py-2 text-center text-muted-foreground">
                          {unitPermits.filter((p) => !requiredTypes.includes(p.permit_type)).length || "--"}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Permit Dialog (shell) */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Permit Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Permit Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PERMIT_TYPE_LABELS) as PermitType[]).map((t) => (
                      <SelectItem key={t} value={t}>{PERMIT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit (optional)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Job-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job-wide">Job-wide</SelectItem>
                    {MOCK_UNITS_JOB001.slice(0, 12).map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.unit_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jurisdiction</Label>
                <Input placeholder="e.g. City of Greenville" />
              </div>
              <div className="space-y-2">
                <Label>Application Date</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fee Amount</Label>
                <Input type="number" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Permit Number (if known)</Label>
                <Input placeholder="Assigned by jurisdiction" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowNewDialog(false)}>Create Permit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
