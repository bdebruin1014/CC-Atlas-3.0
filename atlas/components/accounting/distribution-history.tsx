"use client"

import { useState, useMemo } from "react"
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  ArrowDownRight,
  Calendar,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Distribution } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DistributionHistoryProps {
  distributions: Distribution[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getStatusBadgeClass(status: Distribution["status"]): string {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    case "approved":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "distributed":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

function getStatusLabel(status: Distribution["status"]): string {
  switch (status) {
    case "draft":
      return "Draft"
    case "approved":
      return "Approved"
    case "distributed":
      return "Distributed"
    default:
      return status
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function DistributionHistory({
  distributions,
}: DistributionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Sort by date descending
  const sorted = useMemo(
    () =>
      [...distributions].sort(
        (a, b) =>
          new Date(b.distribution_date).getTime() -
          new Date(a.distribution_date).getTime()
      ),
    [distributions]
  )

  // Cumulative totals
  const cumulativeTotals = useMemo(() => {
    const totalDistributed = distributions
      .filter((d) => d.status === "distributed")
      .reduce((sum, d) => sum + d.total_amount, 0)
    const totalAll = distributions.reduce((sum, d) => sum + d.total_amount, 0)
    const count = distributions.filter(
      (d) => d.status === "distributed"
    ).length
    return { totalDistributed, totalAll, count }
  }, [distributions])

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Total Distributions
            </p>
            <p className="text-2xl font-bold">{cumulativeTotals.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Total Distributed Amount
            </p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(cumulativeTotals.totalDistributed, {
                decimals: 2,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              All-Time Total (incl. Draft)
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(cumulativeTotals.totalAll, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ArrowDownRight className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No distributions recorded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((dist) => {
            const expanded = expandedId === dist.id

            return (
              <Card key={dist.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedId(expanded ? null : dist.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(dist.distribution_date)}
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              getStatusBadgeClass(dist.status)
                            )}
                          >
                            {getStatusLabel(dist.status)}
                          </Badge>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {dist.results.length} investor
                          {dist.results.length !== 1 ? "s" : ""}
                          {dist.approved_at && (
                            <span className="ml-2">
                              Approved: {formatDate(dist.approved_at)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-bold tabular-nums">
                      {formatCurrency(dist.total_amount, { decimals: 2 })}
                    </p>
                  </div>
                </CardHeader>

                {expanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />

                    <div className="overflow-x-auto rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Investor</TableHead>
                            <TableHead className="text-right">
                              Ownership %
                            </TableHead>
                            <TableHead className="text-right">
                              Preferred
                            </TableHead>
                            <TableHead className="text-right">
                              Promote Share
                            </TableHead>
                            <TableHead className="text-right">
                              Total Allocation
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dist.results.map((result) => (
                            <TableRow key={result.investor_id}>
                              <TableCell className="font-medium">
                                {result.investor_name}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                {result.ownership_percent.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums">
                                {formatCurrency(result.preferred_amount, {
                                  decimals: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums">
                                {formatCurrency(result.promote_share, {
                                  decimals: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums font-medium">
                                {formatCurrency(result.total_distribution, {
                                  decimals: 2,
                                })}
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Tier detail sub-rows */}
                          {dist.results.length > 0 &&
                            dist.results[0].tier_details.length > 0 && (
                              <>
                                <TableRow className="bg-muted/30">
                                  <TableCell
                                    colSpan={5}
                                    className="text-xs font-medium text-muted-foreground py-1.5"
                                  >
                                    Tier Breakdown
                                  </TableCell>
                                </TableRow>
                                {dist.results[0].tier_details.map((tier) => {
                                  const tierTotal = dist.results.reduce(
                                    (sum, r) => {
                                      const t = r.tier_details.find(
                                        (td) =>
                                          td.tier_order === tier.tier_order
                                      )
                                      return sum + (t?.investor_amount ?? 0)
                                    },
                                    0
                                  )
                                  const managerTotal = dist.results.reduce(
                                    (sum, r) => {
                                      const t = r.tier_details.find(
                                        (td) =>
                                          td.tier_order === tier.tier_order
                                      )
                                      return sum + (t?.manager_amount ?? 0)
                                    },
                                    0
                                  )
                                  return (
                                    <TableRow
                                      key={tier.tier_order}
                                      className="text-xs"
                                    >
                                      <TableCell
                                        colSpan={2}
                                        className="pl-6 text-muted-foreground"
                                      >
                                        {tier.tier_name}
                                      </TableCell>
                                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                        {formatCurrency(tierTotal, {
                                          decimals: 2,
                                        })}
                                      </TableCell>
                                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                        {formatCurrency(managerTotal, {
                                          decimals: 2,
                                        })}
                                      </TableCell>
                                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                        {formatCurrency(
                                          tierTotal + managerTotal,
                                          { decimals: 2 }
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </>
                            )}

                          {/* Total row */}
                          <TableRow className="border-t-2 bg-muted/30 font-semibold">
                            <TableCell>Total</TableCell>
                            <TableCell />
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(
                                dist.results.reduce(
                                  (sum, r) => sum + r.preferred_amount,
                                  0
                                ),
                                { decimals: 2 }
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(
                                dist.results.reduce(
                                  (sum, r) => sum + r.promote_share,
                                  0
                                ),
                                { decimals: 2 }
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(dist.total_amount, {
                                decimals: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Cumulative Summary */}
      {sorted.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Cumulative Distributions
                </span>
              </div>
              <span className="text-lg font-bold tabular-nums">
                {formatCurrency(cumulativeTotals.totalDistributed, {
                  decimals: 2,
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
