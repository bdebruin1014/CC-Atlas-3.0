"use client"

import { useMemo } from "react"
import { DollarSign, AlertTriangle } from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ARInvoice } from "@/lib/construction/accounting-types"
import {
  AR_INVOICE_STATUS_CONFIG,
  AGING_BUCKET_CONFIG,
  getAgingBucket,
  type AgingBucket,
  type ARInvoiceStatus,
} from "@/lib/construction/accounting-types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ARAgingProps {
  invoices: ARInvoice[]
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ClientGroup {
  clientName: string
  invoices: ARInvoice[]
  totalDue: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function computeDaysOutstanding(dueDate: string): number {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = Math.floor(
    (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
  )
  return Math.max(diff, 0)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ARAgingReport({ invoices }: ARAgingProps) {
  // Compute aging buckets
  const bucketTotals = useMemo(() => {
    const totals: Record<AgingBucket, number> = {
      current: 0,
      "1-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    }
    invoices
      .filter((inv) => !["paid", "written_off"].includes(inv.status))
      .forEach((inv) => {
        const days = computeDaysOutstanding(inv.due_date)
        const bucket = getAgingBucket(days)
        totals[bucket] += inv.balance_due
      })
    return totals
  }, [invoices])

  const totalOutstanding = useMemo(() => {
    return invoices
      .filter((inv) => !["paid", "written_off"].includes(inv.status))
      .reduce((sum, inv) => sum + inv.balance_due, 0)
  }, [invoices])

  // Group by client
  const clientGroups = useMemo((): ClientGroup[] => {
    const map = new Map<string, ClientGroup>()
    invoices
      .filter((inv) => !["paid", "written_off"].includes(inv.status))
      .forEach((inv) => {
        const clientKey = inv.client_entity?.name ?? inv.client_entity_id ?? "Unknown"
        const existing = map.get(clientKey)
        if (existing) {
          existing.invoices.push(inv)
          existing.totalDue += inv.balance_due
        } else {
          map.set(clientKey, {
            clientName: clientKey,
            invoices: [inv],
            totalDue: inv.balance_due,
          })
        }
      })
    return Array.from(map.values()).sort((a, b) => b.totalDue - a.totalDue)
  }, [invoices])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="col-span-1">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="text-xl font-bold">
              {formatCurrency(totalOutstanding, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
        {(Object.entries(AGING_BUCKET_CONFIG) as [AgingBucket, typeof AGING_BUCKET_CONFIG[AgingBucket]][]).map(
          ([bucket, cfg]) => (
            <Card key={bucket}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
                <p className={cn("text-xl font-bold", cfg.color)}>
                  {formatCurrency(bucketTotals[bucket], { decimals: 2 })}
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Client Groups */}
      {clientGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <DollarSign className="h-10 w-10 mb-2 opacity-40" />
          <p>No outstanding AR invoices.</p>
        </div>
      ) : (
        clientGroups.map((group) => (
          <Card key={group.clientName}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {group.clientName}
                </CardTitle>
                <span className="text-lg font-bold">
                  {formatCurrency(group.totalDue, { decimals: 2 })}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.invoices
                    .sort(
                      (a, b) =>
                        computeDaysOutstanding(b.due_date) -
                        computeDaysOutstanding(a.due_date)
                    )
                    .map((inv) => {
                      const days = computeDaysOutstanding(inv.due_date)
                      const bucket = getAgingBucket(days)
                      const bucketCfg = AGING_BUCKET_CONFIG[bucket]
                      const statusCfg = AR_INVOICE_STATUS_CONFIG[inv.status]

                      return (
                        <TableRow key={inv.id}>
                          <TableCell>{inv.job?.name ?? "—"}</TableCell>
                          <TableCell className="font-medium">
                            {inv.invoice_number}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(inv.balance_due, { decimals: 2 })}
                          </TableCell>
                          <TableCell>
                            {formatDate(inv.due_date, { short: true })}
                          </TableCell>
                          <TableCell>
                            {days > 0 ? (
                              <Badge
                                className={cn(
                                  "text-xs border-0",
                                  bucketCfg.bgColor,
                                  bucketCfg.color
                                )}
                              >
                                {days} days
                              </Badge>
                            ) : (
                              <span className="text-xs text-green-600 font-medium">
                                Current
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-xs border-0",
                                statusCfg.bgColor,
                                statusCfg.color
                              )}
                            >
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Overdue Warning */}
      {(bucketTotals["61-90"] > 0 || bucketTotals["90+"] > 0) && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">
              Severely Past Due Receivables
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {formatCurrency(bucketTotals["61-90"] + bucketTotals["90+"], {
                decimals: 2,
              })}{" "}
              in receivables are more than 60 days past due. Follow up with
              clients to collect outstanding balances.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
