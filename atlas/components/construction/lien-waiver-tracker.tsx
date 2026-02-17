"use client"

import { useMemo } from "react"
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  FileWarning,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface LienWaiverTrackerProps {
  entries: RetainageEntry[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const WAIVER_STATUS_CONFIG: Record<
  LienWaiverStatus,
  {
    label: string
    icon: typeof ShieldCheck
    color: string
    bgColor: string
  }
> = {
  not_received: {
    label: "Not Received",
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function LienWaiverTracker({ entries }: LienWaiverTrackerProps) {
  // Summary counts
  const summary = useMemo(() => {
    const counts: Record<LienWaiverStatus, number> = {
      not_received: 0,
      conditional: 0,
      unconditional: 0,
    }
    entries.forEach((e) => {
      counts[e.lien_waiver_status]++
    })
    return counts
  }, [entries])

  const missingEntries = useMemo(() => {
    return entries.filter((e) => e.lien_waiver_status === "not_received")
  }, [entries])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.entries(WAIVER_STATUS_CONFIG) as [
          LienWaiverStatus,
          typeof WAIVER_STATUS_CONFIG[LienWaiverStatus],
        ][]).map(([status, cfg]) => {
          const Icon = cfg.icon
          return (
            <Card key={status}>
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    cfg.bgColor
                  )}
                >
                  <Icon className={cn("h-5 w-5", cfg.color)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  <p className={cn("text-2xl font-bold", cfg.color)}>
                    {summary[status]}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Missing Waiver Alert */}
      {missingEntries.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">
              {missingEntries.length} Missing Lien Waiver{missingEntries.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              The following vendors have not submitted lien waivers. Retainage
              release is blocked until unconditional waivers are received.
            </p>
          </div>
        </div>
      )}

      {/* Waiver Status Table */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileWarning className="h-10 w-10 mb-2 opacity-40" />
          <p>No lien waiver entries found.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>PO #</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead className="text-right">Retainage Held</TableHead>
              <TableHead>Release Date</TableHead>
              <TableHead>Conditional Status</TableHead>
              <TableHead>Unconditional Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries
              .sort((a, b) => {
                // Sort missing waivers first
                const order: Record<LienWaiverStatus, number> = {
                  not_received: 0,
                  conditional: 1,
                  unconditional: 2,
                }
                return (
                  order[a.lien_waiver_status] - order[b.lien_waiver_status]
                )
              })
              .map((entry) => {
                const waiverCfg = WAIVER_STATUS_CONFIG[entry.lien_waiver_status]
                const WaiverIcon = waiverCfg.icon

                // Determine conditional and unconditional status independently
                const isConditional =
                  entry.lien_waiver_status === "conditional" ||
                  entry.lien_waiver_status === "unconditional"
                const isUnconditional =
                  entry.lien_waiver_status === "unconditional"

                return (
                  <TableRow
                    key={entry.id}
                    className={cn(
                      entry.lien_waiver_status === "not_received" &&
                        "bg-red-50/50 dark:bg-red-950/20"
                    )}
                  >
                    <TableCell className="font-medium">
                      {entry.vendor?.company_name ?? "Unknown"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.po?.po_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.invoice_id}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(entry.amount_held, { decimals: 2 })}
                    </TableCell>
                    <TableCell>
                      {entry.release_date
                        ? formatDate(entry.release_date, { short: true })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {isConditional ? (
                        <Badge className="text-xs border-0 bg-green-100 text-green-700 gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Received
                        </Badge>
                      ) : (
                        <Badge className="text-xs border-0 bg-red-100 text-red-700 gap-1">
                          <ShieldX className="h-3 w-3" />
                          Missing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isUnconditional ? (
                        <Badge className="text-xs border-0 bg-green-100 text-green-700 gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Received
                        </Badge>
                      ) : isConditional ? (
                        <Badge className="text-xs border-0 bg-yellow-100 text-yellow-700 gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge className="text-xs border-0 bg-red-100 text-red-700 gap-1">
                          <ShieldX className="h-3 w-3" />
                          Missing
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
