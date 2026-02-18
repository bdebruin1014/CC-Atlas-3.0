"use client"

import { Skeleton } from "@/components/ui/skeleton"
import type { CommunityStats } from "@/lib/hooks/use-disposition"
import { formatCurrency, formatPercent } from "@/lib/utils/format"
import { TrendingUp, Clock, BarChart3, DollarSign, BadgeDollarSign, Landmark } from "lucide-react"

const cards = (s: CommunityStats) => [
  { icon: TrendingUp, label: "Absorption Rate", value: `${s.absorption_rate} units/mo`, accent: "text-primary" },
  { icon: Clock, label: "Avg Days on Market", value: `${s.avg_dom} days`, accent: "text-[#2563eb]" },
  { icon: BarChart3, label: "Avg Sale vs List", value: formatPercent(s.avg_sale_vs_list_pct), accent: s.avg_sale_vs_list_pct >= 100 ? "text-primary" : "text-[#ef4444]" },
  { icon: DollarSign, label: "Total Revenue", value: formatCurrency(s.total_revenue + s.pending_revenue, { compact: true }), sub: `${formatCurrency(s.pending_revenue, { compact: true })} pending`, accent: "text-primary" },
  { icon: BadgeDollarSign, label: "Total Concessions", value: formatCurrency(s.concession_total, { compact: true }), accent: "text-[#ef4444]" },
  { icon: Landmark, label: "Projected Remaining", value: formatCurrency(s.remaining * (s.total_revenue / Math.max(s.sold, 1)), { compact: true }), sub: `${s.remaining} units left`, accent: "text-muted-foreground" },
]

export function CommunityStatCards({ stats, isLoading }: { stats?: CommunityStats; isLoading: boolean }) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards(stats).map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">
            <c.icon className="h-3.5 w-3.5" />{c.label}
          </div>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${c.accent}`}>{c.value}</p>
          {c.sub && <p className="text-[11px] text-muted-foreground">{c.sub}</p>}
        </div>
      ))}
    </div>
  )
}
