"use client"

import { useState, useMemo } from "react"
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Download,
  ChevronRight,
  ArrowUpRight,
  Building2,
  Calendar,
  Search,
  X,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
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
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgingBucket = "current" | "1_30" | "31_60" | "61_90" | "over_90"
type DrawStatus = "draft" | "submitted" | "under_review" | "approved" | "funded" | "rejected"

interface ARRecord {
  id: string
  customer_name: string
  customer_type: "owner" | "developer" | "gc" | "government"
  job_name: string
  job_number: string
  invoice_number: string
  invoice_date: string
  due_date: string
  original_amount: number
  paid_amount: number
  balance: number
  aging_bucket: AgingBucket
  last_payment_date: string | null
  notes: string | null
}

interface DrawSchedule {
  id: string
  job_name: string
  job_number: string
  lender_name: string
  draw_number: number
  total_draws: number
  scheduled_date: string
  amount_requested: number
  amount_approved: number | null
  amount_funded: number | null
  status: DrawStatus
  retention_held: number
  completion_pct: number
  submitted_date: string | null
  funded_date: string | null
  notes: string | null
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

// TODO: Replace with API call to fetch AR records
const MOCK_AR_RECORDS: ARRecord[] = [
  {
    id: "ar-001",
    customer_name: "Greenview Development Partners",
    customer_type: "developer",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    invoice_number: "REC-2026-0028",
    invoice_date: "2026-01-15",
    due_date: "2026-02-14",
    original_amount: 285000.00,
    paid_amount: 0,
    balance: 285000.00,
    aging_bucket: "1_30",
    last_payment_date: null,
    notes: "Draw 4 - pending lender approval",
  },
  {
    id: "ar-002",
    customer_name: "Greenview Development Partners",
    customer_type: "developer",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    invoice_number: "REC-2025-0095",
    invoice_date: "2025-12-01",
    due_date: "2025-12-31",
    original_amount: 312000.00,
    paid_amount: 312000.00,
    balance: 0,
    aging_bucket: "current",
    last_payment_date: "2026-01-08",
    notes: null,
  },
  {
    id: "ar-003",
    customer_name: "Oakmont Reserve LLC",
    customer_type: "owner",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    invoice_number: "REC-2026-0032",
    invoice_date: "2026-01-25",
    due_date: "2026-02-24",
    original_amount: 198500.00,
    paid_amount: 0,
    balance: 198500.00,
    aging_bucket: "current",
    last_payment_date: null,
    notes: "Draw 3 submitted to First National Bank",
  },
  {
    id: "ar-004",
    customer_name: "Oakmont Reserve LLC",
    customer_type: "owner",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    invoice_number: "REC-2025-0088",
    invoice_date: "2025-11-20",
    due_date: "2025-12-20",
    original_amount: 175000.00,
    paid_amount: 125000.00,
    balance: 50000.00,
    aging_bucket: "61_90",
    last_payment_date: "2026-01-02",
    notes: "Partial payment received - retention dispute pending resolution",
  },
  {
    id: "ar-005",
    customer_name: "Thompson Custom Homes",
    customer_type: "gc",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    invoice_number: "REC-2026-0015",
    invoice_date: "2026-01-05",
    due_date: "2026-02-04",
    original_amount: 45600.00,
    paid_amount: 0,
    balance: 45600.00,
    aging_bucket: "1_30",
    last_payment_date: null,
    notes: "Change order work - owner approved",
  },
  {
    id: "ar-006",
    customer_name: "Greenview Development Partners",
    customer_type: "developer",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    invoice_number: "REC-2025-0072",
    invoice_date: "2025-10-15",
    due_date: "2025-11-14",
    original_amount: 82300.00,
    paid_amount: 0,
    balance: 82300.00,
    aging_bucket: "over_90",
    last_payment_date: null,
    notes: "In collections - disputed scope items",
  },
  {
    id: "ar-007",
    customer_name: "SC Department of Transportation",
    customer_type: "government",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    invoice_number: "REC-2025-0085",
    invoice_date: "2025-11-10",
    due_date: "2026-01-10",
    original_amount: 34800.00,
    paid_amount: 0,
    balance: 34800.00,
    aging_bucket: "31_60",
    last_payment_date: null,
    notes: "Road impact reimbursement - government net 60 terms",
  },
  {
    id: "ar-008",
    customer_name: "Oakmont Reserve LLC",
    customer_type: "owner",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    invoice_number: "REC-2026-0041",
    invoice_date: "2026-02-05",
    due_date: "2026-03-07",
    original_amount: 156000.00,
    paid_amount: 0,
    balance: 156000.00,
    aging_bucket: "current",
    last_payment_date: null,
    notes: null,
  },
]

// TODO: Replace with API call to fetch draw schedules
const MOCK_DRAW_SCHEDULES: DrawSchedule[] = [
  {
    id: "draw-001",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    lender_name: "First National Bank",
    draw_number: 1,
    total_draws: 8,
    scheduled_date: "2025-06-15",
    amount_requested: 425000.00,
    amount_approved: 425000.00,
    amount_funded: 425000.00,
    status: "funded",
    retention_held: 42500.00,
    completion_pct: 12,
    submitted_date: "2025-06-10",
    funded_date: "2025-06-22",
    notes: null,
  },
  {
    id: "draw-002",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    lender_name: "First National Bank",
    draw_number: 2,
    total_draws: 8,
    scheduled_date: "2025-08-15",
    amount_requested: 580000.00,
    amount_approved: 565000.00,
    amount_funded: 565000.00,
    status: "funded",
    retention_held: 56500.00,
    completion_pct: 28,
    submitted_date: "2025-08-12",
    funded_date: "2025-08-25",
    notes: "Reduced $15K - inspector noted incomplete work on 2 units",
  },
  {
    id: "draw-003",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    lender_name: "First National Bank",
    draw_number: 3,
    total_draws: 8,
    scheduled_date: "2025-10-15",
    amount_requested: 620000.00,
    amount_approved: 620000.00,
    amount_funded: 620000.00,
    status: "funded",
    retention_held: 62000.00,
    completion_pct: 45,
    submitted_date: "2025-10-10",
    funded_date: "2025-10-23",
    notes: null,
  },
  {
    id: "draw-004",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    lender_name: "First National Bank",
    draw_number: 4,
    total_draws: 8,
    scheduled_date: "2026-01-15",
    amount_requested: 285000.00,
    amount_approved: null,
    amount_funded: null,
    status: "under_review",
    retention_held: 28500.00,
    completion_pct: 58,
    submitted_date: "2026-01-12",
    funded_date: null,
    notes: "Pending lender site inspection scheduled 2/20",
  },
  {
    id: "draw-005",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    lender_name: "First National Bank",
    draw_number: 5,
    total_draws: 8,
    scheduled_date: "2026-03-15",
    amount_requested: 0,
    amount_approved: null,
    amount_funded: null,
    status: "draft",
    retention_held: 0,
    completion_pct: 0,
    submitted_date: null,
    funded_date: null,
    notes: "Estimated $540K - preparing documentation",
  },
  {
    id: "draw-010",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    lender_name: "Regional Community Bank",
    draw_number: 1,
    total_draws: 6,
    scheduled_date: "2025-09-01",
    amount_requested: 310000.00,
    amount_approved: 310000.00,
    amount_funded: 310000.00,
    status: "funded",
    retention_held: 31000.00,
    completion_pct: 15,
    submitted_date: "2025-08-28",
    funded_date: "2025-09-10",
    notes: null,
  },
  {
    id: "draw-011",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    lender_name: "Regional Community Bank",
    draw_number: 2,
    total_draws: 6,
    scheduled_date: "2025-11-15",
    amount_requested: 440000.00,
    amount_approved: 440000.00,
    amount_funded: 440000.00,
    status: "funded",
    retention_held: 44000.00,
    completion_pct: 35,
    submitted_date: "2025-11-10",
    funded_date: "2025-11-22",
    notes: null,
  },
  {
    id: "draw-012",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    lender_name: "Regional Community Bank",
    draw_number: 3,
    total_draws: 6,
    scheduled_date: "2026-01-25",
    amount_requested: 198500.00,
    amount_approved: 198500.00,
    amount_funded: null,
    status: "approved",
    retention_held: 19850.00,
    completion_pct: 52,
    submitted_date: "2026-01-20",
    funded_date: null,
    notes: "Approved - awaiting wire transfer",
  },
  {
    id: "draw-013",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    lender_name: "Regional Community Bank",
    draw_number: 4,
    total_draws: 6,
    scheduled_date: "2026-04-01",
    amount_requested: 0,
    amount_approved: null,
    amount_funded: null,
    status: "draft",
    retention_held: 0,
    completion_pct: 0,
    submitted_date: null,
    funded_date: null,
    notes: "Estimated $380K",
  },
]

// ---------------------------------------------------------------------------
// Aging bucket config
// ---------------------------------------------------------------------------

const AGING_BUCKET_CONFIG: Record<AgingBucket, { label: string; color: string }> = {
  current: { label: "Current", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  "1_30": { label: "1-30 Days", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  "31_60": { label: "31-60 Days", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  "61_90": { label: "61-90 Days", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  over_90: { label: "Over 90 Days", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
}

const DRAW_STATUS_CONFIG: Record<DrawStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  under_review: { label: "Under Review", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  funded: { label: "Funded", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
}

// ---------------------------------------------------------------------------
// ARAging Component
// ---------------------------------------------------------------------------

// TODO: Extract to @/components/construction/ar-aging
function ARAging() {
  const [search, setSearch] = useState("")
  const [bucketFilter, setBucketFilter] = useState<AgingBucket | "all">("all")
  const [jobFilter, setJobFilter] = useState("all")

  const openRecords = MOCK_AR_RECORDS.filter((r) => r.balance > 0)

  const filteredRecords = useMemo(() => {
    let records = [...openRecords]

    if (bucketFilter !== "all") {
      records = records.filter((r) => r.aging_bucket === bucketFilter)
    }
    if (jobFilter !== "all") {
      records = records.filter((r) => r.job_number === jobFilter)
    }
    if (search) {
      const s = search.toLowerCase()
      records = records.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(s) ||
          r.invoice_number.toLowerCase().includes(s) ||
          r.job_name.toLowerCase().includes(s)
      )
    }

    // Sort by aging: oldest first
    const bucketOrder: AgingBucket[] = ["over_90", "61_90", "31_60", "1_30", "current"]
    return records.sort(
      (a, b) => bucketOrder.indexOf(a.aging_bucket) - bucketOrder.indexOf(b.aging_bucket)
    )
  }, [search, bucketFilter, jobFilter, openRecords])

  // Aging summary
  const agingSummary = useMemo(() => {
    const buckets: Record<AgingBucket, number> = {
      current: 0,
      "1_30": 0,
      "31_60": 0,
      "61_90": 0,
      over_90: 0,
    }
    openRecords.forEach((r) => {
      buckets[r.aging_bucket] += r.balance
    })
    return buckets
  }, [openRecords])

  const totalAR = Object.values(agingSummary).reduce((sum, v) => sum + v, 0)

  const hasFilters = bucketFilter !== "all" || jobFilter !== "all" || search !== ""

  return (
    <div className="space-y-4">
      {/* Aging Buckets Visual */}
      <div className="grid grid-cols-5 gap-3">
        {(Object.entries(agingSummary) as [AgingBucket, number][]).map(
          ([bucket, amount]) => {
            const config = AGING_BUCKET_CONFIG[bucket]
            const pct = totalAR > 0 ? (amount / totalAR) * 100 : 0

            return (
              <Card
                key={bucket}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  bucketFilter === bucket && "ring-2 ring-primary"
                )}
                onClick={() => setBucketFilter(bucketFilter === bucket ? "all" : bucket)}
              >
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {config.label}
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrency(amount, { compact: true })}
                  </p>
                  <Progress value={pct} className="h-1.5 mt-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatPercent(pct, 0)} of total
                  </p>
                </CardContent>
              </Card>
            )
          }
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer, invoice, or job..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            <SelectItem value="JOB-2024-001">Greenview Phase I</SelectItem>
            <SelectItem value="JOB-2024-002">Oakmont Reserve</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="ml-auto" disabled title="Export coming soon">
          <Download className="mr-2 h-4 w-4" />
          Export Aging Report
        </Button>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setBucketFilter("all")
              setJobFilter("all")
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* AR Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Job</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Aging</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => {
                const bucketConfig = AGING_BUCKET_CONFIG[record.aging_bucket]

                return (
                  <TableRow key={record.id}>
                    <TableCell className="pl-4 font-mono text-xs font-medium">
                      {record.invoice_number}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.customer_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {record.customer_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.job_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(record.original_amount)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {record.paid_amount > 0 ? formatCurrency(record.paid_amount) : "---"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(record.balance)}
                    </TableCell>
                    <TableCell>
                      {formatDate(record.due_date, { short: true })}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", bucketConfig.color)}>
                        {bucketConfig.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredRecords.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
          <h3 className="text-lg font-semibold">All caught up</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No outstanding receivables match your filters.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DrawScheduleOverview Component
// ---------------------------------------------------------------------------

// TODO: Extract to @/components/construction/draw-schedule-overview
function DrawScheduleOverview() {
  const [jobFilter, setJobFilter] = useState("all")

  const filteredDraws = useMemo(() => {
    let draws = [...MOCK_DRAW_SCHEDULES]
    if (jobFilter !== "all") {
      draws = draws.filter((d) => d.job_number === jobFilter)
    }
    return draws.sort((a, b) => {
      // Group by job, then by draw number
      if (a.job_number !== b.job_number) return a.job_number.localeCompare(b.job_number)
      return a.draw_number - b.draw_number
    })
  }, [jobFilter])

  // Job-level summaries
  const jobSummaries = useMemo(() => {
    const jobs = new Map<string, {
      job_name: string
      lender: string
      total_funded: number
      total_retention: number
      total_draws: number
      draws_funded: number
      latest_completion: number
    }>()

    MOCK_DRAW_SCHEDULES.forEach((draw) => {
      const existing = jobs.get(draw.job_number) || {
        job_name: draw.job_name,
        lender: draw.lender_name,
        total_funded: 0,
        total_retention: 0,
        total_draws: draw.total_draws,
        draws_funded: 0,
        latest_completion: 0,
      }

      if (draw.status === "funded" && draw.amount_funded) {
        existing.total_funded += draw.amount_funded
        existing.draws_funded += 1
      }
      if (draw.status === "funded") {
        existing.total_retention += draw.retention_held
      }
      if (draw.completion_pct > existing.latest_completion) {
        existing.latest_completion = draw.completion_pct
      }

      jobs.set(draw.job_number, existing)
    })

    return jobs
  }, [])

  return (
    <div className="space-y-4">
      {/* Job Filter */}
      <div className="flex items-center gap-3">
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            <SelectItem value="JOB-2024-001">Greenview Phase I</SelectItem>
            <SelectItem value="JOB-2024-002">Oakmont Reserve</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Job Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from(jobSummaries.entries()).map(([jobNumber, summary]) => (
          <Card key={jobNumber}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{summary.job_name}</CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {jobNumber}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {summary.lender}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Funded</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(summary.total_funded, { compact: true })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Retention Held</p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatCurrency(summary.total_retention, { compact: true })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Draws</p>
                  <p className="text-lg font-bold">
                    {summary.draws_funded} / {summary.total_draws}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Project Completion</span>
                  <span className="font-medium">{formatPercent(summary.latest_completion, 0)}</span>
                </div>
                <Progress value={summary.latest_completion} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Draw Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Draw Schedule Detail</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Job</TableHead>
                <TableHead>Draw #</TableHead>
                <TableHead>Lender</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Funded</TableHead>
                <TableHead className="text-right">Retention</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDraws.map((draw) => {
                const statusConfig = DRAW_STATUS_CONFIG[draw.status]

                return (
                  <TableRow key={draw.id}>
                    <TableCell className="pl-4 font-medium">
                      {draw.job_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {draw.draw_number} / {draw.total_draws}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {draw.lender_name}
                    </TableCell>
                    <TableCell>
                      {formatDate(draw.scheduled_date, { short: true })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {draw.amount_requested > 0
                        ? formatCurrency(draw.amount_requested)
                        : "---"}
                    </TableCell>
                    <TableCell className="text-right">
                      {draw.amount_approved
                        ? formatCurrency(draw.amount_approved)
                        : "---"}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {draw.amount_funded
                        ? formatCurrency(draw.amount_funded)
                        : "---"}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 text-xs">
                      {draw.retention_held > 0
                        ? formatCurrency(draw.retention_held)
                        : "---"}
                    </TableCell>
                    <TableCell>
                      {draw.completion_pct > 0 ? (
                        <div className="flex items-center gap-2">
                          <Progress value={draw.completion_pct} className="h-1.5 w-16" />
                          <span className="text-xs">{draw.completion_pct}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">---</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", statusConfig.color)}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function AccountsReceivablePage() {
  const [activeTab, setActiveTab] = useState("aging")

  // ---- Computed summary stats ----
  const summaryStats = useMemo(() => {
    const openRecords = MOCK_AR_RECORDS.filter((r) => r.balance > 0)
    const totalAR = openRecords.reduce((sum, r) => sum + r.balance, 0)

    const currentAmount = openRecords
      .filter((r) => r.aging_bucket === "current")
      .reduce((sum, r) => sum + r.balance, 0)

    const overdueAmount = openRecords
      .filter((r) => ["31_60", "61_90", "over_90"].includes(r.aging_bucket))
      .reduce((sum, r) => sum + r.balance, 0)

    // Collections this month - payments received on AR records
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const collectionsThisMonth = MOCK_AR_RECORDS.filter(
      (r) => r.last_payment_date && r.last_payment_date.startsWith(thisMonth)
    ).reduce((sum, r) => sum + r.paid_amount, 0)

    return {
      totalAR,
      currentAmount,
      overdueAmount,
      collectionsThisMonth,
    }
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Accounts Receivable
          </h1>
          <p className="text-sm text-muted-foreground">
            Track receivables, aging, and construction draw schedules
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Total AR
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(summaryStats.totalAR, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All outstanding receivables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Current
            </div>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(summaryStats.currentAmount, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Not yet due or within terms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue
            </div>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(summaryStats.overdueAmount, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              31+ days past due
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Collections This Month
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(summaryStats.collectionsThisMonth, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              February 2026
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="aging">
            <Clock className="mr-2 h-4 w-4" />
            AR Aging
          </TabsTrigger>
          <TabsTrigger value="draws">
            <Calendar className="mr-2 h-4 w-4" />
            Draw Schedules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aging" className="mt-4">
          <ARAging />
        </TabsContent>

        <TabsContent value="draws" className="mt-4">
          <DrawScheduleOverview />
        </TabsContent>
      </Tabs>
    </div>
  )
}
