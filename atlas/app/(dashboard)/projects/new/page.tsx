"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProjectForm } from "@/components/projects/project-form"
import { useCreateProject, type Project } from "@/lib/hooks/use-projects"

export default function NewProjectPage() {
  const router = useRouter()
  const createMutation = useCreateProject()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: Record<string, unknown>) => {
    setError(null)

    const payload = {
      organization_id: "",
      project_number: data.project_number as string,
      name: data.name as string,
      address: (data.address as string) || null,
      city: (data.city as string) || null,
      state: (data.state as string) || null,
      zip: (data.zip as string) || null,
      type: data.type as string,
      status: (data.status as string) || "pre_construction",
      owner_entity_id: (data.owner_entity_id as string) || null,
      builder_entity_id: (data.builder_entity_id as string) || null,
      total_budget: Number(data.total_budget) || 0,
      purchase_price: data.purchase_price ? Number(data.purchase_price) : null,
      acquisition_date: (data.acquisition_date as string) || null,
      contract_type: (data.contract_type as string) || null,
      contract_amount: data.contract_amount ? Number(data.contract_amount) : null,
      contract_fee: data.contract_fee ? Number(data.contract_fee) : null,
      lot_width: data.lot_width ? Number(data.lot_width) : null,
      lot_depth: data.lot_depth ? Number(data.lot_depth) : null,
      acreage: data.acreage ? Number(data.acreage) : null,
      total_lots: data.total_lots ? Number(data.total_lots) : null,
      floor_plan_id: (data.floor_plan_id as string) || null,
      floor_plan_name: null,
      permit_date: null,
      construction_start_date: null,
      projected_completion_date: null,
      co_date: null,
      sale_date: null,
      warranty_expiration_date: null,
      source_opportunity_id: null,
      notes: (data.notes as string) || null,
    } as Omit<Project, "id" | "created_at" | "updated_at" | "owner_entity_name" | "builder_entity_name" | "current_spend" | "committed_amount" | "projected_final">

    try {
      const result = await createMutation.mutateAsync(payload)
      router.push(`/projects/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
    }
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
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
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
