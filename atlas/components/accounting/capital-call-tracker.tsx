"use client"

import { useState, useMemo } from "react"
import {
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Send,
  Loader2,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
import type {
  CapitalCall,
  CapitalCallStatus,
  CapitalCallResponse,
} from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CapitalCallTrackerProps {
  calls: CapitalCall[]
  onRecordReceipt: (
    callId: string,
    responseId: string,
    amount: number,
    date: string
  ) => Promise<void>
  onIssue: (callId: string) => Promise<void>
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCallStatusBadgeClass(status: CapitalCallStatus): string {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    case "issued":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "partially_funded":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    case "fully_funded":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "cancelled":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

function getCallStatusLabel(status: CapitalCallStatus): string {
  switch (status) {
    case "draft":
      return "Draft"
    case "issued":
      return "Issued"
    case "partially_funded":
      return "Partial"
    case "fully_funded":
      return "Funded"
    case "cancelled":
      return "Cancelled"
    default:
      return status
  }
}

function getResponseStatusBadge(status: CapitalCallResponse["status"]) {
  switch (status) {
    case "funded":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "partial":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    case "pending":
      return "bg-gray-100 text-gray-600 hover:bg-gray-100"
    case "unfunded":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

function isOverdue(call: CapitalCall): boolean {
  if (call.status === "fully_funded" || call.status === "cancelled") return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(call.due_date)
  due.setHours(0, 0, 0, 0)
  return today > due
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CapitalCallTracker({
  calls,
  onRecordReceipt,
  onIssue,
  className,
}: CapitalCallTrackerProps) {
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)
  const [receiptDialog, setReceiptDialog] = useState<{
    callId: string
    response: CapitalCallResponse
  } | null>(null)
  const [receiptAmount, setReceiptAmount] = useState("")
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [recording, setRecording] = useState(false)
  const [issuing, setIssuing] = useState<string | null>(null)

  // Sort calls by date descending
  const sortedCalls = useMemo(
    () =>
      [...calls].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [calls]
  )

  // Summary
  const summary = useMemo(() => {
    return calls.reduce(
      (acc, call) => {
        acc.totalCalled += call.total_amount
        const funded = call.responses.reduce(
          (s, r) => s + r.amount_funded,
          0
        )
        acc.totalReceived += funded
        if (
          call.status !== "fully_funded" &&
          call.status !== "cancelled"
        ) {
          acc.totalOutstanding += call.total_amount - funded
        }
        return acc
      },
      { totalCalled: 0, totalReceived: 0, totalOutstanding: 0 }
    )
  }, [calls])

  const handleRecordReceipt = async () => {
    if (!receiptDialog) return
    const amount = parseFloat(receiptAmount)
    if (!amount || amount <= 0) return

    setRecording(true)
    try {
      await onRecordReceipt(
        receiptDialog.callId,
        receiptDialog.response.id,
        amount,
        receiptDate
      )
      setReceiptDialog(null)
      setReceiptAmount("")
    } finally {
      setRecording(false)
    }
  }

  const handleIssue = async (callId: string) => {
    setIssuing(callId)
    try {
      await onIssue(callId)
    } finally {
      setIssuing(null)
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Total Called</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(summary.totalCalled, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Total Received</p>
            <p className="text-2xl font-bold tabular-nums text-green-600">
              {formatCurrency(summary.totalReceived, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold tabular-nums text-orange-600">
              {formatCurrency(summary.totalOutstanding, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Call List */}
      {sortedCalls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <DollarSign className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No capital calls recorded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedCalls.map((call) => {
            const expanded = expandedCallId === call.id
            const overdue = isOverdue(call)
            const funded = call.responses.reduce(
              (s, r) => s + r.amount_funded,
              0
            )
            const fundedPercent =
              call.total_amount > 0
                ? (funded / call.total_amount) * 100
                : 0

            return (
              <Card
                key={call.id}
                className={cn(
                  overdue && "border-red-300",
                  call.status === "fully_funded" && "opacity-75"
                )}
              >
                <CardHeader
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedCallId(expanded ? null : call.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          Capital Call #{call.call_number}
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              getCallStatusBadgeClass(call.status)
                            )}
                          >
                            {getCallStatusLabel(call.status)}
                          </Badge>
                          {overdue && (
                            <Badge
                              variant="secondary"
                              className="bg-red-100 text-red-800 text-[10px]"
                            >
                              <AlertTriangle className="h-3 w-3 mr-0.5" />
                              Overdue
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {call.purpose} | Due:{" "}
                          {formatDate(call.due_date)}
                          {call.issued_date && (
                            <span className="ml-2">
                              Issued: {formatDate(call.issued_date)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums">
                        {formatCurrency(call.total_amount, { decimals: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(funded, { decimals: 0 })} received (
                        {formatPercent(fundedPercent, 0)})
                      </p>
                    </div>
                  </div>
                </CardHeader>

                {expanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />

                    {/* Issue button for drafts */}
                    {call.status === "draft" && (
                      <div className="mb-4">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleIssue(call.id)
                          }}
                          disabled={issuing === call.id}
                        >
                          {issuing === call.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Issuing...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Issue to Investors
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Per-investor responses */}
                    <div className="overflow-x-auto rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Investor</TableHead>
                            <TableHead className="text-right">
                              Amount Due
                            </TableHead>
                            <TableHead className="text-right">
                              Amount Funded
                            </TableHead>
                            <TableHead className="text-right">
                              Outstanding
                            </TableHead>
                            <TableHead>Funded Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[100px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {call.responses.map((response) => {
                            const outstanding =
                              response.amount_due - response.amount_funded
                            return (
                              <TableRow key={response.id}>
                                <TableCell className="font-medium">
                                  {response.investor_name}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums">
                                  {formatCurrency(response.amount_due, {
                                    decimals: 2,
                                  })}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums text-green-600">
                                  {formatCurrency(response.amount_funded, {
                                    decimals: 2,
                                  })}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "text-right font-mono tabular-nums",
                                    outstanding > 0 && "text-orange-600"
                                  )}
                                >
                                  {formatCurrency(outstanding, {
                                    decimals: 2,
                                  })}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {response.funded_date
                                    ? formatDate(response.funded_date)
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-[10px] px-1.5 py-0",
                                      getResponseStatusBadge(response.status)
                                    )}
                                  >
                                    {response.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {response.status !== "funded" &&
                                    call.status !== "cancelled" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setReceiptDialog({
                                            callId: call.id,
                                            response,
                                          })
                                          setReceiptAmount(
                                            String(outstanding > 0 ? outstanding : response.amount_due)
                                          )
                                        }}
                                      >
                                        Record Receipt
                                      </Button>
                                    )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Receipt Dialog */}
      <Dialog
        open={!!receiptDialog}
        onOpenChange={(open) => !open && setReceiptDialog(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Receipt</DialogTitle>
          </DialogHeader>
          {receiptDialog && (
            <div className="space-y-4 pt-2">
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Investor:</span>{" "}
                  <span className="font-medium">
                    {receiptDialog.response.investor_name}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Amount Due:</span>{" "}
                  <span className="font-medium font-mono tabular-nums">
                    {formatCurrency(receiptDialog.response.amount_due, {
                      decimals: 2,
                    })}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Already Funded:
                  </span>{" "}
                  <span className="font-medium font-mono tabular-nums">
                    {formatCurrency(receiptDialog.response.amount_funded, {
                      decimals: 2,
                    })}
                  </span>
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="receipt-amount">Receipt Amount</Label>
                <Input
                  id="receipt-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt-date">Receipt Date</Label>
                <Input
                  id="receipt-date"
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setReceiptDialog(null)}
                  disabled={recording}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordReceipt}
                  disabled={
                    recording ||
                    !receiptAmount ||
                    parseFloat(receiptAmount) <= 0
                  }
                >
                  {recording ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Record
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
