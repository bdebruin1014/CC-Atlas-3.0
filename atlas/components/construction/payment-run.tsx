"use client"

import { useState, useMemo } from "react"
import {
  Search,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import type { APInvoice, PaymentMethod } from "@/lib/construction/accounting-types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface PaymentRunResult {
  invoiceId: string
  success: boolean
  paymentNumber?: string
  error?: string
}

interface PaymentRunProps {
  invoices: APInvoice[]
  onProcess: (
    payments: {
      vendorId: string
      invoiceIds: string[]
      method: PaymentMethod
      totalAmount: number
    }[]
  ) => Promise<PaymentRunResult[]>
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface VendorGroup {
  vendorId: string
  vendorName: string
  invoices: APInvoice[]
  total: number
  method: PaymentMethod
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "check", label: "Check" },
  { value: "ach", label: "ACH" },
  { value: "wire", label: "Wire Transfer" },
  { value: "credit_card", label: "Credit Card" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PaymentRun({ invoices, onProcess, onCancel }: PaymentRunProps) {
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [vendorMethods, setVendorMethods] = useState<Record<string, PaymentMethod>>({})
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<PaymentRunResult[]>([])

  // Only show approved invoices eligible for payment
  const eligible = useMemo(() => {
    return invoices.filter(
      (inv) => inv.status === "approved" || inv.status === "scheduled"
    )
  }, [invoices])

  // Search filter for step 1
  const filteredEligible = useMemo(() => {
    if (!searchQuery) return eligible
    const q = searchQuery.toLowerCase()
    return eligible.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.vendor?.company_name?.toLowerCase().includes(q) ?? false) ||
        (inv.job?.name?.toLowerCase().includes(q) ?? false)
    )
  }, [eligible, searchQuery])

  // Running total for step 1
  const runningTotal = useMemo(() => {
    return eligible
      .filter((inv) => selectedIds.has(inv.id))
      .reduce((sum, inv) => sum + inv.balance_due, 0)
  }, [eligible, selectedIds])

  // Vendor grouping for step 2
  const vendorGroups = useMemo((): VendorGroup[] => {
    const map = new Map<string, VendorGroup>()
    eligible
      .filter((inv) => selectedIds.has(inv.id))
      .forEach((inv) => {
        const vid = inv.vendor_contact_id
        const existing = map.get(vid)
        if (existing) {
          existing.invoices.push(inv)
          existing.total += inv.balance_due
        } else {
          map.set(vid, {
            vendorId: vid,
            vendorName: inv.vendor?.company_name ?? "Unknown Vendor",
            invoices: [inv],
            total: inv.balance_due,
            method: vendorMethods[vid] ?? "check",
          })
        }
      })
    return Array.from(map.values()).sort((a, b) =>
      a.vendorName.localeCompare(b.vendorName)
    )
  }, [eligible, selectedIds, vendorMethods])

  // Selection helpers
  const allFilteredIds = filteredEligible.map((i) => i.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id))

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        allFilteredIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        allFilteredIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function updateVendorMethod(vendorId: string, method: PaymentMethod) {
    setVendorMethods((prev) => ({ ...prev, [vendorId]: method }))
  }

  async function handleProcess() {
    setProcessing(true)
    try {
      const payloads = vendorGroups.map((g) => ({
        vendorId: g.vendorId,
        invoiceIds: g.invoices.map((i) => i.id),
        method: vendorMethods[g.vendorId] ?? "check",
        totalAmount: g.total,
      }))
      const res = await onProcess(payloads)
      setResults(res)
      setStep(4)
    } catch {
      setResults(
        Array.from(selectedIds).map((id) => ({
          invoiceId: id,
          success: false,
          error: "Processing failed",
        }))
      )
      setStep(4)
    } finally {
      setProcessing(false)
    }
  }

  // Results summary
  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                    ? "bg-green-100 text-green-700"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {step > s ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                s
              )}
            </div>
            {s < 4 && (
              <div
                className={cn(
                  "h-0.5 w-8",
                  step > s ? "bg-green-400" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
        <span className="ml-3 text-sm text-muted-foreground">
          {step === 1 && "Select Invoices"}
          {step === 2 && "Review by Vendor"}
          {step === 3 && "Confirm & Process"}
          {step === 4 && "Results"}
        </span>
      </div>

      <Separator />

      {/* ---- Step 1: Select Invoices ---- */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Card className="ml-4">
              <CardContent className="flex items-center gap-3 p-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Running Total</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(runningTotal, { decimals: 2 })}
                  </p>
                </div>
                <Badge variant="secondary">{selectedIds.size} selected</Badge>
              </CardContent>
            </Card>
          </div>

          {filteredEligible.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No approved invoices available for payment.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEligible.map((inv) => {
                  const isSelected = selectedIds.has(inv.id)
                  return (
                    <TableRow
                      key={inv.id}
                      data-state={isSelected ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => toggleOne(inv.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(inv.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell>
                        {inv.vendor?.company_name ?? "Unknown"}
                      </TableCell>
                      <TableCell>{inv.job?.name ?? "—"}</TableCell>
                      <TableCell>{formatDate(inv.due_date, { short: true })}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(inv.balance_due, { decimals: 2 })}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={selectedIds.size === 0}
            >
              Next: Review
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ---- Step 2: Review by Vendor ---- */}
      {step === 2 && (
        <div className="space-y-4">
          {vendorGroups.map((group) => (
            <Card key={group.vendorId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{group.vendorName}</CardTitle>
                  <div className="flex items-center gap-3">
                    <Select
                      value={vendorMethods[group.vendorId] ?? "check"}
                      onValueChange={(v) =>
                        updateVendorMethod(group.vendorId, v as PaymentMethod)
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-lg font-bold">
                      {formatCurrency(group.total, { decimals: 2 })}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          {inv.invoice_number}
                        </TableCell>
                        <TableCell>{inv.job?.name ?? "—"}</TableCell>
                        <TableCell>
                          {formatDate(inv.due_date, { short: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(inv.balance_due, { decimals: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <span className="font-medium">Total Payment Run</span>
              <span className="text-xl font-bold">
                {formatCurrency(runningTotal, { decimals: 2 })}
              </span>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setStep(3)}>
              Next: Confirm
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ---- Step 3: Confirm & Process ---- */}
      {step === 3 && (
        <div className="space-y-6">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>Payment Run Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Vendors</p>
                  <p className="text-2xl font-bold">{vendorGroups.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoices</p>
                  <p className="text-2xl font-bold">{selectedIds.size}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(runningTotal, { decimals: 2 })}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                {vendorGroups.map((g) => (
                  <div
                    key={g.vendorId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{g.vendorName}</span>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {(vendorMethods[g.vendorId] ?? "check").toUpperCase()}
                      </Badge>
                      <span className="font-medium">
                        {formatCurrency(g.total, { decimals: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleProcess} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Process Payments
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ---- Step 4: Results ---- */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardContent className="flex items-center gap-3 p-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-700">
                    {successCount}
                  </p>
                </div>
              </CardContent>
            </Card>
            {failCount > 0 && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <CardContent className="flex items-center gap-3 p-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold text-red-700">
                      {failCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment #</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => {
                const inv = invoices.find((i) => i.id === r.invoiceId)
                return (
                  <TableRow key={r.invoiceId}>
                    <TableCell className="font-medium">
                      {inv?.invoice_number ?? r.invoiceId}
                    </TableCell>
                    <TableCell>
                      {r.success ? (
                        <Badge className="border-0 bg-green-100 text-green-700">
                          Success
                        </Badge>
                      ) : (
                        <Badge className="border-0 bg-red-100 text-red-700">
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{r.paymentNumber ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.error ?? "Payment processed"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <Button onClick={onCancel}>Done</Button>
          </div>
        </div>
      )}
    </div>
  )
}
