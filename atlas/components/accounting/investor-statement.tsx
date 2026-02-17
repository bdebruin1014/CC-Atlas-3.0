"use client"

import { useMemo } from "react"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface InvestorStatementData {
  investor_name: string
  beginning_balance: number
  contributions: number
  preferred_return: number
  distributions: number
  ending_balance: number
  irr: number | null
  equity_multiple: number
  cash_flows: any[]
}

interface InvestorStatementProps {
  data: InvestorStatementData
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getIRRColor(irr: number | null): string {
  if (irr === null) return "text-muted-foreground"
  if (irr >= 20) return "text-green-600"
  if (irr >= 10) return "text-green-500"
  if (irr >= 0) return "text-yellow-600"
  return "text-red-600"
}

function getMultipleColor(multiple: number): string {
  if (multiple >= 2.0) return "text-green-600"
  if (multiple >= 1.5) return "text-green-500"
  if (multiple >= 1.0) return "text-yellow-600"
  return "text-red-600"
}

function getCashFlowTypeBadge(type: string): {
  label: string
  className: string
} {
  switch (type) {
    case "contribution":
    case "capital_contribution":
      return {
        label: "Contribution",
        className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      }
    case "distribution":
      return {
        label: "Distribution",
        className: "bg-green-100 text-green-800 hover:bg-green-100",
      }
    case "preferred_return":
      return {
        label: "Preferred Return",
        className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
      }
    case "return_of_capital":
      return {
        label: "Return of Capital",
        className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
      }
    default:
      return {
        label: type.replace(/_/g, " "),
        className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
      }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function InvestorStatement({ data }: InvestorStatementProps) {
  const irrFormatted = useMemo(() => {
    if (data.irr === null) return "N/A"
    return `${data.irr.toFixed(1)}%`
  }, [data.irr])

  const sortedCashFlows = useMemo(
    () =>
      [...(data.cash_flows ?? [])].sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [data.cash_flows]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wallet className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold">{data.investor_name}</h3>
          <p className="text-xs text-muted-foreground">
            Capital Account Statement
          </p>
        </div>
      </div>

      {/* Capital Account Waterfall */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capital Account Waterfall</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {/* Beginning Balance */}
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-sm font-medium">Beginning Balance</span>
              <span className="font-mono tabular-nums font-medium">
                {formatCurrency(data.beginning_balance, { decimals: 2 })}
              </span>
            </div>

            {/* + Contributions */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold text-sm">+</span>
                <span className="text-sm">Contributions</span>
              </div>
              <span className="font-mono tabular-nums text-green-600">
                {formatCurrency(data.contributions, { decimals: 2 })}
              </span>
            </div>

            {/* + Preferred Return */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold text-sm">+</span>
                <span className="text-sm">Preferred Return</span>
              </div>
              <span className="font-mono tabular-nums text-green-600">
                {formatCurrency(data.preferred_return, { decimals: 2 })}
              </span>
            </div>

            {/* - Distributions */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-bold text-sm">-</span>
                <span className="text-sm">Distributions</span>
              </div>
              <span className="font-mono tabular-nums text-red-600">
                ({formatCurrency(data.distributions, { decimals: 2 })})
              </span>
            </div>

            {/* = Ending Balance */}
            <div className="flex items-center justify-between py-3 bg-muted/30 rounded-b-md px-3 -mx-3 border-t-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">=</span>
                <span className="text-sm font-bold">Ending Balance</span>
              </div>
              <span className="font-mono tabular-nums font-bold text-lg">
                {formatCurrency(data.ending_balance, { decimals: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">
              Internal Rate of Return (IRR)
            </p>
            <div className="flex items-center gap-2">
              {data.irr !== null && data.irr >= 0 ? (
                <TrendingUp
                  className={cn("h-5 w-5", getIRRColor(data.irr))}
                />
              ) : data.irr !== null ? (
                <TrendingDown
                  className={cn("h-5 w-5", getIRRColor(data.irr))}
                />
              ) : null}
              <span
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  getIRRColor(data.irr)
                )}
              >
                {irrFormatted}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">
              Equity Multiple
            </p>
            <span
              className={cn(
                "text-3xl font-bold tabular-nums",
                getMultipleColor(data.equity_multiple)
              )}
            >
              {data.equity_multiple.toFixed(2)}x
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cash Flow History</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedCashFlows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No cash flow transactions recorded
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCashFlows.map((cf: any, idx: number) => {
                    const typeCfg = getCashFlowTypeBadge(
                      cf.type ?? "other"
                    )
                    const isNegative =
                      cf.type === "distribution" ||
                      cf.type === "return_of_capital"

                    return (
                      <TableRow key={cf.id ?? idx}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(cf.date)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cf.description ?? "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono tabular-nums font-medium",
                            isNegative
                              ? "text-red-600"
                              : "text-green-600"
                          )}
                        >
                          {isNegative ? "(" : ""}
                          {formatCurrency(Math.abs(cf.amount ?? 0), {
                            decimals: 2,
                          })}
                          {isNegative ? ")" : ""}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              typeCfg.className
                            )}
                          >
                            {typeCfg.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {/* Running total */}
                  <TableRow className="font-semibold bg-muted/50 border-t-2">
                    <TableCell colSpan={2}>Net Cash Flow</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums",
                        sortedCashFlows.reduce(
                          (sum: number, cf: any) =>
                            sum + (cf.amount ?? 0),
                          0
                        ) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {formatCurrency(
                        sortedCashFlows.reduce(
                          (sum: number, cf: any) =>
                            sum + (cf.amount ?? 0),
                          0
                        ),
                        { decimals: 2 }
                      )}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
