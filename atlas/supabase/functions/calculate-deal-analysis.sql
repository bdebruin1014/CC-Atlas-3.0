-- ============================================================================
-- Function: calculate_deal_analysis
-- ATLAS Platform - Red Cedar Homes
--
-- Performs the complete financial analysis for a scattered-lot residential
-- new-construction deal entirely in SQL. Saves the result to deal_analyses
-- and returns the new analysis UUID.
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_deal_analysis(
    p_opportunity_id UUID,
    p_floor_plan_id UUID,
    p_upgrade_package TEXT,
    p_municipality_id UUID,
    p_purchase_price NUMERIC,
    p_site_work NUMERIC,
    p_other_costs NUMERIC,
    p_vertical_adjustments NUMERIC,
    p_sales_price NUMERIC,
    p_concessions NUMERIC DEFAULT 0,
    p_duration_override INTEGER DEFAULT NULL,
    p_rate_override NUMERIC DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_analysis_id UUID;
    v_org_id UUID;

    -- Floor plan data
    v_base_cost NUMERIC;
    v_heated_sf INTEGER;

    -- Upgrade cost lookup
    v_upgrade_cost NUMERIC;

    -- Municipality soft costs
    v_municipality_soft_costs NUMERIC;

    -- Org defaults
    v_interest_rate NUMERIC;
    v_cost_of_capital NUMERIC;
    v_project_duration INTEGER;
    v_ltc_ratio NUMERIC;
    v_selling_cost_rate NUMERIC;
    v_warranty_reserve NUMERIC := 1500;
    v_builders_risk NUMERIC := 1200;
    v_utility_charges NUMERIC := 2500;

    -- Calculated values
    v_lot_preparation NUMERIC;
    v_pre_fee_subtotal NUMERIC;
    v_builder_fee NUMERIC;
    v_contingency NUMERIC;
    v_total_contract_cost NUMERIC;
    v_closing_costs NUMERIC;
    v_total_fixed_costs NUMERIC;
    v_total_project_cost NUMERIC;
    v_loan_amount NUMERIC;
    v_equity_required NUMERIC;
    v_interest_on_loan NUMERIC;
    v_cost_of_capital_on_equity NUMERIC;
    v_total_carry_costs NUMERIC;
    v_total_all_in_cost NUMERIC;
    v_total_selling_costs NUMERIC;
    v_net_sales_proceeds NUMERIC;
    v_net_profit NUMERIC;
    v_net_margin NUMERIC;
    v_verdict TEXT;
BEGIN
    -- ---------------------------------------------------------------
    -- 1. Fetch floor plan base cost
    -- ---------------------------------------------------------------
    SELECT fp.base_cost, fp.heated_sf, fp.organization_id
    INTO v_base_cost, v_heated_sf, v_org_id
    FROM floor_plans fp
    WHERE fp.id = p_floor_plan_id;

    IF v_base_cost IS NULL THEN
        RAISE EXCEPTION 'Floor plan not found: %', p_floor_plan_id;
    END IF;

    -- ---------------------------------------------------------------
    -- 2. Determine upgrade cost
    -- ---------------------------------------------------------------
    CASE p_upgrade_package
        WHEN 'standard' THEN v_upgrade_cost := 0;
        WHEN 'classic'  THEN v_upgrade_cost := 3500;
        WHEN 'elegance' THEN v_upgrade_cost := 7500;
        WHEN 'harmony'  THEN v_upgrade_cost := 12000;
        ELSE v_upgrade_cost := 0;
    END CASE;

    -- ---------------------------------------------------------------
    -- 3. Calculate municipality soft costs
    -- ---------------------------------------------------------------
    SELECT COALESCE(m.building_permit_fee, 0) +
           COALESCE(m.grading_permit_fee, 0) +
           COALESCE(m.mechanical_permit_fee, 0) +
           COALESCE(m.electrical_permit_fee, 0) +
           COALESCE(m.plumbing_permit_fee, 0) +
           COALESCE(m.water_tap_fee, 0) +
           COALESCE(m.sewer_tap_fee, 0) +
           COALESCE(m.impact_fee_per_unit, 0) +
           COALESCE(m.stormwater_fee, 0) +
           COALESCE(m.tree_mitigation_fee, 0) +
           COALESCE(m.road_impact_fee, 0) +
           COALESCE(m.school_impact_fee, 0) +
           COALESCE(m.park_impact_fee, 0) +
           COALESCE(m.fire_impact_fee, 0) +
           COALESCE(m.certificate_of_occupancy_fee, 0)
    INTO v_municipality_soft_costs
    FROM municipalities m
    WHERE m.id = p_municipality_id;

    IF v_municipality_soft_costs IS NULL THEN
        v_municipality_soft_costs := 0;
    END IF;

    -- ---------------------------------------------------------------
    -- 4. Fetch org defaults
    -- ---------------------------------------------------------------
    SELECT
        COALESCE(o.default_interest_rate, 10),
        COALESCE(o.default_cost_of_capital_rate, 12),
        COALESCE(o.default_construction_period_days, 120),
        COALESCE(o.default_ltc_ratio, 85),
        COALESCE(o.default_selling_cost_pct, 8.5)
    INTO
        v_interest_rate,
        v_cost_of_capital,
        v_project_duration,
        v_ltc_ratio,
        v_selling_cost_rate
    FROM organizations o
    WHERE o.id = v_org_id;

    -- Apply overrides
    IF p_duration_override IS NOT NULL THEN
        v_project_duration := p_duration_override;
    END IF;
    IF p_rate_override IS NOT NULL THEN
        v_interest_rate := p_rate_override;
    END IF;

    -- ---------------------------------------------------------------
    -- 5. Section 1: Cost Summary
    -- ---------------------------------------------------------------
    v_lot_preparation := p_site_work + p_other_costs;

    v_pre_fee_subtotal := v_base_cost
                        + v_upgrade_cost
                        + v_lot_preparation
                        + p_vertical_adjustments
                        + v_municipality_soft_costs;

    -- Builder Fee: MAX($25,000, 10% of pre-fee subtotal)
    v_builder_fee := GREATEST(25000, v_pre_fee_subtotal * 0.10);

    -- Contingency: MAX($10,000, 5% of pre-fee subtotal)
    v_contingency := GREATEST(10000, v_pre_fee_subtotal * 0.05);

    v_total_contract_cost := v_pre_fee_subtotal + v_builder_fee + v_contingency;

    -- ---------------------------------------------------------------
    -- 6. Section 2: Fixed Per-House Costs
    -- ---------------------------------------------------------------
    v_closing_costs := p_purchase_price * 0.05;
    v_total_fixed_costs := v_warranty_reserve
                         + v_builders_risk
                         + v_closing_costs
                         + v_utility_charges;

    -- ---------------------------------------------------------------
    -- 7. Section 3: Total Project Cost
    -- ---------------------------------------------------------------
    v_total_project_cost := p_purchase_price
                          + v_total_contract_cost
                          + v_total_fixed_costs;

    -- ---------------------------------------------------------------
    -- 8. Section 4: Financing
    -- ---------------------------------------------------------------
    v_loan_amount := v_total_project_cost * (v_ltc_ratio / 100.0);
    v_equity_required := v_total_project_cost - v_loan_amount;

    v_interest_on_loan := v_loan_amount
                        * (v_interest_rate / 100.0)
                        * (v_project_duration / 365.0);

    v_cost_of_capital_on_equity := v_equity_required
                                 * (v_cost_of_capital / 100.0)
                                 * (v_project_duration / 365.0);

    v_total_carry_costs := v_interest_on_loan + v_cost_of_capital_on_equity;

    -- ---------------------------------------------------------------
    -- 9. Section 5: Deal Results
    -- ---------------------------------------------------------------
    v_total_all_in_cost := v_total_project_cost + v_total_carry_costs;

    v_total_selling_costs := p_sales_price * (v_selling_cost_rate / 100.0)
                           + p_concessions;

    v_net_sales_proceeds := p_sales_price - v_total_selling_costs;

    v_net_profit := v_net_sales_proceeds - v_total_all_in_cost;

    IF p_sales_price > 0 THEN
        v_net_margin := (v_net_profit / p_sales_price) * 100.0;
    ELSE
        v_net_margin := 0;
    END IF;

    -- ---------------------------------------------------------------
    -- 10. Verdict
    -- ---------------------------------------------------------------
    IF v_net_margin > 10 THEN
        v_verdict := 'strong_deal';
    ELSIF v_net_margin >= 7 THEN
        v_verdict := 'good_deal';
    ELSIF v_net_margin >= 5 THEN
        v_verdict := 'marginal';
    ELSE
        v_verdict := 'no_go';
    END IF;

    -- ---------------------------------------------------------------
    -- 11. Mark previous analyses as non-current
    -- ---------------------------------------------------------------
    UPDATE deal_analyses
    SET is_current = FALSE
    WHERE opportunity_id = p_opportunity_id
      AND is_current = TRUE;

    -- ---------------------------------------------------------------
    -- 12. Insert new analysis
    -- ---------------------------------------------------------------
    INSERT INTO deal_analyses (
        opportunity_id,
        floor_plan_id,
        upgrade_package,
        municipality_id,
        purchase_price,
        site_work_estimate,
        other_site_costs,
        site_specific_vertical_adjustments,
        asset_sales_price,
        selling_concessions,
        project_duration_days,
        interest_rate_override,
        calc_base_construction_cost,
        calc_upgrade_cost,
        calc_site_specific_adjustments,
        calc_total_soft_costs,
        calc_contingency,
        calc_total_project_cost,
        calc_loan_amount,
        calc_equity_required,
        calc_interest_expense,
        calc_gross_revenue,
        calc_selling_costs,
        calc_net_revenue,
        calc_net_profit,
        calc_net_margin_pct,
        verdict,
        is_current
    ) VALUES (
        p_opportunity_id,
        p_floor_plan_id,
        p_upgrade_package,
        p_municipality_id,
        p_purchase_price,
        p_site_work,
        p_other_costs,
        p_vertical_adjustments,
        p_sales_price,
        p_concessions,
        v_project_duration,
        p_rate_override,
        v_base_cost,
        v_upgrade_cost,
        p_vertical_adjustments,
        v_municipality_soft_costs,
        v_contingency,
        v_total_project_cost,
        v_loan_amount,
        v_equity_required,
        v_interest_on_loan,
        p_sales_price,
        v_total_selling_costs,
        v_net_sales_proceeds,
        v_net_profit,
        v_net_margin,
        v_verdict,
        TRUE
    )
    RETURNING id INTO v_analysis_id;

    -- ---------------------------------------------------------------
    -- 13. Update opportunity projected values
    -- ---------------------------------------------------------------
    UPDATE opportunities
    SET projected_purchase_price = p_purchase_price,
        projected_sale_price = p_sales_price,
        projected_profit = v_net_profit,
        projected_margin_pct = v_net_margin
    WHERE id = p_opportunity_id;

    RETURN v_analysis_id;
END;
$$ LANGUAGE plpgsql;
