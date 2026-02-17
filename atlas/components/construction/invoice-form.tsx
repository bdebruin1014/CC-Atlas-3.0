"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Search } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { APInvoice } from "@/lib/construction/accounting-types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface VendorOption {
  id: string
  company_name: string
  contact_name?: string
  trades?: string[]
}

interface JobOption {
  id: string
  name: string
  units?: { id: string; unit_number: string }[]
}

interface POOption {
  id: string
  po_number: string
  vendor_name: string
  vendor_id?: string
  job_id: string
  unit_id?: string
  amount: number
  amount_invoiced?: number
  trade_category?: string
  retainage_percent?: number
}

interface InvoiceFormProps {
  poId?: string
  purchaseOrders?: POOption[]
  vendors: VendorOption[]
  jobs: JobOption[]
  onSubmit: (data: Partial<APInvoice>) => void
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function InvoiceForm({
  poId,
  purchaseOrders = [],
  vendors,
  jobs,
  onSubmit,
  onCancel,
}: InvoiceFormProps) {
  // Form state
  const [selectedPOId, setSelectedPOId] = useState(poId ?? "")
  const [vendorSearch, setVendorSearch] = useState("")
  const [selectedVendorId, setSelectedVendorId] = useState("")
  const [selectedVendorName, setSelectedVendorName] = useState("")
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const [jobId, setJobId] = useState("")
  const [unitId, setUnitId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [dueDate, setDueDate] = useState("")
  const [grossAmount, setGrossAmount] = useState("")
  const [retainagePct, setRetainagePct] = useState("5")
  const [description, setDescription] = useState("")
  const [costCode, setCostCode] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Resolve the selected PO
  const selectedPO = useMemo(
    () => purchaseOrders.find((po) => po.id === selectedPOId),
    [purchaseOrders, selectedPOId]
  )

  // Auto-fill from PO
  useEffect(() => {
    if (!selectedPO) return
    setSelectedVendorId(selectedPO.vendor_id ?? "")
    setSelectedVendorName(selectedPO.vendor_name)
    setJobId(selectedPO.job_id)
    if (selectedPO.unit_id) setUnitId(selectedPO.unit_id)
    if (selectedPO.trade_category) setCostCode(selectedPO.trade_category)
    if (selectedPO.retainage_percent != null) {
      setRetainagePct(String(selectedPO.retainage_percent))
    }
  }, [selectedPO])

  // Derived calculations
  const parsedGross = parseFloat(grossAmount) || 0
  const parsedRetPct = parseFloat(retainagePct) || 0
  const retainageHeld = parsedGross * (parsedRetPct / 100)
  const netAmount = parsedGross - retainageHeld

  // PO remaining balance
  const poRemainingBalance = useMemo(() => {
    if (!selectedPO) return Infinity
    const alreadyInvoiced = selectedPO.amount_invoiced ?? 0
    return selectedPO.amount - alreadyInvoiced
  }, [selectedPO])

  // Units for selected job
  const jobUnits = useMemo(() => {
    const job = jobs.find((j) => j.id === jobId)
    return job?.units ?? []
  }, [jobs, jobId])

  // Vendor search
  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return vendors.slice(0, 20)
    const q = vendorSearch.toLowerCase()
    return vendors.filter(
      (v) =>
        v.company_name.toLowerCase().includes(q) ||
        (v.contact_name && v.contact_name.toLowerCase().includes(q))
    )
  }, [vendors, vendorSearch])

  // Validation
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {}
    if (!selectedVendorId && !selectedVendorName) errs.vendor = "Vendor is required"
    if (!invoiceNumber.trim()) errs.invoiceNumber = "Invoice number is required"
    if (!invoiceDate) errs.invoiceDate = "Invoice date is required"
    if (!dueDate) errs.dueDate = "Due date is required"
    if (parsedGross <= 0) errs.grossAmount = "Amount must be greater than zero"
    if (!jobId) errs.jobId = "Job is required"
    if (selectedPO && parsedGross > poRemainingBalance) {
      errs.grossAmount = `Amount exceeds PO remaining balance of ${formatCurrency(poRemainingBalance, { decimals: 2 })}`
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [
    selectedVendorId,
    selectedVendorName,
    invoiceNumber,
    invoiceDate,
    dueDate,
    parsedGross,
    jobId,
    selectedPO,
    poRemainingBalance,
  ])

  function handleSubmit() {
    if (!validate()) return

    onSubmit({
      id: `inv-${Date.now()}`,
      invoice_number: invoiceNumber.trim(),
      vendor_contact_id: selectedVendorId,
      po_id: selectedPOId || null,
      job_id: jobId,
      unit_id: unitId || null,
      invoice_date: invoiceDate,
      due_date: dueDate,
      received_date: new Date().toISOString(),
      gross_amount: parsedGross,
      retainage_held: retainageHeld,
      net_amount: netAmount,
      amount_paid: 0,
      balance_due: netAmount,
      description: description || null,
      cost_code: costCode || null,
      status: "received",
      organization_id: "",
      approved_by: null,
      approved_at: null,
      accounting_period: null,
      supporting_document_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-6">
      {/* PO Link (optional) */}
      {purchaseOrders.length > 0 && (
        <div className="space-y-2">
          <Label>Link to Purchase Order</Label>
          <Select value={selectedPOId} onValueChange={setSelectedPOId}>
            <SelectTrigger>
              <SelectValue placeholder="Standalone invoice (no PO)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Standalone invoice (no PO)</SelectItem>
              {purchaseOrders.map((po) => (
                <SelectItem key={po.id} value={po.id}>
                  {po.po_number} - {po.vendor_name} ({formatCurrency(po.amount, { decimals: 2 })})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPO && (
            <p className="text-xs text-muted-foreground">
              PO Balance Remaining:{" "}
              <span className="font-medium">
                {formatCurrency(poRemainingBalance, { decimals: 2 })}
              </span>
            </p>
          )}
        </div>
      )}

      <Separator />

      {/* Vendor */}
      <div className="space-y-2">
        <Label>Vendor *</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={selectedVendorName || vendorSearch}
            onChange={(e) => {
              setVendorSearch(e.target.value)
              setSelectedVendorName("")
              setSelectedVendorId("")
              setShowVendorDropdown(true)
            }}
            onFocus={() => setShowVendorDropdown(true)}
            className={cn("pl-9", errors.vendor && "border-red-500")}
            disabled={!!selectedPO}
          />
          {showVendorDropdown && !selectedVendorName && !selectedPO && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
              {filteredVendors.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No vendors found
                </div>
              ) : (
                filteredVendors.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => {
                      setSelectedVendorName(v.company_name)
                      setSelectedVendorId(v.id)
                      setVendorSearch("")
                      setShowVendorDropdown(false)
                    }}
                  >
                    <div>
                      <span className="font-medium">{v.company_name}</span>
                      {v.contact_name && (
                        <span className="ml-2 text-muted-foreground">
                          {v.contact_name}
                        </span>
                      )}
                    </div>
                    {v.trades && v.trades.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {v.trades.slice(0, 2).join(", ")}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {errors.vendor && (
          <p className="text-xs text-red-500">{errors.vendor}</p>
        )}
      </div>

      {/* Invoice # and dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Invoice # *</Label>
          <Input
            placeholder="INV-001"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className={cn(errors.invoiceNumber && "border-red-500")}
          />
          {errors.invoiceNumber && (
            <p className="text-xs text-red-500">{errors.invoiceNumber}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Invoice Date *</Label>
          <Input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className={cn(errors.invoiceDate && "border-red-500")}
          />
          {errors.invoiceDate && (
            <p className="text-xs text-red-500">{errors.invoiceDate}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={cn(errors.dueDate && "border-red-500")}
          />
          {errors.dueDate && (
            <p className="text-xs text-red-500">{errors.dueDate}</p>
          )}
        </div>
      </div>

      {/* Job and Unit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Job *</Label>
          <Select
            value={jobId}
            onValueChange={(v) => {
              setJobId(v)
              setUnitId("")
            }}
            disabled={!!selectedPO}
          >
            <SelectTrigger className={cn(errors.jobId && "border-red-500")}>
              <SelectValue placeholder="Select job..." />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.jobId && (
            <p className="text-xs text-red-500">{errors.jobId}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Unit</Label>
          <Select value={unitId} onValueChange={setUnitId} disabled={!!selectedPO || !jobId}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit (optional)..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No specific unit</SelectItem>
              {jobUnits.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.unit_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Amount and Retainage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gross Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              placeholder="0.00"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              className={cn("pl-7", errors.grossAmount && "border-red-500")}
              min="0"
              step="0.01"
            />
          </div>
          {errors.grossAmount && (
            <p className="text-xs text-red-500">{errors.grossAmount}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Retainage %</Label>
          <div className="relative">
            <Input
              type="number"
              value={retainagePct}
              onChange={(e) => setRetainagePct(e.target.value)}
              min="0"
              max="100"
              step="0.5"
              className="pr-7"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
        </div>
      </div>

      {/* Auto-calculated summary */}
      {parsedGross > 0 && (
        <Card>
          <CardContent className="p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Amount</span>
              <span className="font-medium">
                {formatCurrency(parsedGross, { decimals: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Retainage Held ({parsedRetPct}%)
              </span>
              <span className="text-red-600">
                -{formatCurrency(retainageHeld, { decimals: 2 })}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Net Amount</span>
              <span>{formatCurrency(netAmount, { decimals: 2 })}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Code */}
      <div className="space-y-2">
        <Label>Cost Code</Label>
        <Input
          placeholder="e.g., Framing - Labor"
          value={costCode}
          onChange={(e) => setCostCode(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Invoice description or notes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Create Invoice</Button>
      </div>
    </div>
  )
}
