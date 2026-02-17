'use client'

import { useRouter } from 'next/navigation'
import { OpportunityForm } from '@/components/opportunities/opportunity-form'
import { createClient } from '@/lib/supabase/client'
import { getStagesForType, type OpportunityType } from '@/lib/types/opportunities'
import { toast } from '@/lib/hooks/use-toast'

export default function NewOpportunityPage() {
  const router = useRouter()

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      const supabase = createClient()
      const type = data.type as OpportunityType
      const stages = getStagesForType(type)
      const initialStage = stages[0]?.id ?? 'lead'

      // Auto-generate name from address + type
      const addressParts = [data.address_line1, data.address_city, data.address_state]
        .filter(Boolean)
        .join(', ')
      const typeLabel =
        type === 'scattered_lot'
          ? 'Scattered Lot'
          : type === 'lot_development'
          ? 'Lot Development'
          : type === 'community_development'
          ? 'Community Development'
          : type === 'lot_purchase'
          ? 'Lot Purchase'
          : 'Other'
      const name = `${addressParts} - ${typeLabel}`

      // Build the insert payload, only including fields with actual values
      const payload: Record<string, unknown> = {
        name,
        type,
        stage: initialStage,
        address_line1: data.address_line1 || null,
        address_city: data.address_city || null,
        address_county: data.address_county || null,
        address_state: data.address_state || null,
        address_zip: data.address_zip || null,
        parcel_tms: data.parcel_tms || null,
        source: data.source || null,
        assigned_to: data.assigned_to || null,
        entity_id: data.entity_id || null,
        archived: false,
      }

      // Type-specific fields
      if (type === 'scattered_lot') {
        Object.assign(payload, {
          zoning: data.zoning || null,
          build_type: data.build_type || null,
          road_type: data.road_type || null,
          road_frontage: data.road_frontage || null,
          setback_front: data.setback_front ?? null,
          setback_rear: data.setback_rear ?? null,
          setback_left: data.setback_left ?? null,
          setback_right: data.setback_right ?? null,
          historic_overlay: data.historic_overlay ?? false,
          has_water: data.has_water ?? false,
          has_sewer: data.has_sewer ?? false,
          has_electric: data.has_electric ?? false,
          floor_plan_id: data.floor_plan_id || null,
          garage_position: data.garage_position || null,
          survey_status: data.survey_status || null,
          lot_width: data.lot_width ?? null,
          lot_depth: data.lot_depth ?? null,
          lot_sqft: data.lot_sqft ?? null,
          lot_acreage: data.lot_acreage ?? null,
        })
      }

      if (type === 'lot_development') {
        Object.assign(payload, {
          total_acreage: data.total_acreage ?? null,
          estimated_lots: data.estimated_lots ?? null,
          zoning_required: data.zoning_required ?? false,
          preliminary_plat_status: data.preliminary_plat_status || null,
          target_builders: data.target_builders || null,
          infrastructure_estimate: data.infrastructure_estimate ?? null,
        })
      }

      // Financial fields
      Object.assign(payload, {
        projected_purchase_price: data.projected_purchase_price ?? null,
        projected_sale_price: data.projected_sale_price ?? null,
        projected_arv: data.projected_arv ?? null,
        date_offer: data.date_offer || null,
        date_contract: data.date_contract || null,
        date_dd_expiration: data.date_dd_expiration || null,
        date_closing: data.date_closing || null,
        notes: data.notes || null,
      })

      const { data: created, error } = await supabase
        .from('opportunities')
        .insert(payload)
        .select('id')
        .single()

      if (error) throw error

      toast({
        title: 'Opportunity Created',
        description: `"${name}" has been created successfully.`,
      })

      router.push(`/opportunities/${created.id}`)
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'Failed to create opportunity.',
        variant: 'destructive',
      })
    }
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

      <OpportunityForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/opportunities')}
      />
    </div>
  )
}
