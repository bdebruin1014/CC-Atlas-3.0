"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Search,
  Building2,
  ChevronDown,
  X,
  List,
  GitBranch,
  Loader2,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { EntityHierarchy } from "@/components/accounting/entity-hierarchy"
import type {
  Entity,
  EntityUseType,
  EntityLegalType,
  EntityStatus,
} from "@/lib/types/accounting"
import {
  ENTITY_USE_TYPE_LABELS,
  ENTITY_LEGAL_TYPE_LABELS,
} from "@/lib/types/accounting"
import { useOrganizationId } from "@/lib/hooks/use-organization"

// ---------------------------------------------------------------------------
// DB <-> UI mapping helpers
// ---------------------------------------------------------------------------

/** Map DB use_type enum value to UI EntityUseType */
function mapDbUseType(dbValue: string | null): EntityUseType {
  if (dbValue === "spe") return "single_purpose_entity"
  if (dbValue === "other") return "operating_company"
  return (dbValue as EntityUseType) ?? "operating_company"
}

/** Map UI EntityUseType back to DB enum value */
function mapUiUseType(uiValue: EntityUseType): string {
  if (uiValue === "single_purpose_entity") return "spe"
  return uiValue
}

/** Map DB entity row to the UI Entity type */
function mapDbEntity(row: Record<string, unknown>): Entity {
  const isActive = row.is_active as boolean | undefined
  let status: EntityStatus = "active"
  if (isActive === false) status = "inactive"

  return {
    id: row.id as string,
    organization_id: (row.organization_id as string) ?? "",
    name: row.name as string,
    legal_name: (row.name as string) ?? null,
    use_type: mapDbUseType(row.use_type as string | null),
    legal_type: mapDbLegalType(row.legal_type as string | null),
    ein: (row.ein as string) ?? null,
    state_of_formation: (row.state_of_formation as string) ?? null,
    formation_date: (row.formation_date as string) ?? null,
    registered_agent: (row.registered_agent as string) ?? null,
    parent_entity_id: (row.parent_entity_id as string) ?? null,
    status,
    notes: null,
    created_at: (row.created_at as string) ?? "",
    updated_at: (row.updated_at as string) ?? "",
  }
}

/** Map DB legal_type enum to UI EntityLegalType */
function mapDbLegalType(dbValue: string | null): EntityLegalType {
  const mapping: Record<string, EntityLegalType> = {
    llc: "llc",
    s_corp: "s_corp",
    partnership: "lp",
    c_corp: "corp",
    sole_proprietorship: "sole_proprietorship",
    trust: "trust",
    lp: "lp",
    corp: "corp",
  }
  return mapping[dbValue ?? ""] ?? "llc"
}

/** Map UI EntityLegalType back to DB enum value */
function mapUiLegalType(uiValue: EntityLegalType): string {
  const mapping: Record<EntityLegalType, string> = {
    llc: "llc",
    lp: "partnership",
    corp: "c_corp",
    s_corp: "s_corp",
    trust: "trust",
    sole_proprietorship: "sole_proprietorship",
  }
  return mapping[uiValue] ?? "llc"
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function EntitiesPage() {
  const router = useRouter()
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [useTypeFilter, setUseTypeFilter] = useState<EntityUseType[]>([])
  const [statusFilter, setStatusFilter] = useState<"all" | EntityStatus>("all")
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const { organizationId } = useOrganizationId()

  useEffect(() => {
    async function loadEntities() {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase.from("entities").select("*").order("name")
      if (data && data.length > 0) {
        setEntities(data.map((row) => mapDbEntity(row as unknown as Record<string, unknown>)))
      }
      setLoading(false)
    }
    loadEntities()
  }, [])

  const filteredEntities = useMemo(() => {
    return entities.filter((e) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        if (
          !e.name.toLowerCase().includes(q) &&
          !(e.legal_name || "").toLowerCase().includes(q) &&
          !(e.ein || "").includes(q)
        ) {
          return false
        }
      }
      if (useTypeFilter.length > 0 && !useTypeFilter.includes(e.use_type)) {
        return false
      }
      if (statusFilter !== "all" && e.status !== statusFilter) {
        return false
      }
      return true
    })
  }, [entities, searchTerm, useTypeFilter, statusFilter])

  const hasActiveFilters = searchTerm !== "" || useTypeFilter.length > 0 || statusFilter !== "all"

  const clearFilters = () => {
    setSearchTerm("")
    setUseTypeFilter([])
    setStatusFilter("all")
  }

  const toggleUseType = (type: EntityUseType) => {
    setUseTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  function getUseTypeBadgeClass(useType: EntityUseType): string {
    switch (useType) {
      case "holding_company": return "bg-purple-100 text-purple-800 hover:bg-purple-100"
      case "operating_company": return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      case "single_purpose_entity": return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
      case "fund_syndication": return "bg-amber-100 text-amber-800 hover:bg-amber-100"
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entities</h1>
          <p className="text-sm text-muted-foreground">
            Manage legal entities, SPEs, and fund structures
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          Add Entity
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entities by name, legal name, or EIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              Use Type
              {useTypeFilter.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {useTypeFilter.length}
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Entity Use Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.entries(ENTITY_USE_TYPE_LABELS) as [EntityUseType, string][]).map(
              ([value, label]) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={useTypeFilter.includes(value)}
                  onCheckedChange={() => toggleUseType(value)}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val as "all" | EntityStatus)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="dissolved">Dissolved</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex rounded-md border border-input">
          <Button
            variant={viewMode === "tree" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-r-none"
            onClick={() => setViewMode("tree")}
          >
            <GitBranch className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredEntities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No entities found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {hasActiveFilters
                ? "Try adjusting your search or filter criteria."
                : "Get started by adding your first entity."}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4" />
                Add Entity
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "tree" ? (
        <Card>
          <CardContent className="pt-6">
            <EntityHierarchy
              entities={filteredEntities}
              onEntityClick={(entity) => router.push(`/accounting/entities/${entity.id}`)}
            />
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Name</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Use Type</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Legal Type</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">EIN</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">State</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntities.map((entity) => (
                  <tr
                    key={entity.id}
                    className="border-b cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/accounting/entities/${entity.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{entity.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", getUseTypeBadgeClass(entity.use_type))}
                      >
                        {ENTITY_USE_TYPE_LABELS[entity.use_type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {ENTITY_LEGAL_TYPE_LABELS[entity.legal_type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {entity.ein ? `***-**-${entity.ein.slice(-4)}` : "--"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {entity.state_of_formation || "--"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          entity.status === "active"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : entity.status === "dissolved"
                            ? "bg-red-100 text-red-800 hover:bg-red-100"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        {entity.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {filteredEntities.length} entit{filteredEntities.length !== 1 ? "ies" : "y"}
            </p>
          </div>
        </Card>
      )}

      {/* Add Entity Dialog */}
      <AddEntityDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        entities={entities}
        organizationId={organizationId}
        onSuccess={(newEntity) => {
          setShowAddDialog(false)
          setEntities((prev) => [...prev, newEntity])
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Entity Dialog
// ---------------------------------------------------------------------------

function AddEntityDialog({
  open,
  onOpenChange,
  entities,
  organizationId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entities: Entity[]
  organizationId: string | null
  onSuccess: (entity: Entity) => void
}) {
  const [formData, setFormData] = useState({
    name: "",
    legal_name: "",
    use_type: "single_purpose_entity" as EntityUseType,
    legal_type: "llc" as EntityLegalType,
    ein: "",
    state_of_formation: "",
    formation_date: "",
    registered_agent: "",
    parent_entity_id: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setFormData({
      name: "",
      legal_name: "",
      use_type: "single_purpose_entity",
      legal_type: "llc",
      ein: "",
      state_of_formation: "",
      formation_date: "",
      registered_agent: "",
      parent_entity_id: "",
      notes: "",
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError("Entity name is required.")
      return
    }

    if (!organizationId) {
      setError("No organization context available. Please contact your administrator.")
      return
    }

    setSaving(true)

    // Build payload matching actual DB columns (lib/supabase/types.ts -> Entity)
    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      use_type: mapUiUseType(formData.use_type),
      legal_type: mapUiLegalType(formData.legal_type),
      ein: formData.ein.trim() || null,
      state_of_formation: formData.state_of_formation.trim() || null,
      formation_date: formData.formation_date || null,
      registered_agent: formData.registered_agent.trim() || null,
      parent_entity_id: formData.parent_entity_id || null,
      is_active: true,
      organization_id: organizationId,
    }

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: dbError } = await supabase
      .from("entities")
      .insert(payload as any)
      .select()
      .single()

    if (dbError) {
      setError(`Failed to create entity: ${dbError.message}`)
      setSaving(false)
      return
    }

    if (data) {
      resetForm()
      onSuccess(mapDbEntity(data as unknown as Record<string, unknown>))
    }
    setSaving(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Entity</DialogTitle>
          <DialogDescription>
            Create a new legal entity, SPE, or fund structure.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ent-name">Entity Name *</Label>
              <Input
                id="ent-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Red Cedar Homes SC LLC"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ent-legal">Legal Name</Label>
              <Input
                id="ent-legal"
                value={formData.legal_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, legal_name: e.target.value }))}
                placeholder="Same as entity name if blank"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Use Type *</Label>
              <Select
                value={formData.use_type}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, use_type: val as EntityUseType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ENTITY_USE_TYPE_LABELS) as [EntityUseType, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Legal Type *</Label>
              <Select
                value={formData.legal_type}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, legal_type: val as EntityLegalType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ENTITY_LEGAL_TYPE_LABELS) as [EntityLegalType, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ent-ein">EIN</Label>
              <Input
                id="ent-ein"
                value={formData.ein}
                onChange={(e) => setFormData((prev) => ({ ...prev, ein: e.target.value }))}
                placeholder="XX-XXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ent-state">State of Formation</Label>
              <Input
                id="ent-state"
                value={formData.state_of_formation}
                onChange={(e) => setFormData((prev) => ({ ...prev, state_of_formation: e.target.value }))}
                placeholder="SC"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ent-date">Formation Date</Label>
              <Input
                id="ent-date"
                type="date"
                value={formData.formation_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, formation_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ent-agent">Registered Agent</Label>
              <Input
                id="ent-agent"
                value={formData.registered_agent}
                onChange={(e) => setFormData((prev) => ({ ...prev, registered_agent: e.target.value }))}
                placeholder="CT Corporation"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Parent Entity</Label>
            <Select
              value={formData.parent_entity_id}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, parent_entity_id: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (top-level entity)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (top-level)</SelectItem>
                {entities
                  .filter((e) => e.status === "active")
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ent-notes">Notes</Label>
            <Textarea
              id="ent-notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Entity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
