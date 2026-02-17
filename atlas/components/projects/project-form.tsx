"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  type Project,
  type ProjectType,
  type ProjectStatus,
  type ContractType,
  PROJECT_TYPES,
  PROJECT_STATUSES,
  CONTRACT_TYPES,
  useEntities,
  useFloorPlans,
  generateProjectNumber,
} from "@/lib/hooks/use-projects"

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const projectSchema = z.object({
  project_number: z.string().min(1, "Project number is required"),
  name: z.string().min(1, "Project name is required"),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  type: z.string().min(1, "Type is required"),
  status: z.string().min(1, "Status is required"),
  owner_entity_id: z.string().nullable().optional(),
  builder_entity_id: z.string().nullable().optional(),
  purchase_price: z.coerce.number().nullable().optional(),
  acquisition_date: z.string().nullable().optional(),
  total_budget: z.coerce.number().min(0, "Budget must be positive"),
  contract_type: z.string().nullable().optional(),
  contract_amount: z.coerce.number().nullable().optional(),
  contract_fee: z.coerce.number().nullable().optional(),
  lot_width: z.coerce.number().nullable().optional(),
  lot_depth: z.coerce.number().nullable().optional(),
  acreage: z.coerce.number().nullable().optional(),
  total_lots: z.coerce.number().int().nullable().optional(),
  floor_plan_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
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
      address: defaultValues?.address ?? "",
      city: defaultValues?.city ?? "",
      state: defaultValues?.state ?? "",
      zip: defaultValues?.zip ?? "",
      type: defaultValues?.type ?? "scattered_lot",
      status: defaultValues?.status ?? "pre_construction",
      owner_entity_id: defaultValues?.owner_entity_id ?? "",
      builder_entity_id: defaultValues?.builder_entity_id ?? "",
      purchase_price: defaultValues?.purchase_price ?? null,
      acquisition_date: defaultValues?.acquisition_date
        ? defaultValues.acquisition_date.substring(0, 10)
        : "",
      total_budget: defaultValues?.total_budget ?? 0,
      contract_type: defaultValues?.contract_type ?? "",
      contract_amount: defaultValues?.contract_amount ?? null,
      contract_fee: defaultValues?.contract_fee ?? null,
      lot_width: defaultValues?.lot_width ?? null,
      lot_depth: defaultValues?.lot_depth ?? null,
      acreage: defaultValues?.acreage ?? null,
      total_lots: defaultValues?.total_lots ?? null,
      floor_plan_id: defaultValues?.floor_plan_id ?? "",
      notes: defaultValues?.notes ?? "",
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

  const showLotDimensions = selectedType === "scattered_lot" || selectedType === "spec_build"
  const showLotDev = selectedType === "lot_development" || selectedType === "community_development"
  const showFloorPlan = selectedType === "scattered_lot" || selectedType === "lot_purchase"

  return (
    <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_number">Project Number *</Label>
              <Input
                id="project_number"
                {...register("project_number")}
                placeholder={generatingNumber ? "Generating..." : "YY-XXX"}
                disabled={generatingNumber}
              />
              {errors.project_number && (
                <p className="text-xs text-destructive">{errors.project_number.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g. 123 Main St Build"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} placeholder="Street address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register("state")} placeholder="OH" maxLength={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">Zip</Label>
              <Input id="zip" {...register("zip")} placeholder="43215" />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Project Type *</Label>
              <Select
                value={watch("type")}
                onValueChange={(val) => setValue("type", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Owner Entity</Label>
              <Select
                value={watch("owner_entity_id") ?? ""}
                onValueChange={(val) => setValue("owner_entity_id", val || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Builder Entity</Label>
              <Select
                value={watch("builder_entity_id") ?? ""}
                onValueChange={(val) => setValue("builder_entity_id", val || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === "edit" && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(val) => setValue("status", val)}
              >
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acquisition */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acquisition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acquisition_date">Acquisition Date</Label>
              <Input
                id="acquisition_date"
                type="date"
                {...register("acquisition_date")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Purchase Price</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                {...register("purchase_price")}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="total_budget">Total Budget *</Label>
            <Input
              id="total_budget"
              type="number"
              step="0.01"
              {...register("total_budget")}
              placeholder="0.00"
            />
            {errors.total_budget && (
              <p className="text-xs text-destructive">{errors.total_budget.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contract */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contract</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Contract Type</Label>
              <Select
                value={watch("contract_type") ?? ""}
                onValueChange={(val) => setValue("contract_type", val || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {CONTRACT_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract_amount">Contract Amount</Label>
              <Input
                id="contract_amount"
                type="number"
                step="0.01"
                {...register("contract_amount")}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract_fee">Contract Fee</Label>
              <Input
                id="contract_fee"
                type="number"
                step="0.01"
                {...register("contract_fee")}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type-specific fields */}
      {showLotDimensions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lot Dimensions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lot_width">Lot Width (ft)</Label>
                <Input
                  id="lot_width"
                  type="number"
                  step="0.1"
                  {...register("lot_width")}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot_depth">Lot Depth (ft)</Label>
                <Input
                  id="lot_depth"
                  type="number"
                  step="0.1"
                  {...register("lot_depth")}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showLotDev && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Development Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="acreage">Acreage</Label>
                <Input
                  id="acreage"
                  type="number"
                  step="0.01"
                  {...register("acreage")}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_lots">Total Lots</Label>
                <Input
                  id="total_lots"
                  type="number"
                  {...register("total_lots")}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showFloorPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Floor Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-sm">
              <Label>Floor Plan</Label>
              <Select
                value={watch("floor_plan_id") ?? ""}
                onValueChange={(val) => setValue("floor_plan_id", val || null)}
              >
                <SelectTrigger>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("notes")}
            placeholder="Additional notes about this project..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
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
