"use client"

import { useState, useMemo, useCallback } from "react"
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Check,
  XCircle,
  Loader2,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import type {
  Transaction,
  TransactionType,
  TransactionStatus,
} from "@/lib/types/accounting"
import {
  TRANSACTION_TYPE_LABELS,
} from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TransactionListProps {
  transactions: Transaction[]
  onApprove: (ids: string[]) => Promise<void>
  onVoid: (ids: string[]) => Promise<void>
  isLoading?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBadgeClass(status: TransactionStatus): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    case "approved":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "posted":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "voided":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransactionList({
  transactions,
  onApprove,
  onVoid,
  isLoading = false,
  className,
}: TransactionListProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [filterAccount, setFilterAccount] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Sorting
  const [sortField, setSortField] = useState<"date" | "description" | "status">("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Expand row for line items
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Bulk action state
  const [bulkActioning, setBulkActioning] = useState(false)

  // Get unique accounts from line items
  const uniqueAccounts = useMemo(() => {
    const accountMap = new Map<string, string>()
    transactions.forEach((t) => {
      t.line_items.forEach((li) => {
        if (li.account_id && li.account_name) {
          accountMap.set(li.account_id, `${li.account_number || ""} - ${li.account_name}`)
        }
      })
    })
    return Array.from(accountMap.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    )
  }, [transactions])

  // Filtered & sorted transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.reference_number && t.reference_number.toLowerCase().includes(q)) ||
          t.line_items.some(
            (li) =>
              li.account_name?.toLowerCase().includes(q) ||
              li.memo?.toLowerCase().includes(q)
          )
      )
    }

    // Date range
    if (dateFrom) {
      result = result.filter((t) => t.date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((t) => t.date <= dateTo)
    }

    // Account filter
    if (filterAccount && filterAccount !== "all") {
      result = result.filter((t) =>
        t.line_items.some((li) => li.account_id === filterAccount)
      )
    }

    // Type filter
    if (filterType && filterType !== "all") {
      result = result.filter((t) => t.transaction_type === filterType)
    }

    // Status filter
    if (filterStatus && filterStatus !== "all") {
      result = result.filter((t) => t.status === filterStatus)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === "date") {
        cmp = a.date.localeCompare(b.date)
      } else if (sortField === "description") {
        cmp = a.description.localeCompare(b.description)
      } else if (sortField === "status") {
        cmp = a.status.localeCompare(b.status)
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [
    transactions,
    searchQuery,
    dateFrom,
    dateTo,
    filterAccount,
    filterType,
    filterStatus,
    sortField,
    sortDir,
  ])

  // Running balance (when filtered to single account)
  const showRunningBalance = filterAccount && filterAccount !== "all"
  const runningBalances = useMemo(() => {
    if (!showRunningBalance) return new Map<string, number>()
    let running = 0
    const balMap = new Map<string, number>()
    // Process in chronological order for running balance
    const sorted = [...filteredTransactions].sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    sorted.forEach((t) => {
      t.line_items
        .filter((li) => li.account_id === filterAccount)
        .forEach((li) => {
          running += li.debit_amount - li.credit_amount
        })
      balMap.set(t.id, running)
    })
    return balMap
  }, [showRunningBalance, filteredTransactions, filterAccount])

  // Selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)))
    }
  }, [selectedIds.size, filteredTransactions])

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 inline" />
    )
  }

  // Bulk actions
  const handleBulkApprove = async () => {
    setBulkActioning(true)
    try {
      await onApprove(Array.from(selectedIds))
      setSelectedIds(new Set())
    } finally {
      setBulkActioning(false)
    }
  }

  const handleBulkVoid = async () => {
    setBulkActioning(true)
    try {
      await onVoid(Array.from(selectedIds))
      setSelectedIds(new Set())
    } finally {
      setBulkActioning(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setDateFrom("")
    setDateTo("")
    setFilterAccount("")
    setFilterType("all")
    setFilterStatus("all")
  }

  const hasActiveFilters =
    searchQuery || dateFrom || dateTo || (filterAccount && filterAccount !== "all") || filterType !== "all" || filterStatus !== "all"

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
              placeholder="From"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
              placeholder="To"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Account filter */}
          <Select value={filterAccount || "all"} onValueChange={setFilterAccount}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {uniqueAccounts.map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(
                Object.entries(TRANSACTION_TYPE_LABELS) as [
                  TransactionType,
                  string,
                ][]
              ).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              <XCircle className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkApprove}
            disabled={bulkActioning}
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkVoid}
            disabled={bulkActioning}
            className="text-red-600 hover:text-red-700"
          >
            <XCircle className="h-3.5 w-3.5" />
            Void
          </Button>
          {bulkActioning && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </span>
        {filteredTransactions.length > 0 && (
          <span>
            Total: {formatCurrency(
              filteredTransactions.reduce((s, t) => s + t.total_debits, 0),
              { decimals: 2 }
            )}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading transactions...
            </span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Filter className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No transactions match your filters</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      selectedIds.size === filteredTransactions.length &&
                      filteredTransactions.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("date")}
                >
                  Date <SortIcon field="date" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("description")}
                >
                  Description <SortIcon field="description" />
                </TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("status")}
                >
                  Status <SortIcon field="status" />
                </TableHead>
                {showRunningBalance && (
                  <TableHead className="text-right">Balance</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((txn) => (
                <>
                  <TableRow
                    key={txn.id}
                    className={cn(
                      "cursor-pointer",
                      selectedIds.has(txn.id) && "bg-muted/30",
                      txn.status === "voided" && "opacity-50"
                    )}
                    onClick={() =>
                      setExpandedId(expandedId === txn.id ? null : txn.id)
                    }
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(txn.id)}
                        onCheckedChange={() => toggleSelect(txn.id)}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(txn.date, { short: true })}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex items-center gap-1">
                        {expandedId === txn.id ? (
                          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground rotate-180" />
                        )}
                        <span className="truncate">{txn.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {txn.line_items.length > 1
                        ? `${txn.line_items.length} accounts`
                        : txn.line_items[0]?.account_name || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(txn.total_debits, { decimals: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(txn.total_credits, { decimals: 2 })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {txn.reference_number || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {TRANSACTION_TYPE_LABELS[txn.transaction_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          getStatusBadgeClass(txn.status)
                        )}
                      >
                        {txn.status}
                      </Badge>
                    </TableCell>
                    {showRunningBalance && (
                      <TableCell className="text-right font-mono tabular-nums font-medium">
                        {formatCurrency(runningBalances.get(txn.id) ?? 0, {
                          decimals: 2,
                        })}
                      </TableCell>
                    )}
                  </TableRow>

                  {/* Expanded line items */}
                  {expandedId === txn.id && (
                    <TableRow key={`${txn.id}-details`}>
                      <TableCell
                        colSpan={showRunningBalance ? 10 : 9}
                        className="bg-muted/20 p-0"
                      >
                        <div className="px-8 py-3">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Line Items
                          </p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-muted-foreground border-b">
                                <th className="text-left py-1 px-2">Account</th>
                                <th className="text-right py-1 px-2">Debit</th>
                                <th className="text-right py-1 px-2">Credit</th>
                                <th className="text-left py-1 px-2">Memo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {txn.line_items.map((li) => (
                                <tr key={li.id} className="border-b last:border-b-0">
                                  <td className="py-1.5 px-2">
                                    <span className="font-mono text-xs text-muted-foreground mr-1">
                                      {li.account_number}
                                    </span>
                                    {li.account_name}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                                    {li.debit_amount > 0
                                      ? formatCurrency(li.debit_amount, {
                                          decimals: 2,
                                        })
                                      : ""}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                                    {li.credit_amount > 0
                                      ? formatCurrency(li.credit_amount, {
                                          decimals: 2,
                                        })
                                      : ""}
                                  </td>
                                  <td className="py-1.5 px-2 text-xs text-muted-foreground">
                                    {li.memo || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
