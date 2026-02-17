"use client"

import { useState, useMemo } from "react"
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Home,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RevenueItem {
  id: string
  accountName: string
  amount: number
  category: string
  unitId?: string
  unitName?: string
}

interface CostItem {
  id: string
  accountName: string
  amount: number
  category: string
  unitId?: string
  unitName?: string
}

interface ProjectSummary {
  totalRevenue: number
  totalCosts: number
  grossProfit: number
  grossMargin: number
  netIncome: number
  netMargin: number
  budgetedRevenue?: number
  budgetedCosts?: number
}

interface UnitProfitability {
  unitId: string
  unitName: string
  revenue: number
  costs: number
  profit: number
  margin: number
  status: "sold" | "under_contract" | "available" | "construction"
}

interface ProjectPLProps {
  projectId: string
  revenue: RevenueItem[]
  costs: CostItem[]
  summary: ProjectSummary
  unitProfitability?: UnitProfitability[]
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByCategory(items: (RevenueItem | CostItem)[]) {
  const groups = new Map<string, (RevenueItem | CostItem)[]>()
  items.forEach((item) => {
    const existing = groups.get(item.category) || []
    existing.push(item)
    groups.set(item.category, existing)
  })
  return groups
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectPL({
  projectId,
  revenue,
  costs,
  summary,
  unitProfitability,
  className,
}: ProjectPLProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(["revenue", "costs", "units"])
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const revenueByCategory = useMemo(() => groupByCategory(revenue), [revenue])
  const costsByCategory = useMemo(() => groupByCategory(costs), [costs])

  // Budget variance
  const revenueVariance = summary.budgetedRevenue
    ? summary.totalRevenue - summary.budgetedRevenue
    : null
  const costVariance = summary.budgetedCosts
    ? summary.totalCosts - summary.budgetedCosts
    : null

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold tabular-nums text-green-600">
                  {formatCurrency(summary.totalRevenue, { decimals: 0 })}
                </p>
                {revenueVariance !== null && (
                  <p
                    className={cn(
                      "text-xs tabular-nums mt-0.5",
                      revenueVariance >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {revenueVariance >= 0 ? "+" : ""}
                    {formatCurrency(revenueVariance, { decimals: 0 })} vs budget
                  </p>
                )}
              </div>
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Costs</p>
                <p className="text-xl font-bold tabular-nums text-red-600">
                  {formatCurrency(summary.totalCosts, { decimals: 0 })}
                </p>
                {costVariance !== null && (
                  <p
                    className={cn(
                      "text-xs tabular-nums mt-0.5",
                      costVariance <= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {costVariance >= 0 ? "+" : ""}
                    {formatCurrency(costVariance, { decimals: 0 })} vs budget
                  </p>
                )}
              </div>
              <TrendingDown className="h-6 w-6 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Gross Profit</p>
                <p
                  className={cn(
                    "text-xl font-bold tabular-nums",
                    summary.grossProfit >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrency(summary.grossProfit, { decimals: 0 })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Margin: {formatPercent(summary.grossMargin)}
                </p>
              </div>
              <BarChart3
                className={cn(
                  "h-6 w-6",
                  summary.grossProfit >= 0 ? "text-green-400" : "text-red-400"
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Net Income</p>
                <p
                  className={cn(
                    "text-xl font-bold tabular-nums",
                    summary.netIncome >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrency(summary.netIncome, { decimals: 0 })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Margin: {formatPercent(summary.netMargin)}
                </p>
              </div>
              <BarChart3
                className={cn(
                  "h-6 w-6",
                  summary.netIncome >= 0 ? "text-green-400" : "text-red-400"
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Section */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("revenue")}
        >
          <CardTitle className="text-base flex items-center gap-2">
            {expandedSections.has("revenue") ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <TrendingUp className="h-4 w-4 text-green-600" />
            Revenue
            <span className="ml-auto font-mono tabular-nums text-green-600">
              {formatCurrency(summary.totalRevenue, { decimals: 2 })}
            </span>
          </CardTitle>
        </CardHeader>
        {expandedSections.has("revenue") && (
          <CardContent className="pt-0">
            {revenueByCategory.size === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No revenue entries
              </p>
            ) : (
              <div className="space-y-4">
                {Array.from(revenueByCategory.entries()).map(
                  ([category, items]) => {
                    const categoryTotal = items.reduce(
                      (s, i) => s + i.amount,
                      0
                    )
                    return (
                      <div key={category}>
                        <h4 className="text-sm font-medium text-muted-foreground border-b pb-1 mb-1">
                          {category}
                        </h4>
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm py-0.5 pl-4"
                          >
                            <span className="text-muted-foreground">
                              {item.accountName}
                              {item.unitName && (
                                <span className="ml-1 text-xs">
                                  ({item.unitName})
                                </span>
                              )}
                            </span>
                            <span className="font-mono tabular-nums">
                              {formatCurrency(item.amount, { decimals: 2 })}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-sm font-medium border-t pt-1 mt-1">
                          <span>Total {category}</span>
                          <span className="font-mono tabular-nums">
                            {formatCurrency(categoryTotal, { decimals: 2 })}
                          </span>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Costs Section */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("costs")}
        >
          <CardTitle className="text-base flex items-center gap-2">
            {expandedSections.has("costs") ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <TrendingDown className="h-4 w-4 text-red-600" />
            Costs & Expenses
            <span className="ml-auto font-mono tabular-nums text-red-600">
              {formatCurrency(summary.totalCosts, { decimals: 2 })}
            </span>
          </CardTitle>
        </CardHeader>
        {expandedSections.has("costs") && (
          <CardContent className="pt-0">
            {costsByCategory.size === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No cost entries
              </p>
            ) : (
              <div className="space-y-4">
                {Array.from(costsByCategory.entries()).map(
                  ([category, items]) => {
                    const categoryTotal = items.reduce(
                      (s, i) => s + i.amount,
                      0
                    )
                    return (
                      <div key={category}>
                        <h4 className="text-sm font-medium text-muted-foreground border-b pb-1 mb-1">
                          {category}
                        </h4>
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm py-0.5 pl-4"
                          >
                            <span className="text-muted-foreground">
                              {item.accountName}
                              {item.unitName && (
                                <span className="ml-1 text-xs">
                                  ({item.unitName})
                                </span>
                              )}
                            </span>
                            <span className="font-mono tabular-nums">
                              {formatCurrency(item.amount, { decimals: 2 })}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-sm font-medium border-t pt-1 mt-1">
                          <span>Total {category}</span>
                          <span className="font-mono tabular-nums">
                            {formatCurrency(categoryTotal, { decimals: 2 })}
                          </span>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Net Income Summary */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Revenue</span>
              <span className="font-mono tabular-nums">
                {formatCurrency(summary.totalRevenue, { decimals: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Costs</span>
              <span className="font-mono tabular-nums text-red-600">
                ({formatCurrency(summary.totalCosts, { decimals: 2 })})
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-base font-bold">
              <span>Gross Profit</span>
              <span
                className={cn(
                  "font-mono tabular-nums",
                  summary.grossProfit < 0 && "text-red-600"
                )}
              >
                {formatCurrency(summary.grossProfit, { decimals: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Gross Margin</span>
              <span>{formatPercent(summary.grossMargin)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Unit Profitability */}
      {unitProfitability && unitProfitability.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => toggleSection("units")}
          >
            <CardTitle className="text-base flex items-center gap-2">
              {expandedSections.has("units") ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Home className="h-4 w-4 text-muted-foreground" />
              Per-Unit Profitability
            </CardTitle>
          </CardHeader>
          {expandedSections.has("units") && (
            <CardContent className="pt-0">
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Costs</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unitProfitability.map((unit) => (
                      <TableRow key={unit.unitId}>
                        <TableCell className="font-medium">
                          {unit.unitName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              unit.status === "sold" &&
                                "bg-green-100 text-green-800",
                              unit.status === "under_contract" &&
                                "bg-blue-100 text-blue-800",
                              unit.status === "available" &&
                                "bg-gray-100 text-gray-600",
                              unit.status === "construction" &&
                                "bg-yellow-100 text-yellow-800"
                            )}
                          >
                            {unit.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(unit.revenue, { decimals: 0 })}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(unit.costs, { decimals: 0 })}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono tabular-nums font-medium",
                            unit.profit >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {formatCurrency(unit.profit, { decimals: 0 })}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono tabular-nums",
                            unit.margin >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {formatPercent(unit.margin)}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Totals */}
                    <TableRow className="border-t-2 bg-muted/30 font-semibold">
                      <TableCell colSpan={2}>
                        Total ({unitProfitability.length} units)
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(
                          unitProfitability.reduce(
                            (s, u) => s + u.revenue,
                            0
                          ),
                          { decimals: 0 }
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(
                          unitProfitability.reduce(
                            (s, u) => s + u.costs,
                            0
                          ),
                          { decimals: 0 }
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono tabular-nums font-bold",
                          unitProfitability.reduce(
                            (s, u) => s + u.profit,
                            0
                          ) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {formatCurrency(
                          unitProfitability.reduce(
                            (s, u) => s + u.profit,
                            0
                          ),
                          { decimals: 0 }
                        )}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Chart Placeholder */}
              <div className="mt-4 rounded-lg border-2 border-dashed border-border p-8 text-center text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">
                  Profitability Chart
                </p>
                <p className="text-xs mt-1">
                  Per-unit revenue vs cost visualization
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
