"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  User,
  MapPin,
  FileText,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import type { ClientType, ContractType } from "@/lib/construction/types"

export default function NewJobPage() {
  const router = useRouter()
  const { toast } = useToast()

  // ---- Form State ----
  const [jobName, setJobName] = useState("")
  const [clientType, setClientType] = useState<ClientType>("internal")
  const [clientEntity, setClientEntity] = useState("")
  const [clientName, setClientName] = useState("")
  const [contractType, setContractType] = useState<ContractType>("cost_plus")
  const [contractAmount, setContractAmount] = useState("")
  const [builderFee, setBuilderFee] = useState("")
  const [unitCount, setUnitCount] = useState("")
  const [linkedProject, setLinkedProject] = useState("")
  const [state, setState] = useState<"SC" | "NC">("SC")
  const [superintendent, setSuperintendent] = useState("")
  const [projectManager, setProjectManager] = useState("")
  const [startDate, setStartDate] = useState("")
  const [projectedCompletion, setProjectedCompletion] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const parsedContractAmount = parseFloat(contractAmount) || 0
  const parsedBuilderFee = parseFloat(builderFee) || 0
  const parsedUnitCount = parseInt(unitCount) || 0

  const feePct =
    parsedContractAmount > 0
      ? ((parsedBuilderFee / parsedContractAmount) * 100).toFixed(1)
      : "0.0"

  const isValid =
    jobName &&
    (clientType === "internal" ? clientEntity : clientName) &&
    contractType &&
    parsedContractAmount > 0 &&
    parsedUnitCount > 0 &&
    superintendent &&
    projectManager &&
    startDate

  const handleSubmit = async () => {
    if (!isValid) return
    setSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toast({
      title: "Job Created",
      description: `${jobName} with ${parsedUnitCount} units has been created successfully.`,
    })

    setSubmitting(false)
    router.push("/construction")
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/construction")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create New Job
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up a new construction job with units and assignments
          </p>
        </div>
      </div>

      {/* Job Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Job Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jobName">Job Name *</Label>
            <Input
              id="jobName"
              placeholder="e.g., Millbrook Crossing Phase 3"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client Type *</Label>
              <Select
                value={clientType}
                onValueChange={(v) => setClientType(v as ClientType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="third_party">Third-Party</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {clientType === "internal" ? (
              <div className="space-y-2">
                <Label>Client Entity *</Label>
                <Select value={clientEntity} onValueChange={setClientEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Red Cedar Homes SC, LLC">
                      Red Cedar Homes SC, LLC
                    </SelectItem>
                    <SelectItem value="Red Cedar Homes NC, LLC">
                      Red Cedar Homes NC, LLC
                    </SelectItem>
                    <SelectItem value="Red Cedar Development, LLC">
                      Red Cedar Development, LLC
                    </SelectItem>
                    <SelectItem value="RCH Land Holdings, LLC">
                      RCH Land Holdings, LLC
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  placeholder="e.g., Palmetto Land Group"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>State *</Label>
              <Select
                value={state}
                onValueChange={(v) => setState(v as "SC" | "NC")}
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

            <div className="space-y-2">
              <Label htmlFor="unitCount">Unit Count *</Label>
              <Input
                id="unitCount"
                type="number"
                placeholder="e.g., 24"
                value={unitCount}
                onChange={(e) => setUnitCount(e.target.value)}
                min="1"
              />
            </div>
          </div>

          {clientType === "internal" && (
            <div className="space-y-2">
              <Label htmlFor="linkedProject">Linked Project (optional)</Label>
              <Select value={linkedProject} onValueChange={setLinkedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project to link..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proj-001">
                    PRJ-001 - Millbrook Crossing
                  </SelectItem>
                  <SelectItem value="proj-003">
                    PRJ-003 - River Bend
                  </SelectItem>
                  <SelectItem value="proj-005">
                    PRJ-005 - Magnolia Row
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            Contract Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Contract Type *</Label>
            <Select
              value={contractType}
              onValueChange={(v) => setContractType(v as ContractType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cost_plus">Cost Plus</SelectItem>
                <SelectItem value="fixed_price">Fixed Price</SelectItem>
                <SelectItem value="time_materials">
                  Time & Materials
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractAmount">Contract Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="contractAmount"
                  type="number"
                  placeholder="0.00"
                  value={contractAmount}
                  onChange={(e) => setContractAmount(e.target.value)}
                  className="pl-7"
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="builderFee">Builder Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="builderFee"
                  type="number"
                  placeholder="0.00"
                  value={builderFee}
                  onChange={(e) => setBuilderFee(e.target.value)}
                  className="pl-7"
                  min="0"
                  step="1000"
                />
              </div>
              {parsedContractAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {feePct}% of contract amount
                </p>
              )}
            </div>
          </div>

          {parsedContractAmount > 0 && parsedUnitCount > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per Unit Average</span>
                <span className="font-medium">
                  {formatCurrency(parsedContractAmount / parsedUnitCount)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Team Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Superintendent *</Label>
              <Select value={superintendent} onValueChange={setSuperintendent}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign superintendent..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mike Thompson">Mike Thompson</SelectItem>
                  <SelectItem value="Dave Rodriguez">
                    Dave Rodriguez
                  </SelectItem>
                  <SelectItem value="Jim Patterson">Jim Patterson</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project Manager *</Label>
              <Select value={projectManager} onValueChange={setProjectManager}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign PM..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sarah Chen">Sarah Chen</SelectItem>
                  <SelectItem value="Maria Gonzalez">
                    Maria Gonzalez
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectedCompletion">
                Projected Completion
              </Label>
              <Input
                id="projectedCompletion"
                type="date"
                value={projectedCompletion}
                onChange={(e) => setProjectedCompletion(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button
          variant="outline"
          onClick={() => router.push("/construction")}
        >
          Cancel
        </Button>
        <Button disabled={!isValid || submitting} onClick={handleSubmit}>
          {submitting ? "Creating..." : "Create Job"}
        </Button>
      </div>
    </div>
  )
}
