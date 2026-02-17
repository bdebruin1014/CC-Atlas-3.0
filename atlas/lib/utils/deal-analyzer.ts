// ---------------------------------------------------------------------------
// ATLAS Deal Analyzer — Core Financial Calculation Engine
// Red Cedar Homes
// ---------------------------------------------------------------------------
//
// This module performs the complete financial analysis for a scattered-lot
// residential new-construction deal. Every field is fully deterministic
// and recalculates on each input change in the UI.
// ---------------------------------------------------------------------------

import type { OrgDefaults, UpgradePackage } from '@/lib/types/opportunities'
import { UPGRADE_PACKAGES } from '@/lib/types/opportunities'

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface DealAnalysisInputs {
  /** Sticks & bricks base cost from the selected floor plan */
  sticksAndBricks: number
  /** Upgrade package key */
  upgradePackage: UpgradePackage
  /** Total municipality soft costs (permits, impact fees, tap fees, etc.) */
  municipalitySoftCosts: number
  /** Purchase price of the lot */
  purchasePrice: number
  /** Site work / grading estimate */
  siteWorkEstimate: number
  /** Other site-specific costs */
  otherSiteCosts: number
  /** Site-specific vertical adjustments (e.g. foundation upgrades) */
  siteSpecificAdjustments: number
  /** Projected asset sales price (ARV) */
  assetSalesPrice: number
  /** Seller concessions to buyer */
  sellingConcessions: number
  /** Override project duration in days (null = use org default) */
  projectDurationDays: number | null
  /** Override interest rate (null = use org default) */
  interestRateOverride: number | null
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface DealAnalysisResults {
  // Section 1 — Cost Summary
  sticksAndBricks: number
  upgradeCost: number
  lotPreparation: number
  siteSpecificAdjustments: number
  municipalitySoftCosts: number
  builderFee: number
  builderFeeLabel: string
  contingency: number
  contingencyLabel: string
  totalContractCost: number

  // Section 2 — Fixed Per-House Costs
  warrantyReserve: number
  buildersRiskInsurance: number
  closingCosts: number
  utilityCharges: number

  // Section 3 — Total Project Cost (excl. carry)
  totalProjectCost: number

  // Section 4 — Financing
  loanAmount: number
  equityRequired: number
  interestOnLoan: number
  costOfCapitalOnEquity: number
  totalCarryCosts: number

  // Section 5 — Deal Results
  totalAllInCost: number
  totalRevenue: number
  totalSellingCosts: number
  netSalesProceeds: number
  netProfit: number
  netProfitMargin: number

  // Section 6 — Verdict
  verdict: DealVerdict
  verdictLabel: string
  verdictColor: string
}

export type DealVerdict = 'strong' | 'good' | 'marginal' | 'no_go'

// ---------------------------------------------------------------------------
// Default org values (used when org data not yet fetched)
// ---------------------------------------------------------------------------

export const DEFAULT_ORG_DEFAULTS: OrgDefaults = {
  default_interest_rate: 10,
  default_cost_of_capital: 12,
  default_project_duration_days: 120,
  default_ltc_ratio: 85,
  default_selling_cost_rate: 8.5,
  default_warranty_reserve: 1500,
  default_builders_risk: 1200,
  default_utility_charges: 2500,
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------

export function calculateDealAnalysis(
  inputs: DealAnalysisInputs,
  orgDefaults: OrgDefaults = DEFAULT_ORG_DEFAULTS
): DealAnalysisResults {
  // -------------------------------------------
  // Section 1 — Cost Summary
  // -------------------------------------------

  const sticksAndBricks = inputs.sticksAndBricks
  const upgradeCost = UPGRADE_PACKAGES[inputs.upgradePackage].cost
  const lotPreparation = inputs.siteWorkEstimate + inputs.otherSiteCosts
  const siteSpecificAdjustments = inputs.siteSpecificAdjustments
  const municipalitySoftCosts = inputs.municipalitySoftCosts

  // Pre-fee subtotal (before builder fee & contingency)
  const preFeeSubtotal =
    sticksAndBricks +
    upgradeCost +
    lotPreparation +
    siteSpecificAdjustments +
    municipalitySoftCosts

  // Builder Fee: MAX($25,000, 10% of pre-fee subtotal)
  const builderFeePercent = preFeeSubtotal * 0.1
  const builderFee = Math.max(25000, builderFeePercent)
  const builderFeeLabel =
    builderFee === 25000 ? 'MIN $25K applied' : '10% of subtotal'

  // Contingency: MAX($10,000, 5% of pre-fee subtotal)
  const contingencyPercent = preFeeSubtotal * 0.05
  const contingency = Math.max(10000, contingencyPercent)
  const contingencyLabel =
    contingency === 10000 ? 'MIN $10K applied' : '5% of subtotal'

  const totalContractCost = preFeeSubtotal + builderFee + contingency

  // -------------------------------------------
  // Section 2 — Fixed Per-House Costs
  // -------------------------------------------

  const warrantyReserve = orgDefaults.default_warranty_reserve
  const buildersRiskInsurance = orgDefaults.default_builders_risk
  const closingCosts = inputs.purchasePrice * 0.05
  const utilityCharges = orgDefaults.default_utility_charges

  const totalFixedCosts =
    warrantyReserve + buildersRiskInsurance + closingCosts + utilityCharges

  // -------------------------------------------
  // Section 3 — Total Project Cost (excl. carry)
  // -------------------------------------------

  const totalProjectCost =
    inputs.purchasePrice + totalContractCost + totalFixedCosts

  // -------------------------------------------
  // Section 4 — Financing
  // -------------------------------------------

  const ltcRatio = orgDefaults.default_ltc_ratio / 100 // e.g. 0.85
  const loanAmount = totalProjectCost * ltcRatio
  const equityRequired = totalProjectCost - loanAmount

  const projectDays =
    inputs.projectDurationDays ?? orgDefaults.default_project_duration_days
  const annualInterestRate =
    (inputs.interestRateOverride ?? orgDefaults.default_interest_rate) / 100
  const annualCoCRate = orgDefaults.default_cost_of_capital / 100

  // Simple interest over the project period
  const interestOnLoan = loanAmount * annualInterestRate * (projectDays / 365)
  const costOfCapitalOnEquity =
    equityRequired * annualCoCRate * (projectDays / 365)
  const totalCarryCosts = interestOnLoan + costOfCapitalOnEquity

  // -------------------------------------------
  // Section 5 — Deal Results
  // -------------------------------------------

  const totalAllInCost = totalProjectCost + totalCarryCosts

  const totalRevenue = inputs.assetSalesPrice

  // Selling costs = selling cost rate (default 8.5%) of revenue + concessions
  const sellingCostRate = orgDefaults.default_selling_cost_rate / 100
  const totalSellingCosts =
    totalRevenue * sellingCostRate + inputs.sellingConcessions

  const netSalesProceeds = totalRevenue - totalSellingCosts

  const netProfit = netSalesProceeds - totalAllInCost
  const netProfitMargin =
    totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  // -------------------------------------------
  // Section 6 — Verdict
  // -------------------------------------------

  let verdict: DealVerdict
  let verdictLabel: string
  let verdictColor: string

  if (netProfitMargin > 10) {
    verdict = 'strong'
    verdictLabel = 'STRONG DEAL'
    verdictColor = '#22c55e'
  } else if (netProfitMargin >= 7) {
    verdict = 'good'
    verdictLabel = 'GOOD DEAL'
    verdictColor = '#3b82f6'
  } else if (netProfitMargin >= 5) {
    verdict = 'marginal'
    verdictLabel = 'MARGINAL'
    verdictColor = '#f59e0b'
  } else {
    verdict = 'no_go'
    verdictLabel = 'NO GO / REWORK'
    verdictColor = '#ef4444'
  }

  return {
    sticksAndBricks,
    upgradeCost,
    lotPreparation,
    siteSpecificAdjustments,
    municipalitySoftCosts,
    builderFee,
    builderFeeLabel,
    contingency,
    contingencyLabel,
    totalContractCost,

    warrantyReserve,
    buildersRiskInsurance,
    closingCosts,
    utilityCharges,

    totalProjectCost,

    loanAmount,
    equityRequired,
    interestOnLoan,
    costOfCapitalOnEquity,
    totalCarryCosts,

    totalAllInCost,
    totalRevenue,
    totalSellingCosts,
    netSalesProceeds,
    netProfit,
    netProfitMargin,

    verdict,
    verdictLabel,
    verdictColor,
  }
}
