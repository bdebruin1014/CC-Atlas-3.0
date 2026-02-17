"use client"

import { useState, useMemo } from "react"
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal,
  FileText,
  AlertTriangle,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { APInvoice } from "@/lib/construction/accounting-types"
import {
  AP_INVOICE_STATUS_CONFIG,
  AGING_BUCKET_CONFIG,
  getAgingBucket,
  type APInvoiceStatus,
  type AgingBucket,
} from "@/lib/construction/accounting-types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface InvoiceListProps {
  invoices: APInvoice[]
  onApprove: (invoiceIds: string[]) => void
  onVoid: (invoiceId: string) => void
  onSchedulePayment: (invoiceIds: string[]) => void
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function computeAgingDays(dueDate: string): number {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

type TabFilter = "all" | "pending" | "scheduled" | "paid" | "disputed"

const TAB_FILTERS: { value: TabFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending Approval" },
  { value: "scheduled", label: "Scheduled" },
  { value: "paid", label: "Paid" },
  { value: "disputed", label: "Disputed" },
]

function matchesTab(invoice: APInvoice, tab: TabFilter): boolean {
  switch (tab) {
    case "all":
      return true
    case "pending":
      return invoice.status === "received" || invoice.status === "coded"
    case "scheduled":
      return invoice.status === "scheduled"
    case "paid":
      return invoice.status === "paid" || invoice.status === "partially_paid"
    case "disputed":
      return invoice.status === "disputed"
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function InvoiceList({
  invoices,
  onApprove,
  onVoid,
  onSchedulePayment,
  isLoading,
}: InvoiceListProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [vendorFilter, setVendorFilter] = useState<string>("all")
  const [jobFilter, setJobFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Derive unique vendors and jobs for filter dropdowns
  const uniqueVendors = useMemo(() => {
    const map = new Map<string, string>()
    invoices.forEach((inv) => {
      if (inv.vendor) map.set(inv.vendor.id, inv.vendor.company_name)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [invoices])

  const uniqueJobs = useMemo(() => {
    const map = new Map<string, string>()
    invoices.forEach((inv) => {
      if (inv.job) map.set(inv.job.id, inv.job.name)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [invoices])

  // Filter logic
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (!matchesTab(inv, activeTab)) return false
      if (vendorFilter !== "all" && inv.vendor_contact_id !== vendorFilter) return false
      if (jobFilter !== "all" && inv.job_id !== jobFilter) return false
      if (statusFilter !== "all" && inv.status !== statusFilter) return false

      if (dateFrom) {
        const from = new Date(dateFrom)
        if (new Date(inv.due_date) < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        if (new Date(inv.due_date) > to) return false
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const vendorName = inv.vendor?.company_name?.toLowerCase() ?? ""
        const poNum = inv.po?.po_number?.toLowerCase() ?? ""
        const invNum = inv.invoice_number.toLowerCase()
        if (
          !vendorName.includes(q) &&
          !poNum.includes(q) &&
          !invNum.includes(q)
        )
          return false
      }

      return true
    })
  }, [invoices, activeTab, searchQuery, vendorFilter, jobFilter, statusFilter, dateFrom, dateTo])

  // Summary calculations
  const summary = useMemo(() => {
    const outstanding = invoices
      .filter((i) => !["paid", "voided"].includes(i.status))
      .reduce((sum, i) => sum + i.balance_due, 0)

    const overdue = invoices.filter((i) => {
      if (["paid", "voided"].includes(i.status)) return false
      return computeAgingDays(i.due_date) > 0
    })
    const overdueTotal = overdue.reduce((sum, i) => sum + i.balance_due, 0)

    const buckets: Record<AgingBucket, number> = {
      current: 0,
      "1-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    }
    invoices
      .filter((i) => !["paid", "voided"].includes(i.status))
      .forEach((i) => {
        const days = computeAgingDays(i.due_date)
        const bucket = getAgingBucket(days)
        buckets[bucket]++
      })

    return { outstanding, overdueTotal, overdueCount: overdue.length, buckets }
  }, [invoices])

  // Selection helpers
  const allFilteredIds = filtered.map((i) => i.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id))

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allFilteredIds))
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedArray = Array.from(selectedIds)

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="text-lg font-bold">
              {formatCurrency(summary.outstanding, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Overdue</p>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(summary.overdueTotal, { decimals: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.overdueCount} invoices
            </p>
          </CardContent>
        </Card>
        {(Object.entries(AGING_BUCKET_CONFIG) as [AgingBucket, typeof AGING_BUCKET_CONFIG[AgingBucket]][]).map(
          ([bucket, cfg]) => (
            <Card key={bucket}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
                <p className={cn("text-lg font-bold", cfg.color)}>
                  {summary.buckets[bucket]}
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoice #, vendor, PO #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {uniqueVendors.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {uniqueJobs.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.entries(AP_INVOICE_STATUS_CONFIG) as [APInvoiceStatus, typeof AP_INVOICE_STATUS_CONFIG[APInvoiceStatus]][]).map(
              ([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[150px]"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[150px]"
          placeholder="To"
        />
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium">
            {selectedIds.size} invoice{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onApprove(selectedArray)
              setSelectedIds(new Set())
            }}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Batch Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onSchedulePayment(selectedArray)
              setSelectedIds(new Set())
            }}
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Schedule Payment
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Tabs + Table */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as TabFilter)
          setSelectedIds(new Set())
        }}
      >
        <TabsList>
          {TAB_FILTERS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading invoices...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mb-2 opacity-40" />
              <p>No invoices match the current filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO #</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Aging</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => {
                  const agingDays = computeAgingDays(inv.due_date)
                  const bucket = getAgingBucket(agingDays)
                  const bucketCfg = AGING_BUCKET_CONFIG[bucket]
                  const statusCfg = AP_INVOICE_STATUS_CONFIG[inv.status]
                  const isSelected = selectedIds.has(inv.id)

                  return (
                    <TableRow
                      key={inv.id}
                      data-state={isSelected ? "selected" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(inv.id)}
                          aria-label={`Select invoice ${inv.invoice_number}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell>
                        {inv.vendor?.company_name ?? "Unknown"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inv.po?.po_number ?? "—"}
                      </TableCell>
                      <TableCell>{inv.job?.name ?? "—"}</TableCell>
                      <TableCell>
                        {inv.unit?.unit_number ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(inv.balance_due, { decimals: 2 })}
                      </TableCell>
                      <TableCell>{formatDate(inv.due_date, { short: true })}</TableCell>
                      <TableCell>
                        {!["paid", "voided"].includes(inv.status) && agingDays > 0 ? (
                          <Badge
                            className={cn(
                              "text-xs border-0",
                              bucketCfg.bgColor,
                              bucketCfg.color
                            )}
                          >
                            {agingDays}d
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {agingDays <= 0 ? "Current" : "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs border-0",
                            statusCfg.bgColor,
                            statusCfg.color
                          )}
                        >
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onApprove([inv.id])}
                              disabled={inv.status !== "received" && inv.status !== "coded"}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onSchedulePayment([inv.id])}
                              disabled={inv.status !== "approved"}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Schedule Payment
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onVoid(inv.id)}
                              disabled={inv.status === "paid" || inv.status === "voided"}
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Void
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
