'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { OpportunityForm } from '@/components/opportunities/opportunity-form'
import { createClient } from '@/lib/supabase/client'
import { getStagesForType, OPPORTUNITY_TYPE_LABELS, type OpportunityType } from '@/lib/types/opportunities'
import { toast } from '@/lib/hooks/use-toast'
import { useOrganizationId } from '@/lib/hooks/use-organization'

export default function NewOpportunityPage() {
  const router = useRouter()
  const { organizationId, loading: orgLoading, error: orgError } = useOrganizationId()
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Form now emits DB column names directly — minimal mapping needed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = async (data: any) => {
    setSubmitError(null)

    if (!organizationId) {
      const msg = 'No organization context available. Please contact your administrator.'
      setSubmitError(msg)
      toast({ title: 'Error', description: msg, variant: 'destructive' })
      return
    }

    try {
      const supabase = createClient()
      const type = data.type as OpportunityType
      const stages = getStagesForType(type)
      const initialStage = stages[0]?.id ?? 'lead'

      // Auto-generate name from address + type
      const addressParts = [data.address_street, data.address_city, data.address_state]
        .filter(Boolean)
        .join(', ')
      const typeLabel = OPPORTUNITY_TYPE_LABELS[type] ?? 'Other'
      const name = `${addressParts} - ${typeLabel}`

      // Build insert payload — form fields already use DB column names.
      // Only need to add computed fields and strip UI-only fields.
      const payload: Record<string, unknown> = {
        organization_id: organizationId,
        name,
        type,
        current_stage: initialStage,
        status: 'active',
        // Address
        address_street: data.address_street || null,
        address_city: data.address_city || null,
        address_county: data.address_county || null,
        address_state: data.address_state || null,
        address_zip: data.address_zip || null,
        parcel_tms_number: data.parcel_tms_number || null,
        // Assignment
        source: data.source || null,
        assigned_to: data.assigned_to || null,
        owner_entity_id: data.owner_entity_id || null,
      }

      // Type-specific fields (scattered lot)
      if (type === 'scattered_lot') {
        Object.assign(payload, {
          zoning_current: data.zoning_current || null,
          build_type: data.build_type || null,
          road_surrounding: data.road_surrounding || null,
          // Serialize individual setbacks into the buffers text column
          buffers: formatSetbacks(data),
          historic_district: data.historic_district ?? false,
          water_available: data.water_available ?? false,
          sewer_available: data.sewer_available ?? false,
          electric_available: data.electric_available ?? false,
          floor_plan_id: data.floor_plan_id || null,
          garage_position: data.garage_position || null,
          survey_complete: data.survey_complete ?? false,
          lot_width: data.lot_width ?? null,
          lot_depth: data.lot_depth ?? null,
          lot_sqft: data.lot_sqft ?? null,
          total_acreage: data.total_acreage ?? null,
        })
      }

      // Type-specific fields (lot development / community development)
      if (type === 'lot_development' || type === 'community_development') {
        Object.assign(payload, {
          total_acreage: data.total_acreage ?? null,
          estimated_total_lots: data.estimated_total_lots ?? null,
          zoning_required: data.zoning_required ? 'yes' : null,
          preliminary_plat_status: data.preliminary_plat_status || null,
          target_builders: data.target_builders || null,
          infrastructure_scope_estimate: data.infrastructure_scope_estimate ?? null,
        })
      }

      // Financial fields (already use DB column names)
      Object.assign(payload, {
        projected_purchase_price: data.projected_purchase_price ?? null,
        projected_sale_price: data.projected_sale_price ?? null,
        date_identified: data.date_identified || null,
        date_under_contract: data.date_under_contract || null,
        due_diligence_deadline: data.due_diligence_deadline || null,
        projected_close_date: data.projected_close_date || null,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: created, error } = await supabase
        .from('opportunities')
        .insert(payload as any)
        .select('id')
        .single()

      if (error) throw error

      toast({
        title: 'Opportunity Created',
        description: `"${name}" has been created successfully.`,
      })

      router.push(`/opportunities/${created.id}`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create opportunity.'
      setSubmitError(`Opportunity creation failed: ${message}`)
      toast({
        title: 'Creation failed',
        description: message,
        variant: 'destructive',
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New Opportunity
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a new deal opportunity in your pipeline.
        </p>
      </div>

      {(submitError || orgError) && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {submitError || orgError}
        </div>
      )}

      <OpportunityForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/opportunities')}
      />
    </div>
  )
}

/** Serialize individual setback values into a single description string for the DB buffers column. */
function formatSetbacks(data: Record<string, unknown>): string | null {
  const parts: string[] = []
  if (data.setback_front != null) parts.push(`Front: ${data.setback_front}ft`)
  if (data.setback_rear != null) parts.push(`Rear: ${data.setback_rear}ft`)
  if (data.setback_left != null) parts.push(`Left: ${data.setback_left}ft`)
  if (data.setback_right != null) parts.push(`Right: ${data.setback_right}ft`)
  return parts.length > 0 ? parts.join(', ') : null
}
