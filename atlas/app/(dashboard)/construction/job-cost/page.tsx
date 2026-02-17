"use client"

import { useState, useMemo } from "react"
import {
  BarChart3,
  Download,
  FileText,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { JobCostReport } from "@/components/construction/job-cost-report"
import { CostCodeAnalysis } from "@/components/construction/cost-code-analysis"
import { MOCK_JOB_COST_REPORT } from "@/lib/construction/mock-data"
import type { JobCostReport as JobCostReportType } from "@/lib/construction/accounting-types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VarianceSeverity = "warning" | "critical"

interface VarianceAlert {
  id: string
  job_name: string
  cost_code: string
  cost_code_name: string
  unit: string
  budgeted: number
  projected: number
  variance: number
  variance_pct: number
  severity: VarianceSeverity
  created_at: string
  description: string
}

interface JobOption {
  id: string
  name: string
  number: string
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

// TODO: Replace with API call to list available jobs
const MOCK_JOBS: JobOption[] = [
  { id: "job-001", name: "Millbrook Crossing Phase 2", number: "JOB-2024-001" },
  { id: "job-002", name: "Oakridge Estates", number: "JOB-2024-002" },
  { id: "job-003", name: "River Bend Townhomes", number: "JOB-2024-003" },
]

// TODO: Replace with API call to fetch variance alerts for the selected job
const MOCK_VARIANCE_ALERTS: VarianceAlert[] = [
  {
    id: "va-001",
    job_name: "Millbrook Crossing Phase 2",
    cost_code: "06-050",
    cost_code_name: "Lumber & Materials",
    unit: "Unit 102",
    budgeted: 32500,
    projected: 38200,
    variance: -5700,
    variance_pct: -17.5,
    severity: "critical",
    created_at: "2026-02-12T09:00:00Z",
    description: "Lumber costs exceeded budget due to supply chain surcharges and framing waste above standard allowance.",
  },
  {
    id: "va-002",
    job_name: "Millbrook Crossing Phase 2",
    cost_code: "15-100",
    cost_code_name: "Plumbing",
    unit: "Unit 104",
    budgeted: 28000,
    projected: 31800,
    variance: -3800,
    variance_pct: -13.6,
    severity: "critical",
    created_at: "2026-02-10T14:30:00Z",
    description: "Additional rough-in work required per redesigned master bath layout (CO #3). Vendor submitted revised scope.",
  },
  {
    id: "va-003",
    job_name: "Millbrook Crossing Phase 2",
    cost_code: "03-100",
    cost_code_name: "Concrete & Foundations",
    unit: "Unit 106",
    budgeted: 40000,
    projected: 43200,
    variance: -3200,
    variance_pct: -8.0,
    severity: "warning",
    created_at: "2026-02-08T11:00:00Z",
    description: "Additional piers required per updated geotechnical report. 4 extra caissons at $800 each.",
  },
  {
    id: "va-004",
    job_name: "Millbrook Crossing Phase 2",
    cost_code: "02-100",
    cost_code_name: "Site Work & Grading",
    unit: "Common Areas",
    budgeted: 26250,
    projected: 28900,
    variance: -2650,
    variance_pct: -10.1,
    severity: "warning",
    created_at: "2026-01-28T16:00:00Z",
    description: "Unexpected rock removal on lots 14-16. Additional blasting charges from grading sub.",
  },
  {
    id: "va-005",
    job_name: "Millbrook Crossing Phase 2",
    cost_code: "16-100",
    cost_code_name: "Electrical",
    unit: "Unit 103",
    budgeted: 26000,
    projected: 27800,
    variance: -1800,
    variance_pct: -6.9,
    severity: "warning",
    created_at: "2026-02-01T08:45:00Z",
    description: "Owner-requested upgrade to whole-house surge protection and additional exterior circuits.",
  },
]

// Build a second mock report for Oakridge (based on first but scaled)
// TODO: Replace with actual API data per job
const MOCK_OAKRIDGE_REPORT: JobCostReportType = {
  job_id: "job-002",
  job_name: "Oakridge Estates",
  contract_amount: 4200000,
  builder_fee: 336000,
  job_total_budget: 3864000,
  job_total_committed: 3520000,
  job_total_actual: 2180000,
  job_total_projected: 3900000,
  job_total_variance: -36000,
  units: [],
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function JobCostPage() {
  const [selectedJob, setSelectedJob] = useState("job-001")
  const [activeTab, setActiveTab] = useState("unit-detail")

  // Get the report data for the selected job
  // TODO: Replace with API call based on selectedJob
  const report = selectedJob === "job-001" ? MOCK_JOB_COST_REPORT : MOCK_OAKRIDGE_REPORT

  // Derive summary metrics
  const isOverBudget = report.job_total_variance < 0
  const budgetUsedPct =
    report.job_total_budget > 0
      ? (report.job_total_actual / report.job_total_budget) * 100
      : 0
  const marginAmount = report.contract_amount - report.job_total_projected
  const marginPct =
    report.contract_amount > 0
      ? (marginAmount / report.contract_amount) * 100
      : 0

  // Variance alerts for the selected job
  const jobAlerts = useMemo(() => {
    const jobName = MOCK_JOBS.find((j) => j.id === selectedJob)?.name
    return MOCK_VARIANCE_ALERTS.filter((a) => a.job_name === jobName).sort(
      (a, b) => Math.abs(b.variance) - Math.abs(a.variance)
    )
  }, [selectedJob])

  // Build variance alerts from the report units (over 5% budget)
  const derivedAlerts = useMemo(() => {
    return report.units.flatMap((unit) =>
      unit.lines
        .filter((line) => line.budget > 0 && line.actual / line.budget > 1.05)
        .map((line) => ({
          unit: unit.unit_number,
          costCode: line.cost_code,
          costCodeName: line.cost_code_name,
          overBudgetPct: Math.round(((line.actual / line.budget) - 1) * 100),
          variance: line.budget - line.actual,
        }))
    )
  }, [report])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Job Cost Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyze job costs, unit economics, cost code variances, and budget performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* TODO: Wire up PDF export */}
          <Button variant="outline" onClick={() => {/* TODO: generate and download PDF report */}}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          {/* TODO: Wire up Excel export */}
          <Button variant="outline" onClick={() => {/* TODO: generate and download Excel report */}}>
            <FileText className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Job Selector */}
      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Select Job</label>
          <Select value={selectedJob} onValueChange={setSelectedJob}>
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="Select job" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_JOBS.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.name} ({job.number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Contract Amount
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(report.contract_amount, { compact: true })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              Total Budget
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(report.job_total_budget, { compact: true })}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Progress value={budgetUsedPct} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground">
                {formatPercent(budgetUsedPct, 0)} used
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Committed
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(report.job_total_committed, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {report.job_total_budget > 0
                ? formatPercent((report.job_total_committed / report.job_total_budget) * 100, 0)
                : "0%"}{" "}
              of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4 text-orange-500" />
              Actual Spent
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(report.job_total_actual, { compact: true })}
            </p>
          </CardContent>
        </Card>

        <Card className={cn(isOverBudget && "border-red-200 dark:border-red-800")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {isOverBudget ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              Variance
            </div>
            <p className={cn(
              "text-2xl font-bold",
              isOverBudget ? "text-red-600" : "text-green-600"
            )}>
              {isOverBudget ? "" : "+"}{formatCurrency(report.job_total_variance, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Projected: {formatCurrency(report.job_total_projected, { compact: true })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Margin Summary */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm font-medium">Projected Margin</p>
              <p className="text-xs text-muted-foreground">
                Contract less projected costs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className={cn(
                "text-xl font-bold",
                marginAmount >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(marginAmount, { compact: true })}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPercent(marginPct, 1)} margin
              </p>
            </div>
            {report.builder_fee > 0 && (
              <>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Builder Fee</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(report.builder_fee, { compact: true })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {report.contract_amount > 0
                      ? formatPercent((report.builder_fee / report.contract_amount) * 100, 1)
                      : "0%"}{" "}
                    of contract
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Variance Alerts */}
      {jobAlerts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Variance Alerts ({jobAlerts.length})
            </CardTitle>
            <CardDescription>
              Cost codes exceeding budget thresholds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-md border p-3",
                    alert.severity === "critical"
                      ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30"
                      : "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/30"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-medium">
                          {alert.cost_code}
                        </span>
                        <span className="text-sm font-medium">
                          {alert.cost_code_name}
                        </span>
                        <Badge
                          className={cn(
                            "text-[10px]",
                            alert.severity === "critical"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          )}
                        >
                          {alert.severity === "critical" ? "Critical" : "Warning"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {alert.unit}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Budget: {formatCurrency(alert.budgeted)} |
                        Projected: {formatCurrency(alert.projected)} |{" "}
                        <span className="text-red-600 font-medium">
                          Variance: {formatCurrency(alert.variance)} ({formatPercent(Math.abs(alert.variance_pct), 1)})
                        </span>
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-4">
                      {formatDate(alert.created_at, { short: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick summary badges from derived alerts */}
            {derivedAlerts.length > 0 && (
              <>
                <Separator className="my-3" />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    All over-budget line items ({derivedAlerts.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {derivedAlerts.map((alert, i) => (
                      <Badge key={i} variant="outline" className="border-orange-300 text-orange-700 text-xs">
                        {alert.unit} - {alert.costCodeName}: {alert.overBudgetPct}% over
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="unit-detail">
            <BarChart3 className="mr-2 h-4 w-4" />
            Unit Detail
          </TabsTrigger>
          <TabsTrigger value="job-summary">
            Job Summary
          </TabsTrigger>
          <TabsTrigger value="cost-analysis">
            Cost Code Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unit-detail" className="mt-4">
          <JobCostReport report={report} />
        </TabsContent>

        <TabsContent value="job-summary" className="mt-4">
          {/* All-jobs comparison table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">All Jobs Comparison</CardTitle>
              <CardDescription>
                Side-by-side financial comparison of all active jobs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Job</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead className="text-right">Contract</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Committed</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Projected</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[MOCK_JOB_COST_REPORT, MOCK_OAKRIDGE_REPORT].map((r) => {
                    const margin = r.contract_amount - r.job_total_projected
                    const mPct = r.contract_amount > 0 ? (margin / r.contract_amount) * 100 : 0
                    const vNeg = r.job_total_variance < 0

                    return (
                      <TableRow
                        key={r.job_id}
                        className={cn(
                          "cursor-pointer",
                          MOCK_JOBS.find((j) => j.id === r.job_id)?.id === selectedJob && "bg-primary/5"
                        )}
                        onClick={() => {
                          const job = MOCK_JOBS.find((j) => j.id === r.job_id)
                          if (job) setSelectedJob(job.id)
                        }}
                      >
                        <TableCell className="pl-4 font-medium">{r.job_name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {MOCK_JOBS.find((j) => j.id === r.job_id)?.number ?? "---"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(r.contract_amount, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(r.job_total_budget, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(r.job_total_committed, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(r.job_total_actual, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(r.job_total_projected, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-medium",
                            vNeg ? "text-red-600" : "text-green-600"
                          )}>
                            {vNeg ? "" : "+"}{formatCurrency(r.job_total_variance, { compact: true })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-medium",
                            margin < 0 ? "text-red-600" : "text-green-600"
                          )}>
                            {formatPercent(mPct, 1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Detailed report for selected job */}
          <JobCostReport report={report} />
        </TabsContent>

        <TabsContent value="cost-analysis" className="mt-4">
          <CostCodeAnalysis
            jobs={[
              {
                name: MOCK_JOB_COST_REPORT.job_name,
                costs: MOCK_JOB_COST_REPORT.units[0]?.lines ?? [],
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
