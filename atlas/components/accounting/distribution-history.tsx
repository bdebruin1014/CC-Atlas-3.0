"use client"

import { useState, useMemo } from "react"
import {
  ChevronDown,
  ChevronRight,
  Banknote,
  Calendar,
  TrendingUp,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { formatPercent } from "@/lib/utils/format"
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
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDistStatusBadgeClass(
  status: Distribution["status"]
): string {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DistributionHistory({
  distributions,
  className,
}: DistributionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Sort chronologically (most recent first)
  const sorted = useMemo(
    () =>
      [...distributions].sort(
        (a, b) =>
          new Date(b.distribution_date).getTime() -
          new Date(a.distribution_date).getTime()
      ),
    [distributions]
  )

  // Cumulative tracking
  const cumulativeTotals = useMemo(() => {
    // Process in chronological order (oldest first) for cumulative
    const chronological = [...distributions].sort(
      (a, b) =>
        new Date(a.distribution_date).getTime() -
        new Date(b.distribution_date).getTime()
    )

    let cumulative = 0
    const map = new Map<string, number>()
    chronological.forEach((dist) => {
      if (dist.status !== "draft") {
        cumulative += dist.total_amount
      }
      map.set(dist.id, cumulative)
    })
    return map
  }, [distributions])

  // Per-investor cumulative
  const investorCumulatives = useMemo(() => {
    const chronological = [...distributions].sort(
      (a, b) =>
        new Date(a.distribution_date).getTime() -
        new Date(b.distribution_date).getTime()
    )

    const investorTotals = new Map<string, number>()

    chronological.forEach((dist) => {
      if (dist.status !== "draft") {
        dist.results.forEach((r) => {
          const current = investorTotals.get(r.investor_id) || 0
          investorTotals.set(r.investor_id, current + r.total_distribution)
        })
      }
    })

    return investorTotals
  }, [distributions])

  // Summary stats
  const totalDistributed = useMemo(
    () =>
      distributions
        .filter((d) => d.status === "distributed")
        .reduce((sum, d) => sum + d.total_amount, 0),
    [distributions]
  )

  const totalApproved = useMemo(
    () =>
      distributions
        .filter((d) => d.status === "approved")
        .reduce((sum, d) => sum + d.total_amount, 0),
    [distributions]
  )

  const totalDraft = useMemo(
    () =>
      distributions
        .filter((d) => d.status === "draft")
        .reduce((sum, d) => sum + d.total_amount, 0),
    [distributions]
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Total Distributions</p>
            <p className="text-2xl font-bold">{distributions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Distributed</p>
            <p className="text-2xl font-bold tabular-nums text-green-600">
              {formatCurrency(totalDistributed, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Approved (Pending)</p>
            <p className="text-2xl font-bold tabular-nums text-blue-600">
              {formatCurrency(totalApproved, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Draft</p>
            <p className="text-2xl font-bold tabular-nums text-gray-500">
              {formatCurrency(totalDraft, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative per-investor summary */}
      {investorCumulatives.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Cumulative Investor Distributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from(investorCumulatives.entries()).map(
                ([investorId, total]) => {
                  // Find investor name from any distribution result
                  const name =
                    distributions
                      .flatMap((d) => d.results)
                      .find((r) => r.investor_id === investorId)
                      ?.investor_name || investorId
                  return (
                    <div
                      key={investorId}
                      className="rounded-md bg-muted/50 p-3"
                    >
                      <p className="text-xs text-muted-foreground truncate">
                        {name}
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(total, { decimals: 0 })}
                      </p>
                    </div>
                  )
                }
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution List */}
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Banknote className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No distributions recorded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((dist) => {
            const expanded = expandedId === dist.id
            const cumulative = cumulativeTotals.get(dist.id) || 0

            return (
              <Card
                key={dist.id}
                className={cn(
                  dist.status === "draft" && "border-dashed opacity-75"
                )}
              >
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
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {formatDate(dist.distribution_date)}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              getDistStatusBadgeClass(dist.status)
                            )}
                          >
                            {dist.status}
                          </Badge>
                        </div>
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
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums">
                        {formatCurrency(dist.total_amount, { decimals: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cumulative: {formatCurrency(cumulative, { decimals: 0 })}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                {expanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />

                    {/* Per-investor allocations */}
                    <div className="overflow-x-auto rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Investor</TableHead>
                            <TableHead className="text-right">
                              Ownership %
                            </TableHead>
                            <TableHead className="text-right">
                              Preferred Return
                            </TableHead>
                            <TableHead className="text-right">
                              Promote Share
                            </TableHead>
                            <TableHead className="text-right">
                              Total Distribution
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dist.results.map((result) => (
                            <TableRow key={result.investor_id}>
                              <TableCell className="font-medium">
                                {result.investor_name}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums">
                                {formatPercent(result.ownership_percent)}
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

                          {/* Tier detail for first investor as reference */}
                          {dist.results[0]?.tier_details &&
                            dist.results[0].tier_details.length > 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="bg-muted/20"
                                >
                                  <div className="py-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                      Waterfall Tier Breakdown
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                      {dist.results[0].tier_details.map(
                                        (tier) => (
                                          <div
                                            key={tier.tier_order}
                                            className="rounded bg-background p-2 border"
                                          >
                                            <p className="font-medium">
                                              {tier.tier_name}
                                            </p>
                                            <p className="text-muted-foreground">
                                              Investor:{" "}
                                              {formatCurrency(
                                                tier.investor_amount,
                                                { decimals: 2 }
                                              )}
                                            </p>
                                            <p className="text-muted-foreground">
                                              Manager:{" "}
                                              {formatCurrency(
                                                tier.manager_amount,
                                                { decimals: 2 }
                                              )}
                                            </p>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}

                          {/* Total */}
                          <TableRow className="border-t-2 bg-muted/30 font-semibold">
                            <TableCell>Total</TableCell>
                            <TableCell />
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(
                                dist.results.reduce(
                                  (s, r) => s + r.preferred_amount,
                                  0
                                ),
                                { decimals: 2 }
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(
                                dist.results.reduce(
                                  (s, r) => s + r.promote_share,
                                  0
                                ),
                                { decimals: 2 }
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(
                                dist.results.reduce(
                                  (s, r) => s + r.total_distribution,
                                  0
                                ),
                                { decimals: 2 }
                              )}
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
    </div>
  )
}
