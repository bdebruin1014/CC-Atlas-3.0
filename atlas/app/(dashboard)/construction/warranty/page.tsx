"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { StatCard, SimpleBarChart } from "@/components/construction/job-dashboard"
import { MOCK_WARRANTY_CLAIMS, MOCK_UNITS_JOB001 } from "@/lib/construction/mock-data"
import {
  WARRANTY_URGENCY_CONFIG,
  WARRANTY_STATUS_CONFIG,
} from "@/lib/construction/types"
import type {
  WarrantyClaim,
  WarrantyUrgency,
  WarrantyStatus,
} from "@/lib/construction/types"

const WARRANTY_CATEGORIES = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Roofing",
  "Drywall",
  "Flooring",
  "Exterior",
  "Foundation",
  "Windows/Doors",
  "Paint",
  "Appliances",
  "Cabinets",
  "Other",
]

export default function WarrantyPage() {
  const router = useRouter()
  const [claims, setClaims] = useState<WarrantyClaim[]>(MOCK_WARRANTY_CLAIMS)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<WarrantyStatus | "all">(
    "all"
  )
  const [urgencyFilter, setUrgencyFilter] = useState<WarrantyUrgency | "all">(
    "all"
  )
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(
    null
  )

  // Create form
  const [formUnit, setFormUnit] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formUrgency, setFormUrgency] = useState<WarrantyUrgency>("routine")
  const [formVendor, setFormVendor] = useState("")

  // Detail form
  const [updateStatus, setUpdateStatus] = useState<WarrantyStatus | "">("" as WarrantyStatus | "")
  const [resolutionNotes, setResolutionNotes] = useState("")

  const filteredClaims = useMemo(() => {
    let result = [...claims]
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter)
    }
    if (urgencyFilter !== "all") {
      result = result.filter((c) => c.urgency === urgencyFilter)
    }
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.unit_address.toLowerCase().includes(s) ||
          c.category.toLowerCase().includes(s) ||
          c.description.toLowerCase().includes(s) ||
          c.claim_number.toLowerCase().includes(s)
      )
    }
    return result.sort(
      (a, b) =>
        new Date(b.reported_date).getTime() -
        new Date(a.reported_date).getTime()
    )
  }, [claims, statusFilter, urgencyFilter, search])

  // Summary stats
  const openClaims = claims.filter(
    (c) => !["resolved", "closed"].includes(c.status)
  ).length
  const avgResolutionDays = (() => {
    const resolved = claims.filter((c) => c.resolved_date)
    if (resolved.length === 0) return 0
    const totalDays = resolved.reduce((sum, c) => {
      const days = Math.round(
        (new Date(c.resolved_date!).getTime() -
          new Date(c.reported_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      return sum + days
    }, 0)
    return Math.round(totalDays / resolved.length)
  })()

  // Claims by category for chart
  const claimsByCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    claims.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1
    })
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [claims])

  const totalCost = claims.reduce((s, c) => s + c.cost, 0)

  const handleCreate = () => {
    if (!formUnit || !formCategory || !formDescription) return

    const unitObj = MOCK_UNITS_JOB001.find((u) => u.id === formUnit)
    const claimNum = `WC-2026-${String(claims.length + 1).padStart(3, "0")}`

    const newClaim: WarrantyClaim = {
      id: `wc-new-${Date.now()}`,
      claim_number: claimNum,
      unit_id: formUnit,
      unit_address: unitObj?.address || "Unknown",
      reported_date: new Date().toISOString().split("T")[0],
      category: formCategory,
      description: formDescription,
      urgency: formUrgency,
      status: "open",
      vendor_name: formVendor || undefined,
      cost: 0,
      owner_signoff: false,
    }

    setClaims((prev) => [newClaim, ...prev])
    setShowCreateDialog(false)
    setFormUnit("")
    setFormCategory("")
    setFormDescription("")
    setFormUrgency("routine")
    setFormVendor("")
  }

  const handleUpdateClaim = () => {
    if (!selectedClaim || !updateStatus) return

    setClaims((prev) =>
      prev.map((c) =>
        c.id === selectedClaim.id
          ? {
              ...c,
              status: updateStatus as WarrantyStatus,
              resolution_notes: resolutionNotes || c.resolution_notes,
              resolved_date:
                updateStatus === "resolved" || updateStatus === "closed"
                  ? new Date().toISOString().split("T")[0]
                  : c.resolved_date,
            }
          : c
      )
    )

    setSelectedClaim(null)
    setUpdateStatus("" as WarrantyStatus | "")
    setResolutionNotes("")
  }

  const handleOwnerSignoff = (claim: WarrantyClaim) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.id === claim.id ? { ...c, owner_signoff: true } : c
      )
    )
  }

  const hasFilters =
    statusFilter !== "all" || urgencyFilter !== "all" || search !== ""

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Warranty Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Track and manage warranty claims across completed units
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Claim
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Open Claims"
          value={openClaims}
          icon={<Shield className="h-4 w-4" />}
        />
        <StatCard
          title="Total Claims"
          value={claims.length}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Avg Resolution"
          value={`${avgResolutionDays} days`}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          title="Total Cost"
          value={formatCurrency(totalCost, { compact: true })}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* Claims by Category Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claims by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleBarChart items={claimsByCategory} />
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search claims..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as WarrantyStatus | "all")
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(WARRANTY_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={urgencyFilter}
          onValueChange={(v) =>
            setUrgencyFilter(v as WarrantyUrgency | "all")
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgencies</SelectItem>
            {Object.entries(WARRANTY_URGENCY_CONFIG).map(
              ([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setStatusFilter("all")
              setUrgencyFilter("all")
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredClaims.length} claim{filteredClaims.length !== 1 ? "s" : ""}
      </p>

      {/* Claims Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Claim#
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Unit
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Category
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Description
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Urgency
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Vendor
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredClaims.map((claim) => (
              <tr
                key={claim.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  setSelectedClaim(claim)
                  setUpdateStatus(claim.status)
                  setResolutionNotes(claim.resolution_notes || "")
                }}
              >
                <td className="px-4 py-3 font-mono text-xs">
                  {claim.claim_number}
                </td>
                <td className="px-4 py-3 text-xs max-w-[120px] truncate">
                  {claim.unit_address}
                </td>
                <td className="px-4 py-3 text-xs">
                  {formatDate(claim.reported_date, { short: true })}
                </td>
                <td className="px-4 py-3">{claim.category}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">
                  {claim.description}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={cn(
                      "text-xs",
                      WARRANTY_URGENCY_CONFIG[claim.urgency].bgColor
                    )}
                  >
                    {WARRANTY_URGENCY_CONFIG[claim.urgency].label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs">
                  {claim.vendor_name || "--"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={cn(
                      "text-xs",
                      WARRANTY_STATUS_CONFIG[claim.status].bgColor
                    )}
                  >
                    {WARRANTY_STATUS_CONFIG[claim.status].label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {claim.cost > 0
                    ? formatCurrency(claim.cost)
                    : "--"}
                </td>
              </tr>
            ))}
            {filteredClaims.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No warranty claims found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Claim Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Warranty Claim</DialogTitle>
            <DialogDescription>
              Submit a new warranty claim for a completed unit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select value={formUnit} onValueChange={setFormUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {MOCK_UNITS_JOB001.filter(
                    (u) => u.status === "complete"
                  ).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.unit_number} - {u.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {WARRANTY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe the warranty issue..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select
                  value={formUrgency}
                  onValueChange={(v) =>
                    setFormUrgency(v as WarrantyUrgency)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsible Vendor</Label>
                <Input
                  placeholder="Vendor name..."
                  value={formVendor}
                  onChange={(e) => setFormVendor(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formUnit || !formCategory || !formDescription}
            >
              Submit Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim Detail Sheet */}
      <Sheet
        open={!!selectedClaim}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedClaim(null)
            setUpdateStatus("" as WarrantyStatus | "")
            setResolutionNotes("")
          }
        }}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedClaim && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedClaim.claim_number}
                  <Badge
                    className={cn(
                      "text-xs",
                      WARRANTY_STATUS_CONFIG[selectedClaim.status].bgColor
                    )}
                  >
                    {WARRANTY_STATUS_CONFIG[selectedClaim.status].label}
                  </Badge>
                  <Badge
                    className={cn(
                      "text-xs",
                      WARRANTY_URGENCY_CONFIG[selectedClaim.urgency].bgColor
                    )}
                  >
                    {WARRANTY_URGENCY_CONFIG[selectedClaim.urgency].label}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {selectedClaim.unit_address}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Claim Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Reported Date</p>
                      <p className="font-medium">
                        {formatDate(selectedClaim.reported_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Category</p>
                      <p className="font-medium">{selectedClaim.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vendor</p>
                      <p className="font-medium">
                        {selectedClaim.vendor_name || "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-medium">
                        {selectedClaim.cost > 0
                          ? formatCurrency(selectedClaim.cost)
                          : "TBD"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">
                      Description
                    </p>
                    <p className="text-sm">{selectedClaim.description}</p>
                  </div>
                </div>

                <Separator />

                {/* Resolution */}
                {selectedClaim.resolution_notes && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Resolution
                    </h3>
                    <p className="text-sm">{selectedClaim.resolution_notes}</p>
                    {selectedClaim.resolved_date && (
                      <p className="text-xs text-muted-foreground">
                        Resolved: {formatDate(selectedClaim.resolved_date)}
                      </p>
                    )}
                  </div>
                )}

                {/* Owner Signoff */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Owner Signoff
                  </h3>
                  {selectedClaim.owner_signoff ? (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Owner has signed off on resolution
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Owner has not yet signed off.
                      </p>
                      {(selectedClaim.status === "resolved" ||
                        selectedClaim.status === "closed") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOwnerSignoff(selectedClaim)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark Owner Signoff
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Update Status */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Update Claim
                  </h3>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={updateStatus}
                      onValueChange={(v) =>
                        setUpdateStatus(v as WarrantyStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">
                          In Progress
                        </SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Resolution Notes</Label>
                    <Textarea
                      placeholder="Add resolution notes..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleUpdateClaim} className="w-full">
                    Update Claim
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
