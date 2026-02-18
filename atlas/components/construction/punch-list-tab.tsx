"use client"

import { useState, useMemo } from "react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Printer,
  AlertCircle,
  ChevronRight,
} from "lucide-react"
import { toast } from "@/lib/hooks/use-toast"
import {
  usePunchItems,
  useCreatePunchItem,
  useCompletePunchItem,
  useVerifyPunchItem,
  useBulkVerifyComplete,
  useStartNewRound,
  PUNCH_ROOM_CONFIG,
  PUNCH_CATEGORY_CONFIG,
  PUNCH_PRIORITY_CONFIG,
  PUNCH_STATUS_CONFIG,
} from "@/lib/hooks/use-punch-items"
import type {
  PunchItemRoom,
  PunchItemCategory,
  PunchItemPriority,
  PunchItem,
} from "@/lib/supabase/types"

interface PunchListTabProps {
  jobId: string
  unitId: string
}

export function PunchListTab({ jobId, unitId }: PunchListTabProps) {
  const [selectedRoom, setSelectedRoom] = useState<PunchItemRoom | "all">("all")
  const [addOpen, setAddOpen] = useState(false)
  const [vendorView, setVendorView] = useState(false)

  const { data: items = [], isLoading } = usePunchItems(unitId)
  const completeMutation = useCompletePunchItem()
  const verifyMutation = useVerifyPunchItem()
  const bulkVerifyMutation = useBulkVerifyComplete()
  const newRoundMutation = useStartNewRound()

  // Current round
  const currentRound = useMemo(
    () => (items.length > 0 ? Math.max(...items.map((i) => i.round)) : 1),
    [items]
  )

  // Items filtered by room and current round
  const filteredItems = useMemo(() => {
    let result = items.filter((i) => i.round === currentRound)
    if (selectedRoom !== "all") {
      result = result.filter((i) => i.room === selectedRoom)
    }
    return result
  }, [items, selectedRoom, currentRound])

  // Room counts (current round only)
  const roomCounts = useMemo(() => {
    const roundItems = items.filter((i) => i.round === currentRound)
    const counts: Record<string, { total: number; open: number }> = {}
    for (const item of roundItems) {
      if (!counts[item.room]) counts[item.room] = { total: 0, open: 0 }
      counts[item.room].total++
      if (item.status === "open" || item.status === "in_progress" || item.status === "disputed") {
        counts[item.room].open++
      }
    }
    return counts
  }, [items, currentRound])

  // Vendor summary
  const vendorSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        vendorId: string | null
        name: string
        total: number
        open: number
        complete: number
        backCharge: number
      }
    >()

    const roundItems = items.filter((i) => i.round === currentRound)
    for (const item of roundItems) {
      const key = item.assigned_vendor_contact_id ?? "__unassigned__"
      if (!map.has(key)) {
        map.set(key, {
          vendorId: item.assigned_vendor_contact_id,
          name: item.assigned_vendor_contact_id
            ? `Vendor ${key.slice(0, 8)}`
            : "Unassigned",
          total: 0,
          open: 0,
          complete: 0,
          backCharge: 0,
        })
      }
      const entry = map.get(key)!
      entry.total++
      if (item.status === "open" || item.status === "in_progress" || item.status === "disputed") {
        entry.open++
      }
      if (item.status === "complete" || item.status === "verified") {
        entry.complete++
      }
      if (item.back_charge_amount && item.back_charge_amount > 0) {
        entry.backCharge++
      }
    }
    return Array.from(map.values())
  }, [items, currentRound])

  // Summary counts
  const summary = useMemo(() => {
    const roundItems = items.filter((i) => i.round === currentRound)
    return {
      total: roundItems.length,
      open: roundItems.filter((i) => i.status === "open").length,
      inProgress: roundItems.filter((i) => i.status === "in_progress").length,
      complete: roundItems.filter((i) => i.status === "complete").length,
      verified: roundItems.filter((i) => i.status === "verified").length,
      disputed: roundItems.filter((i) => i.status === "disputed").length,
    }
  }, [items, currentRound])

  const handleQuickComplete = async (item: PunchItem) => {
    try {
      await completeMutation.mutateAsync({
        id: item.id,
        unitId,
        jobId,
      })
      toast({ title: `Item #${item.item_number} marked complete` })
    } catch {
      toast({ title: "Failed to complete item", variant: "destructive" })
    }
  }

  const handleVerify = async (item: PunchItem) => {
    try {
      await verifyMutation.mutateAsync({
        id: item.id,
        unitId,
        jobId,
      })
      toast({ title: `Item #${item.item_number} verified` })
    } catch {
      toast({ title: "Failed to verify item", variant: "destructive" })
    }
  }

  const handleBulkVerify = async () => {
    try {
      const result = await bulkVerifyMutation.mutateAsync({ unitId, jobId })
      toast({ title: `${result.length} item(s) verified` })
    } catch {
      toast({ title: "Failed to bulk verify", variant: "destructive" })
    }
  }

  const handleNewRound = async () => {
    try {
      const result = await newRoundMutation.mutateAsync({ unitId, jobId })
      toast({
        title: `Round ${currentRound + 1} started with ${result.length} item(s)`,
      })
    } catch {
      toast({ title: "Failed to start new round", variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading punch items...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">
            Round {currentRound} &mdash; {summary.total} item
            {summary.total !== 1 ? "s" : ""}
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="bg-red-50 text-red-700">
              {summary.open} Open
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {summary.inProgress} In Progress
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {summary.complete} Complete
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800">
              {summary.verified} Verified
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setVendorView(!vendorView)}>
            {vendorView ? "Room View" : "Vendor View"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkVerify}
            disabled={summary.complete === 0 || bulkVerifyMutation.isPending}
          >
            <ShieldCheck className="mr-1 h-4 w-4" />
            Verify All Complete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewRound}
            disabled={
              summary.open + summary.inProgress + summary.disputed === 0 ||
              newRoundMutation.isPending
            }
          >
            <RotateCcw className="mr-1 h-4 w-4" />
            New Round
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {vendorView ? (
        /* ---- Vendor Summary ---- */
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Per-Vendor Summary
          </h4>
          {vendorSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No items in this round.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Vendor</th>
                    <th className="px-4 py-3 text-center font-medium">Total</th>
                    <th className="px-4 py-3 text-center font-medium">Open</th>
                    <th className="px-4 py-3 text-center font-medium">Complete</th>
                    <th className="px-4 py-3 text-center font-medium">
                      Back-Charge
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorSummary.map((v) => (
                    <tr
                      key={v.vendorId ?? "unassigned"}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">{v.name}</td>
                      <td className="px-4 py-3 text-center">{v.total}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "font-medium",
                            v.open > 0 ? "text-red-600" : "text-green-600"
                          )}
                        >
                          {v.open}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{v.complete}</td>
                      <td className="px-4 py-3 text-center">
                        {v.backCharge > 0 ? (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                            {v.backCharge} flagged
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            window.print()
                          }}
                        >
                          <Printer className="mr-1 h-3.5 w-3.5" />
                          Report
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ---- Room-by-Room View ---- */
        <div className="grid md:grid-cols-[220px_1fr] gap-4">
          {/* Room Selector */}
          <div className="space-y-1">
            <button
              onClick={() => setSelectedRoom("all")}
              className={cn(
                "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                selectedRoom === "all"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span>All Rooms</span>
              <span className="text-xs opacity-80">{summary.total}</span>
            </button>
            {(Object.keys(PUNCH_ROOM_CONFIG) as PunchItemRoom[]).map((room) => {
              const counts = roomCounts[room]
              if (!counts) return null
              return (
                <button
                  key={room}
                  onClick={() => setSelectedRoom(room)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                    selectedRoom === room
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span>{PUNCH_ROOM_CONFIG[room].label}</span>
                  <div className="flex items-center gap-1.5">
                    {counts.open > 0 && (
                      <span
                        className={cn(
                          "text-xs font-medium",
                          selectedRoom === room
                            ? "text-red-200"
                            : "text-red-600"
                        )}
                      >
                        {counts.open}
                      </span>
                    )}
                    <span className="text-xs opacity-60">{counts.total}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Items Panel */}
          <div className="space-y-2">
            {filteredItems.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {selectedRoom === "all"
                      ? "No punch items for this round."
                      : `No items in ${PUNCH_ROOM_CONFIG[selectedRoom].label}.`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                    item.status === "verified" && "opacity-60",
                    item.status === "disputed" &&
                      "border-orange-200 bg-orange-50/50"
                  )}
                >
                  {/* Quick-complete checkbox */}
                  <div className="pt-0.5">
                    <Checkbox
                      checked={
                        item.status === "complete" ||
                        item.status === "verified"
                      }
                      disabled={
                        item.status === "verified" ||
                        completeMutation.isPending
                      }
                      onCheckedChange={() => {
                        if (
                          item.status !== "complete" &&
                          item.status !== "verified"
                        ) {
                          handleQuickComplete(item)
                        }
                      }}
                    />
                  </div>

                  {/* Item content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{item.item_number}
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          (item.status === "complete" ||
                            item.status === "verified") &&
                            "line-through text-muted-foreground"
                        )}
                      >
                        {item.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={cn(
                          "text-xs",
                          PUNCH_CATEGORY_CONFIG[item.category].color
                        )}
                      >
                        {PUNCH_CATEGORY_CONFIG[item.category].label}
                      </Badge>
                      {selectedRoom === "all" && (
                        <span className="text-xs text-muted-foreground">
                          {PUNCH_ROOM_CONFIG[item.room].label}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            PUNCH_PRIORITY_CONFIG[item.priority].dot
                          )}
                        />
                        {PUNCH_PRIORITY_CONFIG[item.priority].label}
                      </span>
                      {item.back_charge_amount && item.back_charge_amount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-orange-50 text-orange-700"
                        >
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Back-charge {formatCurrency(item.back_charge_amount)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Status badge + verify button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={cn(
                        "text-xs",
                        PUNCH_STATUS_CONFIG[item.status].bgColor
                      )}
                    >
                      {PUNCH_STATUS_CONFIG[item.status].label}
                    </Badge>
                    {item.status === "complete" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleVerify(item)}
                        disabled={verifyMutation.isPending}
                      >
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Item Dialog */}
      <AddPunchItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        jobId={jobId}
        unitId={unitId}
        defaultRoom={selectedRoom !== "all" ? selectedRoom : undefined}
      />
    </div>
  )
}

// ==========================================================================
// Add Punch Item Dialog
// ==========================================================================
function AddPunchItemDialog({
  open,
  onOpenChange,
  jobId,
  unitId,
  defaultRoom,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  jobId: string
  unitId: string
  defaultRoom?: PunchItemRoom
}) {
  const [room, setRoom] = useState<PunchItemRoom | "">(defaultRoom ?? "")
  const [category, setCategory] = useState<PunchItemCategory | "">("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<PunchItemPriority>("medium")
  const [notes, setNotes] = useState("")

  const createMutation = useCreatePunchItem()

  const resetForm = () => {
    setRoom(defaultRoom ?? "")
    setCategory("")
    setDescription("")
    setPriority("medium")
    setNotes("")
  }

  const handleSubmit = async () => {
    if (!room || !category || !description) return

    try {
      await createMutation.mutateAsync({
        job_id: jobId,
        unit_id: unitId,
        room,
        category,
        description,
        priority,
        notes: notes || undefined,
      })
      toast({ title: "Punch item added" })
      onOpenChange(false)
      resetForm()
    } catch {
      toast({ title: "Failed to add item", variant: "destructive" })
    }
  }

  const isValid = room && category && description

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Punch Item</DialogTitle>
          <DialogDescription>
            Add a new item to the punch list.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Room */}
          <div className="space-y-2">
            <Label>Room *</Label>
            <Select
              value={room}
              onValueChange={(v) => setRoom(v as PunchItemRoom)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select room..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {(Object.keys(PUNCH_ROOM_CONFIG) as PunchItemRoom[]).map(
                  (r) => (
                    <SelectItem key={r} value={r}>
                      {PUNCH_ROOM_CONFIG[r].label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as PunchItemCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {(
                  Object.keys(PUNCH_CATEGORY_CONFIG) as PunchItemCategory[]
                ).map((c) => (
                  <SelectItem key={c} value={c}>
                    {PUNCH_CATEGORY_CONFIG[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Describe the punch item..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as PunchItemPriority)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(PUNCH_PRIORITY_CONFIG) as PunchItemPriority[]
                ).map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          PUNCH_PRIORITY_CONFIG[p].dot
                        )}
                      />
                      {PUNCH_PRIORITY_CONFIG[p].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              resetForm()
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createMutation.isPending}
          >
            {createMutation.isPending ? "Adding..." : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
