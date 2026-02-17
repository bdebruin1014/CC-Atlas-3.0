"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
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
import { TRADE_CATEGORIES } from "@/lib/construction/types"
import { MOCK_VENDORS } from "@/lib/construction/mock-data"
import type { PurchaseOrder } from "@/lib/construction/types"

interface POFormProps {
  unitId: string
  jobId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Partial<PurchaseOrder>) => void
  defaultValues?: Partial<PurchaseOrder>
}

export function POForm({
  unitId,
  jobId,
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: POFormProps) {
  const [tradeCategory, setTradeCategory] = useState(
    defaultValues?.trade_category || ""
  )
  const [vendorSearch, setVendorSearch] = useState("")
  const [selectedVendor, setSelectedVendor] = useState(
    defaultValues?.vendor_name || ""
  )
  const [vendorId, setVendorId] = useState(defaultValues?.vendor_id || "")
  const [description, setDescription] = useState(
    defaultValues?.description || ""
  )
  const [amount, setAmount] = useState(
    defaultValues?.amount?.toString() || ""
  )
  const [retainagePercent, setRetainagePercent] = useState(
    defaultValues?.retainage_percent?.toString() || "5"
  )
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)

  const parsedAmount = parseFloat(amount) || 0
  const parsedRetainage = parseFloat(retainagePercent) || 0
  const retainageAmount = parsedAmount * (parsedRetainage / 100)
  const netAmount = parsedAmount - retainageAmount

  const filteredVendors = useMemo(() => {
    let vendors = MOCK_VENDORS.filter((v) => v.status === "active")
    if (tradeCategory) {
      const tradeMatches = vendors.filter((v) =>
        v.trades.some((t) => t === tradeCategory)
      )
      if (tradeMatches.length > 0) vendors = tradeMatches
    }
    if (vendorSearch) {
      const search = vendorSearch.toLowerCase()
      vendors = vendors.filter(
        (v) =>
          v.company_name.toLowerCase().includes(search) ||
          v.contact_name.toLowerCase().includes(search)
      )
    }
    return vendors
  }, [tradeCategory, vendorSearch])

  const handleSubmit = () => {
    if (!tradeCategory || !selectedVendor || !description || !amount) return

    const poNum = `PO-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 9000) + 1000
    )}`

    onSubmit({
      id: `po-new-${Date.now()}`,
      po_number: poNum,
      unit_id: unitId,
      job_id: jobId,
      trade_category: tradeCategory,
      vendor_id: vendorId || undefined,
      vendor_name: selectedVendor,
      description,
      amount: parsedAmount,
      retainage_percent: parsedRetainage,
      retainage_amount: retainageAmount,
      net_amount: netAmount,
      status: "draft",
      lien_waiver_status: "not_received",
      created_at: new Date().toISOString(),
    })

    // Reset form
    setTradeCategory("")
    setVendorSearch("")
    setSelectedVendor("")
    setVendorId("")
    setDescription("")
    setAmount("")
    setRetainagePercent("5")
    onOpenChange(false)
  }

  const isValid = tradeCategory && selectedVendor && description && parsedAmount > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {defaultValues ? "Edit Purchase Order" : "Create Purchase Order"}
          </DialogTitle>
          <DialogDescription>
            Create a new purchase order for this unit. Select the trade category
            and vendor, then enter the details.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Trade Category */}
          <div className="space-y-2">
            <Label>Trade Category *</Label>
            <Select value={tradeCategory} onValueChange={setTradeCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select trade category..." />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {TRADE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor Selection */}
          <div className="space-y-2">
            <Label>Vendor *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={selectedVendor || vendorSearch}
                onChange={(e) => {
                  setVendorSearch(e.target.value)
                  setSelectedVendor("")
                  setVendorId("")
                  setShowVendorDropdown(true)
                }}
                onFocus={() => setShowVendorDropdown(true)}
                className="pl-9"
              />
              {showVendorDropdown && !selectedVendor && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                  {filteredVendors.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No vendors found
                    </div>
                  ) : (
                    filteredVendors.map((v) => (
                      <button
                        key={v.id}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => {
                          setSelectedVendor(v.company_name)
                          setVendorId(v.id)
                          setVendorSearch("")
                          setShowVendorDropdown(false)
                        }}
                      >
                        <div>
                          <span className="font-medium">{v.company_name}</span>
                          <span className="ml-2 text-muted-foreground">
                            {v.contact_name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {v.trades.slice(0, 2).join(", ")}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Describe the work or materials..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Retainage %</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={retainagePercent}
                  onChange={(e) => setRetainagePercent(e.target.value)}
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

          {/* Summary */}
          {parsedAmount > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">PO Amount</span>
                <span className="font-medium">
                  {formatCurrency(parsedAmount, { decimals: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Retainage ({parsedRetainage}%)
                </span>
                <span className="text-red-600">
                  -{formatCurrency(retainageAmount, { decimals: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1">
                <span className="font-medium">Net Payable</span>
                <span className="font-semibold">
                  {formatCurrency(netAmount, { decimals: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            {defaultValues ? "Update PO" : "Create PO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
