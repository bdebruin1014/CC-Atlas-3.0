"use client"

import { useState, useMemo, useCallback } from "react"
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Loader2,
  Cloud,
  CloudOff,
  Settings2,
  Link2,
  Unlink2,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
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
  onSync: (direction?: string) => void
  onUpdateMapping: (atlasId: string, akauntingId: string) => void
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SyncDirection = "push" | "pull" | "bidirectional"

const SYNC_DIRECTION_OPTIONS: {
  value: SyncDirection
  label: string
  description: string
  icon: typeof ArrowUpRight
}[] = [
  {
    value: "push",
    label: "Push to Akaunting",
    description: "Send Atlas data to Akaunting",
    icon: ArrowUpRight,
  },
  {
    value: "pull",
    label: "Pull from Akaunting",
    description: "Import Akaunting data to Atlas",
    icon: ArrowDownLeft,
  },
  {
    value: "bidirectional",
    label: "Bidirectional",
    description: "Sync both directions",
    icon: ArrowLeftRight,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSyncStatusIndicator(status: string): {
  icon: typeof CheckCircle2
  color: string
  label: string
  bgClass: string
} {
  switch (status) {
    case "connected":
    case "synced":
      return {
        icon: CheckCircle2,
        color: "text-green-600",
        label: "Connected",
        bgClass: "bg-green-50 dark:bg-green-950/30",
      }
    case "syncing":
      return {
        icon: RefreshCw,
        color: "text-blue-600",
        label: "Syncing...",
        bgClass: "bg-blue-50 dark:bg-blue-950/30",
      }
    case "error":
      return {
        icon: XCircle,
        color: "text-red-600",
        label: "Error",
        bgClass: "bg-red-50 dark:bg-red-950/30",
      }
    case "disconnected":
      return {
        icon: CloudOff,
        color: "text-yellow-600",
        label: "Disconnected",
        bgClass: "bg-yellow-50 dark:bg-yellow-950/30",
      }
    default:
      return {
        icon: Clock,
        color: "text-muted-foreground",
        label: "Unknown",
        bgClass: "bg-muted/50",
      }
  }
}

function getMappingStatusColor(mapped: boolean): string {
  return mapped
    ? "bg-green-100 text-green-800 hover:bg-green-100"
    : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SyncProgressBar({
  progress,
  syncing,
}: {
  progress: number
  syncing: boolean
}) {
  if (!syncing) return null

  return (
    <div className="space-y-2 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Sync Progress</span>
        <span className="font-medium tabular-nums">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {progress < 30
          ? "Connecting to Akaunting..."
          : progress < 60
            ? "Transferring transactions..."
            : progress < 90
              ? "Reconciling accounts..."
              : "Finalizing sync..."}
      </p>
    </div>
  )
}

function MappingStatusSummary({ mappings }: { mappings: any[] }) {
  const mapped = mappings.filter(
    (m) => m.akaunting_id || m.mapped_to
  ).length
  const unmapped = mappings.length - mapped
  const pct =
    mappings.length > 0 ? Math.round((mapped / mappings.length) * 100) : 0

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <Link2 className="h-3.5 w-3.5 text-green-600" />
        <span className="text-muted-foreground">Mapped:</span>
        <span className="font-medium">{mapped}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Unlink2 className="h-3.5 w-3.5 text-yellow-600" />
        <span className="text-muted-foreground">Unmapped:</span>
        <span className="font-medium">{unmapped}</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <Progress
          value={pct}
          className="h-1.5 w-20"
        />
        <span className="text-xs text-muted-foreground tabular-nums">
          {pct}%
        </span>
      </div>
    </div>
  )
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
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncDirection, setSyncDirection] = useState<SyncDirection>("push")
  const [mappingSearch, setMappingSearch] = useState("")

  const statusInfo = useMemo(
    () => getSyncStatusIndicator(syncStatus?.status ?? "disconnected"),
    [syncStatus]
  )

  const pendingCount = syncStatus?.pending_count ?? 0
  const lastSyncDate = syncStatus?.last_sync_date ?? null
  const syncHistory = syncStatus?.history ?? []
  const akauntingAccounts = syncStatus?.akaunting_accounts ?? []

  // Filtered mappings for search
  const filteredMappings = useMemo(() => {
    if (!mappingSearch.trim()) return mappings
    const q = mappingSearch.toLowerCase()
    return mappings.filter(
      (m: any) =>
        (m.account_number ?? m.atlas_id ?? "").toLowerCase().includes(q) ||
        (m.atlas_name ?? m.name ?? "").toLowerCase().includes(q)
    )
  }, [mappings, mappingSearch])

  // Sync history aggregates
  const historyAggregates = useMemo(() => {
    const total = syncHistory.length
    const successful = syncHistory.filter(
      (e: any) => !e.errors || e.errors === 0
    ).length
    const failed = total - successful
    const totalSynced = syncHistory.reduce(
      (sum: number, e: any) => sum + (e.synced_count ?? e.count ?? 0),
      0
    )
    const totalErrors = syncHistory.reduce(
      (sum: number, e: any) => sum + (e.errors ?? 0),
      0
    )
    return { total, successful, failed, totalSynced, totalErrors }
  }, [syncHistory])

  // Simulate sync progress
  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncProgress(0)

    // Simulate progress steps
    const steps = [10, 25, 40, 55, 70, 85, 95, 100]
    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) =>
        setTimeout(resolve, 200 + Math.random() * 300)
      )
      setSyncProgress(steps[i])
    }

    try {
      onSync(syncDirection)
    } finally {
      setTimeout(() => {
        setSyncing(false)
        setSyncProgress(0)
      }, 500)
    }
  }, [onSync, syncDirection])

  const StatusIcon = statusInfo.icon
  const isConnected =
    syncStatus?.status === "connected" || syncStatus?.status === "synced"

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-5 w-5 text-muted-foreground" />
              Akaunting Integration
            </CardTitle>
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                statusInfo.bgClass,
                statusInfo.color
              )}
            >
              <StatusIcon
                className={cn(
                  "h-3.5 w-3.5",
                  syncStatus?.status === "syncing" && "animate-spin"
                )}
              />
              {statusInfo.label}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            {/* Total Synced */}
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Total Synced</p>
              <p className="text-sm font-medium">
                {historyAggregates.totalSynced.toLocaleString()}
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

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Sync Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Direction selector */}
          <div className="space-y-2">
            <Label className="text-sm">Sync Direction</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SYNC_DIRECTION_OPTIONS.map((opt) => {
                const DirIcon = opt.icon
                const selected = syncDirection === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSyncDirection(opt.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-3 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <DirIcon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selected ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          selected && "text-primary"
                        )}
                      >
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sync button + progress */}
          <div className="space-y-2">
            <Button
              onClick={handleSync}
              disabled={syncing || !isConnected}
              className="w-full sm:w-auto"
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
            {!isConnected && !syncing && (
              <p className="text-xs text-muted-foreground">
                Connect to Akaunting before syncing.
              </p>
            )}
          </div>

          {/* Progress bar */}
          <SyncProgressBar progress={syncProgress} syncing={syncing} />
        </CardContent>
      </Card>

      {/* Account Mapping Editor */}
      <Card>
        <CardHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Account Mapping</CardTitle>
              <MappingStatusSummary mappings={mappings} />
            </div>
            {/* Search */}
            {mappings.length > 5 && (
              <Input
                placeholder="Search accounts..."
                value={mappingSearch}
                onChange={(e) => setMappingSearch(e.target.value)}
                className="max-w-sm h-8 text-sm"
              />
            )}
          </div>
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
                    <TableHead className="w-[120px]">Atlas Account #</TableHead>
                    <TableHead>Atlas Name</TableHead>
                    <TableHead className="w-[40px] text-center" />
                    <TableHead>Akaunting Account</TableHead>
                    <TableHead className="w-[90px] text-center">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMappings.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-sm text-muted-foreground py-6"
                      >
                        No accounts match your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMappings.map((mapping: any) => {
                      const isMapped = !!(
                        mapping.akaunting_id ?? mapping.mapped_to
                      )
                      return (
                        <TableRow
                          key={mapping.atlas_id ?? mapping.account_number}
                          className={cn(!isMapped && "bg-yellow-50/50 dark:bg-yellow-950/10")}
                        >
                          <TableCell className="font-mono text-sm">
                            {mapping.account_number ?? mapping.atlas_id}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {mapping.atlas_name ?? mapping.name ?? "\u2014"}
                          </TableCell>
                          <TableCell className="text-center">
                            <ArrowRight
                              className={cn(
                                "h-4 w-4 mx-auto",
                                isMapped
                                  ? "text-green-500"
                                  : "text-muted-foreground"
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={
                                mapping.akaunting_id ??
                                mapping.mapped_to ??
                                ""
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
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                getMappingStatusColor(isMapped)
                              )}
                            >
                              {isMapped ? "Mapped" : "Unmapped"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aggregate stats */}
          {syncHistory.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-md bg-muted/50 p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Total Syncs</p>
                <p className="text-lg font-bold tabular-nums">
                  {historyAggregates.total}
                </p>
              </div>
              <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Successful</p>
                <p className="text-lg font-bold tabular-nums text-green-600">
                  {historyAggregates.successful}
                </p>
              </div>
              <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-lg font-bold tabular-nums text-red-600">
                  {historyAggregates.failed}
                </p>
              </div>
              <div className="rounded-md bg-muted/50 p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Total Errors</p>
                <p
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    historyAggregates.totalErrors > 0 && "text-red-600"
                  )}
                >
                  {historyAggregates.totalErrors}
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* History table */}
          {syncHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No sync history available
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead className="text-right">Synced</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncHistory
                    .slice(0, 20)
                    .map((entry: any, idx: number) => {
                      const hasErrors =
                        entry.errors != null && entry.errors > 0
                      const syncedCount =
                        entry.synced_count ?? entry.count ?? 0
                      const direction =
                        entry.direction ?? entry.sync_direction ?? "push"

                      return (
                        <TableRow
                          key={entry.id ?? idx}
                          className={cn(
                            hasErrors &&
                              "bg-red-50/50 dark:bg-red-950/10"
                          )}
                        >
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(entry.date ?? entry.synced_at, {
                              includeTime: true,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize"
                            >
                              {direction === "pull" ? (
                                <ArrowDownLeft className="h-3 w-3 mr-0.5" />
                              ) : direction === "bidirectional" ? (
                                <ArrowLeftRight className="h-3 w-3 mr-0.5" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                              )}
                              {direction}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-sm">
                            {syncedCount}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-mono tabular-nums text-sm",
                              hasErrors && "text-red-600"
                            )}
                          >
                            {entry.errors ?? 0}
                          </TableCell>
                          <TableCell className="text-center">
                            {hasErrors ? (
                              <Badge
                                variant="secondary"
                                className="bg-red-100 text-red-800 text-[10px]"
                              >
                                <XCircle className="h-3 w-3 mr-0.5" />
                                Failed
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-800 text-[10px]"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                Success
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
