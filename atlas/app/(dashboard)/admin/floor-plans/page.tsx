"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Search,
  Building2,
  LayoutGrid,
  List,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

interface FloorPlan {
  id: string
  organization_id: string
  name: string
  type: "sfh" | "townhome"
  heated_sf: number
  bedrooms: number | null
  bathrooms: number | null
  garage_type: string | null
  stories: number | null
  sb_cost: number
  classic_upgrade_cost: number | null
  elegance_upgrade_cost: number | null
  standard_soft_site_cost: number | null
  total_cost_incl_soft: number | null
  cost_per_heated_sf_sb: number | null
  cost_per_heated_sf_total: number | null
  min_lot_width: number | null
  min_lot_depth: number | null
  min_lot_frontage: number | null
  is_active: boolean
  pricing_effective_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "\u2014"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return "\u2014"
  return new Intl.NumberFormat("en-US").format(value)
}

export default function FloorPlansPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [typeFilter, setTypeFilter] = useState<"all" | "sfh" | "townhome">("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<FloorPlan | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  const debouncedSearch = useDebounce(searchTerm, 300)

  const fetchFloorPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      let query = supabase
        .from("floor_plans")
        .select("*")
        .order("heated_sf", { ascending: true })

      if (debouncedSearch) {
        query = query.ilike("name", `%${debouncedSearch}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setFloorPlans((data as unknown as FloorPlan[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch floor plans")
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchFloorPlans()
  }, [fetchFloorPlans])

  const filteredPlans = floorPlans.filter((plan) => {
    if (typeFilter === "all") return true
    return plan.type === typeFilter
  })

  const sfhCount = floorPlans.filter((p) => p.type === "sfh").length
  const thCount = floorPlans.filter((p) => p.type === "townhome").length

  const handlePlanClick = (plan: FloorPlan) => {
    setSelectedPlan(plan)
    setShowDetailDialog(true)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Floor Plan Library</h1>
          <p className="text-sm text-muted-foreground">
            {floorPlans.length} floor plans ({sfhCount} SFH, {thCount} Townhomes)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Floor Plan
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search floor plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={typeFilter}
        onValueChange={(val) => setTypeFilter(val as "all" | "sfh" | "townhome")}
      >
        <TabsList>
          <TabsTrigger value="all">All ({floorPlans.length})</TabsTrigger>
          <TabsTrigger value="sfh">Single Family Homes ({sfhCount})</TabsTrigger>
          <TabsTrigger value="townhome">Townhomes ({thCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={typeFilter} className="mt-6">
          {/* Error */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={fetchFloorPlans}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filteredPlans.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No floor plans found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm
                    ? "Try a different search term."
                    : "Add your first floor plan to get started."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Grid View */}
          {!loading && !error && filteredPlans.length > 0 && viewMode === "grid" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPlans.map((plan) => (
                <Card
                  key={plan.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                  onClick={() => handlePlanClick(plan)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold">{plan.name}</h3>
                      <div className="flex gap-1.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            plan.type === "sfh"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          )}
                        >
                          {plan.type === "sfh" ? "SFH" : "TH"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            plan.is_active
                              ? "border-green-300 text-green-700"
                              : "border-gray-300 text-gray-500"
                          )}
                        >
                          {plan.is_active ? "Active" : "Archived"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-3">
                      <div className="text-muted-foreground">Heated SF</div>
                      <div className="font-medium text-right">
                        {formatNumber(plan.heated_sf)}
                      </div>
                      <div className="text-muted-foreground">Bed/Bath</div>
                      <div className="font-medium text-right">
                        {plan.bedrooms ?? "?"}/{plan.bathrooms ?? "?"}
                      </div>
                      <div className="text-muted-foreground">Garage</div>
                      <div className="font-medium text-right">
                        {plan.garage_type || "\u2014"}
                      </div>
                      <div className="text-muted-foreground">Stories</div>
                      <div className="font-medium text-right">
                        {plan.stories ?? "\u2014"}
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base S&B</span>
                        <span className="font-semibold">
                          {formatCurrency(plan.sb_cost)}
                        </span>
                      </div>
                      {plan.classic_upgrade_cost && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Classic Upgrade</span>
                          <span>{formatCurrency(plan.classic_upgrade_cost)}</span>
                        </div>
                      )}
                      {plan.elegance_upgrade_cost && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            Elegance Upgrade
                          </span>
                          <span>{formatCurrency(plan.elegance_upgrade_cost)}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3 mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Min Lot:{" "}
                        {plan.min_lot_width
                          ? `${plan.min_lot_width}'W`
                          : plan.min_lot_frontage
                            ? `${plan.min_lot_frontage}' Frontage`
                            : "\u2014"}
                        {plan.min_lot_depth ? ` x ${plan.min_lot_depth}'D` : ""}
                      </span>
                      <span className="text-xs font-semibold text-primary">
                        {plan.cost_per_heated_sf_sb
                          ? `$${plan.cost_per_heated_sf_sb}/SF`
                          : ""}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Table View */}
          {!loading && !error && filteredPlans.length > 0 && viewMode === "table" && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                        Plan Name
                      </th>
                      <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground">
                        SF
                      </th>
                      <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground">
                        Bed/Bath
                      </th>
                      <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                        Garage
                      </th>
                      <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground">
                        Base S&B
                      </th>
                      <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground">
                        $/SF
                      </th>
                      <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((plan) => (
                      <tr
                        key={plan.id}
                        className="border-b cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => handlePlanClick(plan)}
                      >
                        <td className="px-4 py-3 font-medium">{plan.name}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              plan.type === "sfh"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            )}
                          >
                            {plan.type === "sfh" ? "SFH" : "TH"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {formatNumber(plan.heated_sf)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {plan.bedrooms ?? "?"}/{plan.bathrooms ?? "?"}
                        </td>
                        <td className="px-4 py-3 text-sm">{plan.garage_type || "\u2014"}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {formatCurrency(plan.sb_cost)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {plan.cost_per_heated_sf_sb
                            ? `$${plan.cost_per_heated_sf_sb}`
                            : "\u2014"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              plan.is_active
                                ? "border-green-300 text-green-700"
                                : "border-gray-300 text-gray-500"
                            )}
                          >
                            {plan.is_active ? "Active" : "Archived"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      {selectedPlan && (
        <FloorPlanDetailDialog
          plan={selectedPlan}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          onSave={async (updates) => {
            try {
              const supabase = createClient()
              const { error: updateError } = await supabase
                .from("floor_plans")
                .update(updates)
                .eq("id", selectedPlan.id)

              if (updateError) throw updateError

              toast({ title: "Floor plan updated" })
              fetchFloorPlans()
              setShowDetailDialog(false)
            } catch {
              toast({
                title: "Error",
                description: "Failed to update floor plan",
                variant: "destructive",
              })
            }
          }}
        />
      )}

      {/* Add Floor Plan Dialog */}
      <AddFloorPlanDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false)
          fetchFloorPlans()
          toast({ title: "Floor plan added" })
        }}
      />
    </div>
  )
}

function FloorPlanDetailDialog({
  plan,
  open,
  onOpenChange,
  onSave,
}: {
  plan: FloorPlan
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updates: Partial<FloorPlan>) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<FloorPlan>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEditData({
      name: plan.name,
      type: plan.type,
      heated_sf: plan.heated_sf,
      bedrooms: plan.bedrooms,
      bathrooms: plan.bathrooms,
      garage_type: plan.garage_type,
      stories: plan.stories,
      sb_cost: plan.sb_cost,
      classic_upgrade_cost: plan.classic_upgrade_cost,
      elegance_upgrade_cost: plan.elegance_upgrade_cost,
      min_lot_width: plan.min_lot_width,
      min_lot_depth: plan.min_lot_depth,
      min_lot_frontage: plan.min_lot_frontage,
      is_active: plan.is_active,
      notes: plan.notes,
    })
    setIsEditing(false)
  }, [plan])

  const handleSave = async () => {
    setSaving(true)
    await onSave(editData)
    setSaving(false)
    setIsEditing(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {plan.name}
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                plan.type === "sfh"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-purple-100 text-purple-800"
              )}
            >
              {plan.type === "sfh" ? "Single Family" : "Townhome"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            View and edit floor plan specifications and pricing
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={editData.name || ""}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editData.type || "sfh"}
                  onValueChange={(val) =>
                    setEditData((prev) => ({
                      ...prev,
                      type: val as "sfh" | "townhome",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sfh">Single Family Home</SelectItem>
                    <SelectItem value="townhome">Townhome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Heated SF</Label>
                <Input
                  type="number"
                  value={editData.heated_sf || ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      heated_sf: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Input
                  type="number"
                  value={editData.bedrooms ?? ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      bedrooms: parseInt(e.target.value) || null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Bathrooms</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editData.bathrooms ?? ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      bathrooms: parseFloat(e.target.value) || null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Stories</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editData.stories ?? ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      stories: parseFloat(e.target.value) || null,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Garage Type</Label>
              <Input
                value={editData.garage_type || ""}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    garage_type: e.target.value || null,
                  }))
                }
                placeholder="e.g., 2-Car, 1-Car F, None"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Base S&B Cost ($)</Label>
                <Input
                  type="number"
                  value={editData.sb_cost || ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      sb_cost: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Classic Upgrade ($)</Label>
                <Input
                  type="number"
                  value={editData.classic_upgrade_cost ?? ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      classic_upgrade_cost: parseFloat(e.target.value) || null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Elegance Upgrade ($)</Label>
                <Input
                  type="number"
                  value={editData.elegance_upgrade_cost ?? ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      elegance_upgrade_cost: parseFloat(e.target.value) || null,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min Lot Width (ft)</Label>
                <Input
                  type="number"
                  value={editData.min_lot_width ?? ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      min_lot_width: parseFloat(e.target.value) || null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min Lot Depth (ft)</Label>
                <Input
                  type="number"
                  value={editData.min_lot_depth ?? ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      min_lot_depth: parseFloat(e.target.value) || null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min Frontage (ft)</Label>
                <Input
                  type="number"
                  value={editData.min_lot_frontage ?? ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      min_lot_frontage: parseFloat(e.target.value) || null,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editData.notes || ""}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Heated SF" value={`${formatNumber(plan.heated_sf)} SF`} />
              <DetailItem
                label="Bed/Bath"
                value={`${plan.bedrooms ?? "?"} Bed / ${plan.bathrooms ?? "?"} Bath`}
              />
              <DetailItem label="Garage" value={plan.garage_type || "None"} />
              <DetailItem
                label="Stories"
                value={plan.stories ? `${plan.stories} Story` : "\u2014"}
              />
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Pricing</h4>
              <div className="grid grid-cols-2 gap-4">
                <DetailItem
                  label="Base S&B Cost"
                  value={formatCurrency(plan.sb_cost)}
                  highlighted
                />
                <DetailItem
                  label="$/SF (S&B)"
                  value={
                    plan.cost_per_heated_sf_sb
                      ? `$${plan.cost_per_heated_sf_sb}`
                      : "\u2014"
                  }
                />
                <DetailItem
                  label="Classic Upgrade"
                  value={formatCurrency(plan.classic_upgrade_cost)}
                />
                <DetailItem
                  label="Elegance Upgrade"
                  value={formatCurrency(plan.elegance_upgrade_cost)}
                />
                <DetailItem
                  label="Total (incl. Soft)"
                  value={formatCurrency(plan.total_cost_incl_soft)}
                  highlighted
                />
                <DetailItem
                  label="$/SF (Total)"
                  value={
                    plan.cost_per_heated_sf_total
                      ? `$${plan.cost_per_heated_sf_total}`
                      : "\u2014"
                  }
                />
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Lot Requirements</h4>
              <div className="grid grid-cols-3 gap-4">
                <DetailItem
                  label="Min Width"
                  value={plan.min_lot_width ? `${plan.min_lot_width} ft` : "\u2014"}
                />
                <DetailItem
                  label="Min Depth"
                  value={plan.min_lot_depth ? `${plan.min_lot_depth} ft` : "\u2014"}
                />
                <DetailItem
                  label="Min Frontage"
                  value={
                    plan.min_lot_frontage ? `${plan.min_lot_frontage} ft` : "\u2014"
                  }
                />
              </div>
            </div>
            {plan.notes && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{plan.notes}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit Floor Plan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailItem({
  label,
  value,
  highlighted,
}: {
  label: string
  value: string
  highlighted?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-sm", highlighted ? "font-bold" : "font-medium")}>
        {value}
      </p>
    </div>
  )
}

function AddFloorPlanDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "sfh" as "sfh" | "townhome",
    heated_sf: "",
    bedrooms: "",
    bathrooms: "",
    garage_type: "",
    stories: "",
    sb_cost: "",
    classic_upgrade_cost: "",
    elegance_upgrade_cost: "",
    min_lot_width: "",
    min_lot_depth: "",
    min_lot_frontage: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const heatedSf = parseInt(formData.heated_sf) || 0
      const sbCost = parseFloat(formData.sb_cost) || 0
      const softSiteCost = 13525

      const { error } = await supabase.from("floor_plans").insert({
        organization_id: user?.user_metadata?.organization_id || "",
        name: formData.name,
        type: formData.type,
        heated_sf: heatedSf,
        bedrooms: parseInt(formData.bedrooms) || null,
        bathrooms: parseFloat(formData.bathrooms) || null,
        garage_type: formData.garage_type || null,
        stories: parseFloat(formData.stories) || null,
        sb_cost: sbCost,
        classic_upgrade_cost: parseFloat(formData.classic_upgrade_cost) || null,
        elegance_upgrade_cost: parseFloat(formData.elegance_upgrade_cost) || null,
        standard_soft_site_cost: softSiteCost,
        total_cost_incl_soft: sbCost + softSiteCost,
        cost_per_heated_sf_sb: heatedSf > 0 ? Math.round((sbCost / heatedSf) * 100) / 100 : null,
        cost_per_heated_sf_total:
          heatedSf > 0
            ? Math.round(((sbCost + softSiteCost) / heatedSf) * 100) / 100
            : null,
        min_lot_width: parseFloat(formData.min_lot_width) || null,
        min_lot_depth: parseFloat(formData.min_lot_depth) || null,
        min_lot_frontage: parseFloat(formData.min_lot_frontage) || null,
        is_active: true,
      })

      if (error) throw error
      onSuccess()
      setFormData({
        name: "",
        type: "sfh",
        heated_sf: "",
        bedrooms: "",
        bathrooms: "",
        garage_type: "",
        stories: "",
        sb_cost: "",
        classic_upgrade_cost: "",
        elegance_upgrade_cost: "",
        min_lot_width: "",
        min_lot_depth: "",
        min_lot_frontage: "",
      })
    } catch {
      // handled by parent
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Floor Plan</DialogTitle>
          <DialogDescription>Add a new floor plan to the library.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: val as "sfh" | "townhome",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sfh">Single Family</SelectItem>
                  <SelectItem value="townhome">Townhome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Heated SF *</Label>
              <Input
                type="number"
                value={formData.heated_sf}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, heated_sf: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Beds</Label>
              <Input
                type="number"
                value={formData.bedrooms}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bedrooms: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Baths</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bathrooms: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Stories</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.stories}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stories: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Base S&B Cost ($) *</Label>
            <Input
              type="number"
              value={formData.sb_cost}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sb_cost: e.target.value }))
              }
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Floor Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
