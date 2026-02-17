"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, ArrowLeft, MapPin, Loader2 } from "lucide-react"
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

interface Municipality {
  id: string
  organization_id: string
  name: string
  state: "SC" | "NC" | null
  building_permit_fee: number | null
  grading_permit_fee: number | null
  mechanical_permit_fee: number | null
  electrical_permit_fee: number | null
  plumbing_permit_fee: number | null
  water_tap_fee: number | null
  sewer_tap_fee: number | null
  impact_fee_per_unit: number | null
  stormwater_fee: number | null
  tree_mitigation_fee: number | null
  road_impact_fee: number | null
  school_impact_fee: number | null
  park_impact_fee: number | null
  fire_impact_fee: number | null
  zoning_application_fee: number | null
  subdivision_application_fee: number | null
  plan_review_fee: number | null
  inspection_fee: number | null
  certificate_of_occupancy_fee: number | null
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

const FEE_FIELDS: Array<{ key: keyof Municipality; label: string; group: string }> = [
  { key: "water_tap_fee", label: "Water Tap Fee", group: "Utility Fees" },
  { key: "sewer_tap_fee", label: "Sewer Tap Fee", group: "Utility Fees" },
  { key: "stormwater_fee", label: "Stormwater Fee", group: "Utility Fees" },
  { key: "building_permit_fee", label: "Building Permit Fee", group: "Permit Fees" },
  { key: "grading_permit_fee", label: "Grading Permit Fee", group: "Permit Fees" },
  { key: "mechanical_permit_fee", label: "Mechanical Permit Fee", group: "Permit Fees" },
  { key: "electrical_permit_fee", label: "Electrical Permit Fee", group: "Permit Fees" },
  { key: "plumbing_permit_fee", label: "Plumbing Permit Fee", group: "Permit Fees" },
  { key: "plan_review_fee", label: "Plan Review Fee", group: "Permit Fees" },
  { key: "inspection_fee", label: "Inspection Fee", group: "Permit Fees" },
  { key: "certificate_of_occupancy_fee", label: "C/O Fee", group: "Permit Fees" },
  { key: "impact_fee_per_unit", label: "Impact Fee (per unit)", group: "Impact Fees" },
  { key: "road_impact_fee", label: "Road Impact Fee", group: "Impact Fees" },
  { key: "school_impact_fee", label: "School Impact Fee", group: "Impact Fees" },
  { key: "park_impact_fee", label: "Park Impact Fee", group: "Impact Fees" },
  { key: "fire_impact_fee", label: "Fire Impact Fee", group: "Impact Fees" },
  { key: "tree_mitigation_fee", label: "Tree Mitigation Fee", group: "Impact Fees" },
  { key: "zoning_application_fee", label: "Zoning Application Fee", group: "Application Fees" },
  { key: "subdivision_application_fee", label: "Subdivision Application Fee", group: "Application Fees" },
]

export default function MunicipalitiesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [stateFilter, setStateFilter] = useState<"all" | "SC" | "NC">("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editMuni, setEditMuni] = useState<Municipality | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const debouncedSearch = useDebounce(searchTerm, 300)

  const fetchMunicipalities = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      let query = supabase
        .from("municipalities")
        .select("*")
        .order("name", { ascending: true })

      if (debouncedSearch) {
        query = query.ilike("name", `%${debouncedSearch}%`)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      setMunicipalities((data as Municipality[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch municipalities")
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchMunicipalities()
  }, [fetchMunicipalities])

  const filtered = municipalities.filter((m) => {
    if (stateFilter === "all") return true
    return m.state === stateFilter
  })

  const scCount = municipalities.filter((m) => m.state === "SC").length
  const ncCount = municipalities.filter((m) => m.state === "NC").length

  const getTotalWsFees = (m: Municipality) => {
    const water = m.water_tap_fee || 0
    const sewer = m.sewer_tap_fee || 0
    return water + sewer
  }

  const getTotalImpactFees = (m: Municipality) => {
    return (
      (m.impact_fee_per_unit || 0) +
      (m.road_impact_fee || 0) +
      (m.school_impact_fee || 0) +
      (m.park_impact_fee || 0) +
      (m.fire_impact_fee || 0)
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Municipalities & Jurisdictions
          </h1>
          <p className="text-sm text-muted-foreground">
            {municipalities.length} municipalities ({scCount} SC, {ncCount} NC)
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          Add Municipality
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search municipalities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={stateFilter}
        onValueChange={(val) => setStateFilter(val as "all" | "SC" | "NC")}
      >
        <TabsList>
          <TabsTrigger value="all">All ({municipalities.length})</TabsTrigger>
          <TabsTrigger value="SC">South Carolina ({scCount})</TabsTrigger>
          <TabsTrigger value="NC">North Carolina ({ncCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={stateFilter} className="mt-6">
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={fetchMunicipalities}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No municipalities found</h3>
                <p className="text-sm text-muted-foreground">
                  Add your first municipality to configure jurisdiction fees.
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && filtered.length > 0 && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Name</th>
                      <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">State</th>
                      <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground">Water Tap</th>
                      <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground">Sewer Tap</th>
                      <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground">Impact Fees</th>
                      <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground">Total W/S</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((muni) => (
                      <tr
                        key={muni.id}
                        className="border-b cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => {
                          setEditMuni(muni)
                          setShowEditDialog(true)
                        }}
                      >
                        <td className="px-4 py-3 font-medium">{muni.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {muni.state || "\u2014"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {formatCurrency(muni.water_tap_fee)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {formatCurrency(muni.sewer_tap_fee)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {formatCurrency(getTotalImpactFees(muni))}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {formatCurrency(getTotalWsFees(muni))}
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

      {/* Edit Dialog */}
      {editMuni && (
        <MunicipalityFormDialog
          municipality={editMuni}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={async (data) => {
            try {
              const supabase = createClient()
              const { error: updateError } = await supabase
                .from("municipalities")
                .update(data)
                .eq("id", editMuni.id)

              if (updateError) throw updateError
              toast({ title: "Municipality updated" })
              fetchMunicipalities()
              setShowEditDialog(false)
            } catch {
              toast({
                title: "Error",
                description: "Failed to update municipality",
                variant: "destructive",
              })
            }
          }}
        />
      )}

      {/* Add Dialog */}
      <MunicipalityFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSave={async (data) => {
          try {
            const supabase = createClient()
            const {
              data: { user },
            } = await supabase.auth.getUser()

            const { error: insertError } = await supabase
              .from("municipalities")
              .insert({
                ...data,
                organization_id: user?.user_metadata?.organization_id || "",
              })

            if (insertError) throw insertError
            toast({ title: "Municipality added" })
            fetchMunicipalities()
            setShowAddDialog(false)
          } catch {
            toast({
              title: "Error",
              description: "Failed to add municipality",
              variant: "destructive",
            })
          }
        }}
      />
    </div>
  )
}

function MunicipalityFormDialog({
  municipality,
  open,
  onOpenChange,
  onSave,
}: {
  municipality?: Municipality
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<Municipality>) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Municipality>>({})

  useEffect(() => {
    if (municipality) {
      setFormData({ ...municipality })
    } else {
      setFormData({ name: "", state: "SC" as const })
    }
  }, [municipality, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(formData)
    setSaving(false)
  }

  const updateField = (key: keyof Municipality, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const groups = ["Utility Fees", "Permit Fees", "Impact Fees", "Application Fees"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {municipality ? `Edit: ${municipality.name}` : "Add Municipality"}
          </DialogTitle>
          <DialogDescription>
            Configure all fee details for this municipality.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Municipality Name *</Label>
              <Input
                value={(formData.name as string) || ""}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Select
                value={(formData.state as string) || "SC"}
                onValueChange={(val) => updateField("state", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SC">South Carolina</SelectItem>
                  <SelectItem value="NC">North Carolina</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {groups.map((group) => {
            const fields = FEE_FIELDS.filter((f) => f.group === group)
            return (
              <div key={group}>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  {group}
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {fields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={
                          formData[field.key] !== null &&
                          formData[field.key] !== undefined
                            ? String(formData[field.key])
                            : ""
                        }
                        onChange={(e) =>
                          updateField(
                            field.key,
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={(formData.notes as string) || ""}
              onChange={(e) => updateField("notes", e.target.value || null)}
              rows={3}
              placeholder="Additional notes about this municipality..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : municipality
                  ? "Save Changes"
                  : "Add Municipality"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
