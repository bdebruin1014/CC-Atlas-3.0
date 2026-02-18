"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type Project,
  type ProjectType,
  PROJECT_TYPES,
  PROJECT_STATUSES,
  useEntities,
  useFloorPlans,
  generateProjectNumber,
} from "@/lib/hooks/use-projects"
import { FormSection, FormGrid, FormField } from "@/components/shared/form-section"

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const projectSchema = z.object({
  project_number: z.string().min(1, "Project number is required"),
  name: z.string().min(1, "Project name is required"),
  address_street: z.string().nullable().optional(),
  address_city: z.string().nullable().optional(),
  address_state: z.string().nullable().optional(),
  address_zip: z.string().nullable().optional(),
  type: z.string().min(1, "Type is required"),
  status: z.string().min(1, "Status is required"),
  owner_entity_id: z.string().nullable().optional(),
  builder_entity_id: z.string().nullable().optional(),
  budget_land_acquisition: z.coerce.number().nullable().optional(),
  acquisition_date: z.string().nullable().optional(),
  budget_total: z.coerce.number().min(0, "Budget must be positive"),
  contract_amount: z.coerce.number().nullable().optional(),
  lot_width: z.coerce.number().nullable().optional(),
  lot_depth: z.coerce.number().nullable().optional(),
  total_acreage: z.coerce.number().nullable().optional(),
  total_lots: z.coerce.number().int().nullable().optional(),
  floor_plan_id: z.string().nullable().optional(),
})

type ProjectFormValues = z.infer<typeof projectSchema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<Project>
  onSubmit: (data: ProjectFormValues) => Promise<void>
  onCancel: () => void
  submitting?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  submitting = false,
}: ProjectFormProps) {
  const { entities } = useEntities()
  const { floorPlans } = useFloorPlans()
  const [generatingNumber, setGeneratingNumber] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema) as never,
    defaultValues: {
      project_number: defaultValues?.project_number ?? "",
      name: defaultValues?.name ?? "",
      address_street: (defaultValues as Record<string, unknown>)?.address_street as string ?? "",
      address_city: (defaultValues as Record<string, unknown>)?.address_city as string ?? "",
      address_state: (defaultValues as Record<string, unknown>)?.address_state as string ?? "",
      address_zip: (defaultValues as Record<string, unknown>)?.address_zip as string ?? "",
      type: defaultValues?.type ?? "scattered_lot",
      status: defaultValues?.status ?? "pre_construction",
      owner_entity_id: defaultValues?.owner_entity_id ?? "",
      builder_entity_id: defaultValues?.builder_entity_id ?? "",
      budget_land_acquisition: (defaultValues as Record<string, unknown>)?.budget_land_acquisition as number ?? null,
      acquisition_date: defaultValues?.acquisition_date
        ? (defaultValues.acquisition_date as string).substring(0, 10)
        : "",
      budget_total: (defaultValues as Record<string, unknown>)?.budget_total as number ?? 0,
      contract_amount: defaultValues?.contract_amount ?? null,
      lot_width: defaultValues?.lot_width ?? null,
      lot_depth: defaultValues?.lot_depth ?? null,
      total_acreage: (defaultValues as Record<string, unknown>)?.total_acreage as number ?? null,
      total_lots: defaultValues?.total_lots ?? null,
      floor_plan_id: defaultValues?.floor_plan_id ?? "",
    },
  })

  const selectedType = watch("type") as ProjectType

  // Auto-generate project number on create
  useEffect(() => {
    if (mode === "create" && !defaultValues?.project_number) {
      setGeneratingNumber(true)
      generateProjectNumber().then((num) => {
        setValue("project_number", num)
        setGeneratingNumber(false)
      }).catch(() => setGeneratingNumber(false))
    }
  }, [mode, defaultValues?.project_number, setValue])

  const showLotDimensions = selectedType === "scattered_lot"
  const showLotDev = selectedType === "lot_development" || selectedType === "community_development"
  const showFloorPlan = selectedType === "scattered_lot" || selectedType === "lot_purchase"

  const inputClass = "h-9 border-[#E5E7EB] focus:ring-[#1a5632]"

  return (
    <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
      {/* Basic Information */}
      <FormSection title="Basic Info">
        <FormGrid>
          <FormField label="Project Number" required>
            <Input
              {...register("project_number")}
              placeholder={generatingNumber ? "Generating..." : "YY-XXX"}
              disabled={generatingNumber}
              className={inputClass}
            />
            {errors.project_number && (
              <p className="text-xs text-destructive">{errors.project_number.message}</p>
            )}
          </FormField>

          <FormField label="Project Name" required>
            <Input
              {...register("name")}
              placeholder="e.g. 123 Main St Build"
              className={inputClass}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </FormField>

          <FormField label="Project Type" required>
            <Select
              value={watch("type")}
              onValueChange={(val) => setValue("type", val)}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </FormField>

          {mode === "edit" && (
            <FormField label="Status">
              <Select
                value={watch("status")}
                onValueChange={(val) => setValue("status", val)}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          <FormField label="Owner Entity">
            <Select
              value={watch("owner_entity_id") ?? ""}
              onValueChange={(val) => setValue("owner_entity_id", val || null)}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Builder Entity">
            <Select
              value={watch("builder_entity_id") ?? ""}
              onValueChange={(val) => setValue("builder_entity_id", val || null)}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Property Details */}
      <FormSection title="Property Details">
        <FormGrid cols={4}>
          <FormField label="Address">
            <Input {...register("address_street")} placeholder="Street address" className={inputClass} />
          </FormField>
          <FormField label="City">
            <Input {...register("address_city")} placeholder="City" className={inputClass} />
          </FormField>
          <FormField label="State">
            <Input {...register("address_state")} placeholder="SC" maxLength={2} className={inputClass} />
          </FormField>
          <FormField label="Zip">
            <Input {...register("address_zip")} placeholder="29401" className={inputClass} />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Acquisition */}
      <FormSection title="Acquisition">
        <FormGrid>
          <FormField label="Acquisition Date">
            <Input type="date" {...register("acquisition_date")} className={inputClass} />
          </FormField>
          <FormField label="Purchase Price ($)">
            <Input type="number" step="0.01" {...register("budget_land_acquisition")} placeholder="0.00" className={inputClass} />
          </FormField>
          <FormField label="Total Budget" required>
            <Input type="number" step="0.01" {...register("budget_total")} placeholder="0.00" className={inputClass} />
            {errors.budget_total && (
              <p className="text-xs text-destructive">{errors.budget_total.message}</p>
            )}
          </FormField>
          <FormField label="Contract Amount">
            <Input type="number" step="0.01" {...register("contract_amount")} placeholder="0.00" className={inputClass} />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Construction (scattered_lot) */}
      {showLotDimensions && (
        <FormSection title="Construction" description="Lot dimensions for scattered lot build.">
          <FormGrid>
            <FormField label="Lot Width (ft)">
              <Input type="number" step="0.1" {...register("lot_width")} placeholder="0" className={inputClass} />
            </FormField>
            <FormField label="Lot Depth (ft)">
              <Input type="number" step="0.1" {...register("lot_depth")} placeholder="0" className={inputClass} />
            </FormField>
          </FormGrid>
        </FormSection>
      )}

      {/* Development (lot_development / community_development) */}
      {showLotDev && (
        <FormSection title="Development" description="Land development details.">
          <FormGrid>
            <FormField label="Acreage">
              <Input type="number" step="0.01" {...register("total_acreage")} placeholder="0" className={inputClass} />
            </FormField>
            <FormField label="Total Lots">
              <Input type="number" {...register("total_lots")} placeholder="0" className={inputClass} />
            </FormField>
          </FormGrid>
        </FormSection>
      )}

      {/* Floor Plan (scattered_lot / lot_purchase) */}
      {showFloorPlan && (
        <FormSection title="Floor Plan">
          <FormGrid>
            <FormField label="Floor Plan">
              <Select
                value={watch("floor_plan_id") ?? ""}
                onValueChange={(val) => setValue("floor_plan_id", val || null)}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Select floor plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {floorPlans.map((fp) => (
                    <SelectItem key={fp.id} value={fp.id}>
                      {fp.name}
                      {fp.square_footage ? ` (${fp.square_footage} sf)` : ""}
                      {fp.bedrooms ? ` - ${fp.bedrooms}bd` : ""}
                      {fp.bathrooms ? `/${fp.bathrooms}ba` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
        </FormSection>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create Project"
              : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
