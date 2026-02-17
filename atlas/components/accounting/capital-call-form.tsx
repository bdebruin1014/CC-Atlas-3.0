"use client"

import { useState, useMemo } from "react"
import { DollarSign, AlertCircle, Loader2 } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Investor } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CapitalCallFormData {
  totalAmount: number
  purpose: string
  dueDate: string
  allocations: Array<{
    investorId: string
    investorName: string
    ownershipPercent: number
    amountCalled: number
  }>
}

interface CapitalCallFormProps {
  investors: Investor[]
  onSubmit: (data: CapitalCallFormData) => Promise<void>
  onCancel: () => void
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CapitalCallForm({
  investors,
  onSubmit,
  onCancel,
  className,
}: CapitalCallFormProps) {
  const [totalAmount, setTotalAmount] = useState("")
  const [purpose, setPurpose] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const activeInvestors = useMemo(
    () => investors.filter((inv) => inv.status === "active"),
    [investors]
  )

  const totalOwnership = useMemo(
    () =>
      activeInvestors.reduce((sum, inv) => sum + inv.ownership_percent, 0),
    [activeInvestors]
  )

  // Compute per-investor allocations
  const allocations = useMemo(() => {
    const amount = parseFloat(totalAmount) || 0
    return activeInvestors.map((inv) => {
      // Pro-rata based on ownership percentage
      const calledAmount =
        totalOwnership > 0
          ? (inv.ownership_percent / totalOwnership) * amount
          : 0
      const exceeds = calledAmount > inv.capital_remaining

      return {
        investorId: inv.id,
        investorName: inv.contact_name,
        ownershipPercent: inv.ownership_percent,
        amountCalled: Math.round(calledAmount * 100) / 100,
        capitalRemaining: inv.capital_remaining,
        exceeds,
      }
    })
  }, [activeInvestors, totalAmount, totalOwnership])

  const allocationTotal = useMemo(
    () => allocations.reduce((sum, a) => sum + a.amountCalled, 0),
    [allocations]
  )

  const hasExcessCalls = useMemo(
    () => allocations.some((a) => a.exceeds),
    [allocations]
  )

  // Validation
  const validate = (): boolean => {
    const errs: string[] = []
    const amount = parseFloat(totalAmount)

    if (!amount || amount <= 0) {
      errs.push("Total amount must be greater than zero")
    }
    if (!purpose.trim()) {
      errs.push("Purpose is required")
    }
    if (!dueDate) {
      errs.push("Due date is required")
    }
    if (activeInvestors.length === 0) {
      errs.push("No active investors to call")
    }

    setErrors(errs)
    return errs.length === 0
  }

  const handlePreview = () => {
    if (validate()) {
      setShowConfirm(true)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmit({
        totalAmount: parseFloat(totalAmount),
        purpose: purpose.trim(),
        dueDate,
        allocations: allocations.map((a) => ({
          investorId: a.investorId,
          investorName: a.investorName,
          ownershipPercent: a.ownershipPercent,
          amountCalled: a.amountCalled,
        })),
      })
    } finally {
      setSubmitting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      <h3 className="text-lg font-semibold">Create Capital Call</h3>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              Please fix the following:
            </span>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="text-sm text-destructive">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cc-amount">Total Amount *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="cc-amount"
              type="number"
              step="0.01"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cc-due">Due Date *</Label>
          <Input
            id="cc-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Active Investors</Label>
          <p className="text-sm font-medium pt-2">
            {activeInvestors.length} investors ({formatPercent(totalOwnership)}{" "}
            total)
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cc-purpose">Purpose *</Label>
        <Textarea
          id="cc-purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="e.g., Construction Phase 2 funding, Land acquisition deposit..."
          rows={2}
        />
      </div>

      {/* Preview Table */}
      {parseFloat(totalAmount) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Per-Investor Allocation Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Ownership %</TableHead>
                    <TableHead className="text-right">Amount Called</TableHead>
                    <TableHead className="text-right">
                      Capital Remaining
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((alloc) => (
                    <TableRow
                      key={alloc.investorId}
                      className={cn(alloc.exceeds && "bg-yellow-50")}
                    >
                      <TableCell className="font-medium">
                        {alloc.investorName}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatPercent(alloc.ownershipPercent)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-medium">
                        {formatCurrency(alloc.amountCalled, { decimals: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatCurrency(alloc.capitalRemaining, {
                          decimals: 0,
                        })}
                      </TableCell>
                      <TableCell>
                        {alloc.exceeds ? (
                          <span className="flex items-center gap-1 text-xs text-yellow-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Exceeds remaining
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Total row */}
                  <TableRow className="border-t-2 bg-muted/30 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatPercent(totalOwnership)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(allocationTotal, { decimals: 2 })}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {hasExcessCalls && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3">
                <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-700">
                  Some investors are being called for more than their remaining
                  capital commitment. Review before issuing.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogTrigger asChild>
            <Button onClick={handlePreview} disabled={!totalAmount || !purpose}>
              Issue Capital Call
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Capital Call</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-medium font-mono tabular-nums">
                    {formatCurrency(parseFloat(totalAmount) || 0, {
                      decimals: 2,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">{dueDate || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Purpose</p>
                  <p className="font-medium">{purpose}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Investors</p>
                  <p className="font-medium">{activeInvestors.length}</p>
                </div>
              </div>

              <Separator />

              <p className="text-sm text-muted-foreground">
                This will create a capital call notice for{" "}
                {activeInvestors.length} investor
                {activeInvestors.length !== 1 ? "s" : ""}.
              </p>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Issuing...
                    </>
                  ) : (
                    "Confirm & Issue"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
