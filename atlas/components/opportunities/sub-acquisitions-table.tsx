"use client"

import { useState, useMemo } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  MapPin,
  DollarSign,
  Calendar,
  Building2,
  Layers,
  TrendingUp,
  AlertTriangle,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { SubAcquisition, SubAcquisitionStatus } from "@/lib/types/opportunities"
import { SUB_ACQUISITION_STATUS_CONFIG } from "@/lib/types/opportunities"
import {
  MOCK_SUB_ACQUISITIONS,
  computeSubAcquisitionAggregates,
} from "@/lib/mock/sub-acquisitions"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SubAcquisitionsTableProps {
  opportunityId: string
}

// ---------------------------------------------------------------------------
// Empty form state
// ---------------------------------------------------------------------------

function emptyForm(): Partial<SubAcquisition> {
  return {
    label: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    parcel_tms_number: "",
    acreage: null,
    lot_count: 1,
    purchase_price: null,
    projected_sale_price: null,
    projected_profit: null,
    projected_margin_pct: null,
    earnest_money: null,
    due_diligence_fee: null,
    date_under_contract: null,
    due_diligence_deadline: null,
    projected_close_date: null,
    status: "identified",
    zoning: "",
    notes: "",
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubAcquisitionsTable({ opportunityId }: SubAcquisitionsTableProps) {
  // In production this would come from a hook/API. Mock for now.
  const [subs, setSubs] = useState<SubAcquisition[]>(
    () => MOCK_SUB_ACQUISITIONS.filter((s) => s.opportunity_id === opportunityId)
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<SubAcquisition>>(emptyForm)

  // Aggregates
  const aggregates = useMemo(() => computeSubAcquisitionAggregates(subs), [subs])
  const activeSubs = subs.filter((s) => s.status !== "dropped")

  // ---- Form helpers ----
  function openNew() {
    setEditingId(null)
    setForm({ ...emptyForm(), opportunity_id: opportunityId })
    setDialogOpen(true)
  }

  function openEdit(sub: SubAcquisition) {
    setEditingId(sub.id)
    setForm({ ...sub })
    setDialogOpen(true)
  }

  function handleSave() {
    if (editingId) {
      setSubs((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? { ...s, ...form, updated_at: new Date().toISOString() } as SubAcquisition
            : s
        )
      )
    } else {
      const newSub: SubAcquisition = {
        ...(form as SubAcquisition),
        id: `subacq-${Date.now()}`,
        opportunity_id: opportunityId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setSubs((prev) => [...prev, newSub])
    }
    setDialogOpen(false)
    setForm(emptyForm())
  }

  function handleDelete(id: string) {
    setSubs((prev) => prev.filter((s) => s.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function updateField(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      {/* Aggregate Financial Dashboard */}
      {subs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Properties</p>
              <p className="text-2xl font-bold">{aggregates.active_properties}</p>
              {aggregates.total_properties !== aggregates.active_properties && (
                <p className="text-xs text-muted-foreground">
                  {aggregates.total_properties - aggregates.active_properties} dropped
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Purchase</p>
              <p className="text-lg font-bold">{formatCurrency(aggregates.total_purchase_price)}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(aggregates.total_earnest_money)} earnest
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Projected Sale</p>
              <p className="text-lg font-bold">{formatCurrency(aggregates.total_sale_price)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Projected Profit</p>
              <p className={cn(
                "text-lg font-bold",
                aggregates.total_projected_profit >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(aggregates.total_projected_profit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Wtd Avg Margin</p>
              <p className={cn(
                "text-lg font-bold",
                aggregates.weighted_avg_margin >= 10 ? "text-green-600" :
                aggregates.weighted_avg_margin >= 7 ? "text-blue-600" :
                aggregates.weighted_avg_margin >= 5 ? "text-yellow-600" : "text-red-600"
              )}>
                {aggregates.weighted_avg_margin.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {aggregates.total_acreage.toFixed(2)} AC &middot; {aggregates.total_lots} lots
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status pipeline mini-bar */}
      {subs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(SUB_ACQUISITION_STATUS_CONFIG) as SubAcquisitionStatus[]).map((status) => {
            const count = aggregates.status_breakdown[status] ?? 0
            if (count === 0) return null
            return (
              <Badge key={status} className={cn("text-xs gap-1", SUB_ACQUISITION_STATUS_CONFIG[status].bgColor)}>
                {SUB_ACQUISITION_STATUS_CONFIG[status].label}: {count}
              </Badge>
            )
          })}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-base">
            <Layers className="inline mr-2 h-4 w-4" />
            Sub-Acquisitions
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              ({subs.length} propert{subs.length !== 1 ? "ies" : "y"})
            </span>
          </CardTitle>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" />
            Add Property
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {subs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">No properties added yet</p>
              <p className="text-xs mt-1">Add individual properties to track their acquisition status and financials.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openNew}>
                <Plus className="mr-1 h-4 w-4" />
                Add First Property
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-t border-border bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-7" />
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Property</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Parcel / TMS</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Acreage</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Purchase</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Sale Price</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Profit</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Margin</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sub) => {
                    const isExpanded = expandedId === sub.id
                    const isDropped = sub.status === "dropped"
                    return (
                      <TooltipProvider key={sub.id} delayDuration={200}>
                        <tr
                          className={cn(
                            "border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors",
                            isExpanded && "bg-muted/30",
                            isDropped && "opacity-60"
                          )}
                          onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                        >
                          <td className="px-3 py-2.5">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <p className={cn("font-medium text-xs", isDropped && "line-through")}>
                              {sub.label}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {[sub.address_city, sub.address_state].filter(Boolean).join(", ")}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono">{sub.parcel_tms_number ?? "--"}</td>
                          <td className="px-3 py-2.5 text-xs text-right">{sub.acreage ? `${sub.acreage} AC` : "--"}</td>
                          <td className="px-3 py-2.5 text-xs text-right font-medium">
                            {sub.purchase_price ? formatCurrency(sub.purchase_price) : "--"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right">
                            {sub.projected_sale_price ? formatCurrency(sub.projected_sale_price) : "--"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right">
                            {sub.projected_profit != null ? (
                              <span className={cn(sub.projected_profit >= 0 ? "text-green-600" : "text-red-600")}>
                                {formatCurrency(sub.projected_profit)}
                              </span>
                            ) : "--"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right">
                            {sub.projected_margin_pct != null ? (
                              <span className={cn(
                                sub.projected_margin_pct >= 10 ? "text-green-600 font-medium" :
                                sub.projected_margin_pct >= 7 ? "text-blue-600" :
                                sub.projected_margin_pct >= 5 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {sub.projected_margin_pct.toFixed(1)}%
                              </span>
                            ) : "--"}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge className={cn("text-[10px]", SUB_ACQUISITION_STATUS_CONFIG[sub.status].bgColor)}>
                              {SUB_ACQUISITION_STATUS_CONFIG[sub.status].label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => { e.stopPropagation(); openEdit(sub) }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove property?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Remove &quot;{sub.label}&quot; from this opportunity? This does not delete the property record.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(sub.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr className="border-b border-border bg-muted/10">
                            <td colSpan={10} className="px-6 py-4">
                              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Address & property */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Property Details
                                  </h4>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex gap-2">
                                      <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                      <span>
                                        {[sub.address_street, sub.address_city, sub.address_state, sub.address_zip]
                                          .filter(Boolean)
                                          .join(", ") || "No address"}
                                      </span>
                                    </div>
                                    <div><span className="text-muted-foreground">Parcel:</span> {sub.parcel_tms_number ?? "--"}</div>
                                    <div><span className="text-muted-foreground">Zoning:</span> {sub.zoning ?? "--"}</div>
                                    <div><span className="text-muted-foreground">Acreage:</span> {sub.acreage ?? "--"}</div>
                                    <div><span className="text-muted-foreground">Lots:</span> {sub.lot_count ?? "--"}</div>
                                  </div>
                                </div>

                                {/* Financials */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Financials
                                  </h4>
                                  <div className="space-y-1 text-xs">
                                    <div><span className="text-muted-foreground">Purchase:</span> <span className="font-medium">{sub.purchase_price ? formatCurrency(sub.purchase_price) : "--"}</span></div>
                                    <div><span className="text-muted-foreground">Projected Sale:</span> <span className="font-medium">{sub.projected_sale_price ? formatCurrency(sub.projected_sale_price) : "--"}</span></div>
                                    <div><span className="text-muted-foreground">Projected Profit:</span> <span className={cn("font-medium", (sub.projected_profit ?? 0) >= 0 ? "text-green-600" : "text-red-600")}>{sub.projected_profit != null ? formatCurrency(sub.projected_profit) : "--"}</span></div>
                                    <div><span className="text-muted-foreground">Earnest Money:</span> {sub.earnest_money ? formatCurrency(sub.earnest_money) : "--"}</div>
                                    <div><span className="text-muted-foreground">DD Fee:</span> {sub.due_diligence_fee ? formatCurrency(sub.due_diligence_fee) : "--"}</div>
                                  </div>
                                </div>

                                {/* Dates & notes */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Key Dates
                                  </h4>
                                  <div className="space-y-1 text-xs">
                                    <div><span className="text-muted-foreground">Contract:</span> {sub.date_under_contract ? formatDate(sub.date_under_contract) : "--"}</div>
                                    <div>
                                      <span className="text-muted-foreground">DD Deadline:</span>{" "}
                                      {sub.due_diligence_deadline ? (
                                        <span className={cn(
                                          new Date(sub.due_diligence_deadline) < new Date() && sub.status === "due_diligence"
                                            ? "text-red-600 font-medium"
                                            : ""
                                        )}>
                                          {formatDate(sub.due_diligence_deadline)}
                                          {new Date(sub.due_diligence_deadline) < new Date() && sub.status === "due_diligence" && (
                                            <AlertTriangle className="inline ml-1 h-3 w-3" />
                                          )}
                                        </span>
                                      ) : "--"}
                                    </div>
                                    <div><span className="text-muted-foreground">Closing:</span> {sub.projected_close_date ? formatDate(sub.projected_close_date) : "--"}</div>
                                  </div>
                                  {sub.notes && (
                                    <div className="mt-2">
                                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</h4>
                                      <p className="text-xs border-l-2 border-muted pl-2 text-muted-foreground">
                                        {sub.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </TooltipProvider>
                    )
                  })}

                  {/* Aggregate footer row */}
                  <tr className="bg-muted/50 border-t-2 border-border font-medium text-xs">
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5" colSpan={2}>
                      <span className="font-semibold">
                        Total ({activeSubs.length} active)
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {aggregates.total_acreage.toFixed(2)} AC
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      {formatCurrency(aggregates.total_purchase_price)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      {formatCurrency(aggregates.total_sale_price)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn(aggregates.total_projected_profit >= 0 ? "text-green-600" : "text-red-600", "font-semibold")}>
                        {formatCurrency(aggregates.total_projected_profit)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn(
                        aggregates.weighted_avg_margin >= 10 ? "text-green-600" :
                        aggregates.weighted_avg_margin >= 7 ? "text-blue-600" :
                        aggregates.weighted_avg_margin >= 5 ? "text-yellow-600" : "text-red-600",
                        "font-semibold"
                      )}>
                        {aggregates.weighted_avg_margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5" colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Property" : "Add Property"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Label */}
            <div className="space-y-2">
              <Label>Property Label *</Label>
              <Input
                placeholder='e.g. "Parcel A — 115 Maple Dr"'
                value={form.label ?? ""}
                onChange={(e) => updateField("label", e.target.value)}
              />
            </div>

            {/* Address grid */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Address</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Street</Label>
                  <Input
                    value={form.address_street ?? ""}
                    onChange={(e) => updateField("address_street", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">City</Label>
                  <Input
                    value={form.address_city ?? ""}
                    onChange={(e) => updateField("address_city", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">State</Label>
                    <Input
                      value={form.address_state ?? ""}
                      onChange={(e) => updateField("address_state", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ZIP</Label>
                    <Input
                      value={form.address_zip ?? ""}
                      onChange={(e) => updateField("address_zip", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Property details */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Property Details</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Parcel / TMS</Label>
                  <Input
                    value={form.parcel_tms_number ?? ""}
                    onChange={(e) => updateField("parcel_tms_number", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Acreage</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.acreage ?? ""}
                    onChange={(e) => updateField("acreage", e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lot Count</Label>
                  <Input
                    type="number"
                    value={form.lot_count ?? ""}
                    onChange={(e) => updateField("lot_count", e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Zoning</Label>
                  <Input
                    value={form.zoning ?? ""}
                    onChange={(e) => updateField("zoning", e.target.value)}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={form.status ?? "identified"}
                    onValueChange={(v) => updateField("status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SUB_ACQUISITION_STATUS_CONFIG) as SubAcquisitionStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{SUB_ACQUISITION_STATUS_CONFIG[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Financials */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Financials</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Purchase Price</Label>
                  <Input
                    type="number"
                    value={form.purchase_price ?? ""}
                    onChange={(e) => updateField("purchase_price", e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Projected Sale Price</Label>
                  <Input
                    type="number"
                    value={form.projected_sale_price ?? ""}
                    onChange={(e) => updateField("projected_sale_price", e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Projected Profit</Label>
                  <Input
                    type="number"
                    value={form.projected_profit ?? ""}
                    onChange={(e) => updateField("projected_profit", e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Margin %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.projected_margin_pct ?? ""}
                    onChange={(e) => updateField("projected_margin_pct", e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Earnest Money</Label>
                  <Input
                    type="number"
                    value={form.earnest_money ?? ""}
                    onChange={(e) => updateField("earnest_money", e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">DD Fee</Label>
                  <Input
                    type="number"
                    value={form.due_diligence_fee ?? ""}
                    onChange={(e) => updateField("due_diligence_fee", e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Key Dates</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Contract Date</Label>
                  <Input
                    type="date"
                    value={form.date_under_contract ?? ""}
                    onChange={(e) => updateField("date_under_contract", e.target.value || null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">DD Deadline</Label>
                  <Input
                    type="date"
                    value={form.due_diligence_deadline ?? ""}
                    onChange={(e) => updateField("due_diligence_deadline", e.target.value || null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Projected Closing</Label>
                  <Input
                    type="date"
                    value={form.projected_close_date ?? ""}
                    onChange={(e) => updateField("projected_close_date", e.target.value || null)}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.label?.trim()}>
              {editingId ? "Save Changes" : "Add Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
