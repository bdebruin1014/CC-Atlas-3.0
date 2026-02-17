"use client"

import { useMemo } from "react"
import { BarChart3 } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { formatPercent } from "@/lib/utils/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { JobCostLine } from "@/lib/construction/accounting-types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CostCodeAnalysisProps {
  jobs: {
    name: string
    costs: JobCostLine[]
    sqft?: number
  }[]
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TradeRow {
  costCode: string
  costCodeName: string
  jobValues: { jobName: string; actual: number; costPerSqft: number | null }[]
  avgActual: number
  avgCostPerSqft: number | null
  totalActual: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CostCodeAnalysis({ jobs }: CostCodeAnalysisProps) {
  // Collect all unique cost codes
  const tradeRows = useMemo((): TradeRow[] => {
    const codeMap = new Map<string, TradeRow>()

    // First pass: gather all cost codes
    jobs.forEach((job) => {
      job.costs.forEach((line) => {
        if (!codeMap.has(line.cost_code)) {
          codeMap.set(line.cost_code, {
            costCode: line.cost_code,
            costCodeName: line.cost_code_name,
            jobValues: [],
            avgActual: 0,
            avgCostPerSqft: null,
            totalActual: 0,
          })
        }
      })
    })

    // Second pass: fill in per-job values
    codeMap.forEach((row) => {
      let totalActual = 0
      let totalSqft = 0
      let sqftCount = 0

      jobs.forEach((job) => {
        const line = job.costs.find((c) => c.cost_code === row.costCode)
        const actual = line?.actual ?? 0
        const perSqft = job.sqft && job.sqft > 0 ? actual / job.sqft : null

        row.jobValues.push({
          jobName: job.name,
          actual,
          costPerSqft: perSqft,
        })

        totalActual += actual
        if (job.sqft && job.sqft > 0) {
          totalSqft += job.sqft
          sqftCount++
        }
      })

      row.totalActual = totalActual
      row.avgActual = jobs.length > 0 ? totalActual / jobs.length : 0
      row.avgCostPerSqft =
        sqftCount > 0 && totalSqft > 0 ? totalActual / totalSqft : null
    })

    return Array.from(codeMap.values()).sort((a, b) =>
      a.costCode.localeCompare(b.costCode)
    )
  }, [jobs])

  // Grand totals per job
  const jobTotals = useMemo(() => {
    return jobs.map((job) => ({
      name: job.name,
      total: job.costs.reduce((s, c) => s + c.actual, 0),
      sqft: job.sqft,
      costPerSqft:
        job.sqft && job.sqft > 0
          ? job.costs.reduce((s, c) => s + c.actual, 0) / job.sqft
          : null,
    }))
  }, [jobs])

  const grandTotal = jobTotals.reduce((s, j) => s + j.total, 0)

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
        <p>No job data available for analysis.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Jobs Compared</p>
            <p className="text-xl font-bold">{jobs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Trade Categories</p>
            <p className="text-xl font-bold">{tradeRows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Actual Costs</p>
            <p className="text-xl font-bold">
              {formatCurrency(grandTotal, { compact: true })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Avg per Job</p>
            <p className="text-xl font-bold">
              {formatCurrency(
                jobs.length > 0 ? grandTotal / jobs.length : 0,
                { compact: true }
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Cost Comparison by Trade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                    Trade / Cost Code
                  </TableHead>
                  {jobs.map((job) => (
                    <TableHead
                      key={job.name}
                      className="text-right min-w-[120px]"
                    >
                      {job.name}
                    </TableHead>
                  ))}
                  <TableHead className="text-right min-w-[120px]">
                    Average
                  </TableHead>
                  <TableHead className="text-right min-w-[100px]">
                    Avg $/sqft
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tradeRows.map((row) => {
                  // Find min and max for coloring
                  const actuals = row.jobValues.map((v) => v.actual).filter((a) => a > 0)
                  const minActual = actuals.length > 0 ? Math.min(...actuals) : 0
                  const maxActual = actuals.length > 0 ? Math.max(...actuals) : 0

                  return (
                    <TableRow key={row.costCode}>
                      <TableCell className="sticky left-0 bg-background z-10">
                        <div>
                          <span className="font-medium text-sm">
                            {row.costCode}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {row.costCodeName}
                          </p>
                        </div>
                      </TableCell>
                      {row.jobValues.map((jv, idx) => (
                        <TableCell
                          key={idx}
                          className={cn(
                            "text-right text-sm",
                            actuals.length > 1 && jv.actual === maxActual && jv.actual > 0
                              ? "text-red-600 font-medium"
                              : actuals.length > 1 && jv.actual === minActual && jv.actual > 0
                                ? "text-green-600 font-medium"
                                : ""
                          )}
                        >
                          {jv.actual > 0
                            ? formatCurrency(jv.actual, { decimals: 0 })
                            : "—"}
                          {jv.costPerSqft !== null && jv.actual > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ${jv.costPerSqft.toFixed(2)}/sf
                            </p>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium">
                        {row.avgActual > 0
                          ? formatCurrency(row.avgActual, { decimals: 0 })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.avgCostPerSqft !== null ? (
                          <span className="font-medium">
                            ${row.avgCostPerSqft.toFixed(2)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {/* Totals row */}
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell className="sticky left-0 bg-muted/50 z-10">
                    Total
                  </TableCell>
                  {jobTotals.map((jt, idx) => (
                    <TableCell key={idx} className="text-right">
                      {formatCurrency(jt.total, { decimals: 0 })}
                      {jt.costPerSqft !== null && (
                        <p className="text-xs font-normal text-muted-foreground">
                          ${jt.costPerSqft.toFixed(2)}/sf
                        </p>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    {formatCurrency(
                      jobs.length > 0 ? grandTotal / jobs.length : 0,
                      { decimals: 0 }
                    )}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-green-500" />
          <span>Lowest cost across jobs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
          <span>Highest cost across jobs</span>
        </div>
      </div>
    </div>
  )
}
