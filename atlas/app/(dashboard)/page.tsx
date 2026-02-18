"use client"

import React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  TrendingUp,
  FolderKanban,
  HardHat,
  AlertCircle,
  CalendarCheck,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Clock,
  Home,
} from "lucide-react"
import { format, formatDistanceToNow, addDays, isBefore } from "date-fns"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils/format"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount)
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-400",
}

const MODULE_LABELS: Record<string, string> = {
  opportunity: "Opportunity",
  project: "Project",
  construction: "Construction",
  disposition: "Disposition",
  general: "General",
}

const FUNNEL_STAGES = [
  "prospecting",
  "contacted",
  "qualified",
  "negotiating",
  "under_contract",
]

const FUNNEL_LABELS: Record<string, string> = {
  prospecting: "Prospecting",
  contacted: "Contacted",
  qualified: "Qualified",
  negotiating: "Negotiating",
  under_contract: "Under Contract",
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const supabase = createClient()

  // ---- Current user ----
  const { data: currentUser } = useQuery({
    queryKey: ["dashboard", "current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name")
        .eq("id", user.id)
        .single()
      return data
    },
  })

  // ---- Active Opportunities ----
  const { data: oppStats, isLoading: loadingOpps } = useQuery({
    queryKey: ["dashboard", "opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, current_stage, projected_sale_price, status")
        .eq("status", "active")

      if (error) throw error

      const count = data?.length ?? 0
      const pipelineValue =
        data?.reduce((s, o) => s + (Number(o.projected_sale_price) || 0), 0) ?? 0

      // Group by stage for funnel
      const stageMap: Record<string, { count: number; value: number }> = {}
      data?.forEach((o) => {
        const stage = o.current_stage || "unknown"
        if (!stageMap[stage]) stageMap[stage] = { count: 0, value: 0 }
        stageMap[stage].count++
        stageMap[stage].value += Number(o.projected_sale_price) || 0
      })

      return { count, pipelineValue, stageMap }
    },
  })

  // ---- Active Projects ----
  const { data: projStats, isLoading: loadingProjects } = useQuery({
    queryKey: ["dashboard", "projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, status, budget_total")
        .in("status", ["active", "pre_construction", "in_progress"])

      if (error) throw error

      const count = data?.length ?? 0
      const totalBudget =
        data?.reduce((s, p) => s + (Number(p.budget_total) || 0), 0) ?? 0

      return { count, totalBudget }
    },
  })

  // ---- Units Under Construction ----
  const { data: constructionStats, isLoading: loadingConstruction } = useQuery({
    queryKey: ["dashboard", "construction"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, name, job_number, status, estimated_completion, start_date")
        .not("status", "in", '("completed","cancelled","closed")')

      if (error) throw error
      return data ?? []
    },
  })

  // ---- Overdue Tasks ----
  const { data: overdueCount, isLoading: loadingOverdue } = useQuery({
    queryKey: ["dashboard", "overdue-tasks"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0]
      const { count, error } = await supabase
        .from("standalone_tasks")
        .select("id", { count: "exact", head: true })
        .lt("due_date", today)
        .neq("status", "completed")
        .neq("status", "cancelled")

      if (error) throw error
      return count ?? 0
    },
  })

  // ---- Closings This Month ----
  const { data: closingsStats, isLoading: loadingClosings } = useQuery({
    queryKey: ["dashboard", "closings-month"],
    queryFn: async () => {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0]
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0]

      const { data, error } = await supabase
        .from("disposition_contracts")
        .select("id, purchase_price, closing_date")
        .gte("closing_date", firstDay)
        .lte("closing_date", lastDay)

      if (error) throw error

      const count = data?.length ?? 0
      const totalValue =
        data?.reduce((s, c) => s + (Number(c.purchase_price) || 0), 0) ?? 0

      return { count, totalValue }
    },
  })

  // ---- My Tasks (top 5 soonest) ----
  const { data: myTasks, isLoading: loadingMyTasks } = useQuery({
    queryKey: ["dashboard", "my-tasks"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from("standalone_tasks")
        .select("id, title, due_date, priority, module, status")
        .eq("assigned_to", user.id)
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5)

      if (error) throw error
      return data ?? []
    },
  })

  // ---- Upcoming Deadlines (next 14 days) ----
  const { data: deadlines, isLoading: loadingDeadlines } = useQuery({
    queryKey: ["dashboard", "deadlines"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0]
      const twoWeeks = addDays(new Date(), 14).toISOString().split("T")[0]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: { date: string; label: string; type: string; href: string }[] = []

      // DD deadlines from opportunities
      const { data: ddOpps } = await supabase
        .from("opportunities")
        .select("id, name, due_diligence_deadline")
        .gte("due_diligence_deadline", today)
        .lte("due_diligence_deadline", twoWeeks)
        .eq("status", "active")

      ddOpps?.forEach((o) => {
        if (o.due_diligence_deadline) {
          items.push({
            date: o.due_diligence_deadline,
            label: `DD Deadline: ${o.name}`,
            type: "opportunity",
            href: `/opportunities/${o.id}`,
          })
        }
      })

      // Closing dates from opportunities
      const { data: closeOpps } = await supabase
        .from("opportunities")
        .select("id, name, projected_close_date")
        .gte("projected_close_date", today)
        .lte("projected_close_date", twoWeeks)
        .eq("status", "active")

      closeOpps?.forEach((o) => {
        if (o.projected_close_date) {
          items.push({
            date: o.projected_close_date,
            label: `Closing: ${o.name}`,
            type: "opportunity",
            href: `/opportunities/${o.id}`,
          })
        }
      })

      // Tasks due
      const { data: tasks } = await supabase
        .from("standalone_tasks")
        .select("id, title, due_date, module")
        .gte("due_date", today)
        .lte("due_date", twoWeeks)
        .neq("status", "completed")
        .neq("status", "cancelled")
        .limit(20)

      tasks?.forEach((t) => {
        if (t.due_date) {
          items.push({
            date: t.due_date,
            label: `Task: ${t.title}`,
            type: t.module || "general",
            href: "/tasks",
          })
        }
      })

      // Disposition closings
      const { data: contracts } = await supabase
        .from("disposition_contracts")
        .select("id, listing_id, closing_date, buyer_entity")
        .gte("closing_date", today)
        .lte("closing_date", twoWeeks)

      contracts?.forEach((c) => {
        if (c.closing_date) {
          items.push({
            date: c.closing_date,
            label: `Disposition Closing${c.buyer_entity ? `: ${c.buyer_entity}` : ""}`,
            type: "disposition",
            href: c.listing_id ? `/disposition/listings/${c.listing_id}` : "/disposition",
          })
        }
      })

      // Sort by date
      items.sort((a, b) => a.date.localeCompare(b.date))
      return items.slice(0, 15)
    },
  })

  // ---- Recent Activity (last 20) ----
  const { data: recentActivity, isLoading: loadingActivity } = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select(
          "id, action, description, record_type, created_at, user_id, profiles(first_name, last_name)"
        )
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      return data ?? []
    },
  })

  // ---- Disposition Summary ----
  const { data: dispositionSummary, isLoading: loadingDispo } = useQuery({
    queryKey: ["dashboard", "disposition-summary"],
    queryFn: async () => {
      // Active listings
      const { count: activeCount } = await supabase
        .from("disposition_listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")

      // Under contract
      const { count: contractCount } = await supabase
        .from("disposition_listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "under_contract")

      // Closed this month
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0]
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0]

      const { data: closedData } = await supabase
        .from("disposition_settlements")
        .select("id, sale_price")
        .gte("closing_date", firstDay)
        .lte("closing_date", lastDay)

      const closedCount = closedData?.length ?? 0
      const revenueMTD =
        closedData?.reduce((s, r) => s + (Number(r.sale_price) || 0), 0) ?? 0

      return {
        active: activeCount ?? 0,
        underContract: contractCount ?? 0,
        closedMonth: closedCount,
        revenueMTD,
      }
    },
  })

  // ---- Greeting ----
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 17) return "Good Afternoon"
    return "Good Evening"
  }, [])

  const constructionJobs = constructionStats ?? []

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "#1a5632" }}>
          {greeting}
          {currentUser?.first_name ? `, ${currentUser.first_name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here is your operational overview for{" "}
          {format(new Date(), "EEEE, MMMM d, yyyy")}.
        </p>
      </div>

      {/* ---- 6 Stat Cards ---- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Active Opportunities"
          value={loadingOpps ? undefined : String(oppStats?.count ?? 0)}
          description={
            loadingOpps
              ? "Loading..."
              : `${fmtCurrency(oppStats?.pipelineValue ?? 0)} pipeline`
          }
          icon={TrendingUp}
          loading={loadingOpps}
        />
        <StatCard
          title="Active Projects"
          value={loadingProjects ? undefined : String(projStats?.count ?? 0)}
          description={
            loadingProjects
              ? "Loading..."
              : `${fmtCurrency(projStats?.totalBudget ?? 0)} total budget`
          }
          icon={FolderKanban}
          loading={loadingProjects}
        />
        <StatCard
          title="Units Under Construction"
          value={
            loadingConstruction ? undefined : String(constructionJobs.length)
          }
          description={
            loadingConstruction ? "Loading..." : "Active jobs"
          }
          icon={HardHat}
          loading={loadingConstruction}
        />
        <StatCard
          title="Overdue Tasks"
          value={loadingOverdue ? undefined : String(overdueCount ?? 0)}
          description={
            loadingOverdue
              ? "Loading..."
              : (overdueCount ?? 0) > 0
                ? "Requires attention"
                : "All caught up"
          }
          icon={AlertCircle}
          loading={loadingOverdue}
          className={
            (overdueCount ?? 0) > 0 ? "border-red-500/60 bg-red-50/30" : undefined
          }
        />
        <StatCard
          title="Closings This Month"
          value={
            loadingClosings ? undefined : String(closingsStats?.count ?? 0)
          }
          description={
            loadingClosings
              ? "Loading..."
              : fmtCurrency(closingsStats?.totalValue ?? 0)
          }
          icon={CalendarCheck}
          loading={loadingClosings}
        />
        <StatCard
          title="Cash Position"
          value="--"
          description="Coming soon"
          icon={DollarSign}
        />
      </div>

      {/* ---- Row: My Tasks + Pipeline Funnel ---- */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* My Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">My Tasks</CardTitle>
              <CardDescription>Your top 5 upcoming tasks</CardDescription>
            </div>
            <Link
              href="/tasks"
              className="inline-flex items-center text-xs font-medium text-[#1a5632] hover:underline"
            >
              View All Tasks
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingMyTasks ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-2.5 w-2.5 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (myTasks?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {myTasks!.map((task) => {
                  const isOverdue =
                    task.due_date &&
                    isBefore(new Date(task.due_date), new Date()) &&
                    task.status !== "completed"
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                    >
                      <span
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          PRIORITY_COLORS[task.priority] ?? "bg-gray-400"
                        )}
                      />
                      <span className="flex-1 truncate font-medium">
                        {task.title}
                      </span>
                      {task.module && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {MODULE_LABELS[task.module] ?? task.module}
                        </Badge>
                      )}
                      {task.due_date && (
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            isOverdue
                              ? "font-medium text-red-600"
                              : "text-muted-foreground"
                          )}
                        >
                          {format(new Date(task.due_date), "MMM d")}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                <div className="text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500/60" />
                  No pending tasks
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Funnel</CardTitle>
            <CardDescription>
              Active opportunities by stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingOpps ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {FUNNEL_STAGES.map((stage, idx) => {
                  const info = oppStats?.stageMap?.[stage]
                  const count = info?.count ?? 0
                  const value = info?.value ?? 0
                  const maxCount = Math.max(
                    1,
                    ...FUNNEL_STAGES.map(
                      (s) => oppStats?.stageMap?.[s]?.count ?? 0
                    )
                  )
                  const widthPct = Math.max(15, (count / maxCount) * 100)

                  return (
                    <Link
                      key={stage}
                      href={`/opportunities?stage=${stage}`}
                      className="group block"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                          {FUNNEL_LABELS[stage]}
                        </span>
                        <div className="relative flex-1">
                          <div
                            className="flex h-9 items-center justify-between rounded-md px-3 transition-all group-hover:opacity-90"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: `hsl(${150 - idx * 15}, 55%, ${45 + idx * 5}%)`,
                            }}
                          >
                            <span className="text-xs font-bold text-white">
                              {count}
                            </span>
                            {value > 0 && (
                              <span className="text-[10px] text-white/80">
                                {fmtCurrency(value)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Row: Construction Heat Map + Upcoming Deadlines ---- */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Construction Heat Map */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Construction Heat Map</CardTitle>
              <CardDescription>Schedule status by job</CardDescription>
            </div>
            <Link
              href="/construction/jobs"
              className="inline-flex items-center text-xs font-medium text-[#1a5632] hover:underline"
            >
              View All Jobs
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingConstruction ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>
            ) : constructionJobs.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {constructionJobs.slice(0, 16).map((job) => {
                  // Determine color based on schedule status
                  let color = "bg-green-100 border-green-300 text-green-800"
                  if (job.estimated_completion) {
                    const est = new Date(job.estimated_completion)
                    const now = new Date()
                    const daysLeft = Math.ceil(
                      (est.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    )
                    if (daysLeft < 0) {
                      color = "bg-red-100 border-red-300 text-red-800"
                    } else if (daysLeft < 14) {
                      color = "bg-yellow-100 border-yellow-300 text-yellow-800"
                    }
                  }

                  return (
                    <Link
                      key={job.id}
                      href={`/construction/jobs/${job.id}`}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-md border p-2 text-center transition-all hover:shadow-sm",
                        color
                      )}
                    >
                      <span className="text-[10px] font-semibold leading-tight truncate w-full">
                        {job.job_number || job.name}
                      </span>
                      <span className="mt-0.5 text-[9px] opacity-70 capitalize">
                        {(job.status || "").replace(/_/g, " ")}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                No active construction jobs
              </div>
            )}
            {constructionJobs.length > 0 && (
              <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-green-300" /> On Track
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-yellow-300" /> {"< 14 days"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-red-300" /> Overdue
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
            <CardDescription>Next 14 days across all modules</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDeadlines ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (deadlines?.length ?? 0) > 0 ? (
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  {deadlines!.map((d, idx) => {
                    const dateObj = new Date(d.date + "T00:00:00")
                    return (
                      <Link
                        key={`${d.date}-${idx}`}
                        href={d.href}
                        className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <span className="text-[10px] font-medium uppercase leading-none">
                            {format(dateObj, "MMM")}
                          </span>
                          <span className="text-sm font-bold leading-tight">
                            {format(dateObj, "d")}
                          </span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium">
                            {d.label}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {d.type.replace(/_/g, " ")}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No upcoming deadlines
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Row: Recent Activity + Disposition Summary ---- */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Last 20 activities across all modules</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (recentActivity?.length ?? 0) > 0 ? (
              <ScrollArea className="h-[360px]">
                <div className="space-y-3">
                  {recentActivity!.map((activity) => {
                    const profile = activity.profiles as unknown as {
                      first_name: string | null
                      last_name: string | null
                    } | null

                    const userName = profile
                      ? [profile.first_name, profile.last_name]
                          .filter(Boolean)
                          .join(" ") || "Unknown"
                      : "System"

                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <p className="text-sm leading-snug">
                            <span className="font-medium">{userName}</span>{" "}
                            <span className="text-muted-foreground">
                              {activity.description || activity.action}
                            </span>
                          </p>
                          <div className="flex items-center gap-2">
                            {activity.record_type && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {activity.record_type}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(activity.created_at),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disposition Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Disposition Summary</CardTitle>
              <CardDescription>Listings &amp; sales overview</CardDescription>
            </div>
            <Link
              href="/disposition"
              className="inline-flex items-center text-xs font-medium text-[#1a5632] hover:underline"
            >
              View Disposition
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingDispo ? (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : (dispositionSummary?.active ?? 0) > 0 ||
              (dispositionSummary?.underContract ?? 0) > 0 ||
              (dispositionSummary?.closedMonth ?? 0) > 0 ? (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Active Listings
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {dispositionSummary?.active ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Under Contract
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {dispositionSummary?.underContract ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Closed This Month
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {dispositionSummary?.closedMonth ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Revenue MTD
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {fmtCurrency(dispositionSummary?.revenueMTD ?? 0)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                <div className="text-center">
                  <Home className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  No disposition listings yet
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
