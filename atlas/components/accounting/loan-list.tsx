"use client"

import { useState, useMemo } from "react"
import {
  Banknote,
  AlertTriangle,
  Search,
  XCircle,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
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
import type { Loan, LoanType, LoanStatus } from "@/lib/types/accounting"
import { LOAN_TYPE_LABELS } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LoanListProps {
  loans: Loan[]
  onSelectLoan: (loan: Loan) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDaysUntilMaturity(maturityDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maturity = new Date(maturityDate)
  maturity.setHours(0, 0, 0, 0)
  return Math.ceil(
    (maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
}

function getMaturityColor(days: number): string {
  if (days <= 0) return "text-red-700 bg-red-50"
  if (days <= 30) return "text-red-600 bg-red-50"
  if (days <= 60) return "text-orange-600 bg-orange-50"
  if (days <= 90) return "text-yellow-600 bg-yellow-50"
  return ""
}

function getStatusBadgeClass(status: LoanStatus): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "paid_off":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "defaulted":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    case "pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoanList({
  loans,
  onSelectLoan,
  className,
}: LoanListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // Filtered loans
  const filteredLoans = useMemo(() => {
    let result = [...loans]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (l) =>
          l.lender_name.toLowerCase().includes(q) ||
          l.project_name?.toLowerCase().includes(q) ||
          LOAN_TYPE_LABELS[l.loan_type].toLowerCase().includes(q)
      )
    }

    if (filterType && filterType !== "all") {
      result = result.filter((l) => l.loan_type === filterType)
    }

    if (filterStatus && filterStatus !== "all") {
      result = result.filter((l) => l.status === filterStatus)
    }

    return result
  }, [loans, searchQuery, filterType, filterStatus])

  // Aggregate totals
  const totals = useMemo(() => {
    return filteredLoans.reduce(
      (acc, loan) => ({
        originalAmount: acc.originalAmount + loan.original_amount,
        amountDrawn: acc.amountDrawn + loan.amount_drawn,
        availableAmount: acc.availableAmount + loan.available_amount,
        currentBalance: acc.currentBalance + loan.current_balance,
      }),
      {
        originalAmount: 0,
        amountDrawn: 0,
        availableAmount: 0,
        currentBalance: 0,
      }
    )
  }, [filteredLoans])

  const hasActiveFilters =
    searchQuery || filterType !== "all" || filterStatus !== "all"

  const clearFilters = () => {
    setSearchQuery("")
    setFilterType("all")
    setFilterStatus("all")
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Total Committed</p>
            <p className="text-xl font-bold tabular-nums">
              {formatCurrency(totals.originalAmount, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Total Drawn</p>
            <p className="text-xl font-bold tabular-nums text-orange-600">
              {formatCurrency(totals.amountDrawn, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-xl font-bold tabular-nums text-green-600">
              {formatCurrency(totals.availableAmount, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-xl font-bold tabular-nums">
              {formatCurrency(totals.currentBalance, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by lender, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(
              Object.entries(LOAN_TYPE_LABELS) as [LoanType, string][]
            ).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid_off">Paid Off</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            <XCircle className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Loan Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        {filteredLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Banknote className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No loans found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lender</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Drawn</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Maturity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.map((loan) => {
                const daysToMaturity = getDaysUntilMaturity(
                  loan.maturity_date
                )
                const maturityColor = getMaturityColor(daysToMaturity)
                const utilization =
                  loan.original_amount > 0
                    ? (loan.amount_drawn / loan.original_amount) * 100
                    : 0

                return (
                  <TableRow
                    key={loan.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelectLoan(loan)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{loan.lender_name}</p>
                        {loan.project_name && (
                          <p className="text-xs text-muted-foreground">
                            {loan.project_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {LOAN_TYPE_LABELS[loan.loan_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(loan.original_amount, { decimals: 0 })}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(loan.amount_drawn, { decimals: 0 })}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-green-600">
                      {formatCurrency(loan.available_amount, { decimals: 0 })}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      <div>
                        <span>{formatPercent(loan.interest_rate)}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {loan.rate_type === "variable" ? "var" : "fix"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs inline-block",
                          maturityColor
                        )}
                      >
                        {formatDate(loan.maturity_date, { short: true })}
                        {daysToMaturity <= 90 && daysToMaturity > 0 && (
                          <span className="ml-1 font-medium">
                            ({daysToMaturity}d)
                          </span>
                        )}
                        {daysToMaturity <= 0 && (
                          <span className="ml-1 flex items-center gap-0.5 inline-flex">
                            <AlertTriangle className="h-3 w-3" />
                            Matured
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          getStatusBadgeClass(loan.status)
                        )}
                      >
                        {loan.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={utilization}
                          className={cn(
                            "h-2 flex-1",
                            utilization > 90 && "[&>div]:bg-red-500",
                            utilization > 75 &&
                              utilization <= 90 &&
                              "[&>div]:bg-yellow-500"
                          )}
                        />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatPercent(utilization, 0)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              {/* Aggregate totals */}
              <TableRow className="border-t-2 bg-muted/30 font-semibold">
                <TableCell colSpan={2}>
                  Totals ({filteredLoans.length} loans)
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(totals.originalAmount, { decimals: 0 })}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(totals.amountDrawn, { decimals: 0 })}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-green-600">
                  {formatCurrency(totals.availableAmount, { decimals: 0 })}
                </TableCell>
                <TableCell colSpan={4} />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
