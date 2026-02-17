"use client"

import { useState, useMemo } from "react"
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Unlock,
  AlertTriangle,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  RetainageEntry,
  LienWaiverStatus,
} from "@/lib/construction/accounting-types"
import type { JobStatus } from "@/lib/construction/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface RetainageTrackerProps {
  entries: RetainageEntry[]
  onRelease: (entryIds: string[]) => void
  jobStatus: JobStatus
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const WAIVER_CONFIG: Record<
  LienWaiverStatus,
  { label: string; icon: typeof ShieldCheck; color: string; bgColor: string }
> = {
  not_received: {
    label: "Missing",
    icon: ShieldX,
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  conditional: {
    label: "Conditional",
    icon: ShieldAlert,
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  unconditional: {
    label: "Unconditional",
    icon: ShieldCheck,
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
}

interface VendorRow {
  vendorId: string
  vendorName: string
  entries: RetainageEntry[]
  totalHeld: number
  totalReleased: number
  balance: number
  worstWaiverStatus: LienWaiverStatus
}

function worstWaiver(entries: RetainageEntry[]): LienWaiverStatus {
  if (entries.some((e) => e.lien_waiver_status === "not_received"))
    return "not_received"
  if (entries.some((e) => e.lien_waiver_status === "conditional"))
    return "conditional"
  return "unconditional"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function RetainageTracker({
  entries,
  onRelease,
  jobStatus,
}: RetainageTrackerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Group entries by vendor
  const vendorRows = useMemo((): VendorRow[] => {
    const map = new Map<string, VendorRow>()
    entries.forEach((entry) => {
      const vid = entry.vendor_contact_id
      const existing = map.get(vid)
      if (existing) {
        existing.entries.push(entry)
        existing.totalHeld += entry.amount_held
        existing.totalReleased += entry.amount_released
        existing.balance += entry.amount_held - entry.amount_released
      } else {
        map.set(vid, {
          vendorId: vid,
          vendorName: entry.vendor?.company_name ?? "Unknown Vendor",
          entries: [entry],
          totalHeld: entry.amount_held,
          totalReleased: entry.amount_released,
          balance: entry.amount_held - entry.amount_released,
          worstWaiverStatus: "unconditional",
        })
      }
    })
    // Compute worst waiver status per vendor
    map.forEach((row) => {
      row.worstWaiverStatus = worstWaiver(row.entries)
    })
    return Array.from(map.values()).sort((a, b) =>
      a.vendorName.localeCompare(b.vendorName)
    )
  }, [entries])

  // Summary totals
  const totals = useMemo(() => {
    return {
      held: entries.reduce((s, e) => s + e.amount_held, 0),
      released: entries.reduce((s, e) => s + e.amount_released, 0),
      balance: entries.reduce(
        (s, e) => s + (e.amount_held - e.amount_released),
        0
      ),
    }
  }, [entries])

  // Can release: job must be completed or closed AND waiver must be unconditional
  function canRelease(entry: RetainageEntry): boolean {
    if (entry.status === "released") return false
    if (
      jobStatus !== "completed" &&
      jobStatus !== "closed" &&
      entry.lien_waiver_status !== "unconditional"
    )
      return false
    return entry.lien_waiver_status === "unconditional"
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const releasableSelected = Array.from(selectedIds).filter((id) => {
    const entry = entries.find((e) => e.id === id)
    return entry ? canRelease(entry) : false
  })

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Held</p>
            <p className="text-xl font-bold">
              {formatCurrency(totals.held, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Released</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(totals.released, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Balance Outstanding</p>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(totals.balance, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Batch Release */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium">
            {selectedIds.size} entr{selectedIds.size > 1 ? "ies" : "y"} selected
          </span>
          {releasableSelected.length < selectedIds.size && (
            <span className="text-xs text-muted-foreground">
              ({selectedIds.size - releasableSelected.length} not eligible)
            </span>
          )}
          <Button
            size="sm"
            onClick={() => {
              onRelease(releasableSelected)
              setSelectedIds(new Set())
            }}
            disabled={releasableSelected.length === 0}
          >
            <Unlock className="mr-1.5 h-3.5 w-3.5" />
            Release Selected ({releasableSelected.length})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      {vendorRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ShieldCheck className="h-10 w-10 mb-2 opacity-40" />
          <p>No retainage entries found.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Vendor</TableHead>
              <TableHead>PO #</TableHead>
              <TableHead className="text-right">Total Held</TableHead>
              <TableHead className="text-right">Released</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Lien Waiver</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendorRows.map((vendor) =>
              vendor.entries.map((entry) => {
                const balance = entry.amount_held - entry.amount_released
                const waiverCfg = WAIVER_CONFIG[entry.lien_waiver_status]
                const WaiverIcon = waiverCfg.icon
                const isReleasable = canRelease(entry)
                const isSelected = selectedIds.has(entry.id)

                return (
                  <TableRow
                    key={entry.id}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(entry.id)}
                        aria-label={`Select retainage for ${vendor.vendorName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {vendor.vendorName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.po?.po_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entry.amount_held, { decimals: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(entry.amount_released, { decimals: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(balance, { decimals: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-xs border-0 gap-1",
                          waiverCfg.bgColor,
                          waiverCfg.color
                        )}
                      >
                        <WaiverIcon className="h-3 w-3" />
                        {waiverCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.status === "released" ? (
                        <Badge className="text-xs border-0 bg-green-100 text-green-700">
                          Released
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRelease([entry.id])}
                          disabled={!isReleasable}
                          title={
                            !isReleasable
                              ? "Unconditional lien waiver required"
                              : "Release retainage"
                          }
                        >
                          <Unlock className="mr-1.5 h-3.5 w-3.5" />
                          Release
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
            {/* Totals row */}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell />
              <TableCell>Totals</TableCell>
              <TableCell />
              <TableCell className="text-right">
                {formatCurrency(totals.held, { decimals: 2 })}
              </TableCell>
              <TableCell className="text-right text-green-600">
                {formatCurrency(totals.released, { decimals: 2 })}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.balance, { decimals: 2 })}
              </TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      )}

      {/* Missing waiver alert */}
      {entries.some((e) => e.lien_waiver_status === "not_received") && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">
              Missing Lien Waivers
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {entries.filter((e) => e.lien_waiver_status === "not_received").length}{" "}
              vendor(s) have not submitted lien waivers. Retainage cannot be
              released without an unconditional lien waiver on file.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
