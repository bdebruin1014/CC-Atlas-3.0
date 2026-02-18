"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  User,
  Loader2,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useCreateJob } from "@/lib/hooks/use-jobs"
import { useEntities } from "@/lib/hooks/use-projects"
import { useProjects } from "@/lib/hooks/use-projects"
import { useOrgProfiles } from "@/lib/hooks/use-workflow"
import { useOrganizationId } from "@/lib/hooks/use-organization"
import type { ClientType, ContractType } from "@/lib/construction/types"

export default function NewJobPage() {
  const router = useRouter()
  const { toast } = useToast()
  const createJob = useCreateJob()
  const { organizationId, loading: orgLoading, error: orgError } = useOrganizationId()

  // Fetch real data for dropdowns
  const { entities, loading: entitiesLoading } = useEntities()
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const { data: orgProfiles = [], isLoading: profilesLoading } = useOrgProfiles()

  // ---- Form State ----
  const [jobName, setJobName] = useState("")
  const [clientType, setClientType] = useState<ClientType>("internal")
  const [clientEntityId, setClientEntityId] = useState("")
  const [clientName, setClientName] = useState("")
  const [contractType, setContractType] = useState<ContractType>("cost_plus")
  const [contractAmount, setContractAmount] = useState("")
  const [builderFee, setBuilderFee] = useState("")
  const [unitCount, setUnitCount] = useState("")
  const [linkedProject, setLinkedProject] = useState("")
  const [state, setState] = useState<"SC" | "NC">("SC")
  const [superintendentId, setSuperintendentId] = useState("")
  const [projectManagerId, setProjectManagerId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [projectedCompletion, setProjectedCompletion] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const parsedContractAmount = parseFloat(contractAmount) || 0
  const parsedBuilderFee = parseFloat(builderFee) || 0
  const parsedUnitCount = parseInt(unitCount) || 0

  const feePct =
    parsedContractAmount > 0
      ? ((parsedBuilderFee / parsedContractAmount) * 100).toFixed(1)
      : "0.0"

  const isValid =
    jobName &&
    (clientType === "internal" ? clientEntityId : clientName) &&
    contractType &&
    parsedContractAmount > 0 &&
    parsedUnitCount > 0 &&
    superintendentId &&
    projectManagerId &&
    startDate

  const handleSubmit = async () => {
    if (!isValid) return
    setFormError(null)

    try {
      const result = await createJob.mutateAsync({
        name: jobName,
        client_type: clientType,
        client_entity_id: clientType === "internal" ? clientEntityId : null,
        client_id: clientType === "third_party" ? clientName : null,
        contract_type: contractType,
        contract_amount: parsedContractAmount,
        builder_fee: parsedBuilderFee || null,
        unit_count: parsedUnitCount,
        linked_project_id: linkedProject || null,
        state,
        superintendent_id: superintendentId,
        pm_id: projectManagerId,
        start_date: startDate,
        projected_completion: projectedCompletion || null,
      })

      toast({
        title: "Job Created",
        description: `${jobName} with ${parsedUnitCount} units has been created successfully.`,
      })

      router.push("/construction")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create job"
      setFormError(message)
      toast({
        title: "Job creation failed",
        description: message,
        variant: "destructive",
      })
    }
  }

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
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

      {/* Error */}
      {(formError || orgError) && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {formError || orgError}
        </div>
      )}

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
                <Select value={clientEntityId} onValueChange={setClientEntityId}>
                  <SelectTrigger>
                    <SelectValue placeholder={entitiesLoading ? "Loading..." : "Select entity..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
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
                  <SelectValue placeholder={projectsLoading ? "Loading..." : "Select project to link..."} />
                </SelectTrigger>
                <SelectContent>
                  {(projects ?? []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_number} - {project.name}
                    </SelectItem>
                  ))}
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
              <Select value={superintendentId} onValueChange={setSuperintendentId}>
                <SelectTrigger>
                  <SelectValue placeholder={profilesLoading ? "Loading..." : "Assign superintendent..."} />
                </SelectTrigger>
                <SelectContent>
                  {orgProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project Manager *</Label>
              <Select value={projectManagerId} onValueChange={setProjectManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder={profilesLoading ? "Loading..." : "Assign PM..."} />
                </SelectTrigger>
                <SelectContent>
                  {orgProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
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
        <Button disabled={!isValid || createJob.isPending} onClick={handleSubmit}>
          {createJob.isPending ? "Creating..." : "Create Job"}
        </Button>
      </div>
    </div>
  )
}
