"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Clock,
  Loader2,
  Save,
  Pencil,
  Check,
  X,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

interface FloorPlan {
  id: string
  name: string
  type: string
}

interface SchedulePhase {
  id?: string
  floor_plan_id: string
  phase_number: number
  phase_name: string
  duration_days: number
  required_inspections: string[]
}

const DEFAULT_PHASES: Array<{ number: number; name: string; duration: number; inspections: string[] }> = [
  { number: 1, name: "Site Preparation", duration: 5, inspections: ["Erosion Control"] },
  { number: 2, name: "Foundation", duration: 7, inspections: ["Footing", "Foundation Wall"] },
  { number: 3, name: "Foundation Waterproofing & Backfill", duration: 3, inspections: ["Waterproofing"] },
  { number: 4, name: "Rough Plumbing (Under Slab)", duration: 3, inspections: ["Under Slab Plumbing"] },
  { number: 5, name: "Slab Pour", duration: 2, inspections: ["Pre-Pour"] },
  { number: 6, name: "Framing", duration: 14, inspections: ["Framing"] },
  { number: 7, name: "Roofing & Sheathing", duration: 5, inspections: ["Sheathing"] },
  { number: 8, name: "Windows & Exterior Doors", duration: 3, inspections: [] },
  { number: 9, name: "Rough MEP", duration: 10, inspections: ["Rough Electrical", "Rough Plumbing", "Rough Mechanical"] },
  { number: 10, name: "Insulation", duration: 3, inspections: ["Insulation"] },
  { number: 11, name: "Drywall", duration: 10, inspections: [] },
  { number: 12, name: "Interior Trim & Cabinets", duration: 10, inspections: [] },
  { number: 13, name: "Paint & Finishes", duration: 7, inspections: [] },
  { number: 14, name: "Finish MEP & Fixtures", duration: 5, inspections: ["Final Electrical", "Final Plumbing", "Final Mechanical"] },
  { number: 15, name: "Flooring & Final Finishes", duration: 5, inspections: [] },
  { number: 16, name: "Final Punch & C/O", duration: 5, inspections: ["Final Building", "Certificate of Occupancy"] },
]

export default function ScheduleTemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [phases, setPhases] = useState<SchedulePhase[]>([])
  const [loading, setLoading] = useState(true)
  const [phasesLoading, setPhasesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingPhase, setEditingPhase] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<SchedulePhase>>({})
  const [hasChanges, setHasChanges] = useState(false)

  const fetchFloorPlans = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("floor_plans")
        .select("id, name, type")
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (error) throw error
      setFloorPlans((data as FloorPlan[]) || [])
      if (data && data.length > 0 && !selectedPlanId) {
        setSelectedPlanId(data[0].id)
      }
    } catch {
      setFloorPlans([])
    } finally {
      setLoading(false)
    }
  }, [selectedPlanId])

  useEffect(() => {
    fetchFloorPlans()
  }, [fetchFloorPlans])

  const fetchPhases = useCallback(async () => {
    if (!selectedPlanId) return
    setPhasesLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("schedule_templates")
        .select("*")
        .eq("floor_plan_id", selectedPlanId)
        .order("phase_number", { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        setPhases(data as SchedulePhase[])
      } else {
        setPhases(
          DEFAULT_PHASES.map((p) => ({
            floor_plan_id: selectedPlanId,
            phase_number: p.number,
            phase_name: p.name,
            duration_days: p.duration,
            required_inspections: p.inspections,
          }))
        )
      }
      setHasChanges(false)
    } catch {
      setPhases([])
    } finally {
      setPhasesLoading(false)
    }
  }, [selectedPlanId])

  useEffect(() => {
    fetchPhases()
  }, [fetchPhases])

  const totalDuration = phases.reduce((sum, p) => sum + p.duration_days, 0)

  const startEditing = (phaseNumber: number) => {
    const phase = phases.find((p) => p.phase_number === phaseNumber)
    if (phase) {
      setEditingPhase(phaseNumber)
      setEditData({
        phase_name: phase.phase_name,
        duration_days: phase.duration_days,
        required_inspections: phase.required_inspections,
      })
    }
  }

  const cancelEditing = () => {
    setEditingPhase(null)
    setEditData({})
  }

  const applyEdit = () => {
    if (editingPhase === null) return
    setPhases((prev) =>
      prev.map((p) =>
        p.phase_number === editingPhase
          ? {
              ...p,
              phase_name: editData.phase_name || p.phase_name,
              duration_days: editData.duration_days ?? p.duration_days,
              required_inspections:
                editData.required_inspections ?? p.required_inspections,
            }
          : p
      )
    )
    setEditingPhase(null)
    setEditData({})
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()

      await supabase
        .from("schedule_templates")
        .delete()
        .eq("floor_plan_id", selectedPlanId)

      const records = phases.map((p) => ({
        floor_plan_id: selectedPlanId,
        phase_number: p.phase_number,
        phase_name: p.phase_name,
        duration_days: p.duration_days,
        required_inspections: p.required_inspections,
      }))

      const { error: insertError } = await supabase
        .from("schedule_templates")
        .insert(records)

      if (insertError) throw insertError

      toast({
        title: "Schedule saved",
        description: `${phases.length} phases saved for this floor plan.`,
      })
      setHasChanges(false)
      fetchPhases()
    } catch {
      toast({
        title: "Error",
        description: "Failed to save schedule template",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
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
          <h1 className="text-2xl font-bold tracking-tight">Schedule Templates</h1>
          <p className="text-sm text-muted-foreground">
            Configure 16-phase construction schedule by floor plan
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Floor Plan Selector */}
      <div className="flex items-center gap-4">
        <Label className="whitespace-nowrap">Floor Plan:</Label>
        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a floor plan..." />
          </SelectTrigger>
          <SelectContent>
            {floorPlans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name} ({plan.type === "sfh" ? "SFH" : "TH"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasChanges && (
          <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
            Unsaved Changes
          </Badge>
        )}
      </div>

      {phasesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : phases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No schedule template</h3>
            <p className="text-sm text-muted-foreground">
              Select a floor plan to configure its construction schedule.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Phase Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground w-16">
                      Phase
                    </th>
                    <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground w-32">
                      Duration (days)
                    </th>
                    <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                      Required Inspections
                    </th>
                    <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map((phase) => {
                    const isEditing = editingPhase === phase.phase_number

                    return (
                      <tr
                        key={phase.phase_number}
                        className={cn(
                          "border-b transition-colors",
                          isEditing && "bg-muted/50"
                        )}
                      >
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs font-mono">
                            {phase.phase_number}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input
                              value={editData.phase_name || ""}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  phase_name: e.target.value,
                                }))
                              }
                              className="h-8"
                            />
                          ) : (
                            <span className="text-sm font-medium">
                              {phase.phase_name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editData.duration_days ?? ""}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  duration_days: parseInt(e.target.value) || 0,
                                }))
                              }
                              className="h-8 w-20 ml-auto text-right"
                            />
                          ) : (
                            <span className="text-sm">{phase.duration_days}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input
                              value={(editData.required_inspections || []).join(", ")}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  required_inspections: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                }))
                              }
                              className="h-8"
                              placeholder="Comma-separated inspections"
                            />
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {phase.required_inspections.length > 0 ? (
                                phase.required_inspections.map((insp) => (
                                  <Badge
                                    key={insp}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {insp}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  None
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={applyEdit}
                              >
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={cancelEditing}
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => startEditing(phase.phase_number)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td className="px-4 py-3 font-medium text-sm" colSpan={2}>
                      Total Build Duration
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-sm">
                      {totalDuration} days
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      ~{Math.round(totalDuration / 7)} weeks / ~
                      {Math.round(totalDuration / 30)} months
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Visual Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline Preview
              </CardTitle>
              <CardDescription>
                Visual representation of the construction schedule ({totalDuration}{" "}
                total days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {phases.map((phase) => {
                  const widthPct =
                    totalDuration > 0
                      ? (phase.duration_days / totalDuration) * 100
                      : 0
                  const colors = [
                    "bg-blue-500",
                    "bg-green-500",
                    "bg-amber-500",
                    "bg-purple-500",
                    "bg-red-500",
                    "bg-teal-500",
                    "bg-indigo-500",
                    "bg-pink-500",
                  ]
                  const colorIdx = (phase.phase_number - 1) % colors.length

                  return (
                    <div
                      key={phase.phase_number}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="w-6 text-right font-mono text-muted-foreground">
                        {phase.phase_number}
                      </span>
                      <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded flex items-center px-2 text-white font-medium truncate",
                            colors[colorIdx]
                          )}
                          style={{
                            width: `${Math.max(widthPct, 2)}%`,
                          }}
                        >
                          {widthPct > 8 && (
                            <span className="truncate">
                              {phase.phase_name} ({phase.duration_days}d)
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="w-8 text-right text-muted-foreground">
                        {phase.duration_days}d
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
