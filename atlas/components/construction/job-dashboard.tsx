"use client"

import {
  Briefcase,
  Building2,
  FileText,
  ClipboardCheck,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ---- Stat Card ----
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; label: string }
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trend.value >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend.value >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---- Horizontal Stacked Bar ----
interface StackedBarSegment {
  label: string
  value: number
  color: string
}

interface StackedBarProps {
  segments: StackedBarSegment[]
  total: number
  height?: number
}

export function StackedBar({ segments, total, height = 32 }: StackedBarProps) {
  if (total === 0) return null

  return (
    <div className="space-y-2">
      <div
        className="flex w-full overflow-hidden rounded-lg"
        style={{ height }}
      >
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100
          if (pct === 0) return null
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center text-xs font-medium text-white transition-all",
                seg.color
              )}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${seg.value}`}
            >
              {pct >= 8 && seg.value}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={cn("h-2.5 w-2.5 rounded-sm", seg.color)} />
            <span className="text-xs text-muted-foreground">
              {seg.label}: {seg.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Simple Bar Chart ----
interface BarChartItem {
  label: string
  value: number
  color?: string
}

interface SimpleBarChartProps {
  items: BarChartItem[]
  maxValue?: number
}

export function SimpleBarChart({ items, maxValue }: SimpleBarChartProps) {
  const max = maxValue || Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-24 truncate text-right">
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
            <div
              className={cn(
                "h-full rounded transition-all",
                item.color || "bg-primary"
              )}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium w-8 text-right">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---- Dashboard Summary Row ----
interface DashboardSummaryProps {
  activeJobs: number
  unitsUnderConstruction: number
  openPOs: { count: number; value: number }
  pendingInspections: number
  openChangeOrders: number
}

export function DashboardSummary({
  activeJobs,
  unitsUnderConstruction,
  openPOs,
  pendingInspections,
  openChangeOrders,
}: DashboardSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        title="Active Jobs"
        value={activeJobs}
        icon={<Briefcase className="h-4 w-4" />}
      />
      <StatCard
        title="Units Under Construction"
        value={unitsUnderConstruction}
        icon={<Building2 className="h-4 w-4" />}
      />
      <StatCard
        title="Open POs"
        value={openPOs.count}
        subtitle={formatCurrency(openPOs.value, { compact: true })}
        icon={<FileText className="h-4 w-4" />}
      />
      <StatCard
        title="Pending Inspections"
        value={pendingInspections}
        icon={<ClipboardCheck className="h-4 w-4" />}
      />
      <StatCard
        title="Open Change Orders"
        value={openChangeOrders}
        icon={<AlertCircle className="h-4 w-4" />}
      />
    </div>
  )
}
