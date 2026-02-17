"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ListingDetail } from "@/lib/hooks/use-disposition"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { ArrowUpDown, Download } from "lucide-react"

const SV: Record<string, "gray" | "blue" | "warning" | "success" | "error"> = {
  draft: "gray", pre_listing: "gray", active: "blue", under_contract: "warning",
  pending_closing: "warning", closed: "success", withdrawn: "error", expired: "gray",
}

function exportCSV(listings: ListingDetail[]) {
  const header = ["Unit/Lot", "Status", "List Price", "Sale Price", "Buyer", "Agent", "DOM", "Closing Date"]
  const rows = listings.map((l) => [
    l.property_address ?? l.listing_number ?? "", l.status,
    l.original_list_price ?? "", l.list_price ?? "",
    "", // buyer from contract not available at list level
    l.listing_agent ? `${l.listing_agent.first_name} ${l.listing_agent.last_name}` : "",
    l.dom ?? "", "",
  ])
  const csv = [header.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
  a.download = "community-units.csv"; a.click(); URL.revokeObjectURL(a.href)
}

// ---------------------------------------------------------------------------
// Unit Table
// ---------------------------------------------------------------------------
export function CommunityUnitTable({ listings, isLoading }: {
  listings: ListingDetail[]; isLoading: boolean
}) {
  const [sortKey, setSortKey] = useState<string>("property_address")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const toggle = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const sorted = useMemo(() => {
    if (!listings.length) return []
    return [...listings].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey] ?? ""
      const bv = (b as unknown as Record<string, unknown>)[sortKey] ?? ""
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [listings, sortKey, sortDir])

  if (isLoading) return <Skeleton className="h-48 w-full rounded-lg" />
  if (!listings.length) return null

  const cols: { key: string; label: string }[] = [
    { key: "property_address", label: "Unit/Lot" }, { key: "status", label: "Status" },
    { key: "original_list_price", label: "List Price" }, { key: "list_price", label: "Sale Price" },
    { key: "listing_agent", label: "Agent" }, { key: "dom", label: "DOM" },
  ]

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[#1F2937]">Unit Table</h3>
        <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => exportCSV(listings)}>
          <Download className="mr-1 h-3 w-3" />Export CSV
        </Button>
      </div>
      <div className="max-h-[400px] overflow-auto">
        <Table>
          <TableHeader><TableRow className="bg-[#F3F4F6]">
            {cols.map((c) => (
              <TableHead key={c.key} className="cursor-pointer select-none text-[11px] uppercase tracking-wide" onClick={() => toggle(c.key)}>
                <span className="flex items-center gap-1">{c.label}<ArrowUpDown className="h-3 w-3 text-[#9CA3AF]" /></span>
              </TableHead>
            ))}
          </TableRow></TableHeader>
          <TableBody>
            {sorted.map((l) => (
              <TableRow key={l.id} className="h-9 hover:bg-[#f9fafb]">
                <TableCell className="text-[12px]"><Link href={`/disposition/${l.id}`} className="font-medium text-[#2563eb] hover:underline">{l.property_address ?? l.listing_number ?? "—"}</Link></TableCell>
                <TableCell><Badge variant={SV[l.status] ?? "gray"} className="text-[10px]">{l.status.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell className="text-[12px] tabular-nums">{formatCurrency(l.original_list_price)}</TableCell>
                <TableCell className="text-[12px] tabular-nums">{l.status === "closed" ? formatCurrency(l.list_price) : "—"}</TableCell>
                <TableCell className="text-[12px]">{l.listing_agent ? `${l.listing_agent.first_name} ${l.listing_agent.last_name}` : "—"}</TableCell>
                <TableCell className="text-[12px] tabular-nums">{l.dom ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Agent Performance
// ---------------------------------------------------------------------------
export function AgentPerformanceTable({ listings, isLoading }: {
  listings: ListingDetail[]; isLoading: boolean
}) {
  const agents = useMemo(() => {
    if (!listings.length) return []
    const map = new Map<string, { name: string; listings: number; showings: number; offers: number; closed: number; domSum: number; domCount: number; volume: number }>()
    for (const l of listings) {
      const name = l.listing_agent ? `${l.listing_agent.first_name} ${l.listing_agent.last_name}` : "Unassigned"
      const key = l.listing_agent?.id ?? "unassigned"
      if (!map.has(key)) map.set(key, { name, listings: 0, showings: 0, offers: 0, closed: 0, domSum: 0, domCount: 0, volume: 0 })
      const a = map.get(key)!
      a.listings++; a.showings += l.showings_count; a.offers += l.offers_count
      if (l.status === "closed") { a.closed++; a.volume += l.list_price ?? 0 }
      if (l.dom != null) { a.domSum += l.dom; a.domCount++ }
    }
    return [...map.values()].sort((a, b) => b.volume - a.volume)
  }, [listings])

  if (isLoading || agents.length <= 1) return null

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <h3 className="mb-3 text-[13px] font-semibold text-[#1F2937]">Agent Performance</h3>
      <Table>
        <TableHeader><TableRow className="bg-[#F3F4F6]">
          {["Agent", "Listings", "Showings", "Offers", "Closed", "Avg DOM", "Volume"].map((h) => (
            <TableHead key={h} className="text-[11px] uppercase tracking-wide">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {agents.map((a) => (
            <TableRow key={a.name} className="h-9">
              <TableCell className="text-[12px] font-medium">{a.name}</TableCell>
              <TableCell className="text-[12px] tabular-nums">{a.listings}</TableCell>
              <TableCell className="text-[12px] tabular-nums">{a.showings}</TableCell>
              <TableCell className="text-[12px] tabular-nums">{a.offers}</TableCell>
              <TableCell className="text-[12px] tabular-nums">{a.closed}</TableCell>
              <TableCell className="text-[12px] tabular-nums">{a.domCount ? Math.round(a.domSum / a.domCount) : "—"}</TableCell>
              <TableCell className="text-[12px] font-semibold tabular-nums">{formatCurrency(a.volume)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
