// ============================================================================
// Waterfall Distribution Calculation Engine
// Supports: Simple Preferred + Promote, Multi-Tier IRR, Straight Split
// ============================================================================

export interface WaterfallInput {
  total_amount: number
  waterfall_type: "simple_preferred_promote" | "straight_split" | "multi_tier_irr"
  investors: WaterfallInvestor[]
  manager_ownership_pct: number
  tiers: WaterfallTierConfig[]
  // For IRR-based waterfalls
  cash_flows?: CashFlowEntry[]
}

export interface WaterfallInvestor {
  id: string
  name: string
  ownership_pct: number
  capital_contributed: number
  capital_returned: number
  preferred_return_rate: number
  preferred_return_accrued: number
  distributions_to_date: number
}

export interface WaterfallTierConfig {
  tier_number: number
  name: string
  threshold_type: "preferred_return" | "irr" | "multiple" | "none"
  threshold_value: number
  investor_split_pct: number
  manager_split_pct: number
}

export interface CashFlowEntry {
  date: string
  amount: number // negative = contribution, positive = distribution
  investor_id: string
}

export interface WaterfallResult {
  total_distributed: number
  tiers: WaterfallTierResult[]
  investor_allocations: InvestorAllocation[]
  manager_allocation: number
}

export interface WaterfallTierResult {
  tier_number: number
  tier_name: string
  amount: number
  investor_share: number
  manager_share: number
}

export interface InvestorAllocation {
  investor_id: string
  investor_name: string
  total_allocation: number
  tier_breakdown: { tier: number; amount: number }[]
  capital_returned: number
  preferred_paid: number
  profit_share: number
}

/**
 * Calculate waterfall distribution
 */
export function calculateWaterfall(input: WaterfallInput): WaterfallResult {
  switch (input.waterfall_type) {
    case "simple_preferred_promote":
      return calculateSimplePreferred(input)
    case "straight_split":
      return calculateStraightSplit(input)
    case "multi_tier_irr":
      return calculateMultiTierIRR(input)
    default:
      return calculateStraightSplit(input)
  }
}

function calculateSimplePreferred(input: WaterfallInput): WaterfallResult {
  const { total_amount, investors, tiers } = input
  let remaining = total_amount
  const tierResults: WaterfallTierResult[] = []
  const allocations = new Map<string, InvestorAllocation>()

  // Initialize allocations
  for (const inv of investors) {
    allocations.set(inv.id, {
      investor_id: inv.id,
      investor_name: inv.name,
      total_allocation: 0,
      tier_breakdown: [],
      capital_returned: 0,
      preferred_paid: 0,
      profit_share: 0,
    })
  }

  // Tier 1: Return of Capital
  if (remaining > 0) {
    const totalUnreturnedCapital = investors.reduce(
      (sum, inv) => sum + Math.max(0, inv.capital_contributed - inv.capital_returned),
      0
    )
    const rocAmount = Math.min(remaining, totalUnreturnedCapital)
    remaining -= rocAmount

    for (const inv of investors) {
      const unreturnedCapital = Math.max(0, inv.capital_contributed - inv.capital_returned)
      const share = totalUnreturnedCapital > 0
        ? (unreturnedCapital / totalUnreturnedCapital) * rocAmount
        : 0
      const alloc = allocations.get(inv.id)!
      alloc.capital_returned = share
      alloc.total_allocation += share
      alloc.tier_breakdown.push({ tier: 1, amount: share })
    }

    tierResults.push({
      tier_number: 1,
      tier_name: "Return of Capital",
      amount: rocAmount,
      investor_share: rocAmount,
      manager_share: 0,
    })
  }

  // Tier 2: Preferred Return
  if (remaining > 0) {
    const totalPreferredOwed = investors.reduce(
      (sum, inv) => sum + inv.preferred_return_accrued,
      0
    )
    const prefAmount = Math.min(remaining, totalPreferredOwed)
    remaining -= prefAmount

    for (const inv of investors) {
      const share = totalPreferredOwed > 0
        ? (inv.preferred_return_accrued / totalPreferredOwed) * prefAmount
        : 0
      const alloc = allocations.get(inv.id)!
      alloc.preferred_paid = share
      alloc.total_allocation += share
      alloc.tier_breakdown.push({ tier: 2, amount: share })
    }

    tierResults.push({
      tier_number: 2,
      tier_name: "Preferred Return",
      amount: prefAmount,
      investor_share: prefAmount,
      manager_share: 0,
    })
  }

  // Tier 3: Catch-Up (to manager)
  if (remaining > 0 && tiers.length > 0) {
    const catchUpTier = tiers.find(t => t.name.toLowerCase().includes("catch"))
    if (catchUpTier) {
      const managerCatchUp = Math.min(
        remaining,
        tierResults[1]?.amount ?? 0 // match preferred amount
      )
      remaining -= managerCatchUp

      tierResults.push({
        tier_number: 3,
        tier_name: "Manager Catch-Up",
        amount: managerCatchUp,
        investor_share: 0,
        manager_share: managerCatchUp,
      })
    }
  }

  // Tier 4+: Residual Split
  if (remaining > 0) {
    const residualTier = tiers.find(t => t.tier_number === tiers.length) ?? {
      investor_split_pct: 80,
      manager_split_pct: 20,
    }
    const investorShare = remaining * (residualTier.investor_split_pct / 100)
    const managerShare = remaining * (residualTier.manager_split_pct / 100)

    const totalOwnership = investors.reduce((sum, inv) => sum + inv.ownership_pct, 0)
    for (const inv of investors) {
      const share = totalOwnership > 0
        ? (inv.ownership_pct / totalOwnership) * investorShare
        : 0
      const alloc = allocations.get(inv.id)!
      alloc.profit_share = share
      alloc.total_allocation += share
      alloc.tier_breakdown.push({ tier: 4, amount: share })
    }

    tierResults.push({
      tier_number: 4,
      tier_name: "Residual Split",
      amount: remaining,
      investor_share: investorShare,
      manager_share: managerShare,
    })
    remaining = 0
  }

  const managerTotal = tierResults.reduce((sum, t) => sum + t.manager_share, 0)

  return {
    total_distributed: total_amount,
    tiers: tierResults,
    investor_allocations: Array.from(allocations.values()),
    manager_allocation: managerTotal,
  }
}

function calculateStraightSplit(input: WaterfallInput): WaterfallResult {
  const { total_amount, investors } = input
  const splitTier = input.tiers[0] ?? { investor_split_pct: 70, manager_split_pct: 30 }

  const investorPool = total_amount * (splitTier.investor_split_pct / 100)
  const managerPool = total_amount * (splitTier.manager_split_pct / 100)

  const totalOwnership = investors.reduce((sum, inv) => sum + inv.ownership_pct, 0)
  const allocations: InvestorAllocation[] = investors.map(inv => {
    const share = totalOwnership > 0
      ? (inv.ownership_pct / totalOwnership) * investorPool
      : 0
    return {
      investor_id: inv.id,
      investor_name: inv.name,
      total_allocation: share,
      tier_breakdown: [{ tier: 1, amount: share }],
      capital_returned: 0,
      preferred_paid: 0,
      profit_share: share,
    }
  })

  return {
    total_distributed: total_amount,
    tiers: [{
      tier_number: 1,
      tier_name: "Straight Split",
      amount: total_amount,
      investor_share: investorPool,
      manager_share: managerPool,
    }],
    investor_allocations: allocations,
    manager_allocation: managerPool,
  }
}

function calculateMultiTierIRR(input: WaterfallInput): WaterfallResult {
  const { total_amount, investors, tiers } = input
  let remaining = total_amount
  const tierResults: WaterfallTierResult[] = []
  const investorTotals = new Map<string, number>()
  investors.forEach(inv => investorTotals.set(inv.id, 0))

  // Process each tier
  for (const tier of tiers) {
    if (remaining <= 0) break

    const tierAmount = remaining // Simplified: distribute remaining at each tier
    const investorShare = tierAmount * (tier.investor_split_pct / 100)
    const managerShare = tierAmount * (tier.manager_split_pct / 100)

    const totalOwnership = investors.reduce((sum, inv) => sum + inv.ownership_pct, 0)
    for (const inv of investors) {
      const share = totalOwnership > 0
        ? (inv.ownership_pct / totalOwnership) * investorShare
        : 0
      investorTotals.set(inv.id, (investorTotals.get(inv.id) ?? 0) + share)
    }

    tierResults.push({
      tier_number: tier.tier_number,
      tier_name: tier.name,
      amount: tierAmount,
      investor_share: investorShare,
      manager_share: managerShare,
    })

    remaining = 0
  }

  const allocations: InvestorAllocation[] = investors.map(inv => ({
    investor_id: inv.id,
    investor_name: inv.name,
    total_allocation: investorTotals.get(inv.id) ?? 0,
    tier_breakdown: tierResults.map(t => ({
      tier: t.tier_number,
      amount: ((investorTotals.get(inv.id) ?? 0) / tierResults.length),
    })),
    capital_returned: 0,
    preferred_paid: 0,
    profit_share: investorTotals.get(inv.id) ?? 0,
  }))

  return {
    total_distributed: total_amount,
    tiers: tierResults,
    investor_allocations: allocations,
    manager_allocation: tierResults.reduce((sum, t) => sum + t.manager_share, 0),
  }
}

/**
 * Calculate IRR using Newton's method (XIRR)
 */
export function calculateXIRR(cashFlows: { date: string; amount: number }[]): number | null {
  if (cashFlows.length < 2) return null

  const dates = cashFlows.map(cf => new Date(cf.date).getTime())
  const amounts = cashFlows.map(cf => cf.amount)
  const minDate = Math.min(...dates)

  // Years from first date
  const years = dates.map(d => (d - minDate) / (365.25 * 24 * 60 * 60 * 1000))

  const npv = (rate: number): number => {
    return amounts.reduce((sum, amount, i) => {
      return sum + amount / Math.pow(1 + rate, years[i])
    }, 0)
  }

  const dnpv = (rate: number): number => {
    return amounts.reduce((sum, amount, i) => {
      if (years[i] === 0) return sum
      return sum - years[i] * amount / Math.pow(1 + rate, years[i] + 1)
    }, 0)
  }

  // Newton's method
  let guess = 0.1
  for (let i = 0; i < 100; i++) {
    const n = npv(guess)
    const d = dnpv(guess)
    if (Math.abs(d) < 1e-10) break
    const newGuess = guess - n / d
    if (Math.abs(newGuess - guess) < 1e-7) return Math.round(newGuess * 10000) / 10000
    guess = newGuess
  }

  return Math.abs(npv(guess)) < 1 ? Math.round(guess * 10000) / 10000 : null
}

/**
 * Calculate equity multiple
 */
export function calculateEquityMultiple(
  totalDistributions: number,
  totalContributions: number
): number {
  if (totalContributions === 0) return 0
  return Math.round((totalDistributions / totalContributions) * 100) / 100
}
