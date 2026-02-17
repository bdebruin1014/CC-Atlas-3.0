"use client"

import { useState, useMemo } from "react"
import {
  Search,
  ChevronDown,
  ChevronRight,
  XCircle,
  CreditCard,
  FileText,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import type { APPayment, PaymentMethod } from "@/lib/construction/accounting-types"
import { PAYMENT_STATUS_CONFIG, type PaymentStatus } from "@/lib/construction/accounting-types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface PaymentHistoryProps {
  payments: APPayment[]
  onVoid: (paymentId: string) => void
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const METHOD_LABELS: Record<PaymentMethod, string> = {
  check: "Check",
  ach: "ACH",
  wire: "Wire",
  credit_card: "Credit Card",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PaymentHistory({
  payments,
  onVoid,
  isLoading,
}: PaymentHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [methodFilter, setMethodFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return payments.filter((pmt) => {
      if (methodFilter !== "all" && pmt.payment_method !== methodFilter) return false
      if (statusFilter !== "all" && pmt.status !== statusFilter) return false

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const vendorName = pmt.vendor?.company_name?.toLowerCase() ?? ""
        const pmtNum = pmt.payment_number.toLowerCase()
        const ref = pmt.payment_reference?.toLowerCase() ?? ""
        if (
          !vendorName.includes(q) &&
          !pmtNum.includes(q) &&
          !ref.includes(q)
        )
          return false
      }
      return true
    })
  }, [payments, searchQuery, methodFilter, statusFilter])

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search payment #, vendor, reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {(Object.entries(METHOD_LABELS) as [PaymentMethod, string][]).map(
              ([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.entries(PAYMENT_STATUS_CONFIG) as [PaymentStatus, typeof PAYMENT_STATUS_CONFIG[PaymentStatus]][]).map(
              ([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading payments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CreditCard className="h-10 w-10 mb-2 opacity-40" />
          <p>No payments match the current filters.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Payment #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((pmt) => {
              const isExpanded = expandedIds.has(pmt.id)
              const statusCfg = PAYMENT_STATUS_CONFIG[pmt.status]

              return (
                <>
                  <TableRow
                    key={pmt.id}
                    className="cursor-pointer"
                    onClick={() => toggleExpand(pmt.id)}
                  >
                    <TableCell>
                      {pmt.applications && pmt.applications.length > 0 ? (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )
                      ) : null}
                    </TableCell>
                    <TableCell className="font-medium">
                      {pmt.payment_number}
                    </TableCell>
                    <TableCell>
                      {formatDate(pmt.payment_date, { short: true })}
                    </TableCell>
                    <TableCell>
                      {pmt.vendor?.company_name ?? "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {METHOD_LABELS[pmt.payment_method]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {pmt.payment_reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(pmt.total_amount, { decimals: 2 })}
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVoid(pmt.id)}
                        disabled={
                          pmt.status === "voided" || pmt.status === "returned"
                        }
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expanded: applied invoices */}
                  {isExpanded &&
                    pmt.applications &&
                    pmt.applications.length > 0 && (
                      <TableRow key={`${pmt.id}-detail`}>
                        <TableCell />
                        <TableCell colSpan={8}>
                          <div className="rounded-md border border-border bg-muted/30 p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Applied Invoices
                            </p>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Invoice #</TableHead>
                                  <TableHead className="text-xs text-right">
                                    Applied
                                  </TableHead>
                                  <TableHead className="text-xs">
                                    Retainage Release
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pmt.applications.map((app) => (
                                  <TableRow key={app.id}>
                                    <TableCell className="py-1.5 text-sm">
                                      <div className="flex items-center gap-1.5">
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                        {app.invoice?.invoice_number ?? app.invoice_id}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-1.5 text-sm text-right font-medium">
                                      {formatCurrency(app.amount_applied, {
                                        decimals: 2,
                                      })}
                                    </TableCell>
                                    <TableCell className="py-1.5 text-sm">
                                      {app.is_retainage_release ? (
                                        <Badge className="text-xs border-0 bg-purple-100 text-purple-700">
                                          Yes
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground">
                                          No
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                </>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
