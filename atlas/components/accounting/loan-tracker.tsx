"use client"

import { useState, useEffect, useMemo } from "react"
import {
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Banknote,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import type { Loan, LoanDraw } from "@/lib/types/accounting"
import { LOAN_TYPE_LABELS } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LoanTrackerProps {
  loanId: string
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
  return Math.ceil((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getMaturityAlertLevel(daysRemaining: number): "none" | "yellow" | "orange" | "red" {
  if (daysRemaining <= 30) return "red"
  if (daysRemaining <= 60) return "orange"
  if (daysRemaining <= 90) return "yellow"
  return "none"
}

function getDrawStatusBadge(status: LoanDraw["status"]) {
  switch (status) {
    case "requested":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Requested</Badge>
    case "approved":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Approved</Badge>
    case "funded":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Funded</Badge>
    case "rejected":
      return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoanTracker({ loanId, className }: LoanTrackerProps) {
  const [loan, setLoan] = useState<Loan | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllDraws, setShowAllDraws] = useState(false)

  useEffect(() => {
    async function loadLoan() {
      setLoading(true)
      const supabase = createClient()

      const { data: loanData } = await supabase
        .from("loans")
        .select(`
          *,
          loan_draws(*)
        `)
        .eq("id", loanId)
        .single()

      if (loanData) {
        setLoan({
          ...loanData,
          draws: (loanData.loan_draws || []).sort(
            (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
          lender_name: loanData.lender_name || "Unknown Lender",
        } as Loan)
      }
      setLoading(false)
    }

    loadLoan()
  }, [loanId])

  const daysUntilMaturity = useMemo(
    () => (loan ? getDaysUntilMaturity(loan.maturity_date) : 999),
    [loan]
  )

  const maturityAlert = useMemo(
    () => getMaturityAlertLevel(daysUntilMaturity),
    [daysUntilMaturity]
  )

  const drawUtilization = useMemo(() => {
    if (!loan || loan.original_amount === 0) return 0
    return (loan.amount_drawn / loan.original_amount) * 100
  }, [loan])

  const visibleDraws = useMemo(() => {
    if (!loan) return []
    return showAllDraws ? loan.draws : loan.draws.slice(0, 5)
  }, [loan, showAllDraws])

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (!loan) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-muted-foreground", className)}>
        <Banknote className="h-10 w-10 mb-3 opacity-50" />
        <p className="text-sm">Loan not found</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Loan Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="h-5 w-5" />
              {loan.lender_name}
            </CardTitle>
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                loan.status === "active" && "bg-green-100 text-green-800 hover:bg-green-100",
                loan.status === "paid_off" && "bg-blue-100 text-blue-800 hover:bg-blue-100",
                loan.status === "defaulted" && "bg-red-100 text-red-800 hover:bg-red-100",
                loan.status === "pending" && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
              )}
            >
              {loan.status.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Loan Type</p>
              <p className="text-sm font-medium">{LOAN_TYPE_LABELS[loan.loan_type]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Original Amount</p>
              <p className="text-sm font-medium">{formatCurrency(loan.original_amount, { decimals: 2 })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Interest Rate</p>
              <p className="text-sm font-medium">
                {formatPercent(loan.interest_rate)}
                {loan.rate_type === "variable" && loan.rate_index && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({loan.rate_index} + {formatPercent(loan.rate_spread || 0)})
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rate Type</p>
              <p className="text-sm font-medium capitalize">{loan.rate_type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Origination Date</p>
              <p className="text-sm font-medium">{formatDate(loan.origination_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Maturity Date</p>
              <p className="text-sm font-medium">{formatDate(loan.maturity_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Payment</p>
              <p className="text-sm font-medium">
                {loan.interest_only
                  ? "Interest Only"
                  : loan.monthly_payment
                  ? formatCurrency(loan.monthly_payment, { decimals: 2 })
                  : "N/A"}
              </p>
            </div>
            {loan.project_name && (
              <div>
                <p className="text-xs text-muted-foreground">Project</p>
                <p className="text-sm font-medium">{loan.project_name}</p>
              </div>
            )}
          </div>

          {loan.covenants && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-1">Covenants</p>
              <p className="text-sm bg-muted/50 rounded-md p-3">{loan.covenants}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maturity Alert */}
      {maturityAlert !== "none" && (
        <Card
          className={cn(
            "border-2",
            maturityAlert === "red" && "border-red-300 bg-red-50",
            maturityAlert === "orange" && "border-orange-300 bg-orange-50",
            maturityAlert === "yellow" && "border-yellow-300 bg-yellow-50"
          )}
        >
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle
              className={cn(
                "h-5 w-5",
                maturityAlert === "red" && "text-red-600",
                maturityAlert === "orange" && "text-orange-600",
                maturityAlert === "yellow" && "text-yellow-600"
              )}
            />
            <div>
              <p className="text-sm font-semibold">
                {daysUntilMaturity <= 0
                  ? "Loan has matured"
                  : `Loan matures in ${daysUntilMaturity} day${daysUntilMaturity !== 1 ? "s" : ""}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Maturity date: {formatDate(loan.maturity_date)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Draw Utilization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Draw Utilization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatCurrency(loan.amount_drawn, { decimals: 2 })} drawn of{" "}
                {formatCurrency(loan.original_amount, { decimals: 2 })}
              </span>
              <span className="font-medium">{formatPercent(drawUtilization)}</span>
            </div>
            <Progress value={drawUtilization} />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Drawn</p>
              <p className="text-lg font-semibold text-orange-600">
                {formatCurrency(loan.amount_drawn, { decimals: 0 })}
              </p>
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(loan.available_amount, { decimals: 0 })}
              </p>
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-lg font-semibold">
                {formatCurrency(loan.current_balance, { decimals: 0 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Draw History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Draw History</CardTitle>
        </CardHeader>
        <CardContent>
          {loan.draws.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No draws recorded
            </p>
          ) : (
            <div className="space-y-0">
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Draw #</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDraws.map((draw) => (
                      <tr key={draw.id} className="border-b last:border-b-0">
                        <td className="px-4 py-2 font-mono text-xs">#{draw.draw_number}</td>
                        <td className="px-4 py-2">{formatDate(draw.date)}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {formatCurrency(draw.amount, { decimals: 2 })}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate">
                          {draw.description}
                        </td>
                        <td className="px-4 py-2">{getDrawStatusBadge(draw.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {loan.draws.length > 5 && (
                <div className="flex justify-center pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllDraws(!showAllDraws)}
                  >
                    {showAllDraws ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        Show All ({loan.draws.length} draws)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interest Accrual Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interest Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Annual Rate</p>
              <p className="text-lg font-semibold">{formatPercent(loan.interest_rate)}</p>
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Est. Monthly Interest</p>
              <p className="text-lg font-semibold">
                {formatCurrency(
                  (loan.current_balance * (loan.interest_rate / 100)) / 12,
                  { decimals: 2 }
                )}
              </p>
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Est. Daily Interest</p>
              <p className="text-lg font-semibold">
                {formatCurrency(
                  (loan.current_balance * (loan.interest_rate / 100)) / 365,
                  { decimals: 2 }
                )}
              </p>
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Days to Maturity</p>
              <p className={cn(
                "text-lg font-semibold",
                daysUntilMaturity <= 30 && "text-red-600",
                daysUntilMaturity > 30 && daysUntilMaturity <= 90 && "text-yellow-600"
              )}>
                {daysUntilMaturity > 0 ? daysUntilMaturity : "Matured"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
