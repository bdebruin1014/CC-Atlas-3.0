import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import {
  calculateDealAnalysis,
  DEFAULT_ORG_DEFAULTS,
  type DealAnalysisInputs,
} from "@/lib/utils/deal-analyzer"
import { UPGRADE_PACKAGES, type UpgradePackage } from "@/lib/types/opportunities"

// ---------------------------------------------------------------------------
// Request validation schema
// ---------------------------------------------------------------------------
const DealAnalysisRequestSchema = z.object({
  opportunity_id: z.string().uuid().optional(),
  floor_plan_id: z.string().uuid(),
  upgrade_package: z.enum(["standard", "classic", "elegance", "harmony"]),
  municipality_id: z.string().uuid(),
  purchase_price: z.number().min(0),
  site_work_estimate: z.number().min(0),
  other_site_costs: z.number().min(0).default(0),
  site_specific_adjustments: z.number().min(0).default(0),
  asset_sales_price: z.number().min(0),
  selling_concessions: z.number().min(0).default(0),
  project_duration_days: z.number().int().positive().nullable().default(null),
  interest_rate_override: z.number().positive().nullable().default(null),
  save: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const parsed = DealAnalysisRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Fetch floor plan base cost
    const { data: floorPlan, error: fpError } = await supabase
      .from("floor_plans")
      .select("id, name, base_cost, heated_sf")
      .eq("id", input.floor_plan_id)
      .single()

    if (fpError || !floorPlan) {
      return NextResponse.json(
        { error: "Floor plan not found" },
        { status: 404 }
      )
    }

    // Fetch municipality soft costs - sum all fee columns
    const { data: municipality, error: munError } = await supabase
      .from("municipalities")
      .select("*")
      .eq("id", input.municipality_id)
      .single()

    if (munError || !municipality) {
      return NextResponse.json(
        { error: "Municipality not found" },
        { status: 404 }
      )
    }

    // Calculate total municipality soft costs
    const municipalitySoftCosts =
      (municipality.building_permit_fee || 0) +
      (municipality.grading_permit_fee || 0) +
      (municipality.mechanical_permit_fee || 0) +
      (municipality.electrical_permit_fee || 0) +
      (municipality.plumbing_permit_fee || 0) +
      (municipality.water_tap_fee || 0) +
      (municipality.sewer_tap_fee || 0) +
      (municipality.impact_fee_per_unit || 0) +
      (municipality.stormwater_fee || 0) +
      (municipality.tree_mitigation_fee || 0) +
      (municipality.road_impact_fee || 0) +
      (municipality.school_impact_fee || 0) +
      (municipality.park_impact_fee || 0) +
      (municipality.fire_impact_fee || 0) +
      (municipality.certificate_of_occupancy_fee || 0)

    // Fetch org defaults
    const orgId = user.user_metadata?.organization_id
    let orgDefaults = DEFAULT_ORG_DEFAULTS

    if (orgId) {
      const { data: org } = await supabase
        .from("organizations")
        .select(
          `
          default_interest_rate,
          default_cost_of_capital_rate,
          default_construction_period_days,
          default_ltc_ratio,
          default_selling_cost_pct,
          default_contingency_pct
        `
        )
        .eq("id", orgId)
        .single()

      if (org) {
        orgDefaults = {
          default_interest_rate: org.default_interest_rate ?? DEFAULT_ORG_DEFAULTS.default_interest_rate,
          default_cost_of_capital: org.default_cost_of_capital_rate ?? DEFAULT_ORG_DEFAULTS.default_cost_of_capital,
          default_project_duration_days: org.default_construction_period_days ?? DEFAULT_ORG_DEFAULTS.default_project_duration_days,
          default_ltc_ratio: org.default_ltc_ratio ?? DEFAULT_ORG_DEFAULTS.default_ltc_ratio,
          default_selling_cost_rate: org.default_selling_cost_pct ?? DEFAULT_ORG_DEFAULTS.default_selling_cost_rate,
          default_warranty_reserve: DEFAULT_ORG_DEFAULTS.default_warranty_reserve,
          default_builders_risk: DEFAULT_ORG_DEFAULTS.default_builders_risk,
          default_utility_charges: DEFAULT_ORG_DEFAULTS.default_utility_charges,
        }
      }
    }

    // Build inputs for the calculation engine
    const calcInputs: DealAnalysisInputs = {
      sticksAndBricks: floorPlan.base_cost || 0,
      upgradePackage: input.upgrade_package as UpgradePackage,
      municipalitySoftCosts,
      purchasePrice: input.purchase_price,
      siteWorkEstimate: input.site_work_estimate,
      otherSiteCosts: input.other_site_costs,
      siteSpecificAdjustments: input.site_specific_adjustments,
      assetSalesPrice: input.asset_sales_price,
      sellingConcessions: input.selling_concessions,
      projectDurationDays: input.project_duration_days,
      interestRateOverride: input.interest_rate_override,
    }

    // Run calculation
    const results = calculateDealAnalysis(calcInputs, orgDefaults)

    // Optionally save to deal_analyses table
    let savedId: string | null = null
    if (input.save && input.opportunity_id) {
      // Mark previous analyses as non-current
      await supabase
        .from("deal_analyses")
        .update({ is_current: false })
        .eq("opportunity_id", input.opportunity_id)
        .eq("is_current", true)

      const { data: saved, error: saveError } = await supabase
        .from("deal_analyses")
        .insert({
          opportunity_id: input.opportunity_id,
          floor_plan_id: input.floor_plan_id,
          upgrade_package: input.upgrade_package,
          municipality_id: input.municipality_id,
          purchase_price: input.purchase_price,
          site_work_estimate: input.site_work_estimate,
          other_site_costs: input.other_site_costs,
          site_specific_vertical_adjustments: input.site_specific_adjustments,
          asset_sales_price: input.asset_sales_price,
          selling_concessions: input.selling_concessions,
          project_duration_days: input.project_duration_days,
          interest_rate_override: input.interest_rate_override,
          calc_base_construction_cost: results.sticksAndBricks,
          calc_upgrade_cost: results.upgradeCost,
          calc_site_specific_adjustments: results.siteSpecificAdjustments,
          calc_total_soft_costs: results.municipalitySoftCosts,
          calc_contingency: results.contingency,
          calc_total_project_cost: results.totalProjectCost,
          calc_loan_amount: results.loanAmount,
          calc_equity_required: results.equityRequired,
          calc_interest_expense: results.interestOnLoan,
          calc_gross_revenue: results.totalRevenue,
          calc_selling_costs: results.totalSellingCosts,
          calc_net_revenue: results.netSalesProceeds,
          calc_net_profit: results.netProfit,
          calc_net_margin_pct: results.netProfitMargin,
          verdict:
            results.verdict === "strong"
              ? "strong_deal"
              : results.verdict === "good"
              ? "good_deal"
              : results.verdict,
          created_by: user.id,
          is_current: true,
        })
        .select("id")
        .single()

      if (saveError) {
        console.error("Failed to save deal analysis:", saveError)
      } else if (saved) {
        savedId = saved.id
      }

      // Update opportunity projected values
      if (input.opportunity_id) {
        await supabase
          .from("opportunities")
          .update({
            projected_purchase_price: input.purchase_price,
            projected_sale_price: input.asset_sales_price,
            projected_profit: results.netProfit,
            projected_margin_pct: results.netProfitMargin,
          })
          .eq("id", input.opportunity_id)
      }
    }

    return NextResponse.json({
      inputs: calcInputs,
      results,
      floor_plan: {
        id: floorPlan.id,
        name: floorPlan.name,
        base_cost: floorPlan.base_cost,
        heated_sf: floorPlan.heated_sf,
      },
      municipality: {
        id: municipality.id,
        name: municipality.name,
        total_soft_costs: municipalitySoftCosts,
      },
      org_defaults: orgDefaults,
      saved_id: savedId,
    })
  } catch (err) {
    console.error("Deal analysis error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
