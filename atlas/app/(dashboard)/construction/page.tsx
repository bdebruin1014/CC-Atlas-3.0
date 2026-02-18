"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Search,
  Plus,
  HardHat,
  Users,
  ChevronRight,
  MapPin,
  X,
  FileText,
  CreditCard,
  Receipt,
  BarChart3,
  Shield,
} from "lucide-react"
import { cn, formatCurrency, formatPercent, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DashboardSummary } from "@/components/construction/job-dashboard"
import { MOCK_JOBS, MOCK_PURCHASE_ORDERS, MOCK_CHANGE_ORDERS } from "@/lib/construction/mock-data"
import { JOB_STATUS_CONFIG } from "@/lib/construction/types"
import type { JobStatus, ClientType } from "@/lib/construction/types"
import { useComplianceSummary, usePhotoCountsByJob } from "@/lib/hooks/use-daily-logs"

// Workdays in a month up to today (or full month if past)
function getWorkdaysInMonth(year: number, month: number): number {
  const today = new Date()
  const firstDay = new Date(year, month - 1, 1)
  const lastDay =
    month === today.getMonth() + 1 && year === today.getFullYear()
      ? today
      : new Date(year, month, 0)
  let count = 0
  const d = new Date(firstDay)
  while (d <= lastDay) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

export default function ConstructionDashboardPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all")
  const [clientTypeFilter, setClientTypeFilter] = useState<ClientType | "all">("all")

  // ---- Computed stats ----
  const activeJobs = MOCK_JOBS.filter((j) => j.status === "active").length
  const unitsUnderConstruction = MOCK_JOBS.filter(
    (j) => j.status === "active"
  ).reduce((sum, j) => sum + j.unit_count - j.units_completed, 0)
  const openPOs = MOCK_PURCHASE_ORDERS.filter((po) =>
    ["issued", "work_complete", "invoiced", "approved", "scheduled"].includes(po.status)
  )
  const pendingInspections = 7 // Mock count
  const openCOs = MOCK_CHANGE_ORDERS.filter((co) =>
    ["pending", "revised"].includes(co.status)
  )

  // ---- Filtered jobs ----
  const filteredJobs = useMemo(() => {
    let jobs = [...MOCK_JOBS]

    if (statusFilter !== "all") {
      jobs = jobs.filter((j) => j.status === statusFilter)
    }
    if (clientTypeFilter !== "all") {
      jobs = jobs.filter((j) => j.client_type === clientTypeFilter)
    }
    if (search) {
      const s = search.toLowerCase()
      jobs = jobs.filter(
        (j) =>
          j.name.toLowerCase().includes(s) ||
          j.job_number.toLowerCase().includes(s) ||
          j.superintendent.toLowerCase().includes(s) ||
          (j.client_name && j.client_name.toLowerCase().includes(s)) ||
          (j.client_entity && j.client_entity.toLowerCase().includes(s))
      )
    }

    return jobs.sort((a, b) => {
      const order: Record<string, number> = {
        active: 0,
        preconstruction: 1,
        on_hold: 2,
        completed: 3,
        closed: 4,
        cancelled: 5,
      }
      return (order[a.status] ?? 9) - (order[b.status] ?? 9)
    })
  }, [search, statusFilter, clientTypeFilter])

  const hasFilters = statusFilter !== "all" || clientTypeFilter !== "all" || search !== ""

  // ---- Compliance dashboard data ----
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const activeJobIds = useMemo(
    () => MOCK_JOBS.filter((j) => j.status === "active").map((j) => j.id),
    []
  )
  const workdaysThisMonth = getWorkdaysInMonth(currentYear, currentMonth)

  const { data: complianceLogs } = useComplianceSummary(
    activeJobIds,
    currentYear,
    currentMonth
  )
  const { data: photoCountsData } = usePhotoCountsByJob(
    activeJobIds,
    currentYear,
    currentMonth
  )

  const complianceByJob = useMemo(() => {
    if (!complianceLogs) return []

    return MOCK_JOBS.filter((j) => j.status === "active").map((job) => {
      const jobLogs = complianceLogs.filter((l) => l.job_id === job.id)
      const logDates = new Set(jobLogs.map((l) => l.log_date))
      const daysLogged = logDates.size
      const lastLogDate =
        jobLogs.length > 0
          ? jobLogs
              .map((l) => l.log_date)
              .sort()
              .reverse()[0]
          : null
      const daysMissing = Math.max(0, workdaysThisMonth - daysLogged)
      const compliancePct =
        workdaysThisMonth > 0 ? (daysLogged / workdaysThisMonth) * 100 : 0
      const photoCount =
        photoCountsData?.filter((p) => p.job_id === job.id).length ?? 0

      return {
        ...job,
        daysLogged,
        lastLogDate,
        daysMissing,
        compliancePct,
        photoCount,
      }
    })
  }, [complianceLogs, photoCountsData, workdaysThisMonth])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Construction Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage jobs, units, schedules, and vendor coordination
          </p>
        </div>
        <Link href="/construction/jobs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <DashboardSummary
        activeJobs={activeJobs}
        unitsUnderConstruction={unitsUnderConstruction}
        openPOs={{ count: openPOs.length, value: openPOs.reduce((s, po) => s + po.amount, 0) }}
        pendingInspections={pendingInspections}
        openChangeOrders={openCOs.length}
      />

      {/* Accounting Quick Access */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Construction Accounting
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Invoices",
              href: "/construction/invoices",
              icon: FileText,
              description: "AP invoices & approvals",
              color: "text-blue-600 bg-blue-50",
            },
            {
              label: "Payments",
              href: "/construction/payments",
              icon: CreditCard,
              description: "Payment runs & history",
              color: "text-green-600 bg-green-50",
            },
            {
              label: "AR / Draws",
              href: "/construction/ar",
              icon: Receipt,
              description: "Receivables & draw requests",
              color: "text-purple-600 bg-purple-50",
            },
            {
              label: "Job Cost",
              href: "/construction/job-cost",
              icon: BarChart3,
              description: "Cost tracking & analysis",
              color: "text-orange-600 bg-orange-50",
            },
            {
              label: "Vendors",
              href: "/construction/vendors",
              icon: Users,
              description: "Vendor management & 1099s",
              color: "text-slate-600 bg-slate-50",
            },
            {
              label: "Warranty",
              href: "/construction/warranty",
              icon: Shield,
              description: "Warranty claims & tracking",
              color: "text-amber-600 bg-amber-50",
            },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="block">
              <Card
                className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 h-full"
              >
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", item.color)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs by name, number, or superintendent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as JobStatus | "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="preconstruction">Pre-Construction</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={clientTypeFilter}
          onValueChange={(v) => setClientTypeFilter(v as ClientType | "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Client Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="third_party">Third-Party</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setStatusFilter("all")
              setClientTypeFilter("all")
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
      </p>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <HardHat className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">No jobs found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {hasFilters
                ? "Try adjusting your filters."
                : "Get started by creating a new job."}
            </p>
            {!hasFilters && (
              <Link href="/construction/jobs/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Job
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => {
            const statusConfig = JOB_STATUS_CONFIG[job.status]
            const progressPct =
              job.unit_count > 0
                ? (job.units_completed / job.unit_count) * 100
                : 0
            const clientDisplay =
              job.client_type === "internal"
                ? job.client_entity
                : job.client_name

            return (
              <Card
                key={job.id}
                className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                onClick={() => router.push(`/construction/jobs/${job.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Top row: job number, name, badges */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">
                          {job.job_number}
                        </span>
                        <h3 className="text-base font-semibold truncate">
                          {job.name}
                        </h3>
                        <Badge
                          className={cn("text-xs", statusConfig.bgColor)}
                        >
                          {statusConfig.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {job.state}
                        </Badge>
                        {job.client_type === "third_party" && (
                          <Badge variant="secondary" className="text-xs">
                            Third-Party
                          </Badge>
                        )}
                      </div>

                      {/* Client & Superintendent */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {clientDisplay}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardHat className="h-3.5 w-3.5" />
                          {job.superintendent}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Units: {job.units_completed} / {job.unit_count} complete
                          </span>
                          <span className="font-medium">
                            {formatPercent(progressPct, 0)}
                          </span>
                        </div>
                        <Progress value={progressPct} className="h-2" />
                      </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex flex-col items-end gap-1 text-right shrink-0">
                      <span className="text-lg font-bold">
                        {formatCurrency(job.contract_amount, { compact: true })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Contract Value
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        {job.unit_count} unit{job.unit_count !== 1 ? "s" : ""}
                      </span>
                      <ChevronRight className="mt-2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Compliance Dashboard */}
      {activeJobIds.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Daily Log Compliance &mdash;{" "}
            {new Date(currentYear, currentMonth - 1).toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Job</th>
                      <th className="text-center p-3 font-medium">Last Log</th>
                      <th className="text-center p-3 font-medium">
                        Days Missing
                      </th>
                      <th className="text-center p-3 font-medium">Photos</th>
                      <th className="text-center p-3 font-medium">
                        Compliance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {complianceByJob.map((job) => {
                      const isGap = job.compliancePct < 80
                      return (
                        <tr
                          key={job.id}
                          className={cn(
                            "border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors",
                            isGap && "bg-red-50/50 dark:bg-red-950/10"
                          )}
                          onClick={() =>
                            router.push(
                              `/construction/jobs/${job.id}/daily-log`
                            )
                          }
                        >
                          <td className="p-3">
                            <div className="font-medium">{job.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {job.job_number}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {job.lastLogDate ? (
                              formatDate(job.lastLogDate)
                            ) : (
                              <span className="text-red-500 font-medium">
                                No logs
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={cn(
                                "font-medium",
                                job.daysMissing > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              )}
                            >
                              {job.daysMissing}
                            </span>
                          </td>
                          <td className="p-3 text-center">{job.photoCount}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Progress
                                value={job.compliancePct}
                                className="h-2 w-16"
                              />
                              <span
                                className={cn(
                                  "text-xs font-medium min-w-[3rem]",
                                  job.compliancePct >= 80
                                    ? "text-green-600"
                                    : "text-red-600"
                                )}
                              >
                                {formatPercent(job.compliancePct, 0)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
