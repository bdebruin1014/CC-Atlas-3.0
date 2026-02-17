// ---------------------------------------------------------------------------
// Waterfall Distribution Calculator - ATLAS Platform
// ---------------------------------------------------------------------------
// Handles precise financial calculations for investor distributions.
// All monetary calculations use pennies internally to avoid floating-point
// errors, then convert back to dollars for display.
// ---------------------------------------------------------------------------

import type {
  Investor,
  WaterfallStructure,
  WaterfallTier,
  DistributionResult,
  TierDistributionDetail,
} from '@/lib/types/accounting'

/**
 * Convert dollars to cents (integer) for safe arithmetic.
 */
function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/**
 * Convert cents back to dollars.
 */
function toDollars(cents: number): number {
  return cents / 100
}

/**
 * Round to the nearest cent (2 decimal places).
 */
function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Allocate an amount across investors proportionally by ownership %,
 * handling rounding so the total is exact.
 * Uses the "largest remainder" method to allocate rounding cents.
 */
function allocateProportionally(
  totalCents: number,
  investors: Array<{ id: string; ownership_percent: number }>
): Map<string, number> {
  const allocation = new Map<string, number>()

  // Calculate raw proportional amounts in cents
  const rawAmounts = investors.map((inv) => ({
    id: inv.id,
    raw: (totalCents * inv.ownership_percent) / 100,
    floored: 0,
    remainder: 0,
  }))

  rawAmounts.forEach((item) => {
    item.floored = Math.floor(item.raw)
    item.remainder = item.raw - item.floored
  })

  // Assign floored amounts
  let allocatedCents = 0
  rawAmounts.forEach((item) => {
    allocation.set(item.id, item.floored)
    allocatedCents += item.floored
  })

  // Distribute remaining cents by largest remainder
  let remaining = totalCents - allocatedCents
  const sorted = [...rawAmounts].sort((a, b) => b.remainder - a.remainder)
  for (const item of sorted) {
    if (remaining <= 0) break
    allocation.set(item.id, (allocation.get(item.id) || 0) + 1)
    remaining--
  }

  return allocation
}

// ---------------------------------------------------------------------------
// Simple Preferred + Promote Waterfall
// ---------------------------------------------------------------------------
// 1. Preferred Return: investors receive their preferred return on contributed capital
// 2. Return of Capital: (simplified - we pay preferred first, then remaining split)
// 3. Promote/Carried Interest: remaining split between investors and manager
// ---------------------------------------------------------------------------

function calculateSimplePreferredPromote(
  totalAmount: number,
  investors: Investor[],
  tiers: WaterfallTier[]
): { results: DistributionResult[]; steps: WaterfallStep[] } {
  const totalCents = toCents(totalAmount)
  const steps: WaterfallStep[] = []

  // Initialize results
  const resultMap = new Map<string, DistributionResult>()
  investors.forEach((inv) => {
    resultMap.set(inv.id, {
      investor_id: inv.id,
      investor_name: inv.contact_name,
      ownership_percent: inv.ownership_percent,
      preferred_amount: 0,
      promote_share: 0,
      total_distribution: 0,
      tier_details: [],
    })
  })

  let remainingCents = totalCents

  // Sort tiers by order
  const sortedTiers = [...tiers].sort((a, b) => a.tier_order - b.tier_order)

  for (const tier of sortedTiers) {
    if (remainingCents <= 0) break

    if (tier.preferred_return_rate && tier.preferred_return_rate > 0) {
      // Step: Preferred Return
      // Calculate each investor's preferred return based on capital contributed
      let totalPreferredCents = 0
      const preferredPerInvestor = new Map<string, number>()

      investors.forEach((inv) => {
        const preferredDollars = inv.capital_contributed * (tier.preferred_return_rate! / 100)
        const preferredCentsForInv = toCents(preferredDollars)
        preferredPerInvestor.set(inv.id, preferredCentsForInv)
        totalPreferredCents += preferredCentsForInv
      })

      // Cap at remaining
      const preferredPayout = Math.min(totalPreferredCents, remainingCents)

      if (preferredPayout < totalPreferredCents) {
        // Not enough to cover full preferred - prorate
        const ratio = preferredPayout / totalPreferredCents
        investors.forEach((inv) => {
          const original = preferredPerInvestor.get(inv.id) || 0
          const prorated = Math.floor(original * ratio)
          const result = resultMap.get(inv.id)!
          result.preferred_amount = roundCents(toDollars(prorated))
          result.total_distribution += roundCents(toDollars(prorated))
          result.tier_details.push({
            tier_name: tier.name,
            tier_order: tier.tier_order,
            investor_amount: roundCents(toDollars(prorated)),
            manager_amount: 0,
          })
        })
      } else {
        investors.forEach((inv) => {
          const prefCents = preferredPerInvestor.get(inv.id) || 0
          const result = resultMap.get(inv.id)!
          result.preferred_amount = roundCents(toDollars(prefCents))
          result.total_distribution += roundCents(toDollars(prefCents))
          result.tier_details.push({
            tier_name: tier.name,
            tier_order: tier.tier_order,
            investor_amount: roundCents(toDollars(prefCents)),
            manager_amount: 0,
          })
        })
      }

      remainingCents -= preferredPayout

      steps.push({
        name: tier.name,
        description: `Preferred Return (${tier.preferred_return_rate}%)`,
        amount: roundCents(toDollars(preferredPayout)),
        investor_total: roundCents(toDollars(preferredPayout)),
        manager_total: 0,
      })
    } else {
      // Promote split tier
      const splitAmount = remainingCents
      const investorShareCents = Math.round(splitAmount * (tier.investor_split_percent / 100))
      const managerShareCents = splitAmount - investorShareCents

      // Allocate investor share proportionally
      const investorAllocation = allocateProportionally(
        investorShareCents,
        investors.map((inv) => ({ id: inv.id, ownership_percent: inv.ownership_percent }))
      )

      investors.forEach((inv) => {
        const invCents = investorAllocation.get(inv.id) || 0
        const result = resultMap.get(inv.id)!
        result.promote_share += roundCents(toDollars(invCents))
        result.total_distribution += roundCents(toDollars(invCents))
        result.tier_details.push({
          tier_name: tier.name,
          tier_order: tier.tier_order,
          investor_amount: roundCents(toDollars(invCents)),
          manager_amount: 0,
        })
      })

      remainingCents -= splitAmount

      steps.push({
        name: tier.name,
        description: `Promote Split: ${tier.investor_split_percent}% Investors / ${tier.manager_split_percent}% Manager`,
        amount: roundCents(toDollars(splitAmount)),
        investor_total: roundCents(toDollars(investorShareCents)),
        manager_total: roundCents(toDollars(managerShareCents)),
      })
    }
  }

  return {
    results: Array.from(resultMap.values()),
    steps,
  }
}

// ---------------------------------------------------------------------------
// Multi-Tier IRR Waterfall
// ---------------------------------------------------------------------------

function calculateMultiTierIRR(
  totalAmount: number,
  investors: Investor[],
  tiers: WaterfallTier[]
): { results: DistributionResult[]; steps: WaterfallStep[] } {
  const totalCents = toCents(totalAmount)
  const steps: WaterfallStep[] = []

  const resultMap = new Map<string, DistributionResult>()
  investors.forEach((inv) => {
    resultMap.set(inv.id, {
      investor_id: inv.id,
      investor_name: inv.contact_name,
      ownership_percent: inv.ownership_percent,
      preferred_amount: 0,
      promote_share: 0,
      total_distribution: 0,
      tier_details: [],
    })
  })

  let remainingCents = totalCents
  const sortedTiers = [...tiers].sort((a, b) => a.tier_order - b.tier_order)

  // Total contributed to calculate tier thresholds
  const totalContributed = investors.reduce((sum, inv) => sum + inv.capital_contributed, 0)
  const totalContributedCents = toCents(totalContributed)

  for (const tier of sortedTiers) {
    if (remainingCents <= 0) break

    // Calculate how much falls into this tier
    // For multi-tier IRR, the amount for each tier is calculated based on IRR hurdle thresholds
    // Simplified: each tier absorbs a portion of remaining based on hurdle rates applied to capital
    let tierCapCents: number

    if (tier.irr_hurdle_high != null) {
      // Capped tier: the amount for this tier is the return between hurdle_low and hurdle_high
      const lowReturn = totalContributedCents * ((tier.irr_hurdle_low || 0) / 100)
      const highReturn = totalContributedCents * (tier.irr_hurdle_high / 100)
      tierCapCents = Math.round(highReturn - lowReturn)
    } else {
      // Uncapped final tier: everything remaining
      tierCapCents = remainingCents
    }

    const tierAmount = Math.min(tierCapCents, remainingCents)
    const investorShareCents = Math.round(tierAmount * (tier.investor_split_percent / 100))
    const managerShareCents = tierAmount - investorShareCents

    // Allocate investor share proportionally
    const investorAllocation = allocateProportionally(
      investorShareCents,
      investors.map((inv) => ({ id: inv.id, ownership_percent: inv.ownership_percent }))
    )

    investors.forEach((inv) => {
      const invCents = investorAllocation.get(inv.id) || 0
      const result = resultMap.get(inv.id)!
      result.promote_share += roundCents(toDollars(invCents))
      result.total_distribution += roundCents(toDollars(invCents))
      result.tier_details.push({
        tier_name: tier.name,
        tier_order: tier.tier_order,
        investor_amount: roundCents(toDollars(invCents)),
        manager_amount: 0,
      })
    })

    remainingCents -= tierAmount

    const hurdleLabel = tier.irr_hurdle_high != null
      ? `${tier.irr_hurdle_low || 0}% - ${tier.irr_hurdle_high}% IRR`
      : `${tier.irr_hurdle_low || 0}%+ IRR`

    steps.push({
      name: tier.name,
      description: `${hurdleLabel}: ${tier.investor_split_percent}% Investors / ${tier.manager_split_percent}% Manager`,
      amount: roundCents(toDollars(tierAmount)),
      investor_total: roundCents(toDollars(investorShareCents)),
      manager_total: roundCents(toDollars(managerShareCents)),
    })
  }

  return {
    results: Array.from(resultMap.values()),
    steps,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface WaterfallStep {
  name: string
  description: string
  amount: number
  investor_total: number
  manager_total: number
}

export interface WaterfallCalculationResult {
  total_distributed: number
  total_to_investors: number
  total_to_manager: number
  results: DistributionResult[]
  steps: WaterfallStep[]
}

/**
 * Main entry point: calculate a distribution waterfall.
 */
export function calculateWaterfall(
  totalAmount: number,
  investors: Investor[],
  waterfallStructure: WaterfallStructure
): WaterfallCalculationResult {
  if (totalAmount <= 0) {
    return {
      total_distributed: 0,
      total_to_investors: 0,
      total_to_manager: 0,
      results: investors.map((inv) => ({
        investor_id: inv.id,
        investor_name: inv.contact_name,
        ownership_percent: inv.ownership_percent,
        preferred_amount: 0,
        promote_share: 0,
        total_distribution: 0,
        tier_details: [],
      })),
      steps: [],
    }
  }

  let calcResult: { results: DistributionResult[]; steps: WaterfallStep[] }

  switch (waterfallStructure.waterfall_type) {
    case 'simple_preferred_promote':
      calcResult = calculateSimplePreferredPromote(
        totalAmount,
        investors,
        waterfallStructure.tiers
      )
      break
    case 'multi_tier_irr':
      calcResult = calculateMultiTierIRR(
        totalAmount,
        investors,
        waterfallStructure.tiers
      )
      break
    default:
      throw new Error(`Unknown waterfall type: ${waterfallStructure.waterfall_type}`)
  }

  const total_to_investors = calcResult.results.reduce(
    (sum, r) => roundCents(sum + r.total_distribution),
    0
  )
  const total_to_manager = calcResult.steps.reduce(
    (sum, s) => roundCents(sum + s.manager_total),
    0
  )

  return {
    total_distributed: roundCents(total_to_investors + total_to_manager),
    total_to_investors,
    total_to_manager,
    results: calcResult.results,
    steps: calcResult.steps,
  }
}
