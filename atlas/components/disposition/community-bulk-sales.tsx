"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts"
import { useBulkSaleAgreements, useTakedownSchedule, type BulkSaleDetail } from "@/lib/hooks/use-disposition"
import { formatCurrency, formatDate } from "@/lib/utils/format"

const BS_V: Record<string, "warning" | "blue" | "success" | "error" | "gray"> = {
  negotiating: "warning", active: "blue", complete: "success", terminated: "error",
}

export function CommunityBulkSales({ projectId, isLotDev }: { projectId: string; isLotDev: boolean }) {
  const { data: agreements, isLoading } = useBulkSaleAgreements(projectId)

  if (!isLotDev) return null
  if (isLoading) return <Skeleton className="h-48 w-full rounded-lg" />
  if (!agreements?.length) return null

  const active = agreements.filter((a) => a.status === "active" || a.status === "negotiating")

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-[#1F2937]">Bulk Sale Agreements</h3>
        <Table>
          <TableHeader><TableRow className="bg-[#F3F4F6]">
            {["Buyer", "Total Lots", "Contracted", "Taken Down", "Remaining", "Total Value", "Status"].map((h) => (
              <TableHead key={h} className="text-[11px] uppercase tracking-wide">{h}</TableHead>
            ))}
          </TableRow></TableHeader>
          <TableBody>
            {active.map((a) => <BulkRow key={a.id} agreement={a} />)}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-[#1F2937]">Takedown Timeline</h3>
        {active.map((a) => <TakedownTimeline key={a.id} agreement={a} />)}
      </div>
    </div>
  )
}

function BulkRow({ agreement: a }: { agreement: BulkSaleDetail }) {
  const { data: takedowns } = useTakedownSchedule(a.id)
  const completed = (takedowns ?? []).filter((t) => t.status === "completed")
  const takenDown = completed.reduce((s, t) => s + (t.lots_count ?? 0), 0)
  const contracted = a.total_lots ?? 0
  const remaining = contracted - takenDown

  return (
    <TableRow className="h-9">
      <TableCell className="text-[12px] font-medium">{a.buyer_entity_name || "—"}</TableCell>
      <TableCell className="text-[12px] tabular-nums">{contracted}</TableCell>
      <TableCell className="text-[12px] tabular-nums">{contracted}</TableCell>
      <TableCell className="text-[12px] tabular-nums">{takenDown}</TableCell>
      <TableCell className="text-[12px] tabular-nums">{remaining}</TableCell>
      <TableCell className="text-[12px] font-semibold tabular-nums">{formatCurrency(a.total_price)}</TableCell>
      <TableCell><Badge variant={BS_V[a.status] ?? "gray"} className="text-[10px]">{a.status}</Badge></TableCell>
    </TableRow>
  )
}

function TakedownTimeline({ agreement }: { agreement: BulkSaleDetail }) {
  const { data: takedowns, isLoading } = useTakedownSchedule(agreement.id)
  if (isLoading) return <Skeleton className="mb-3 h-32 w-full" />
  if (!takedowns?.length) return <p className="mb-3 text-[12px] text-[#9CA3AF]">No takedowns for {agreement.buyer_entity_name}</p>

  const chartData = takedowns.map((t) => ({
    name: `TD #${t.takedown_number}`,
    scheduled: t.scheduled_amount ?? 0,
    actual: t.actual_amount ?? 0,
    isUpcoming: t.status === "scheduled" || t.status === "upcoming",
  }))

  return (
    <div className="mb-4">
      <p className="mb-2 text-[12px] font-medium text-[#5A6B75]">{agreement.buyer_entity_name}</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <RechartsTooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="scheduled" name="Scheduled" fill="#93c5fd" radius={[0, 2, 2, 0]} />
          <Bar dataKey="actual" name="Actual" radius={[0, 2, 2, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.isUpcoming ? "#fcd34d" : "#1a5632"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
