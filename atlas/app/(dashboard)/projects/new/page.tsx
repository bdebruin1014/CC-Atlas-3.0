"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProjectForm } from "@/components/projects/project-form"
import { useCreateProject } from "@/lib/hooks/use-projects"
import { useOrganizationId } from "@/lib/hooks/use-organization"

export default function NewProjectPage() {
  const router = useRouter()
  const createMutation = useCreateProject()
  const [error, setError] = useState<string | null>(null)
  const { organizationId, loading: orgLoading, error: orgError } = useOrganizationId()

  const handleSubmit = async (data: Record<string, unknown>) => {
    setError(null)

    if (!organizationId) {
      setError("No organization context available. Please contact your administrator.")
      return
    }

    // Form fields already use DB column names — just add org context and defaults.
    const payload = {
      organization_id: organizationId,
      project_number: data.project_number as string,
      name: data.name as string,
      address_street: (data.address_street as string) || null,
      address_city: (data.address_city as string) || null,
      address_state: (data.address_state as string) || null,
      address_zip: (data.address_zip as string) || null,
      type: data.type as string,
      status: (data.status as string) || "pre_construction",
      owner_entity_id: (data.owner_entity_id as string) || null,
      builder_entity_id: (data.builder_entity_id as string) || null,
      budget_total: Number(data.budget_total) || 0,
      budget_land_acquisition: data.budget_land_acquisition ? Number(data.budget_land_acquisition) : null,
      acquisition_date: (data.acquisition_date as string) || null,
      contract_amount: data.contract_amount ? Number(data.contract_amount) : null,
      lot_width: data.lot_width ? Number(data.lot_width) : null,
      lot_depth: data.lot_depth ? Number(data.lot_depth) : null,
      total_acreage: data.total_acreage ? Number(data.total_acreage) : null,
      total_lots: data.total_lots ? Number(data.total_lots) : null,
      floor_plan_id: (data.floor_plan_id as string) || null,
      source_opportunity_id: null,
    }

    try {
      const result = await createMutation.mutateAsync(payload)
      router.push(`/projects/${result.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create project"
      setError(`Project creation failed: ${message}`)
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
        <Button variant="ghost" size="sm" onClick={() => router.push("/projects")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
          <p className="text-sm text-muted-foreground">
            Create a new construction project
          </p>
        </div>
      </div>

      {/* Error */}
      {(error || orgError) && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error || orgError}
        </div>
      )}

      {/* Form */}
      <ProjectForm
        mode="create"
        onSubmit={handleSubmit as never}
        onCancel={() => router.push("/projects")}
        submitting={createMutation.isPending}
      />
    </div>
  )
}
