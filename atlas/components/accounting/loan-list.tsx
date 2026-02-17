"use client"

import { useMemo } from "react"
import {
  Banknote,
  AlertTriangle,
  Clock,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { formatPercent } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
  onSelectLoan?: (id: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getMonthsUntilMaturity(maturityDate: string): number {
  const today = new Date()
  const maturity = new Date(maturityDate)
  const diffMs = maturity.getTime() - today.getTime()
  return diffMs / (1000 * 60 * 60 * 24 * 30.44)
}

function getMaturityColor(months: number): string {
  if (months < 0) return "text-red-900 bg-red-200"
  if (months < 3) return "text-red-700 bg-red-100"
  if (months < 6) return "text-yellow-700 bg-yellow-100"
  return "text-green-700 bg-green-100"
}

function getMaturityLabel(months: number): string {
  if (months < 0) return "Past Due"
  if (months < 1) return "<1 mo"
  if (months < 12) return `${Math.floor(months)} mo`
  const years = Math.floor(months / 12)
  const remainMo = Math.floor(months % 12)
  return remainMo > 0 ? `${years}y ${remainMo}m` : `${years}y`
}

function getLoanStatusBadge(status: LoanStatus): {
  label: string
  className: string
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className: "bg-green-100 text-green-800 hover:bg-green-100",
      }
    case "paid_off":
      return {
        label: "Paid Off",
        className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      }
    case "defaulted":
      return {
        label: "Defaulted",
        className: "bg-red-100 text-red-800 hover:bg-red-100",
      }
    case "pending":
      return {
        label: "Pending",
        className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      }
    default:
      return {
        label: status,
        className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
      }
  }
}

function getLoanTypeBadge(loanType: LoanType): string {
  switch (loanType) {
    case "construction_loan":
      return "bg-orange-100 text-orange-800 hover:bg-orange-100"
    case "acquisition_loan":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "bridge_loan":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100"
    case "permanent_loan":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "line_of_credit":
      return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100"
    case "mezzanine":
      return "bg-pink-100 text-pink-800 hover:bg-pink-100"
    case "seller_financing":
      return "bg-teal-100 text-teal-800 hover:bg-teal-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function LoanList({ loans, onSelectLoan }: LoanListProps) {
  // Aggregates
  const aggregate = useMemo(() => {
    return loans.reduce(
      (acc, loan) => {
        acc.totalOriginal += loan.original_amount
        acc.totalDrawn += loan.amount_drawn
        acc.totalAvailable += loan.available_amount
        acc.totalBalance += loan.current_balance
        return acc
      },
      {
        totalOriginal: 0,
        totalDrawn: 0,
        totalAvailable: 0,
        totalBalance: 0,
      }
    )
  }, [loans])

  const overallUtilization = useMemo(() => {
    if (aggregate.totalOriginal === 0) return 0
    return (aggregate.totalDrawn / aggregate.totalOriginal) * 100
  }, [aggregate])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Commitments</p>
            <p className="text-2xl font-bold">
              {formatCurrency(aggregate.totalOriginal, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Drawn</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(aggregate.totalDrawn, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Available</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(aggregate.totalAvailable, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Overall Utilization
            </p>
            <p className="text-2xl font-bold">
              {formatPercent(overallUtilization, 1)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loan Table */}
      {loans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Banknote className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No loans recorded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lender</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Original Amount</TableHead>
                <TableHead className="text-right">Amount Drawn</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Maturity</TableHead>
                <TableHead className="w-[140px]">Utilization</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => {
                const months = getMonthsUntilMaturity(loan.maturity_date)
                const maturityColor = getMaturityColor(months)
                const maturityLabel = getMaturityLabel(months)
                const utilization =
                  loan.original_amount > 0
                    ? (loan.amount_drawn / loan.original_amount) * 100
                    : 0
                const statusCfg = getLoanStatusBadge(loan.status)

                return (
                  <TableRow
                    key={loan.id}
                    className={cn(
                      onSelectLoan && "cursor-pointer",
                      months < 0 && "bg-red-50/50 dark:bg-red-950/20"
                    )}
                    onClick={() => onSelectLoan?.(loan.id)}
                  >
                    <TableCell className="font-medium">
                      <div>
                        {loan.lender_name}
                        {loan.project_name && (
                          <p className="text-xs text-muted-foreground">
                            {loan.project_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] whitespace-nowrap",
                          getLoanTypeBadge(loan.loan_type)
                        )}
                      >
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
                      {formatPercent(loan.interest_rate)}
                      {loan.rate_type === "variable" && (
                        <span className="text-[10px] text-muted-foreground block">
                          Variable
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] border-0",
                            maturityColor
                          )}
                        >
                          {months < 0 && (
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                          )}
                          {months >= 0 && months < 3 && (
                            <Clock className="h-3 w-3 mr-0.5" />
                          )}
                          {maturityLabel}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(loan.maturity_date, { short: true })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress
                          value={Math.min(utilization, 100)}
                          className={cn(
                            "h-2 flex-1",
                            utilization >= 90 && "[&>div]:bg-red-500",
                            utilization >= 75 &&
                              utilization < 90 &&
                              "[&>div]:bg-orange-500"
                          )}
                        />
                        <span className="text-xs font-medium w-10 text-right tabular-nums">
                          {formatPercent(utilization, 0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px]", statusCfg.className)}
                      >
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}

              {/* Aggregate row */}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell>
                  {loans.length} loan{loans.length !== 1 ? "s" : ""}
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(aggregate.totalOriginal, { decimals: 0 })}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(aggregate.totalDrawn, { decimals: 0 })}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-green-600">
                  {formatCurrency(aggregate.totalAvailable, { decimals: 0 })}
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <Progress
                      value={Math.min(overallUtilization, 100)}
                      className="h-2 flex-1"
                    />
                    <span className="text-xs font-medium w-10 text-right tabular-nums">
                      {formatPercent(overallUtilization, 0)}
                    </span>
                  </div>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
