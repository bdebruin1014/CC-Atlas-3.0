"use client"

import React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  TrendingUp,
  FolderKanban,
  HardHat,
  AlertCircle,
  Plus,
  Users,
  CalendarDays,
  Clock,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils/format"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount)
}

export default function DashboardPage() {
  const supabase = createClient()

  // Fetch active opportunities
  const { data: opportunityStats, isLoading: loadingOpps } = useQuery({
    queryKey: ["dashboard", "opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, stage, estimated_revenue")
        .neq("stage", "closed_lost")
        .neq("stage", "closed_won")

      if (error) throw error

      const count = data?.length || 0
      const pipelineValue =
        data?.reduce(
          (sum, opp) => sum + (Number(opp.estimated_revenue) || 0),
          0
        ) || 0

      // Group by stage for chart
      const stageMap: Record<string, { count: number; value: number }> = {}
      data?.forEach((opp) => {
        const stage = opp.stage || "unknown"
        if (!stageMap[stage]) stageMap[stage] = { count: 0, value: 0 }
        stageMap[stage].count++
        stageMap[stage].value += Number(opp.estimated_revenue) || 0
      })

      const pipelineByStage = Object.entries(stageMap).map(
        ([stage, info]) => ({
          name: stage
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          count: info.count,
          value: info.value,
        })
      )

      return { count, pipelineValue, pipelineByStage }
    },
  })

  // Fetch active projects
  const { data: projectStats, isLoading: loadingProjects } = useQuery({
    queryKey: ["dashboard", "projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, status, total_budget")
        .in("status", ["active", "pre_construction", "in_progress"])

      if (error) throw error

      const count = data?.length || 0
      const totalBudget =
        data?.reduce(
          (sum, proj) => sum + (Number(proj.total_budget) || 0),
          0
        ) || 0

      // Group by status for donut chart
      const statusMap: Record<string, number> = {}
      data?.forEach((proj) => {
        const status = proj.status || "unknown"
        statusMap[status] = (statusMap[status] || 0) + 1
      })

      const projectsByStatus = Object.entries(statusMap).map(
        ([status, count]) => ({
          name: status
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          value: count,
        })
      )

      return { count, totalBudget, projectsByStatus }
    },
  })

  // Fetch units under construction
  const { data: constructionStats, isLoading: loadingConstruction } = useQuery({
    queryKey: ["dashboard", "construction"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, status")
        .in("status", [
          "framing",
          "rough_in",
          "drywall",
          "finish",
          "punch_list",
          "pre_construction",
          "foundation",
        ])

      if (error) throw error

      const count = data?.length || 0
      const statusMap: Record<string, number> = {}
      data?.forEach((job) => {
        const status = job.status || "unknown"
        statusMap[status] = (statusMap[status] || 0) + 1
      })

      const statusSummary = Object.entries(statusMap)
        .map(([status, cnt]) => ({
          label: status
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          count: cnt,
        }))
        .sort((a, b) => b.count - a.count)

      return { count, statusSummary }
    },
  })

  // Fetch overdue tasks
  const { data: taskStats, isLoading: loadingTasks } = useQuery({
    queryKey: ["dashboard", "overdue-tasks"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0]
      const { count, error } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .lt("due_date", today)
        .neq("status", "completed")

      if (error) throw error
      return { count: count || 0 }
    },
  })

  // Fetch recent activity
  const { data: recentActivity, isLoading: loadingActivity } = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select(
          "id, action, description, record_type, created_at, user_id, profiles(first_name, last_name)"
        )
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    },
  })

  // Fetch upcoming calendar events
  const { data: upcomingEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ["dashboard", "events"],
    queryFn: async () => {
      const now = new Date().toISOString()
      const nextWeek = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString()

      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, title, start_time, end_time, event_type")
        .gte("start_time", now)
        .lte("start_time", nextWeek)
        .order("start_time", { ascending: true })
        .limit(5)

      if (error) throw error
      return data || []
    },
  })

  // Fetch user name for welcome message
  const { data: currentUser } = useQuery({
    queryKey: ["dashboard", "current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single()

      return data
    },
  })

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }, [])

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}
            {currentUser?.first_name ? `, ${currentUser.first_name}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Here is an overview of your operations today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/opportunities/new">
              <Plus className="mr-1 h-4 w-4" />
              New Opportunity
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/contacts/new">
              <Users className="mr-1 h-4 w-4" />
              New Contact
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Opportunities"
          value={
            loadingOpps
              ? undefined
              : (opportunityStats?.count ?? 0).toString()
          }
          description={
            loadingOpps
              ? "Loading..."
              : `${formatCurrency(opportunityStats?.pipelineValue ?? 0)} pipeline`
          }
          icon={TrendingUp}
          loading={loadingOpps}
        />
        <StatCard
          title="Active Projects"
          value={
            loadingProjects
              ? undefined
              : (projectStats?.count ?? 0).toString()
          }
          description={
            loadingProjects
              ? "Loading..."
              : `${formatCurrency(projectStats?.totalBudget ?? 0)} total budget`
          }
          icon={FolderKanban}
          loading={loadingProjects}
        />
        <StatCard
          title="Units Under Construction"
          value={
            loadingConstruction
              ? undefined
              : (constructionStats?.count ?? 0).toString()
          }
          description={
            loadingConstruction
              ? "Loading..."
              : constructionStats?.statusSummary
                    ?.slice(0, 2)
                    .map((s) => `${s.count} ${s.label}`)
                    .join(", ") || "No active units"
          }
          icon={HardHat}
          loading={loadingConstruction}
        />
        <StatCard
          title="Overdue Tasks"
          value={
            loadingTasks ? undefined : (taskStats?.count ?? 0).toString()
          }
          description={
            loadingTasks
              ? "Loading..."
              : (taskStats?.count ?? 0) > 0
                ? "Requires attention"
                : "All caught up"
          }
          icon={AlertCircle}
          loading={loadingTasks}
          className={
            (taskStats?.count ?? 0) > 0
              ? "border-destructive/50"
              : undefined
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pipeline by Stage Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline by Stage</CardTitle>
            <CardDescription>
              Opportunity count by pipeline stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingOpps ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (opportunityStats?.pipelineByStage?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={opportunityStats!.pipelineByStage}
                  margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No pipeline data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects by Status Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects by Status</CardTitle>
            <CardDescription>
              Distribution of active projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (projectStats?.projectsByStatus?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={projectStats!.projectsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {projectStats!.projectsByStatus.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No project data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity & Events Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>
              Latest activity across all modules
            </CardDescription>
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
              <ScrollArea className="h-[320px]">
                <div className="space-y-4">
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
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
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
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">Upcoming Events</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/calendar">
                <CalendarDays className="mr-1 h-4 w-4" />
                View Calendar
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (upcomingEvents?.length ?? 0) > 0 ? (
              <ScrollArea className="h-[320px]">
                <div className="space-y-3">
                  {upcomingEvents!.map((event) => {
                    const startDate = new Date(event.start_time)
                    return (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <span className="text-[10px] font-medium uppercase leading-none">
                            {format(startDate, "MMM")}
                          </span>
                          <span className="text-sm font-bold leading-tight">
                            {format(startDate, "d")}
                          </span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(startDate, "h:mm a")}
                            {event.event_type && (
                              <>
                                {" "}
                                &middot;{" "}
                                {event.event_type
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (c: string) =>
                                    c.toUpperCase()
                                  )}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No upcoming events
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
