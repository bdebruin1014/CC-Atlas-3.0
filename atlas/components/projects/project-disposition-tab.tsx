"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCommunityStats, useBulkSaleAgreements, useTakedownSchedule, type BulkSaleDetail } from "@/lib/hooks/use-disposition"
import { formatCurrency, formatPercent } from "@/lib/utils/format"
import { ExternalLink, Home, FileText } from "lucide-react"

const BS_V: Record<string, "warning" | "blue" | "success" | "error" | "gray"> = {
  negotiating: "warning", active: "blue", complete: "success", terminated: "error",
}

export function ProjectDispositionTab({ projectId, projectType, budgetTotal }: {
  projectId: string; projectType: string; budgetTotal?: number | null
}) {
  const { data: stats, isLoading } = useCommunityStats(projectId)
  const isLotDev = projectType === "lot_development"

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    )
  }

  if (!stats || stats.total_units === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Home className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="mb-1 text-sm font-semibold">No listings linked to this project</h3>
          <p className="mb-4 text-xs text-muted-foreground">Create listings in Disposition to see sales data here.</p>
          <Link href="/disposition">
            <Button size="sm" variant="outline"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Go to Disposition</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const target = (budgetTotal ?? (stats.total_revenue + stats.pending_revenue)) || 1
  const pctToTarget = ((stats.total_revenue + stats.pending_revenue) / target) * 100

  return (
    <div className="space-y-4">
      {isLotDev ? (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="bulk-sales">Bulk Sales</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="mt-4"><SummaryGrid stats={stats} target={target} pctToTarget={pctToTarget} projectId={projectId} /></TabsContent>
          <TabsContent value="bulk-sales" className="mt-4"><BulkSalesSection projectId={projectId} /></TabsContent>
        </Tabs>
      ) : (
        <SummaryGrid stats={stats} target={target} pctToTarget={pctToTarget} projectId={projectId} />
      )}
    </div>
  )
}

function SummaryGrid({ stats, target, pctToTarget, projectId }: {
  stats: { total_units: number; contracted: number; sold: number; remaining: number; total_revenue: number; pending_revenue: number }
  target: number; pctToTarget: number; projectId: string
}) {
  const items = [
    { label: "Total Units", value: String(stats.total_units) },
    { label: "Contracted", value: String(stats.contracted) },
    { label: "Sold", value: String(stats.sold) },
    { label: "Remaining", value: String(stats.remaining) },
    { label: "Revenue Received", value: formatCurrency(stats.total_revenue, { compact: true }) },
    { label: "Revenue Pending", value: formatCurrency(stats.pending_revenue, { compact: true }) },
    { label: "Target", value: formatCurrency(target, { compact: true }) },
    { label: "% to Target", value: formatPercent(pctToTarget, 1) },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end">
        <Link href={`/disposition/community/${projectId}`}>
          <Button variant="outline" size="sm"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />View Full Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}

function BulkSalesSection({ projectId }: { projectId: string }) {
  const { data: agreements, isLoading } = useBulkSaleAgreements(projectId)

  if (isLoading) return <Skeleton className="h-32 w-full" />
  if (!agreements?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No bulk sale agreements for this project</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader><TableRow>
          {["Buyer", "Total Lots", "Price/Lot", "Total Value", "Status"].map((h) => (
            <TableHead key={h} className="text-[11px] uppercase">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {agreements.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-[13px] font-medium">{a.buyer_entity_name || "—"}</TableCell>
              <TableCell className="text-[13px] tabular-nums">{a.total_lots ?? 0}</TableCell>
              <TableCell className="text-[13px] tabular-nums">{formatCurrency(a.price_per_lot)}</TableCell>
              <TableCell className="text-[13px] font-semibold tabular-nums">{formatCurrency(a.total_price)}</TableCell>
              <TableCell><Badge variant={BS_V[a.status] ?? "gray"}>{a.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {agreements.filter((a) => a.status === "active").map((a) => (
        <TakedownSummary key={a.id} agreement={a} />
      ))}
    </div>
  )
}

function TakedownSummary({ agreement }: { agreement: BulkSaleDetail }) {
  const { data: takedowns } = useTakedownSchedule(agreement.id)
  if (!takedowns?.length) return null

  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-2 text-[12px] font-semibold text-muted-foreground">{agreement.buyer_entity_name} — Takedown Schedule</p>
        <div className="flex flex-wrap gap-2">
          {takedowns.map((t) => (
            <div key={t.id} className={`rounded border px-2 py-1 text-[11px] ${
              t.status === "completed" ? "border-green-300 bg-green-50 text-green-700" :
              t.status === "upcoming" ? "border-amber-300 bg-amber-50 text-amber-700" :
              "border-gray-200 bg-gray-50 text-gray-600"
            }`}>
              #{t.takedown_number} · {t.lots_count ?? 0} lots · {formatCurrency(t.scheduled_amount, { compact: true })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
