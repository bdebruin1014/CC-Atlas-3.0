'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, formatCurrency } from '@/lib/utils/format'
import {
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_TYPE_COLORS,
  type Opportunity,
} from '@/lib/types/opportunities'
import { MapPin, Clock } from 'lucide-react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OpportunityCardProps {
  opportunity: Opportunity
  onClick?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysInStage(updatedAt: string): number {
  const now = new Date()
  const updated = new Date(updatedAt)
  return Math.max(0, Math.floor((now.getTime() - updated.getTime()) / 86_400_000))
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OpportunityCard({ opportunity, onClick }: OpportunityCardProps) {
  const days = daysInStage(opportunity.updated_at)
  const typeLabel = OPPORTUNITY_TYPE_LABELS[opportunity.type] ?? opportunity.type
  const typeColor = OPPORTUNITY_TYPE_COLORS[opportunity.type] ?? '#6b7280'

  const address =
    opportunity.address_street ||
    opportunity.name ||
    'Untitled Opportunity'

  const shortAddress =
    address.length > 35 ? address.slice(0, 35) + '...' : address

  const Wrapper = onClick ? 'div' : Link

  const wrapperProps = onClick
    ? { onClick, className: cn('cursor-pointer rounded-md p-3 transition-all hover:shadow-md', 'space-y-2') }
    : { href: `/opportunities/${opportunity.id}`, className: cn('block cursor-pointer rounded-md p-3 transition-all hover:shadow-md', 'space-y-2') }

  return (
    <Wrapper
      {...(wrapperProps as any)}
    >
      {/* Top row: address + type badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium leading-tight truncate">
            {shortAddress}
          </span>
        </div>
      </div>

      {/* Type badge */}
      <div>
        <Badge
          className="text-[10px] font-medium px-1.5 py-0"
          style={{
            backgroundColor: `${typeColor}15`,
            color: typeColor,
            borderColor: `${typeColor}30`,
          }}
        >
          {typeLabel}
        </Badge>
      </div>

      {/* Bottom row: value, days, user */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {opportunity.projected_sale_price
            ? formatCurrency(opportunity.projected_sale_price, { compact: true })
            : opportunity.projected_purchase_price
            ? formatCurrency(opportunity.projected_purchase_price, { compact: true })
            : '—'}
        </span>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-[11px]">{days}d</span>
          </div>

          {opportunity.assigned_user && (
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={opportunity.assigned_user.avatar_url ?? undefined}
                alt={opportunity.assigned_user.full_name}
              />
              <AvatarFallback className="text-[9px]">
                {getInitials(opportunity.assigned_user.full_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </Wrapper>
  )
}
