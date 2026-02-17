'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { DealAnalyzer } from '@/components/opportunities/deal-analyzer'
import { createClient } from '@/lib/supabase/client'
import type { Opportunity } from '@/lib/types/opportunities'
import { ArrowLeft, Calculator } from 'lucide-react'

export default function DealAnalyzerPage() {
  const params = useParams()
  const id = params.id as string

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from('opportunities')
        .select(
          'id, name, address_line1, type, projected_purchase_price, projected_sale_price, projected_arv, floor_plan_id'
        )
        .eq('id', id)
        .single()

      setOpportunity(data as Opportunity | null)
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/opportunities/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Opportunity
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Deal Analyzer</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {opportunity?.name || opportunity?.address_street || 'Opportunity'} —
          Run financial scenarios to evaluate this deal.
        </p>
      </div>

      {/* Deal Analyzer Component */}
      <DealAnalyzer
        opportunityId={id}
        initialData={{
          purchasePrice: opportunity?.projected_purchase_price ?? undefined,
          salesPrice:
            opportunity?.projected_sale_price ??
            undefined,
          floorPlanId: opportunity?.floor_plan_id ?? undefined,
        }}
      />
    </div>
  )
}
