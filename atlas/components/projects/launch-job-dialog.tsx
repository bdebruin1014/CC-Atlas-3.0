"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { toast } from "@/lib/hooks/use-toast"
import { useFloorPlans, type Project } from "@/lib/hooks/use-projects"
import { useOrgProfiles } from "@/lib/hooks/use-workflow"

interface LaunchJobDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}

const UPGRADE_PACKAGES = [
  { value: "standard", label: "Standard" },
  { value: "classic", label: "Classic" },
  { value: "elegance", label: "Elegance" },
  { value: "harmony", label: "Harmony" },
]

/**
 * Parse a lot number input like "101-110" or "A1, A2, A3" into an array of strings.
 */
function parseLotNumbers(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  // Check for range pattern like "101-110"
  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/)
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)
    if (!isNaN(start) && !isNaN(end) && end >= start && end - start < 200) {
      return Array.from({ length: end - start + 1 }, (_, i) =>
        String(start + i)
      )
    }
  }

  // Comma-separated
  return trimmed
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function LaunchJobDialog({
  project,
  open,
  onOpenChange,
}: LaunchJobDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { floorPlans } = useFloorPlans()
  const { data: profiles = [] } = useOrgProfiles()

  const isMultiUnit =
    project.type === "community_development" ||
    project.type === "lot_development"

  // Form state
  const [jobName, setJobName] = useState(project.name)
  const [superintendentId, setSuperintendentId] = useState("")
  const [pmId, setPmId] = useState("")
  const [startDate, setStartDate] = useState(
    project.construction_start_date?.slice(0, 10) ?? ""
  )

  // Single unit fields
  const [floorPlanId, setFloorPlanId] = useState(project.floor_plan_id ?? "")
  const [upgradePackage, setUpgradePackage] = useState("")
  const [lotNumber, setLotNumber] = useState("")

  // Multi-unit fields
  const [lotNumbersInput, setLotNumbersInput] = useState("")
  const [multiFloorPlanId, setMultiFloorPlanId] = useState("")

  const [submitting, setSubmitting] = useState(false)

  const parsedLots = useMemo(
    () => parseLotNumbers(lotNumbersInput),
    [lotNumbersInput]
  )

  const handleSubmit = async () => {
    if (!jobName.trim()) {
      toast({ title: "Job name is required", variant: "destructive" })
      return
    }

    // Build units array
    let units: {
      unit_number: string
      floor_plan_id?: string | null
      upgrade_package?: string | null
    }[]

    if (isMultiUnit) {
      if (parsedLots.length === 0) {
        toast({
          title: "Enter lot numbers",
          description: "Provide comma-separated lot numbers or a range (e.g. 101-120).",
          variant: "destructive",
        })
        return
      }
      units = parsedLots.map((lot) => ({
        unit_number: `Lot ${lot}`,
        floor_plan_id: multiFloorPlanId || null,
        upgrade_package: null,
      }))
    } else {
      units = [
        {
          unit_number: lotNumber.trim() ? `Lot ${lotNumber.trim()}` : "Unit 1",
          floor_plan_id: floorPlanId || null,
          upgrade_package: upgradePackage || null,
        },
      ]
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/launch-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: jobName.trim(),
          superintendent_id: superintendentId || null,
          pm_id: pmId || null,
          start_date: startDate || null,
          units,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast({
          title: "Failed to launch job",
          description: json.error ?? "An unexpected error occurred.",
          variant: "destructive",
        })
        return
      }

      toast({ title: "Construction job launched successfully" })

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["projects", "detail", project.id] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["jobs"] })

      onOpenChange(false)

      // Navigate to new job
      router.push(`/construction/jobs/${json.data.jobId}`)
    } catch {
      toast({
        title: "Failed to launch job",
        description: "A network error occurred.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Launch Construction Job</DialogTitle>
          <DialogDescription>
            Create a construction job linked to this project. Units and
            milestones will be auto-created.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Project name (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Project</Label>
            <Input value={project.name} disabled />
          </div>

          {/* Job name */}
          <div className="space-y-2">
            <Label htmlFor="lj-name">Job Name</Label>
            <Input
              id="lj-name"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="Enter job name"
            />
          </div>

          {/* Superintendent */}
          <div className="space-y-2">
            <Label>Superintendent</Label>
            <Select value={superintendentId} onValueChange={setSuperintendentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select superintendent" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Manager */}
          <div className="space-y-2">
            <Label>Project Manager</Label>
            <Select value={pmId} onValueChange={setPmId}>
              <SelectTrigger>
                <SelectValue placeholder="Select PM" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="lj-start">Start Date</Label>
            <Input
              id="lj-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* --- Unit Fields --- */}
          {isMultiUnit ? (
            <>
              {/* Multi-unit: lot numbers + floor plan */}
              <div className="space-y-2">
                <Label htmlFor="lj-lots">
                  Lot Numbers{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (comma-separated or range, e.g. 101-120)
                  </span>
                </Label>
                <Input
                  id="lj-lots"
                  value={lotNumbersInput}
                  onChange={(e) => setLotNumbersInput(e.target.value)}
                  placeholder="101-120 or A1, A2, A3"
                />
                {parsedLots.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {parsedLots.length} unit{parsedLots.length !== 1 ? "s" : ""}{" "}
                    will be created
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Floor Plan (all units)</Label>
                <Select
                  value={multiFloorPlanId}
                  onValueChange={setMultiFloorPlanId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {floorPlans.map((fp) => (
                      <SelectItem key={fp.id} value={fp.id}>
                        {fp.name}
                        {fp.square_footage
                          ? ` (${fp.square_footage.toLocaleString()} sf)`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              {/* Single unit fields */}
              <div className="space-y-2">
                <Label htmlFor="lj-lot">Lot Number</Label>
                <Input
                  id="lj-lot"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="e.g. 42"
                />
              </div>

              <div className="space-y-2">
                <Label>Floor Plan</Label>
                <Select value={floorPlanId} onValueChange={setFloorPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {floorPlans.map((fp) => (
                      <SelectItem key={fp.id} value={fp.id}>
                        {fp.name}
                        {fp.square_footage
                          ? ` (${fp.square_footage.toLocaleString()} sf)`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Upgrade Package</Label>
                <Select value={upgradePackage} onValueChange={setUpgradePackage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {UPGRADE_PACKAGES.map((pkg) => (
                      <SelectItem key={pkg.value} value={pkg.value}>
                        {pkg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !jobName.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {submitting ? "Launching..." : "Launch Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
