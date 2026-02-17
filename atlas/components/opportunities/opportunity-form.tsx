'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { cn } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import {
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_SOURCES,
  getStagesForType,
  type OpportunityType,
  type Opportunity,
} from '@/lib/types/opportunities'
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const opportunitySchema = z.object({
  // Step 1 — Basic Info
  type: z.enum([
    'scattered_lot',
    'lot_development',
    'community_development',
    'lot_purchase',
    'other',
  ]),
  address_line1: z.string().min(1, 'Address is required'),
  address_city: z.string().min(1, 'City is required'),
  address_county: z.string().optional().default(''),
  address_state: z.string().min(2, 'State is required'),
  address_zip: z.string().min(5, 'ZIP is required'),
  parcel_tms: z.string().optional().default(''),
  source: z.string().optional().default(''),
  assigned_to: z.string().optional().default(''),
  entity_id: z.string().optional().default(''),

  // Step 2 — Type-Specific (scattered lot)
  zoning: z.string().optional().default(''),
  build_type: z.string().optional().default(''),
  road_type: z.string().optional().default(''),
  road_frontage: z.string().optional().default(''),
  setback_front: z.coerce.number().optional(),
  setback_rear: z.coerce.number().optional(),
  setback_left: z.coerce.number().optional(),
  setback_right: z.coerce.number().optional(),
  historic_overlay: z.boolean().optional().default(false),
  has_water: z.boolean().optional().default(false),
  has_sewer: z.boolean().optional().default(false),
  has_electric: z.boolean().optional().default(false),
  floor_plan_id: z.string().optional().default(''),
  garage_position: z.string().optional().default(''),
  survey_status: z.string().optional().default(''),
  lot_width: z.coerce.number().optional(),
  lot_depth: z.coerce.number().optional(),
  lot_sqft: z.coerce.number().optional(),
  lot_acreage: z.coerce.number().optional(),

  // Step 2 — Type-Specific (lot development)
  total_acreage: z.coerce.number().optional(),
  estimated_lots: z.coerce.number().optional(),
  zoning_required: z.boolean().optional().default(false),
  preliminary_plat_status: z.string().optional().default(''),
  target_builders: z.string().optional().default(''),
  infrastructure_estimate: z.coerce.number().optional(),

  // Step 3 — Financial
  projected_purchase_price: z.coerce.number().optional(),
  projected_sale_price: z.coerce.number().optional(),
  projected_arv: z.coerce.number().optional(),
  date_offer: z.string().optional().default(''),
  date_contract: z.string().optional().default(''),
  date_dd_expiration: z.string().optional().default(''),
  date_closing: z.string().optional().default(''),

  notes: z.string().optional().default(''),
})

type OpportunityFormData = z.infer<typeof opportunitySchema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OpportunityFormProps {
  mode: 'create' | 'edit'
  defaultValues?: Partial<Opportunity>
  onSubmit: (data: OpportunityFormData) => Promise<void>
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OpportunityForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
}: OpportunityFormProps) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([])
  const [floorPlans, setFloorPlans] = useState<
    { id: string; name: string; sqft: number }[]
  >([])

  const form = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      type: (defaultValues?.type as OpportunityType) || 'scattered_lot',
      address_line1: defaultValues?.address_line1 || '',
      address_city: defaultValues?.address_city || '',
      address_county: defaultValues?.address_county || '',
      address_state: defaultValues?.address_state || '',
      address_zip: defaultValues?.address_zip || '',
      parcel_tms: defaultValues?.parcel_tms || '',
      source: defaultValues?.source || '',
      assigned_to: defaultValues?.assigned_to || '',
      entity_id: defaultValues?.entity_id || '',
      zoning: defaultValues?.zoning || '',
      build_type: defaultValues?.build_type || '',
      road_type: defaultValues?.road_type || '',
      road_frontage: defaultValues?.road_frontage || '',
      setback_front: defaultValues?.setback_front ?? undefined,
      setback_rear: defaultValues?.setback_rear ?? undefined,
      setback_left: defaultValues?.setback_left ?? undefined,
      setback_right: defaultValues?.setback_right ?? undefined,
      historic_overlay: defaultValues?.historic_overlay || false,
      has_water: defaultValues?.has_water || false,
      has_sewer: defaultValues?.has_sewer || false,
      has_electric: defaultValues?.has_electric || false,
      floor_plan_id: defaultValues?.floor_plan_id || '',
      garage_position: defaultValues?.garage_position || '',
      survey_status: defaultValues?.survey_status || '',
      lot_width: defaultValues?.lot_width ?? undefined,
      lot_depth: defaultValues?.lot_depth ?? undefined,
      lot_sqft: defaultValues?.lot_sqft ?? undefined,
      lot_acreage: defaultValues?.lot_acreage ?? undefined,
      total_acreage: defaultValues?.total_acreage ?? undefined,
      estimated_lots: defaultValues?.estimated_lots ?? undefined,
      zoning_required: defaultValues?.zoning_required || false,
      preliminary_plat_status: defaultValues?.preliminary_plat_status || '',
      target_builders: defaultValues?.target_builders || '',
      infrastructure_estimate: defaultValues?.infrastructure_estimate ?? undefined,
      projected_purchase_price: defaultValues?.projected_purchase_price ?? undefined,
      projected_sale_price: defaultValues?.projected_sale_price ?? undefined,
      projected_arv: defaultValues?.projected_arv ?? undefined,
      date_offer: defaultValues?.date_offer || '',
      date_contract: defaultValues?.date_contract || '',
      date_dd_expiration: defaultValues?.date_dd_expiration || '',
      date_closing: defaultValues?.date_closing || '',
      notes: defaultValues?.notes || '',
    },
  })

  const watchedType = form.watch('type') as OpportunityType

  // Fetch reference data
  useEffect(() => {
    const supabase = createClient()

    async function fetchRefData() {
      const [usersRes, entitiesRes, plansRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name')
          .order('full_name'),
        supabase
          .from('entities')
          .select('id, name')
          .order('name'),
        supabase
          .from('floor_plans')
          .select('id, name, sqft')
          .order('name'),
      ])

      if (usersRes.data) setUsers(usersRes.data as { id: string; full_name: string }[])
      if (entitiesRes.data) setEntities(entitiesRes.data as { id: string; name: string }[])
      if (plansRes.data) setFloorPlans(plansRes.data as { id: string; name: string; sqft: number }[])
    }

    fetchRefData()
  }, [])

  const handleSubmit = async (data: OpportunityFormData) => {
    setSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setSubmitting(false)
    }
  }

  const nextStep = async () => {
    // Validate current step fields
    if (step === 1) {
      const valid = await form.trigger([
        'type',
        'address_line1',
        'address_city',
        'address_state',
        'address_zip',
      ])
      if (!valid) return
    }
    setStep((s) => Math.min(s + 1, 3))
  }

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1))
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : step > s
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {s}
            </div>
            <span
              className={cn(
                'text-sm',
                step === s ? 'font-medium' : 'text-muted-foreground'
              )}
            >
              {s === 1 ? 'Basic Info' : s === 2 ? 'Details' : 'Financial'}
            </span>
            {s < 3 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Step 1: Basic Info                                                  */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the property address and assignment details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="type">Opportunity Type *</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(v) =>
                  form.setValue('type', v as OpportunityType, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(OPPORTUNITY_TYPE_LABELS) as [
                      OpportunityType,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address_line1">Street Address *</Label>
              <Input
                id="address_line1"
                {...form.register('address_line1')}
                placeholder="123 Main Street"
              />
              {form.formState.errors.address_line1 && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.address_line1.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="address_city">City *</Label>
                <Input
                  id="address_city"
                  {...form.register('address_city')}
                  placeholder="Charleston"
                />
                {form.formState.errors.address_city && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.address_city.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address_county">County</Label>
                <Input
                  id="address_county"
                  {...form.register('address_county')}
                  placeholder="Charleston"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address_state">State *</Label>
                <Input
                  id="address_state"
                  {...form.register('address_state')}
                  placeholder="SC"
                  maxLength={2}
                />
                {form.formState.errors.address_state && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.address_state.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address_zip">ZIP *</Label>
                <Input
                  id="address_zip"
                  {...form.register('address_zip')}
                  placeholder="29401"
                />
                {form.formState.errors.address_zip && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.address_zip.message}
                  </p>
                )}
              </div>
            </div>

            {/* Parcel / TMS */}
            <div className="space-y-1.5">
              <Label htmlFor="parcel_tms">Parcel / TMS Number</Label>
              <Input
                id="parcel_tms"
                {...form.register('parcel_tms')}
                placeholder="460-00-00-123"
              />
            </div>

            {/* Source / Assigned To / Entity */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select
                  value={form.watch('source') || ''}
                  onValueChange={(v) => form.setValue('source', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPPORTUNITY_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Assigned To</Label>
                <Select
                  value={form.watch('assigned_to') || ''}
                  onValueChange={(v) => form.setValue('assigned_to', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Owner Entity</Label>
                <Select
                  value={form.watch('entity_id') || ''}
                  onValueChange={(v) => form.setValue('entity_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 2: Type-Specific Details                                       */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && watchedType === 'scattered_lot' && (
        <Card>
          <CardHeader>
            <CardTitle>Scattered Lot Details</CardTitle>
            <CardDescription>
              Property characteristics for the scattered lot opportunity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Zoning</Label>
                <Input {...form.register('zoning')} placeholder="R-4" />
              </div>
              <div className="space-y-1.5">
                <Label>Build Type</Label>
                <Select
                  value={form.watch('build_type') || ''}
                  onValueChange={(v) => form.setValue('build_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_construction">
                      New Construction
                    </SelectItem>
                    <SelectItem value="teardown_rebuild">
                      Teardown & Rebuild
                    </SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Survey Status</Label>
                <Select
                  value={form.watch('survey_status') || ''}
                  onValueChange={(v) => form.setValue('survey_status', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="existing">Existing on File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Road info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Road Type</Label>
                <Select
                  value={form.watch('road_type') || ''}
                  onValueChange={(v) => form.setValue('road_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paved_public">Paved (Public)</SelectItem>
                    <SelectItem value="paved_private">Paved (Private)</SelectItem>
                    <SelectItem value="dirt">Dirt</SelectItem>
                    <SelectItem value="gravel">Gravel</SelectItem>
                    <SelectItem value="none">None / Landlocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Road Frontage (ft)</Label>
                <Input
                  {...form.register('road_frontage')}
                  placeholder="75"
                />
              </div>
            </div>

            {/* Setbacks */}
            <div>
              <Label className="mb-2 block">Setbacks (ft)</Label>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Front
                  </Label>
                  <Input
                    type="number"
                    {...form.register('setback_front')}
                    placeholder="25"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Rear</Label>
                  <Input
                    type="number"
                    {...form.register('setback_rear')}
                    placeholder="20"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Left</Label>
                  <Input
                    type="number"
                    {...form.register('setback_left')}
                    placeholder="5"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Right
                  </Label>
                  <Input
                    type="number"
                    {...form.register('setback_right')}
                    placeholder="5"
                  />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="historic_overlay">Historic Overlay</Label>
                <Switch
                  id="historic_overlay"
                  checked={form.watch('historic_overlay')}
                  onCheckedChange={(v) =>
                    form.setValue('historic_overlay', v)
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="has_water">Water Available</Label>
                <Switch
                  id="has_water"
                  checked={form.watch('has_water')}
                  onCheckedChange={(v) => form.setValue('has_water', v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="has_sewer">Sewer Available</Label>
                <Switch
                  id="has_sewer"
                  checked={form.watch('has_sewer')}
                  onCheckedChange={(v) => form.setValue('has_sewer', v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="has_electric">Electric Available</Label>
                <Switch
                  id="has_electric"
                  checked={form.watch('has_electric')}
                  onCheckedChange={(v) => form.setValue('has_electric', v)}
                />
              </div>
            </div>

            {/* Floor Plan & Garage */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Floor Plan</Label>
                <Select
                  value={form.watch('floor_plan_id') || ''}
                  onValueChange={(v) => form.setValue('floor_plan_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {floorPlans.map((fp) => (
                      <SelectItem key={fp.id} value={fp.id}>
                        {fp.name} ({fp.sqft.toLocaleString()} SF)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Garage Position</Label>
                <Select
                  value={form.watch('garage_position') || ''}
                  onValueChange={(v) => form.setValue('garage_position', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="front_load">Front Load</SelectItem>
                    <SelectItem value="side_load">Side Load</SelectItem>
                    <SelectItem value="rear_load">Rear Load</SelectItem>
                    <SelectItem value="detached">Detached</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lot Dimensions */}
            <div>
              <Label className="mb-2 block">Lot Dimensions</Label>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Width (ft)
                  </Label>
                  <Input
                    type="number"
                    {...form.register('lot_width')}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Depth (ft)
                  </Label>
                  <Input
                    type="number"
                    {...form.register('lot_depth')}
                    placeholder="120"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Sq Ft
                  </Label>
                  <Input
                    type="number"
                    {...form.register('lot_sqft')}
                    placeholder="6000"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Acreage
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register('lot_acreage')}
                    placeholder="0.14"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && watchedType === 'lot_development' && (
        <Card>
          <CardHeader>
            <CardTitle>Lot Development Details</CardTitle>
            <CardDescription>
              Development-specific information for the lot development
              opportunity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Total Acreage</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('total_acreage')}
                  placeholder="25.0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estimated Lots</Label>
                <Input
                  type="number"
                  {...form.register('estimated_lots')}
                  placeholder="45"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="zoning_required">Rezoning Required</Label>
              <Switch
                id="zoning_required"
                checked={form.watch('zoning_required')}
                onCheckedChange={(v) => form.setValue('zoning_required', v)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Preliminary Plat Status</Label>
              <Select
                value={form.watch('preliminary_plat_status') || ''}
                onValueChange={(v) =>
                  form.setValue('preliminary_plat_status', v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Target Builders</Label>
              <Textarea
                {...form.register('target_builders')}
                placeholder="List target builders, one per line"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Infrastructure Estimate ($)</Label>
              <Input
                type="number"
                {...form.register('infrastructure_estimate')}
                placeholder="500000"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 &&
        watchedType !== 'scattered_lot' &&
        watchedType !== 'lot_development' && (
          <Card>
            <CardHeader>
              <CardTitle>
                {OPPORTUNITY_TYPE_LABELS[watchedType]} Details
              </CardTitle>
              <CardDescription>
                Additional details for this opportunity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Zoning</Label>
                  <Input {...form.register('zoning')} placeholder="Zoning" />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Acreage</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register('total_acreage')}
                    placeholder="0.5"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  {...form.register('notes')}
                  placeholder="Additional notes..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 3: Financial                                                   */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
            <CardDescription>
              Projected financial figures and key dates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Projected Purchase Price ($)</Label>
                <Input
                  type="number"
                  {...form.register('projected_purchase_price')}
                  placeholder="65000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Projected Sale Price ($)</Label>
                <Input
                  type="number"
                  {...form.register('projected_sale_price')}
                  placeholder="350000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Projected ARV ($)</Label>
                <Input
                  type="number"
                  {...form.register('projected_arv')}
                  placeholder="365000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Offer Date</Label>
                <Input type="date" {...form.register('date_offer')} />
              </div>
              <div className="space-y-1.5">
                <Label>Contract Date</Label>
                <Input type="date" {...form.register('date_contract')} />
              </div>
              <div className="space-y-1.5">
                <Label>DD Expiration</Label>
                <Input type="date" {...form.register('date_dd_expiration')} />
              </div>
              <div className="space-y-1.5">
                <Label>Closing Date</Label>
                <Input type="date" {...form.register('date_closing')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                {...form.register('notes')}
                placeholder="Deal notes, conditions, etc."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Navigation buttons                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex gap-2">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={prevStep}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button type="button" onClick={nextStep}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === 'create' ? 'Create Opportunity' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
