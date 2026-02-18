"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  Lock,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { Entity, AccountingPeriod, PeriodStatus } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBadge(status: PeriodStatus) {
  switch (status) {
    case "open":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Open</Badge>
    case "in_review":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">In Review</Badge>
    case "closed":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Closed</Badge>
    case "locked":
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100">Locked</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getStatusColor(status: PeriodStatus): string {
  switch (status) {
    case "open": return "bg-green-100 text-green-800 border-green-200"
    case "in_review": return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "closed": return "bg-blue-100 text-blue-800 border-blue-200"
    case "locked": return "bg-gray-100 text-gray-600 border-gray-200"
    default: return "bg-gray-50 text-gray-500 border-gray-200"
  }
}

function generatePeriods(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`)
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PeriodClosePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [entities, setEntities] = useState<Entity[]>([])
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [closingPeriod, setClosingPeriod] = useState<{ entityId: string; entityName: string; period: string; currentStatus: PeriodStatus } | null>(null)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const monthPeriods = useMemo(() => generatePeriods(selectedYear), [selectedYear])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const supabase = createClient()

      const { data: entityData } = await supabase
        .from("entities")
        .select("*")
        .eq("status", "active")
        .order("name")
      if (entityData) setEntities(entityData as unknown as Entity[])

      const { data: periodData } = await supabase
        .from("accounting_periods")
        .select("*")
        .gte("period", `${selectedYear}-01`)
        .lte("period", `${selectedYear}-12`)
      if (periodData) setPeriods(periodData as AccountingPeriod[])

      setLoading(false)
    }
    loadData()
  }, [selectedYear])

  // Get period status for entity + period combo
  const getPeriodStatus = (entityId: string, period: string): PeriodStatus => {
    const found = periods.find((p) => p.entity_id === entityId && p.period === period)
    return found?.status || "open"
  }

  const getPeriodRecord = (entityId: string, period: string): AccountingPeriod | undefined => {
    return periods.find((p) => p.entity_id === entityId && p.period === period)
  }

  // Period actions
  const handlePeriodAction = (
    entityId: string,
    entityName: string,
    period: string
  ) => {
    const currentStatus = getPeriodStatus(entityId, period)
    setClosingPeriod({ entityId, entityName, period, currentStatus })
    setShowCloseDialog(true)
  }

  const updatePeriodStatus = async (
    entityId: string,
    period: string,
    newStatus: PeriodStatus
  ) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()

    const existingRecord = getPeriodRecord(entityId, period)

    const updates: Record<string, any> = { status: newStatus }
    if (newStatus === "in_review") {
      updates.reviewed_by = user?.id
      updates.reviewed_at = now
    } else if (newStatus === "closed") {
      updates.closed_by = user?.id
      updates.closed_at = now
    } else if (newStatus === "locked") {
      updates.locked_by = user?.id
      updates.locked_at = now
    }

    if (existingRecord) {
      const { error } = await supabase
        .from("accounting_periods")
        .update(updates)
        .eq("id", existingRecord.id)

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" })
        return
      }

      setPeriods((prev) =>
        prev.map((p) =>
          p.id === existingRecord.id ? { ...p, ...updates } : p
        )
      )
    } else {
      const { data, error } = await supabase
        .from("accounting_periods")
        .insert({
          entity_id: entityId,
          period,
          ...updates,
        })
        .select()
        .single()

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" })
        return
      }

      if (data) {
        setPeriods((prev) => [...prev, data as AccountingPeriod])
      }
    }

    toast({
      title: `Period ${newStatus}`,
      description: `${period} has been marked as ${newStatus}.`,
    })
    setShowCloseDialog(false)
  }

  // Bulk close all entities for a period
  const handleBulkClose = async (period: string, targetStatus: PeriodStatus) => {
    for (const entity of entities) {
      const currentStatus = getPeriodStatus(entity.id, period)
      // Only advance status, never go backwards
      const statusOrder: PeriodStatus[] = ["open", "in_review", "closed", "locked"]
      const currentIdx = statusOrder.indexOf(currentStatus)
      const targetIdx = statusOrder.indexOf(targetStatus)
      if (targetIdx > currentIdx) {
        await updatePeriodStatus(entity.id, period, targetStatus)
      }
    }
    toast({
      title: "Bulk update complete",
      description: `All entities updated to ${targetStatus} for ${period}.`,
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Period Close</h1>
          <p className="text-sm text-muted-foreground">
            Manage accounting period status for all entities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg min-w-[60px] text-center">{selectedYear}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear((y) => y + 1)}
            disabled={selectedYear >= currentYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-green-100 border border-green-200" />
          <span>Open</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-yellow-100 border border-yellow-200" />
          <span>In Review</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-blue-100 border border-blue-200" />
          <span>Closed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-gray-100 border border-gray-200" />
          <span>Locked</span>
        </div>
      </div>

      {/* Period Grid */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : entities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No active entities</h3>
            <p className="text-sm text-muted-foreground">
              Add entities to manage period close.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground sticky left-0 bg-muted/50 min-w-[200px]">
                    Entity
                  </th>
                  {MONTHS.map((month, idx) => (
                    <th key={idx} className="px-2 py-2 text-center font-medium text-muted-foreground min-w-[70px]">
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entities.map((entity) => (
                  <tr key={entity.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium sticky left-0 bg-background">
                      <button
                        className="text-sm hover:text-primary hover:underline text-left"
                        onClick={() => router.push(`/accounting/entities/${entity.id}`)}
                      >
                        {entity.name}
                      </button>
                    </td>
                    {monthPeriods.map((period, idx) => {
                      const status = getPeriodStatus(entity.id, period)
                      return (
                        <td key={idx} className="px-1 py-1 text-center">
                          <button
                            className={cn(
                              "inline-flex items-center justify-center rounded px-2 py-1 text-[10px] font-medium border transition-colors hover:opacity-80 w-full",
                              getStatusColor(status)
                            )}
                            onClick={() => handlePeriodAction(entity.id, entity.name, period)}
                          >
                            {status === "open" && "Open"}
                            {status === "in_review" && "Review"}
                            {status === "closed" && "Closed"}
                            {status === "locked" && "Locked"}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Bulk Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk Operations</CardTitle>
          <CardDescription>
            Update all entities for a specific period at once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Period</label>
              <Select>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {monthPeriods.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date()
                const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
                handleBulkClose(currentPeriod, "in_review")
              }}
            >
              <Eye className="h-4 w-4" />
              Mark All In Review
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date()
                const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
                handleBulkClose(currentPeriod, "closed")
              }}
            >
              <CheckCircle className="h-4 w-4" />
              Close All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date()
                const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
                handleBulkClose(currentPeriod, "locked")
              }}
            >
              <Lock className="h-4 w-4" />
              Lock All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Period Close Dialog */}
      {closingPeriod && (
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Period Status Change</DialogTitle>
              <DialogDescription>
                {closingPeriod.entityName} - {closingPeriod.period}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Current Status:</span>
                {getStatusBadge(closingPeriod.currentStatus)}
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Available Actions:</p>

                {closingPeriod.currentStatus === "open" && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => updatePeriodStatus(closingPeriod.entityId, closingPeriod.period, "in_review")}
                    >
                      <Eye className="h-4 w-4 text-yellow-600" />
                      Mark for Review
                      <span className="text-xs text-muted-foreground ml-auto">
                        Prevents new transactions
                      </span>
                    </Button>
                  </div>
                )}

                {closingPeriod.currentStatus === "in_review" && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => updatePeriodStatus(closingPeriod.entityId, closingPeriod.period, "open")}
                    >
                      <XCircle className="h-4 w-4 text-gray-500" />
                      Reopen Period
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => updatePeriodStatus(closingPeriod.entityId, closingPeriod.period, "closed")}
                    >
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      Close Period
                      <span className="text-xs text-muted-foreground ml-auto">
                        No more changes allowed
                      </span>
                    </Button>
                  </div>
                )}

                {closingPeriod.currentStatus === "closed" && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => updatePeriodStatus(closingPeriod.entityId, closingPeriod.period, "in_review")}
                    >
                      <Eye className="h-4 w-4 text-yellow-600" />
                      Reopen for Review
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => updatePeriodStatus(closingPeriod.entityId, closingPeriod.period, "locked")}
                    >
                      <Lock className="h-4 w-4 text-gray-600" />
                      Lock Period
                      <span className="text-xs text-muted-foreground ml-auto">
                        Permanent - cannot be undone
                      </span>
                    </Button>
                  </div>
                )}

                {closingPeriod.currentStatus === "locked" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Lock className="h-4 w-4" />
                    This period is locked. No further changes can be made.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
