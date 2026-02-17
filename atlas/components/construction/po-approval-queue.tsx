"use client"

import { useState, useMemo } from "react"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  Search,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PurchaseOrder } from "@/lib/construction/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface POApprovalQueueProps {
  purchaseOrders: PurchaseOrder[]
  onApprove: (poId: string) => void
  onReject: (poId: string, reason: string) => void
  approvalThreshold?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function POApprovalQueue({
  purchaseOrders,
  onApprove,
  onReject,
  approvalThreshold = 50000,
}: POApprovalQueueProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  // Filter to only POs awaiting approval (draft or issued status that need review)
  const pendingPOs = useMemo(() => {
    return purchaseOrders.filter(
      (po) => po.status === "draft" || po.status === "issued"
    )
  }, [purchaseOrders])

  // Search filter
  const filtered = useMemo(() => {
    if (!searchQuery) return pendingPOs
    const q = searchQuery.toLowerCase()
    return pendingPOs.filter(
      (po) =>
        po.po_number.toLowerCase().includes(q) ||
        po.vendor_name.toLowerCase().includes(q) ||
        po.trade_category.toLowerCase().includes(q) ||
        po.description.toLowerCase().includes(q)
    )
  }, [pendingPOs, searchQuery])

  // Summary
  const totalValue = pendingPOs.reduce((s, po) => s + po.amount, 0)
  const aboveThreshold = pendingPOs.filter(
    (po) => po.amount >= approvalThreshold
  ).length

  function handleReject() {
    if (rejectDialogId && rejectReason.trim()) {
      onReject(rejectDialogId, rejectReason.trim())
      setRejectDialogId(null)
      setRejectReason("")
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Awaiting Approval</p>
            <p className="text-2xl font-bold">{pendingPOs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">
              {formatCurrency(totalValue, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            aboveThreshold > 0 && "border-orange-200 dark:border-orange-800"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {aboveThreshold > 0 && (
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">
                  Above {formatCurrency(approvalThreshold, { compact: true })} Threshold
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    aboveThreshold > 0 ? "text-orange-600" : "text-green-600"
                  )}
                >
                  {aboveThreshold}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search PO #, vendor, trade..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* PO List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ClipboardList className="h-10 w-10 mb-2 opacity-40" />
          <p>
            {pendingPOs.length === 0
              ? "No purchase orders awaiting approval."
              : "No results match your search."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Retainage</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead className="w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((po) => {
              const isAboveThreshold = po.amount >= approvalThreshold

              return (
                <TableRow
                  key={po.id}
                  className={cn(
                    isAboveThreshold &&
                      "bg-orange-50/50 dark:bg-orange-950/20"
                  )}
                >
                  <TableCell className="font-medium">{po.po_number}</TableCell>
                  <TableCell>{po.vendor_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {po.trade_category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {po.description}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(po.amount, { decimals: 2 })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {po.retainage_percent}%
                  </TableCell>
                  <TableCell>
                    {formatDate(po.created_at, { short: true })}
                  </TableCell>
                  <TableCell>
                    {isAboveThreshold ? (
                      <Badge className="text-xs border-0 bg-orange-100 text-orange-700 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Above
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Below
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onApprove(po.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejectDialogId(po.id)
                          setRejectReason("")
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {/* Reject Reason Dialog */}
      <Dialog
        open={rejectDialogId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialogId(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this purchase order. The
              vendor will be notified.
            </p>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogId(null)
                  setRejectReason("")
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim()}
              >
                Reject PO
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
