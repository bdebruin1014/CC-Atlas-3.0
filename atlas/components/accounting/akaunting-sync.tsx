"use client"

import { useState, useMemo } from "react"
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Loader2,
  Cloud,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface AkauntingSyncProps {
  syncStatus: any
  mappings: any[]
  onSync: () => void
  onUpdateMapping: (atlasId: string, akauntingId: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSyncStatusIndicator(status: string): {
  icon: typeof CheckCircle2
  color: string
  label: string
} {
  switch (status) {
    case "connected":
    case "synced":
      return {
        icon: CheckCircle2,
        color: "text-green-600",
        label: "Connected",
      }
    case "syncing":
      return { icon: RefreshCw, color: "text-blue-600", label: "Syncing..." }
    case "error":
      return { icon: XCircle, color: "text-red-600", label: "Error" }
    case "disconnected":
      return {
        icon: AlertTriangle,
        color: "text-yellow-600",
        label: "Disconnected",
      }
    default:
      return { icon: Clock, color: "text-muted-foreground", label: "Unknown" }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AkauntingSync({
  syncStatus,
  mappings,
  onSync,
  onUpdateMapping,
}: AkauntingSyncProps) {
  const [syncing, setSyncing] = useState(false)

  const statusInfo = useMemo(
    () => getSyncStatusIndicator(syncStatus?.status ?? "disconnected"),
    [syncStatus]
  )

  const pendingCount = syncStatus?.pending_count ?? 0
  const lastSyncDate = syncStatus?.last_sync_date ?? null
  const syncHistory = syncStatus?.history ?? []
  const akauntingAccounts = syncStatus?.akaunting_accounts ?? []

  const handleSync = async () => {
    setSyncing(true)
    try {
      onSync()
    } finally {
      // Reset after a brief delay to show the animation
      setTimeout(() => setSyncing(false), 1500)
    }
  }

  const StatusIcon = statusInfo.icon

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-5 w-5 text-muted-foreground" />
              Akaunting Integration
            </CardTitle>
            <Button
              onClick={handleSync}
              disabled={syncing}
              size="sm"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
              <StatusIcon className={cn("h-5 w-5", statusInfo.color)} />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={cn("text-sm font-medium", statusInfo.color)}>
                  {statusInfo.label}
                </p>
              </div>
            </div>

            {/* Last Sync */}
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Last Sync</p>
              <p className="text-sm font-medium">
                {lastSyncDate
                  ? formatDate(lastSyncDate, { includeTime: true })
                  : "Never"}
              </p>
            </div>

            {/* Pending */}
            <div
              className={cn(
                "rounded-md p-3",
                pendingCount > 0
                  ? "bg-yellow-50 dark:bg-yellow-950/30"
                  : "bg-muted/50"
              )}
            >
              <p className="text-xs text-muted-foreground">
                Pending Transactions
              </p>
              <p
                className={cn(
                  "text-sm font-medium",
                  pendingCount > 0 && "text-yellow-700"
                )}
              >
                {pendingCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Warning */}
      {pendingCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-700">
              {pendingCount} Transaction{pendingCount !== 1 ? "s" : ""} Pending
              Sync
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              These transactions have been recorded in Atlas but have not yet
              been synced to Akaunting. Click &quot;Sync Now&quot; to push
              changes.
            </p>
          </div>
        </div>
      )}

      {/* Account Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No account mappings configured
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atlas Account #</TableHead>
                    <TableHead>Atlas Name</TableHead>
                    <TableHead className="w-[40px] text-center" />
                    <TableHead>Akaunting Account</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping: any) => (
                    <TableRow key={mapping.atlas_id ?? mapping.account_number}>
                      <TableCell className="font-mono text-sm">
                        {mapping.account_number ?? mapping.atlas_id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {mapping.atlas_name ?? mapping.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={
                            mapping.akaunting_id ?? mapping.mapped_to ?? ""
                          }
                          onValueChange={(value) =>
                            onUpdateMapping(
                              mapping.atlas_id ?? mapping.account_number,
                              value
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select account..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unmapped">
                              <span className="text-muted-foreground">
                                Unmapped
                              </span>
                            </SelectItem>
                            {akauntingAccounts.map((acct: any) => (
                              <SelectItem
                                key={acct.id}
                                value={String(acct.id)}
                              >
                                {acct.number
                                  ? `${acct.number} - ${acct.name}`
                                  : acct.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          {syncHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No sync history available
            </p>
          ) : (
            <div className="space-y-2">
              {syncHistory
                .slice(0, 10)
                .map((entry: any, idx: number) => {
                  const hasErrors =
                    entry.errors != null && entry.errors > 0
                  return (
                    <div
                      key={entry.id ?? idx}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2",
                        hasErrors
                          ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                          : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {hasErrors ? (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {formatDate(entry.date ?? entry.synced_at, {
                              includeTime: true,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.synced_count ?? entry.count ?? 0} transaction
                            {(entry.synced_count ?? entry.count ?? 0) !== 1
                              ? "s"
                              : ""}{" "}
                            synced
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasErrors && (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800 text-[10px]"
                          >
                            {entry.errors} error
                            {entry.errors !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {!hasErrors && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 text-[10px]"
                          >
                            Success
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
