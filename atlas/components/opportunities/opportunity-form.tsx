'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import {
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_SOURCES,
  type OpportunityType,
  type Opportunity,
} from '@/lib/types/opportunities'
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/format'
import { FormSection, FormGrid, FormField } from '@/components/shared/form-section'

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
  address_street: z.string().min(1, 'Address is required'),
  address_city: z.string().min(1, 'City is required'),
  address_county: z.string().optional().default(''),
  address_state: z.string().min(2, 'State is required'),
  address_zip: z.string().min(5, 'ZIP is required'),
  parcel_tms_number: z.string().optional().default(''),
  source: z.string().optional().default(''),
  assigned_to: z.string().optional().default(''),
  owner_entity_id: z.string().optional().default(''),

  // Step 2 — Type-Specific (scattered lot)
  zoning_current: z.string().optional().default(''),
  build_type: z.string().optional().default(''),
  road_surrounding: z.string().optional().default(''),
  road_frontage: z.string().optional().default(''),
  setback_front: z.coerce.number().optional(),
  setback_rear: z.coerce.number().optional(),
  setback_left: z.coerce.number().optional(),
  setback_right: z.coerce.number().optional(),
  historic_district: z.boolean().optional().default(false),
  water_available: z.boolean().optional().default(false),
  sewer_available: z.boolean().optional().default(false),
  electric_available: z.boolean().optional().default(false),
  floor_plan_id: z.string().optional().default(''),
  garage_position: z.string().optional().default(''),
  survey_complete: z.boolean().optional().default(false),
  lot_width: z.coerce.number().optional(),
  lot_depth: z.coerce.number().optional(),
  lot_sqft: z.coerce.number().optional(),

  // Step 2 — Type-Specific (lot development)
  total_acreage: z.coerce.number().optional(),
  estimated_total_lots: z.coerce.number().optional(),
  zoning_required: z.boolean().optional().default(false),
  preliminary_plat_status: z.string().optional().default(''),
  target_builders: z.string().optional().default(''),
  infrastructure_scope_estimate: z.coerce.number().optional(),

  // Step 3 — Financial
  projected_purchase_price: z.coerce.number().optional(),
  projected_sale_price: z.coerce.number().optional(),
  date_identified: z.string().optional().default(''),
  date_under_contract: z.string().optional().default(''),
  due_diligence_deadline: z.string().optional().default(''),
  projected_close_date: z.string().optional().default(''),

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
  const [users, setUsers] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([])
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([])
  const [floorPlans, setFloorPlans] = useState<
    { id: string; name: string; square_footage: number | null }[]
  >([])

  const form = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunitySchema) as never,
    defaultValues: {
      type: (defaultValues?.type as OpportunityType) || 'scattered_lot',
      address_street: (defaultValues as Record<string, unknown>)?.address_street as string || '',
      address_city: defaultValues?.address_city || '',
      address_county: defaultValues?.address_county || '',
      address_state: defaultValues?.address_state || '',
      address_zip: defaultValues?.address_zip || '',
      parcel_tms_number: (defaultValues as Record<string, unknown>)?.parcel_tms_number as string || '',
      source: defaultValues?.source || '',
      assigned_to: defaultValues?.assigned_to || '',
      owner_entity_id: (defaultValues as Record<string, unknown>)?.owner_entity_id as string || '',
      zoning_current: (defaultValues as Record<string, unknown>)?.zoning_current as string || '',
      build_type: (defaultValues as Record<string, unknown>)?.build_type as string || '',
      road_surrounding: (defaultValues as Record<string, unknown>)?.road_surrounding as string || '',
      road_frontage: '',
      setback_front: (defaultValues as Record<string, unknown>)?.setback_front as number ?? undefined,
      setback_rear: (defaultValues as Record<string, unknown>)?.setback_rear as number ?? undefined,
      setback_left: (defaultValues as Record<string, unknown>)?.setback_left as number ?? undefined,
      setback_right: (defaultValues as Record<string, unknown>)?.setback_right as number ?? undefined,
      historic_district: (defaultValues as Record<string, unknown>)?.historic_district as boolean || false,
      water_available: (defaultValues as Record<string, unknown>)?.water_available as boolean || false,
      sewer_available: (defaultValues as Record<string, unknown>)?.sewer_available as boolean || false,
      electric_available: (defaultValues as Record<string, unknown>)?.electric_available as boolean || false,
      floor_plan_id: defaultValues?.floor_plan_id || '',
      garage_position: (defaultValues as Record<string, unknown>)?.garage_position as string || '',
      survey_complete: (defaultValues as Record<string, unknown>)?.survey_complete as boolean || false,
      lot_width: defaultValues?.lot_width ?? undefined,
      lot_depth: defaultValues?.lot_depth ?? undefined,
      lot_sqft: (defaultValues as Record<string, unknown>)?.lot_sqft as number ?? undefined,
      total_acreage: defaultValues?.total_acreage ?? undefined,
      estimated_total_lots: (defaultValues as Record<string, unknown>)?.estimated_total_lots as number ?? undefined,
      zoning_required: (defaultValues as Record<string, unknown>)?.zoning_required ? true : false,
      preliminary_plat_status: defaultValues?.preliminary_plat_status || '',
      target_builders: defaultValues?.target_builders || '',
      infrastructure_scope_estimate: (defaultValues as Record<string, unknown>)?.infrastructure_scope_estimate as number ?? undefined,
      projected_purchase_price: defaultValues?.projected_purchase_price ?? undefined,
      projected_sale_price: defaultValues?.projected_sale_price ?? undefined,
      date_identified: (defaultValues as Record<string, unknown>)?.date_identified as string || '',
      date_under_contract: (defaultValues as Record<string, unknown>)?.date_under_contract as string || '',
      due_diligence_deadline: (defaultValues as Record<string, unknown>)?.due_diligence_deadline as string || '',
      projected_close_date: (defaultValues as Record<string, unknown>)?.projected_close_date as string || '',
      notes: (defaultValues as Record<string, unknown>)?.notes as string || '',
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
          .select('id, first_name, last_name')
          .order('last_name'),
        supabase
          .from('entities')
          .select('id, name')
          .order('name'),
        supabase
          .from('floor_plans')
          .select('id, name, square_footage')
          .order('name'),
      ])

      if (usersRes.data) setUsers(usersRes.data as unknown as { id: string; first_name: string | null; last_name: string | null }[])
      if (entitiesRes.data) setEntities(entitiesRes.data as unknown as { id: string; name: string }[])
      if (plansRes.data) setFloorPlans(plansRes.data as unknown as { id: string; name: string; square_footage: number | null }[])
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
    if (step === 1) {
      const valid = await form.trigger([
        'type',
        'address_street',
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

  const inputClass = "h-9 border-border focus:ring-primary"

  return (
    <form onSubmit={form.handleSubmit(handleSubmit as never)} className="space-y-4">
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
        <>
          <FormSection title="Basic Info">
            <FormGrid>
              <FormField label="Opportunity Type" required>
                <Select
                  value={form.watch('type')}
                  onValueChange={(v) =>
                    form.setValue('type', v as OpportunityType, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(OPPORTUNITY_TYPE_LABELS) as [OpportunityType, string][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.type && (
                  <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
                )}
              </FormField>

              <FormField label="Source">
                <Select
                  value={form.watch('source') || ''}
                  onValueChange={(v) => form.setValue('source', v)}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPPORTUNITY_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Assigned To">
                <Select
                  value={form.watch('assigned_to') || ''}
                  onValueChange={(v) => form.setValue('assigned_to', v)}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unnamed'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Owner Entity">
                <Select
                  value={form.watch('owner_entity_id') || ''}
                  onValueChange={(v) => form.setValue('owner_entity_id', v)}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Property Details">
            <FormGrid>
              <FormField label="Street Address" required className="md:col-span-2">
                <Input
                  {...form.register('address_street')}
                  placeholder="123 Main Street"
                  className={inputClass}
                />
                {form.formState.errors.address_street && (
                  <p className="text-xs text-destructive">{form.formState.errors.address_street.message}</p>
                )}
              </FormField>

              <FormField label="City" required>
                <Input
                  {...form.register('address_city')}
                  placeholder="Charleston"
                  className={inputClass}
                />
                {form.formState.errors.address_city && (
                  <p className="text-xs text-destructive">{form.formState.errors.address_city.message}</p>
                )}
              </FormField>

              <FormField label="County">
                <Input {...form.register('address_county')} placeholder="Charleston" className={inputClass} />
              </FormField>

              <FormField label="State" required>
                <Input
                  {...form.register('address_state')}
                  placeholder="SC"
                  maxLength={2}
                  className={inputClass}
                />
                {form.formState.errors.address_state && (
                  <p className="text-xs text-destructive">{form.formState.errors.address_state.message}</p>
                )}
              </FormField>

              <FormField label="ZIP" required>
                <Input
                  {...form.register('address_zip')}
                  placeholder="29401"
                  className={inputClass}
                />
                {form.formState.errors.address_zip && (
                  <p className="text-xs text-destructive">{form.formState.errors.address_zip.message}</p>
                )}
              </FormField>

              <FormField label="Parcel / TMS Number">
                <Input {...form.register('parcel_tms_number')} placeholder="460-00-00-123" className={inputClass} />
              </FormField>

              <FormField label="Zoning">
                <Input {...form.register('zoning_current')} placeholder="R-4" className={inputClass} />
              </FormField>
            </FormGrid>
          </FormSection>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 2: Type-Specific Details                                       */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && watchedType === 'scattered_lot' && (
        <>
          <FormSection title="Property Details" description="Scattered lot characteristics.">
            <FormGrid>
              <FormField label="Build Type">
                <Select
                  value={form.watch('build_type') || ''}
                  onValueChange={(v) => form.setValue('build_type', v)}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spec">Spec</SelectItem>
                    <SelectItem value="pre_sale">Pre-Sale</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="model">Model</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Road Type">
                <Select
                  value={form.watch('road_surrounding') || ''}
                  onValueChange={(v) => form.setValue('road_surrounding', v)}
                >
                  <SelectTrigger className={inputClass}>
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
              </FormField>

              <FormField label="Road Frontage (ft)">
                <Input {...form.register('road_frontage')} placeholder="75" className={inputClass} />
              </FormField>

              <FormField label="Floor Plan">
                <Select
                  value={form.watch('floor_plan_id') || ''}
                  onValueChange={(v) => form.setValue('floor_plan_id', v)}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select floor plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {floorPlans.map((fp) => (
                      <SelectItem key={fp.id} value={fp.id}>
                        {fp.name} ({(fp.square_footage ?? 0).toLocaleString()} SF)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Garage Position">
                <Select
                  value={form.watch('garage_position') || ''}
                  onValueChange={(v) => form.setValue('garage_position', v)}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="front_entry">Front Entry</SelectItem>
                    <SelectItem value="side_entry">Side Entry</SelectItem>
                    <SelectItem value="rear_entry">Rear Entry</SelectItem>
                    <SelectItem value="detached">Detached</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">Survey Complete</span>
                <Switch
                  checked={form.watch('survey_complete')}
                  onCheckedChange={(v) => form.setValue('survey_complete', v)}
                />
              </div>
            </FormGrid>
          </FormSection>

          <FormSection title="Lot Dimensions">
            <FormGrid cols={4}>
              <FormField label="Width (ft)">
                <Input type="number" {...form.register('lot_width')} placeholder="50" className={inputClass} />
              </FormField>
              <FormField label="Depth (ft)">
                <Input type="number" {...form.register('lot_depth')} placeholder="120" className={inputClass} />
              </FormField>
              <FormField label="Sq Ft">
                <Input type="number" {...form.register('lot_sqft')} placeholder="6000" className={inputClass} />
              </FormField>
              <FormField label="Acreage">
                <Input type="number" step="0.01" {...form.register('total_acreage')} placeholder="0.14" className={inputClass} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Setbacks (ft)">
            <FormGrid cols={4}>
              <FormField label="Front">
                <Input type="number" {...form.register('setback_front')} placeholder="25" className={inputClass} />
              </FormField>
              <FormField label="Rear">
                <Input type="number" {...form.register('setback_rear')} placeholder="20" className={inputClass} />
              </FormField>
              <FormField label="Left">
                <Input type="number" {...form.register('setback_left')} placeholder="5" className={inputClass} />
              </FormField>
              <FormField label="Right">
                <Input type="number" {...form.register('setback_right')} placeholder="5" className={inputClass} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Utilities">
            <FormGrid>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">Historic District</span>
                <Switch
                  checked={form.watch('historic_district')}
                  onCheckedChange={(v) => form.setValue('historic_district', v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">Water Available</span>
                <Switch
                  checked={form.watch('water_available')}
                  onCheckedChange={(v) => form.setValue('water_available', v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">Sewer Available</span>
                <Switch
                  checked={form.watch('sewer_available')}
                  onCheckedChange={(v) => form.setValue('sewer_available', v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">Electric Available</span>
                <Switch
                  checked={form.watch('electric_available')}
                  onCheckedChange={(v) => form.setValue('electric_available', v)}
                />
              </div>
            </FormGrid>
          </FormSection>
        </>
      )}

      {step === 2 && watchedType === 'lot_development' && (
        <FormSection title="Lot Development Details">
          <FormGrid>
            <FormField label="Total Acreage">
              <Input type="number" step="0.01" {...form.register('total_acreage')} placeholder="25.0" className={inputClass} />
            </FormField>
            <FormField label="Estimated Lots">
              <Input type="number" {...form.register('estimated_total_lots')} placeholder="45" className={inputClass} />
            </FormField>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">Rezoning Required</span>
              <Switch
                checked={form.watch('zoning_required')}
                onCheckedChange={(v) => form.setValue('zoning_required', v)}
              />
            </div>
            <FormField label="Preliminary Plat Status">
              <Select
                value={form.watch('preliminary_plat_status') || ''}
                onValueChange={(v) => form.setValue('preliminary_plat_status', v)}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Target Builders" className="md:col-span-2">
              <Textarea
                {...form.register('target_builders')}
                placeholder="List target builders, one per line"
                rows={3}
              />
            </FormField>
            <FormField label="Infrastructure Estimate ($)">
              <Input type="number" {...form.register('infrastructure_scope_estimate')} placeholder="500000" className={inputClass} />
            </FormField>
          </FormGrid>
        </FormSection>
      )}

      {step === 2 &&
        watchedType !== 'scattered_lot' &&
        watchedType !== 'lot_development' && (
          <FormSection title={`${OPPORTUNITY_TYPE_LABELS[watchedType]} Details`}>
            <FormGrid>
              <FormField label="Zoning">
                <Input {...form.register('zoning_current')} placeholder="Zoning" className={inputClass} />
              </FormField>
              <FormField label="Total Acreage">
                <Input type="number" step="0.01" {...form.register('total_acreage')} placeholder="0.5" className={inputClass} />
              </FormField>
              <FormField label="Notes" className="md:col-span-2">
                <Textarea
                  {...form.register('notes')}
                  placeholder="Additional notes..."
                  rows={4}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 3: Financial                                                   */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && (
        <>
          <FormSection title="Financial">
            <FormGrid>
              <FormField label="Projected Purchase Price ($)">
                <Input type="number" {...form.register('projected_purchase_price')} placeholder="65000" className={inputClass} />
              </FormField>
              <FormField label="Projected Sale Price ($)">
                <Input type="number" {...form.register('projected_sale_price')} placeholder="350000" className={inputClass} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Key Dates">
            <FormGrid>
              <FormField label="Date Identified">
                <Input type="date" {...form.register('date_identified')} className={inputClass} />
              </FormField>
              <FormField label="Under Contract">
                <Input type="date" {...form.register('date_under_contract')} className={inputClass} />
              </FormField>
              <FormField label="DD Deadline">
                <Input type="date" {...form.register('due_diligence_deadline')} className={inputClass} />
              </FormField>
              <FormField label="Projected Close">
                <Input type="date" {...form.register('projected_close_date')} className={inputClass} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Notes">
            <Textarea
              {...form.register('notes')}
              placeholder="Deal notes, conditions, etc."
              rows={4}
            />
          </FormSection>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Navigation buttons                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between pt-2">
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
