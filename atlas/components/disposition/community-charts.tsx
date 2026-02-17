"use client"

import { useMemo } from "react"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import type { CommunityStats, ListingDetail } from "@/lib/hooks/use-disposition"
import { formatCurrency } from "@/lib/utils/format"

// ---------------------------------------------------------------------------
// Sales Velocity Chart
// ---------------------------------------------------------------------------
export function SalesVelocityChart({ listings, stats, isLoading }: {
  listings: ListingDetail[]; stats?: CommunityStats; isLoading: boolean
}) {
  const data = useMemo(() => {
    if (!listings.length || !stats) return []
    const closedSorted = listings
      .filter((l) => l.status === "closed" && l.listing_date)
      .sort((a, b) => new Date(a.listing_date!).getTime() - new Date(b.listing_date!).getTime())
    if (!closedSorted.length) return []

    const earliest = new Date(closedSorted[0].listing_date!)
    const now = new Date()
    const months: { month: string; actual: number; projected: number }[] = []
    let cumulative = 0
    const cur = new Date(earliest.getFullYear(), earliest.getMonth(), 1)

    while (cur <= now || months.length < 3) {
      const label = cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      const closedThisMonth = closedSorted.filter((l) => {
        const d = new Date(l.listing_date!)
        return d.getFullYear() === cur.getFullYear() && d.getMonth() === cur.getMonth()
      }).length
      cumulative += closedThisMonth
      months.push({ month: label, actual: cumulative, projected: 0 })
      cur.setMonth(cur.getMonth() + 1)
      if (months.length > 36) break
    }

    // Add 6 months of projection
    const rate = stats.absorption_rate || 0
    let proj = cumulative
    for (let i = 0; i < 6; i++) {
      proj += rate
      const label = cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      months.push({ month: label, actual: cumulative, projected: Math.round(proj) })
      cur.setMonth(cur.getMonth() + 1)
    }
    // Backfill projected for overlap point
    if (months.length > 0) {
      const lastActualIdx = months.findIndex((m) => m.projected > 0) - 1
      if (lastActualIdx >= 0) months[lastActualIdx].projected = months[lastActualIdx].actual
    }
    return months
  }, [listings, stats])

  if (isLoading) return <Skeleton className="h-72 w-full rounded-lg" />
  if (!data.length) return <p className="py-8 text-center text-[13px] text-[#5A6B75]">No velocity data yet</p>

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <h3 className="mb-3 text-[13px] font-semibold text-[#1F2937]">Sales Velocity</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <RechartsTooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="actual" name="Actual" stroke="#1a5632" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="projected" name="Projected" stroke="#1a5632" strokeWidth={2} strokeDasharray="6 3" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pricing Analysis Chart
// ---------------------------------------------------------------------------
export function PricingAnalysisChart({ listings, isLoading }: {
  listings: ListingDetail[]; isLoading: boolean
}) {
  const { chartData, tableData } = useMemo(() => {
    if (!listings.length) return { chartData: [], tableData: [] }
    const groups = new Map<string, { list: number[]; sale: number[]; concessions: number[] }>()
    for (const l of listings) {
      const plan = l.property_type || "other"
      if (!groups.has(plan)) groups.set(plan, { list: [], sale: [], concessions: [] })
      const g = groups.get(plan)!
      if (l.original_list_price) g.list.push(l.original_list_price)
      if (l.status === "closed" && l.list_price) g.sale.push(l.list_price)
    }
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
    const cd = [...groups.entries()].map(([plan, g]) => ({
      plan: plan.replace(/_/g, " "), listPrice: avg(g.list), salePrice: avg(g.sale), concessions: avg(g.concessions),
    }))
    return { chartData: cd, tableData: cd }
  }, [listings])

  if (isLoading) return <Skeleton className="h-72 w-full rounded-lg" />
  if (!chartData.length) return null

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <h3 className="mb-3 text-[13px] font-semibold text-[#1F2937]">Pricing Analysis</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="plan" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <RechartsTooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="listPrice" name="List Price" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Bar dataKey="salePrice" name="Avg Sale Price" fill="#1a5632" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 overflow-auto">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-[#E5E7EB] text-left text-[#6B7280]">
            <th className="pb-1.5 font-medium">Type</th><th className="pb-1.5 font-medium">List Price</th>
            <th className="pb-1.5 font-medium">Avg Sale</th><th className="pb-1.5 font-medium">Margin</th>
          </tr></thead>
          <tbody>{tableData.map((r) => (
            <tr key={r.plan} className="border-b border-[#E5E7EB] last:border-0">
              <td className="py-1.5 capitalize">{r.plan}</td>
              <td className="py-1.5 tabular-nums">{formatCurrency(r.listPrice)}</td>
              <td className="py-1.5 tabular-nums">{formatCurrency(r.salePrice)}</td>
              <td className={`py-1.5 tabular-nums ${r.salePrice >= r.listPrice ? "text-[#1a5632]" : "text-[#ef4444]"}`}>
                {r.listPrice ? `${(((r.salePrice - r.listPrice) / r.listPrice) * 100).toFixed(1)}%` : "—"}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Concession Analysis Chart
// ---------------------------------------------------------------------------
export function ConcessionChart({ listings, stats, isLoading }: {
  listings: ListingDetail[]; stats?: CommunityStats; isLoading: boolean
}) {
  const { summary, chartData } = useMemo(() => {
    if (!stats) return { summary: null, chartData: [] }
    const closed = listings.filter((l) => l.status === "closed")
    const totalSale = closed.reduce((s, l) => s + (l.list_price ?? 0), 0)
    const summary = {
      total: stats.concession_total,
      avgPerUnit: closed.length ? Math.round(stats.concession_total / closed.length) : 0,
      pctOfSale: totalSale ? ((stats.concession_total / totalSale) * 100).toFixed(1) : "0",
    }
    // Simple monthly concession trend (mock based on closed listing dates)
    const months = new Map<string, number>()
    for (const l of closed) {
      if (!l.listing_date) continue
      const d = new Date(l.listing_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      months.set(key, (months.get(key) ?? 0) + 1)
    }
    const avgConcPerUnit = summary.avgPerUnit
    const cd = [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, count]) => ({
        month: new Date(m + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        concessions: avgConcPerUnit * count,
      }))
    return { summary, chartData: cd }
  }, [listings, stats])

  if (isLoading || !summary) return <Skeleton className="h-48 w-full rounded-lg" />

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <h3 className="mb-3 text-[13px] font-semibold text-[#1F2937]">Concession Analysis</h3>
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Total Concessions", value: formatCurrency(summary.total) },
          { label: "Avg Per Unit", value: formatCurrency(summary.avgPerUnit) },
          { label: "% of Sale Price", value: `${summary.pctOfSale}%` },
        ].map((c) => (
          <div key={c.label} className="rounded-md bg-[#F9FAFB] px-3 py-2 text-center">
            <p className="text-[10px] uppercase text-[#6B7280]">{c.label}</p>
            <p className="text-[14px] font-semibold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>
      {chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <RechartsTooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="concessions" name="Concessions" fill="#ef4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
