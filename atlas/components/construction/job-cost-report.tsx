"use client"

import { useMemo } from "react"
import { TrendingDown, TrendingUp, BarChart3 } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { formatPercent } from "@/lib/utils/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  JobCostReport as JobCostReportType,
  JobCostLine,
  UnitCostReport,
} from "@/lib/construction/accounting-types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface JobCostReportProps {
  report: JobCostReportType
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function varianceColor(variance: number): string {
  if (variance > 0) return "text-green-600"
  if (variance < 0) return "text-red-600"
  return "text-muted-foreground"
}

function varianceBg(variance: number): string {
  if (variance > 0) return "bg-green-100 text-green-700"
  if (variance < 0) return "bg-red-100 text-red-700"
  return "bg-gray-100 text-gray-700"
}

function progressColor(pct: number): string {
  if (pct >= 100) return "text-red-600"
  if (pct >= 90) return "text-orange-600"
  return "text-primary"
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function CostLineTable({
  lines,
  totalBudget,
  totalCommitted,
  totalActual,
  totalProjected,
  totalVariance,
}: {
  lines: JobCostLine[]
  totalBudget: number
  totalCommitted: number
  totalActual: number
  totalProjected: number
  totalVariance: number
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cost Code</TableHead>
          <TableHead className="text-right">Budget</TableHead>
          <TableHead className="text-right">Committed</TableHead>
          <TableHead className="text-right">Actual</TableHead>
          <TableHead className="text-right">Projected</TableHead>
          <TableHead className="text-right">Variance</TableHead>
          <TableHead className="text-right w-[120px]">% Used</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => {
          const pctUsed = line.budget > 0 ? (line.actual / line.budget) * 100 : 0

          return (
            <TableRow key={line.cost_code}>
              <TableCell>
                <div>
                  <span className="font-medium">{line.cost_code}</span>
                  <p className="text-xs text-muted-foreground">
                    {line.cost_code_name}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(line.budget, { decimals: 0 })}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(line.committed, { decimals: 0 })}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(line.actual, { decimals: 0 })}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(line.projected_final, { decimals: 0 })}
              </TableCell>
              <TableCell className="text-right">
                <span className={cn("font-medium", varianceColor(line.variance))}>
                  {line.variance > 0 ? "+" : ""}
                  {formatCurrency(line.variance, { decimals: 0 })}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress
                    value={Math.min(pctUsed, 100)}
                    className={cn(
                      "h-2 flex-1",
                      pctUsed >= 100 && "[&>div]:bg-red-500",
                      pctUsed >= 90 && pctUsed < 100 && "[&>div]:bg-orange-500"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium w-10 text-right",
                      progressColor(pctUsed)
                    )}
                  >
                    {formatPercent(pctUsed, 0)}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
        {/* Totals row */}
        <TableRow className="font-semibold bg-muted/50">
          <TableCell>Total</TableCell>
          <TableCell className="text-right">
            {formatCurrency(totalBudget, { decimals: 0 })}
          </TableCell>
          <TableCell className="text-right">
            {formatCurrency(totalCommitted, { decimals: 0 })}
          </TableCell>
          <TableCell className="text-right">
            {formatCurrency(totalActual, { decimals: 0 })}
          </TableCell>
          <TableCell className="text-right">
            {formatCurrency(totalProjected, { decimals: 0 })}
          </TableCell>
          <TableCell className="text-right">
            <span className={cn(varianceColor(totalVariance))}>
              {totalVariance > 0 ? "+" : ""}
              {formatCurrency(totalVariance, { decimals: 0 })}
            </span>
          </TableCell>
          <TableCell>
            {totalBudget > 0 && (
              <span className="text-xs">
                {formatPercent((totalActual / totalBudget) * 100, 0)}
              </span>
            )}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function JobCostReport({ report }: JobCostReportProps) {
  // Aggregate all lines across units for job summary
  const jobSummaryLines = useMemo((): JobCostLine[] => {
    const map = new Map<string, JobCostLine>()
    report.units.forEach((unit) => {
      unit.lines.forEach((line) => {
        const existing = map.get(line.cost_code)
        if (existing) {
          existing.budget += line.budget
          existing.committed += line.committed
          existing.actual += line.actual
          existing.projected_final += line.projected_final
          existing.variance += line.variance
        } else {
          map.set(line.cost_code, { ...line })
        }
      })
    })
    // Recompute pct_complete for aggregated lines
    map.forEach((line) => {
      line.pct_complete =
        line.budget > 0 ? (line.actual / line.budget) * 100 : 0
    })
    return Array.from(map.values()).sort((a, b) =>
      a.cost_code.localeCompare(b.cost_code)
    )
  }, [report])

  const overallPct =
    report.job_total_budget > 0
      ? (report.job_total_actual / report.job_total_budget) * 100
      : 0

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Contract</p>
            <p className="text-lg font-bold">
              {formatCurrency(report.contract_amount, { compact: true })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="text-lg font-bold">
              {formatCurrency(report.job_total_budget, { compact: true })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Committed</p>
            <p className="text-lg font-bold">
              {formatCurrency(report.job_total_committed, { compact: true })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Actual</p>
            <p className="text-lg font-bold">
              {formatCurrency(report.job_total_actual, { compact: true })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Projected</p>
            <p className="text-lg font-bold">
              {formatCurrency(report.job_total_projected, { compact: true })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Variance</p>
            <div className="flex items-center gap-1.5">
              {report.job_total_variance >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <p
                className={cn(
                  "text-lg font-bold",
                  varianceColor(report.job_total_variance)
                )}
              >
                {report.job_total_variance > 0 ? "+" : ""}
                {formatCurrency(report.job_total_variance, { compact: true })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Budget Utilization</span>
            <span className={cn("text-sm font-medium", progressColor(overallPct))}>
              {formatPercent(overallPct, 1)}
            </span>
          </div>
          <Progress
            value={Math.min(overallPct, 100)}
            className={cn(
              "h-3",
              overallPct >= 100 && "[&>div]:bg-red-500",
              overallPct >= 90 && overallPct < 100 && "[&>div]:bg-orange-500"
            )}
          />
        </CardContent>
      </Card>

      {/* Tabs: Unit Detail | Job Summary */}
      <Tabs defaultValue="unit-detail">
        <TabsList>
          <TabsTrigger value="unit-detail">Unit Detail</TabsTrigger>
          <TabsTrigger value="job-summary">Job Summary</TabsTrigger>
        </TabsList>

        {/* Unit Detail Tab */}
        <TabsContent value="unit-detail" className="mt-4 space-y-6">
          {report.units.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No unit cost data available.</p>
            </div>
          ) : (
            report.units.map((unit) => (
              <Card key={unit.unit_id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Unit {unit.unit_number}
                    </CardTitle>
                    <Badge
                      className={cn(
                        "text-xs border-0",
                        varianceBg(unit.total_variance)
                      )}
                    >
                      Variance: {unit.total_variance > 0 ? "+" : ""}
                      {formatCurrency(unit.total_variance, { decimals: 0 })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CostLineTable
                    lines={unit.lines}
                    totalBudget={unit.total_budget}
                    totalCommitted={unit.total_committed}
                    totalActual={unit.total_actual}
                    totalProjected={unit.total_projected}
                    totalVariance={unit.total_variance}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Job Summary Tab */}
        <TabsContent value="job-summary" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {report.job_name} - All Units Aggregated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CostLineTable
                lines={jobSummaryLines}
                totalBudget={report.job_total_budget}
                totalCommitted={report.job_total_committed}
                totalActual={report.job_total_actual}
                totalProjected={report.job_total_projected}
                totalVariance={report.job_total_variance}
              />
            </CardContent>
          </Card>

          {/* Builder Fee info */}
          {report.builder_fee > 0 && (
            <>
              <Separator className="my-4" />
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">Builder Fee</p>
                    <p className="text-xs text-muted-foreground">
                      Margin after projected costs
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {formatCurrency(report.builder_fee, { decimals: 0 })}
                    </p>
                    {report.contract_amount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(
                          (report.builder_fee / report.contract_amount) * 100,
                          1
                        )}{" "}
                        of contract
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
