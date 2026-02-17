"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Building2,
  Star,
  AlertTriangle,
  Shield,
  FileText,
  DollarSign,
  Phone,
  Mail,
  X,
  ChevronDown,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MOCK_VENDORS, MOCK_PURCHASE_ORDERS } from "@/lib/construction/mock-data"
import { TRADE_CATEGORIES } from "@/lib/construction/types"
import type { Vendor } from "@/lib/construction/types"

function StarRating({ score }: { score: number }) {
  const fullStars = Math.floor(score)
  const hasHalf = score - fullStars >= 0.5
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < fullStars
              ? "fill-yellow-400 text-yellow-400"
              : i === fullStars && hasHalf
              ? "fill-yellow-400/50 text-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          )}
        />
      ))}
      <span className="ml-1 text-xs font-medium">{score.toFixed(1)}</span>
    </div>
  )
}

function getInsuranceStatus(vendor: Vendor): {
  status: "valid" | "expiring" | "expired"
  label: string
  bgColor: string
} {
  if (vendor.insurance_certificates.length === 0) {
    return {
      status: "expired",
      label: "No Insurance",
      bgColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    }
  }

  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 86400000)
  const hasExpired = vendor.insurance_certificates.some(
    (c) => new Date(c.expiration_date) < now
  )
  const hasExpiring = vendor.insurance_certificates.some(
    (c) =>
      new Date(c.expiration_date) >= now &&
      new Date(c.expiration_date) < thirtyDays
  )

  if (hasExpired)
    return {
      status: "expired",
      label: "Expired",
      bgColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    }
  if (hasExpiring)
    return {
      status: "expiring",
      label: "Expiring Soon",
      bgColor:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    }
  return {
    status: "valid",
    label: "Current",
    bgColor:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  }
}

function getLicenseStatus(vendor: Vendor): {
  label: string
  bgColor: string
} {
  if (!vendor.license_number || vendor.license_number === "N/A") {
    return {
      label: "N/A",
      bgColor: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    }
  }
  if (!vendor.license_expiration) {
    return {
      label: "Active",
      bgColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    }
  }
  const expDate = new Date(vendor.license_expiration)
  const now = new Date()
  if (expDate < now) {
    return {
      label: "Expired",
      bgColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    }
  }
  const thirtyDays = new Date(now.getTime() + 30 * 86400000)
  if (expDate < thirtyDays) {
    return {
      label: "Expiring",
      bgColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    }
  }
  return {
    label: "Active",
    bgColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  }
}

export default function VendorsPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [tradeFilter, setTradeFilter] = useState("all")
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)

  const filteredVendors = useMemo(() => {
    let vendors = [...MOCK_VENDORS]
    if (search) {
      const s = search.toLowerCase()
      vendors = vendors.filter(
        (v) =>
          v.company_name.toLowerCase().includes(s) ||
          v.contact_name.toLowerCase().includes(s) ||
          v.trades.some((t) => t.toLowerCase().includes(s))
      )
    }
    if (tradeFilter !== "all") {
      vendors = vendors.filter((v) => v.trades.includes(tradeFilter))
    }
    return vendors.sort((a, b) => b.performance_score - a.performance_score)
  }, [search, tradeFilter])

  // Get unique trades from vendors
  const activeTrades = useMemo(() => {
    const trades = new Set<string>()
    MOCK_VENDORS.forEach((v) => v.trades.forEach((t) => trades.add(t)))
    return Array.from(trades).sort()
  }, [])

  const vendorPOs = selectedVendor
    ? MOCK_PURCHASE_ORDERS.filter(
        (po) => po.vendor_name === selectedVendor.company_name
      )
    : []

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Vendor Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage subcontractors, suppliers, and vendor compliance
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors by name, contact, or trade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tradeFilter} onValueChange={setTradeFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by trade" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">All Trades</SelectItem>
            {activeTrades.map((trade) => (
              <SelectItem key={trade} value={trade}>
                {trade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || tradeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setTradeFilter("all")
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredVendors.length} vendor{filteredVendors.length !== 1 ? "s" : ""}
      </p>

      {/* Vendor Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Company
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Contact
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Trades
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                License
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Insurance
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Performance
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                YTD Payments
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.map((vendor) => {
              const insurance = getInsuranceStatus(vendor)
              const license = getLicenseStatus(vendor)

              return (
                <tr
                  key={vendor.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedVendor(vendor)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{vendor.company_name}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {vendor.contact_name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {vendor.trades.slice(0, 2).map((trade) => (
                        <Badge
                          key={trade}
                          variant="secondary"
                          className="text-xs"
                        >
                          {trade}
                        </Badge>
                      ))}
                      {vendor.trades.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{vendor.trades.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn("text-xs", license.bgColor)}>
                      {license.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn("text-xs", insurance.bgColor)}>
                      {insurance.status === "expired" && (
                        <AlertTriangle className="mr-1 h-3 w-3" />
                      )}
                      {insurance.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <StarRating score={vendor.performance_score} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(vendor.ytd_payments, { compact: true })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Vendor Detail Sheet */}
      <Sheet
        open={!!selectedVendor}
        onOpenChange={(open) => !open && setSelectedVendor(null)}
      >
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedVendor && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedVendor.company_name}</SheetTitle>
                <SheetDescription>
                  Vendor profile and compliance information
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Contact Name</p>
                      <p className="font-medium">
                        {selectedVendor.contact_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge
                        className={cn(
                          "text-xs",
                          selectedVendor.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {selectedVendor.status === "active"
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </div>
                    {selectedVendor.email && (
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Email
                        </p>
                        <p className="font-medium">{selectedVendor.email}</p>
                      </div>
                    )}
                    {selectedVendor.phone && (
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Phone
                        </p>
                        <p className="font-medium">{selectedVendor.phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Trades */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Trades Performed
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.trades.map((trade) => (
                      <Badge key={trade} variant="secondary">
                        {trade}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* License */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    License
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">License Number</p>
                      <p className="font-medium">
                        {selectedVendor.license_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expiration</p>
                      <p className="font-medium">
                        {selectedVendor.license_expiration
                          ? formatDate(selectedVendor.license_expiration)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Insurance */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Insurance Certificates
                  </h3>
                  {selectedVendor.insurance_certificates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No insurance certificates on file.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedVendor.insurance_certificates.map((cert) => {
                        const isExpired =
                          new Date(cert.expiration_date) < new Date()
                        return (
                          <div
                            key={cert.id}
                            className={cn(
                              "rounded-lg border px-4 py-3 text-sm",
                              isExpired && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{cert.type}</span>
                              {isExpired && (
                                <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  Expired
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-muted-foreground">
                              <span>Carrier: {cert.carrier}</span>
                              <span>Policy: {cert.policy_number}</span>
                              <span>
                                Exp: {formatDate(cert.expiration_date, { short: true })}
                              </span>
                            </div>
                            <p className="text-xs mt-1">
                              Coverage: {formatCurrency(cert.coverage_amount)}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* W-9 & Payment */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    W-9 & Payment
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">W-9 Status</p>
                      <Badge
                        className={cn(
                          "text-xs",
                          selectedVendor.w9_status === "received"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : selectedVendor.w9_status === "pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        )}
                      >
                        {selectedVendor.w9_status === "received"
                          ? "Received"
                          : selectedVendor.w9_status === "pending"
                          ? "Pending"
                          : "Expired"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payment Info</p>
                      <p className="font-medium font-mono">
                        {selectedVendor.payment_info_masked || "Not on file"}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Performance */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Performance
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Score</p>
                      <StarRating score={selectedVendor.performance_score} />
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        YTD Payments (1099)
                      </p>
                      <p className="text-lg font-bold">
                        {formatCurrency(selectedVendor.ytd_payments)}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* PO History */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Recent PO History
                  </h3>
                  {vendorPOs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No purchase orders found for this vendor.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {vendorPOs.slice(0, 10).map((po) => (
                        <div
                          key={po.id}
                          className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                        >
                          <div>
                            <span className="font-mono text-xs mr-2">
                              {po.po_number}
                            </span>
                            <span className="text-muted-foreground">
                              {po.trade_category}
                            </span>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(po.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedVendor.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Notes
                      </h3>
                      <p className="text-sm">{selectedVendor.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
