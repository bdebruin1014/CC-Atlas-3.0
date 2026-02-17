"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { formatDate, cn } from "@/lib/utils/format"
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react"

interface SyncStatus {
  last_sync_at: string | null
  pending_count: number
  sync_status: "idle" | "syncing" | "error" | "success"
  sync_error: string | null
}

interface AccountMapping {
  atlas_account_id: string
  atlas_account_number: string
  atlas_account_name: string
  akaunting_account_id: string
  akaunting_account_name: string
}

interface AkauntingSyncProps {
  syncStatus: SyncStatus
  mappings: AccountMapping[]
  onSync: () => void
  onUpdateMapping: (atlasId: string, akauntingId: string) => void
}

export function AkauntingSync({
  syncStatus,
  mappings,
  onSync,
  onUpdateMapping,
}: AkauntingSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await onSync()
    } finally {
      setIsSyncing(false)
    }
  }

  const statusIcon = {
    idle: <Clock className="h-4 w-4 text-muted-foreground" />,
    syncing: <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />,
    success: <CheckCircle className="h-4 w-4 text-green-600" />,
    error: <AlertCircle className="h-4 w-4 text-red-600" />,
  }

  const statusLabel = {
    idle: "Idle",
    syncing: "Syncing...",
    success: "Success",
    error: "Error",
  }

  return (
    <div className="space-y-6">
      {/* Sync Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4" />
            Akaunting Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Last Sync</p>
                <p className="text-sm font-medium">
                  {syncStatus.last_sync_at
                    ? formatDate(syncStatus.last_sync_at)
                    : "Never"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-sm font-medium">
                  {syncStatus.pending_count} transaction{syncStatus.pending_count !== 1 ? "s" : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="flex items-center gap-1.5">
                  {statusIcon[syncStatus.sync_status]}
                  <span className="text-sm font-medium">
                    {statusLabel[syncStatus.sync_status]}
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={handleSync}
              disabled={isSyncing || syncStatus.sync_status === "syncing"}
              size="sm"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>
          </div>
          {syncStatus.sync_error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{syncStatus.sync_error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Mapping</CardTitle>
          <p className="text-sm text-muted-foreground">
            Map Atlas chart of accounts to Akaunting accounts
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atlas Account #</TableHead>
                <TableHead>Atlas Account Name</TableHead>
                <TableHead className="w-10 text-center">
                  <ArrowRight className="h-4 w-4 mx-auto" />
                </TableHead>
                <TableHead>Akaunting Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.atlas_account_id}>
                  <TableCell className="font-mono text-sm">
                    {mapping.atlas_account_number}
                  </TableCell>
                  <TableCell className="text-sm">
                    {mapping.atlas_account_name}
                  </TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="h-3 w-3 mx-auto text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Input
                      defaultValue={mapping.akaunting_account_id}
                      placeholder="Akaunting Account ID"
                      className="h-8 text-sm"
                      onBlur={(e) =>
                        onUpdateMapping(mapping.atlas_account_id, e.target.value)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
              {mappings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No account mappings configured. Add mappings to enable sync.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {syncStatus.last_sync_at ? (
              <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{formatDate(syncStatus.last_sync_at)}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Completed
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sync history available
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
