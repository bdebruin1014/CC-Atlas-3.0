"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Badge } from "@/components/ui/badge"
import { toast } from "@/lib/hooks/use-toast"
import { CO_REASON_CONFIG } from "@/lib/construction/types"
import type { ChangeOrderReason } from "@/lib/construction/types"
import {
  useCreateChangeOrder,
  getApprovalThreshold,
  getApprovalLabel,
} from "@/lib/hooks/use-change-orders"

interface UnitOption {
  id: string
  unit_number: string | null
}

interface ChangeOrderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  units: UnitOption[]
}

export function ChangeOrderForm({
  open,
  onOpenChange,
  jobId,
  units,
}: ChangeOrderFormProps) {
  const [unitId, setUnitId] = useState("")
  const [description, setDescription] = useState("")
  const [reason, setReason] = useState<ChangeOrderReason | "">("")
  const [costImpact, setCostImpact] = useState("")
  const [scheduleImpact, setScheduleImpact] = useState("0")
  const [linkedPO, setLinkedPO] = useState("")

  const createMutation = useCreateChangeOrder()

  const parsedCost = parseFloat(costImpact) || 0
  const markupPercent = reason ? CO_REASON_CONFIG[reason].markupPercent : 0
  const markupAmount = parsedCost * (markupPercent / 100)
  const totalAmount = parsedCost + markupAmount

  const threshold = useMemo(
    () => (totalAmount > 0 ? getApprovalThreshold(totalAmount) : null),
    [totalAmount]
  )

  const resetForm = () => {
    setUnitId("")
    setDescription("")
    setReason("")
    setCostImpact("")
    setScheduleImpact("0")
    setLinkedPO("")
  }

  const handleSubmit = async () => {
    if (!unitId || !description || !reason || !parsedCost) return

    try {
      await createMutation.mutateAsync({
        job_id: jobId,
        unit_id: unitId,
        description,
        reason_category: reason,
        cost_impact: parsedCost,
        markup_pct: markupPercent,
        total_with_markup: totalAmount,
        schedule_impact_days: parseInt(scheduleImpact) || 0,
        linked_po_id: linkedPO || null,
      })
      toast({ title: "Change order submitted" })
      onOpenChange(false)
      resetForm()
    } catch {
      toast({ title: "Failed to create change order", variant: "destructive" })
    }
  }

  const isValid = unitId && description && reason && parsedCost > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Change Order</DialogTitle>
          <DialogDescription>
            Submit a new change order for review and approval.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Affected Unit */}
          <div className="space-y-2">
            <Label>Affected Unit *</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.unit_number ?? u.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Describe the change order..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as ChangeOrderReason)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CO_REASON_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label} ({config.markupPercent}% markup)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cost & Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Cost *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={costImpact}
                  onChange={(e) => setCostImpact(e.target.value)}
                  className="pl-7"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Schedule Impact (days)</Label>
              <Input
                type="number"
                value={scheduleImpact}
                onChange={(e) => setScheduleImpact(e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Linked PO (optional) */}
          <div className="space-y-2">
            <Label>Linked PO (optional)</Label>
            <Input
              placeholder="PO number..."
              value={linkedPO}
              onChange={(e) => setLinkedPO(e.target.value)}
            />
          </div>

          {/* Auto-calculated summary */}
          {parsedCost > 0 && reason && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Cost</span>
                <span className="font-medium">
                  {formatCurrency(parsedCost, { decimals: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Markup ({markupPercent}% &mdash;{" "}
                  {CO_REASON_CONFIG[reason].label})
                </span>
                <span>
                  {formatCurrency(markupAmount, { decimals: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1">
                <span className="font-medium">Total CO Amount</span>
                <span className="font-bold">
                  {formatCurrency(totalAmount, { decimals: 2 })}
                </span>
              </div>

              {/* Approval routing */}
              {threshold && (
                <div className="mt-2 pt-2 border-t border-border">
                  <Badge variant="outline" className="text-xs">
                    {getApprovalLabel(threshold)}
                  </Badge>
                </div>
              )}
            </div>
          )}
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
            {createMutation.isPending ? "Submitting..." : "Submit Change Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
