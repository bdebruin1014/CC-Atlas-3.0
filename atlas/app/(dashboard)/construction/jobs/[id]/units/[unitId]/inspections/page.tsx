"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  ClipboardCheck,
  AlertTriangle,
  Calendar,
  RotateCcw,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { MOCK_UNITS_JOB001, generateMilestones } from "@/lib/construction/mock-data"
import {
  CONSTRUCTION_PHASES,
  PHASE_INSPECTIONS,
  INSPECTION_RESULT_CONFIG,
} from "@/lib/construction/types"
import type { Inspection, InspectionResult } from "@/lib/construction/types"

const ALL_INSPECTION_TYPES = [
  "Erosion Control",
  "Footer",
  "Foundation Wall",
  "Waterproofing",
  "Framing",
  "Plumbing Rough",
  "Electrical Rough",
  "HVAC Rough",
  "Insulation",
  "Plumbing Final",
  "Electrical Final",
  "HVAC Final",
  "Grading/Drainage",
  "Final/CO",
  "Fire Sprinkler",
  "Energy Compliance",
  "Other",
]

export default function InspectionsPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const unitId = params.unitId as string

  const unit = MOCK_UNITS_JOB001.find((u) => u.id === unitId)
  const milestones = unit
    ? generateMilestones(unitId, unit.current_phase)
    : []
  const initialInspections = milestones.flatMap((m) => m.inspections)

  const [inspections, setInspections] =
    useState<Inspection[]>(initialInspections)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [selectedInspection, setSelectedInspection] =
    useState<Inspection | null>(null)

  // Schedule form
  const [schedType, setSchedType] = useState("")
  const [schedDate, setSchedDate] = useState("")
  const [schedInspector, setSchedInspector] = useState("")
  const [schedMunicipality, setSchedMunicipality] = useState("Greenville County")

  // Result form
  const [resultValue, setResultValue] = useState<InspectionResult | "">("")
  const [resultNotes, setResultNotes] = useState("")

  if (!unit) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold">Unit not found</h2>
      </div>
    )
  }

  const passed = inspections.filter((i) => i.result === "pass").length
  const failed = inspections.filter((i) => i.result === "fail").length
  const pending = inspections.filter((i) => !i.result).length
  const conditional = inspections.filter(
    (i) => i.result === "conditional"
  ).length

  const handleSchedule = () => {
    if (!schedType || !schedDate) return

    const newInsp: Inspection = {
      id: `insp-new-${Date.now()}`,
      unit_id: unitId,
      type: schedType,
      scheduled_date: schedDate,
      inspector: schedInspector || undefined,
      municipality: schedMunicipality || undefined,
      is_required: false,
      is_reinspection: false,
    }

    setInspections((prev) => [...prev, newInsp])
    setShowScheduleDialog(false)
    setSchedType("")
    setSchedDate("")
    setSchedInspector("")
  }

  const handleRecordResult = () => {
    if (!selectedInspection || !resultValue) return

    setInspections((prev) =>
      prev.map((i) =>
        i.id === selectedInspection.id
          ? {
              ...i,
              result: resultValue as InspectionResult,
              actual_date: new Date().toISOString().split("T")[0],
              notes: resultNotes || undefined,
            }
          : i
      )
    )

    setShowResultDialog(false)
    setSelectedInspection(null)
    setResultValue("")
    setResultNotes("")
  }

  const handleReinspection = (insp: Inspection) => {
    const reinsp: Inspection = {
      id: `insp-re-${Date.now()}`,
      unit_id: unitId,
      milestone_id: insp.milestone_id,
      phase_number: insp.phase_number,
      type: `${insp.type} (Re-Inspection)`,
      scheduled_date: new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .split("T")[0],
      inspector: insp.inspector,
      municipality: insp.municipality,
      is_required: insp.is_required,
      is_reinspection: true,
      original_inspection_id: insp.id,
    }
    setInspections((prev) => [...prev, reinsp])
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push(`/construction/jobs/${jobId}/units/${unitId}`)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Unit {unit.unit_number}
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Inspections - {unit.unit_number}
            </h1>
            <p className="text-sm text-muted-foreground">
              {unit.floor_plan_name} &middot; {unit.address}
            </p>
          </div>
          <Button onClick={() => setShowScheduleDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Inspection
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Passed</p>
            <p className="text-2xl font-bold text-green-600">{passed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-red-600">{failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Conditional</p>
            <p className="text-2xl font-bold text-yellow-600">
              {conditional}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-blue-600">{pending}</p>
          </CardContent>
        </Card>
      </div>

      {/* Inspections List */}
      <div className="space-y-2">
        {inspections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ClipboardCheck className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">
                No inspections scheduled
              </h3>
              <p className="text-sm text-muted-foreground">
                Schedule inspections as construction phases are completed.
              </p>
            </CardContent>
          </Card>
        ) : (
          inspections.map((insp) => {
            const phaseName = insp.phase_number
              ? CONSTRUCTION_PHASES.find(
                  (p) => p.number === insp.phase_number
                )?.name
              : undefined

            return (
              <Card
                key={insp.id}
                className={cn(
                  insp.result === "fail" &&
                    "border-red-200 dark:border-red-800"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <ClipboardCheck
                        className={cn(
                          "h-5 w-5 mt-0.5 shrink-0",
                          insp.result === "pass"
                            ? "text-green-600"
                            : insp.result === "fail"
                            ? "text-red-600"
                            : insp.result === "conditional"
                            ? "text-yellow-600"
                            : "text-muted-foreground"
                        )}
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{insp.type}</span>
                          {insp.is_required && (
                            <Badge
                              variant="outline"
                              className="text-xs border-orange-300 text-orange-700"
                            >
                              Required
                            </Badge>
                          )}
                          {insp.is_reinspection && (
                            <Badge
                              variant="outline"
                              className="text-xs border-purple-300 text-purple-700"
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Re-Inspection
                            </Badge>
                          )}
                          {insp.result && (
                            <Badge
                              className={cn(
                                "text-xs",
                                INSPECTION_RESULT_CONFIG[insp.result].bgColor
                              )}
                            >
                              {INSPECTION_RESULT_CONFIG[insp.result].label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {phaseName && <span>Phase: {phaseName}</span>}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Scheduled:{" "}
                            {formatDate(insp.scheduled_date, { short: true })}
                          </span>
                          {insp.actual_date && (
                            <span>
                              Actual:{" "}
                              {formatDate(insp.actual_date, { short: true })}
                            </span>
                          )}
                          {insp.inspector && (
                            <span>Inspector: {insp.inspector}</span>
                          )}
                          {insp.municipality && (
                            <span>{insp.municipality}</span>
                          )}
                        </div>
                        {insp.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Notes: {insp.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!insp.result && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInspection(insp)
                            setShowResultDialog(true)
                          }}
                        >
                          Record Result
                        </Button>
                      )}
                      {insp.result === "fail" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReinspection(insp)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Re-Inspect
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Schedule New Inspection Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Inspection</DialogTitle>
            <DialogDescription>
              Schedule a new inspection for this unit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Inspection Type *</Label>
              <Select value={schedType} onValueChange={setSchedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {ALL_INSPECTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedDate">Date *</Label>
              <Input
                id="schedDate"
                type="date"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedInspector">Inspector</Label>
              <Input
                id="schedInspector"
                placeholder="Inspector name..."
                value={schedInspector}
                onChange={(e) => setSchedInspector(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Municipality</Label>
              <Select
                value={schedMunicipality}
                onValueChange={setSchedMunicipality}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Greenville County">
                    Greenville County
                  </SelectItem>
                  <SelectItem value="City of Greenville">
                    City of Greenville
                  </SelectItem>
                  <SelectItem value="Spartanburg County">
                    Spartanburg County
                  </SelectItem>
                  <SelectItem value="Mecklenburg County">
                    Mecklenburg County
                  </SelectItem>
                  <SelectItem value="City of Charlotte">
                    City of Charlotte
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!schedType || !schedDate}
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Inspection Result</DialogTitle>
            <DialogDescription>
              {selectedInspection?.type} -{" "}
              {formatDate(selectedInspection?.scheduled_date)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Result *</Label>
              <Select
                value={resultValue}
                onValueChange={(v) =>
                  setResultValue(v as InspectionResult)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select result..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultNotes">Notes</Label>
              <Textarea
                id="resultNotes"
                placeholder="Inspection notes, deficiencies, conditions..."
                value={resultNotes}
                onChange={(e) => setResultNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResultDialog(false)
                setResultValue("")
                setResultNotes("")
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRecordResult} disabled={!resultValue}>
              Save Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
