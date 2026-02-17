'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { KanbanBoard, type KanbanColumn } from '@/components/shared/kanban-board'
import { OpportunityCard } from '@/components/opportunities/opportunity-card'
import type { Opportunity, StageDefinition } from '@/lib/types/opportunities'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PipelineKanbanProps {
  opportunities: Opportunity[]
  stages: StageDefinition[]
  onStageChange: (opportunityId: string, fromStage: string, toStage: string) => void
  onCardClick?: (opportunity: Opportunity) => void
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PipelineKanban({
  opportunities,
  stages,
  onStageChange,
  onCardClick,
  isLoading = false,
}: PipelineKanbanProps) {
  const router = useRouter()

  // Build kanban columns from stages
  const columns: KanbanColumn<Opportunity>[] = stages.map((stage) => ({
    id: stage.id,
    title: stage.label,
    color: stage.color,
    items: opportunities.filter((opp) => opp.stage === stage.id),
  }))

  const handleCardMove = useCallback(
    (item: Opportunity, fromColumnId: string, toColumnId: string) => {
      onStageChange(item.id, fromColumnId, toColumnId)
    },
    [onStageChange]
  )

  const handleCardClick = useCallback(
    (opp: Opportunity) => {
      if (onCardClick) {
        onCardClick(opp)
      } else {
        router.push(`/opportunities/${opp.id}`)
      }
    },
    [onCardClick, router]
  )

  const renderCard = useCallback(
    (opp: Opportunity) => (
      <OpportunityCard
        opportunity={opp}
        onClick={() => handleCardClick(opp)}
      />
    ),
    [handleCardClick]
  )

  const columnValueAccessor = useCallback(
    (opp: Opportunity) =>
      opp.projected_sale_price ?? opp.projected_purchase_price ?? 0,
    []
  )

  return (
    <KanbanBoard<Opportunity>
      columns={columns}
      onCardMove={handleCardMove}
      renderCard={renderCard}
      isLoading={isLoading}
      columnValueAccessor={columnValueAccessor}
    />
  )
}
