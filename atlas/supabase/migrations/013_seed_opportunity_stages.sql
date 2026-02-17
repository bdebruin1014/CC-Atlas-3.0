-- ============================================================================
-- Migration 013: Seed Opportunity Stages
-- ATLAS Platform - Red Cedar Homes
-- Seeds pipeline stages for all 5 opportunity types
-- ============================================================================

DO $$
DECLARE
    org_id UUID;
BEGIN
    -- Get the default organization
    SELECT id INTO org_id FROM organizations WHERE name = 'Red Cedar Homes' LIMIT 1;
    IF org_id IS NULL THEN
        INSERT INTO organizations (name) VALUES ('Red Cedar Homes') RETURNING id INTO org_id;
    END IF;

    -- ========================================================================
    -- SCATTERED LOT STAGES (9 stages)
    -- ========================================================================

    INSERT INTO opportunity_stages (organization_id, opportunity_type, name, sequence, is_terminal, entry_criteria, required_fields)
    VALUES
    (org_id, 'scattered_lot', 'Lead', 1, false,
        'New scattered lot opportunity identified from any source.',
        ARRAY['name', 'address_street', 'address_city', 'address_state', 'source']),

    (org_id, 'scattered_lot', 'Site Analysis', 2, false,
        'Initial screening passed. Site visit scheduled or completed. Parcel data pulled.',
        ARRAY['parcel_tms_number', 'lot_width', 'lot_depth', 'zoning_current']),

    (org_id, 'scattered_lot', 'Offer/LOI', 3, false,
        'Site analysis supports viability. Purchase price determined. Offer or LOI being prepared.',
        ARRAY['projected_purchase_price', 'best_fit_model', 'floor_plan_id']),

    (org_id, 'scattered_lot', 'Under Contract', 4, false,
        'Offer accepted and purchase contract fully executed by all parties.',
        ARRAY['date_under_contract', 'due_diligence_deadline', 'projected_close_date']),

    (org_id, 'scattered_lot', 'Due Diligence', 5, false,
        'Contract executed. Due diligence period active. Survey, title, environmental reviews in progress.',
        ARRAY['survey_complete']),

    (org_id, 'scattered_lot', 'Financing', 6, false,
        'Due diligence complete or waived. Financing package being assembled and submitted to lender.',
        ARRAY[]::TEXT[]),

    (org_id, 'scattered_lot', 'Closing Prep', 7, false,
        'Financing approved. Closing documents being prepared. Title clear. Insurance bound.',
        ARRAY['projected_close_date']),

    (org_id, 'scattered_lot', 'Closed/Won', 8, true,
        'Closing complete. Property acquired. Ready for conversion to project.',
        ARRAY[]::TEXT[]),

    (org_id, 'scattered_lot', 'Archived', 9, true,
        'Opportunity no longer being pursued. May be dead deal, lost to competitor, or withdrawn.',
        ARRAY['archived_reason']);

    -- ========================================================================
    -- LOT DEVELOPMENT STAGES (8 stages)
    -- ========================================================================

    INSERT INTO opportunity_stages (organization_id, opportunity_type, name, sequence, is_terminal, entry_criteria, required_fields)
    VALUES
    (org_id, 'lot_development', 'Lead', 1, false,
        'New lot development opportunity identified. Raw land or subdivision potential.',
        ARRAY['name', 'address_street', 'address_city', 'address_state', 'source']),

    (org_id, 'lot_development', 'Feasibility', 2, false,
        'Initial screening passed. Feasibility study and proforma analysis in progress.',
        ARRAY['total_acreage', 'estimated_total_lots', 'zoning_current']),

    (org_id, 'lot_development', 'LOI/Contract', 3, false,
        'Feasibility supports proceeding. LOI or purchase contract being negotiated.',
        ARRAY['projected_purchase_price', 'zoning_required']),

    (org_id, 'lot_development', 'Entitlement DD', 4, false,
        'Contract executed. Entitlement and due diligence period. Zoning applications, preliminary plat review.',
        ARRAY['date_under_contract', 'due_diligence_deadline', 'preliminary_plat_status']),

    (org_id, 'lot_development', 'Financing', 5, false,
        'Entitlements secured or on track. Development financing package being assembled.',
        ARRAY['infrastructure_scope_estimate']),

    (org_id, 'lot_development', 'Closing Prep', 6, false,
        'Financing approved. Land closing documents being prepared.',
        ARRAY['projected_close_date']),

    (org_id, 'lot_development', 'Closed/Won', 7, true,
        'Land acquisition closed. Development project initiated.',
        ARRAY[]::TEXT[]),

    (org_id, 'lot_development', 'Archived', 8, true,
        'Opportunity no longer being pursued.',
        ARRAY['archived_reason']);

    -- ========================================================================
    -- COMMUNITY DEVELOPMENT STAGES (8 stages - same as lot development)
    -- ========================================================================

    INSERT INTO opportunity_stages (organization_id, opportunity_type, name, sequence, is_terminal, entry_criteria, required_fields)
    VALUES
    (org_id, 'community_development', 'Lead', 1, false,
        'New community development opportunity identified. Large tract for full community build-out.',
        ARRAY['name', 'address_street', 'address_city', 'address_state', 'source']),

    (org_id, 'community_development', 'Feasibility', 2, false,
        'Initial screening passed. Market study, feasibility analysis, and community concept planning.',
        ARRAY['total_acreage', 'estimated_total_lots', 'zoning_current']),

    (org_id, 'community_development', 'LOI/Contract', 3, false,
        'Feasibility supports proceeding. LOI or purchase contract being negotiated with landowner.',
        ARRAY['projected_purchase_price', 'zoning_required', 'target_builders']),

    (org_id, 'community_development', 'Entitlement DD', 4, false,
        'Contract executed. Entitlement process including rezoning, preliminary plat, and environmental review.',
        ARRAY['date_under_contract', 'due_diligence_deadline', 'preliminary_plat_status']),

    (org_id, 'community_development', 'Financing', 5, false,
        'Entitlements secured or on track. Development and construction financing being structured.',
        ARRAY['infrastructure_scope_estimate']),

    (org_id, 'community_development', 'Closing Prep', 6, false,
        'Financing approved. Land closing and development agreement documents being prepared.',
        ARRAY['projected_close_date']),

    (org_id, 'community_development', 'Closed/Won', 7, true,
        'Land acquisition closed. Community development project initiated.',
        ARRAY[]::TEXT[]),

    (org_id, 'community_development', 'Archived', 8, true,
        'Opportunity no longer being pursued.',
        ARRAY['archived_reason']);

    -- ========================================================================
    -- LOT PURCHASE STAGES (8 stages)
    -- ========================================================================

    INSERT INTO opportunity_stages (organization_id, opportunity_type, name, sequence, is_terminal, entry_criteria, required_fields)
    VALUES
    (org_id, 'lot_purchase', 'Lead', 1, false,
        'New lot purchase opportunity identified. Improved lot available for vertical construction.',
        ARRAY['name', 'address_street', 'address_city', 'address_state', 'source']),

    (org_id, 'lot_purchase', 'Lot Evaluation', 2, false,
        'Initial screening passed. Lot evaluation including setbacks, utilities, and floor plan fit analysis.',
        ARRAY['lot_width', 'lot_depth', 'zoning_current', 'water_available', 'sewer_available']),

    (org_id, 'lot_purchase', 'Offer/LOI', 3, false,
        'Lot evaluation supports purchase. Offer being prepared based on deal analysis.',
        ARRAY['projected_purchase_price', 'best_fit_model', 'floor_plan_id']),

    (org_id, 'lot_purchase', 'Under Contract', 4, false,
        'Offer accepted and purchase contract fully executed.',
        ARRAY['date_under_contract', 'due_diligence_deadline', 'projected_close_date']),

    (org_id, 'lot_purchase', 'DD/Verification', 5, false,
        'Contract executed. Verifying lot conditions, utility availability, HOA restrictions, and buildability.',
        ARRAY['survey_complete']),

    (org_id, 'lot_purchase', 'Closing Prep', 6, false,
        'Verification complete. Closing documents being prepared. Title clear.',
        ARRAY['projected_close_date']),

    (org_id, 'lot_purchase', 'Closed/Won', 7, true,
        'Lot purchase closed. Ready for construction project initiation.',
        ARRAY[]::TEXT[]),

    (org_id, 'lot_purchase', 'Archived', 8, true,
        'Opportunity no longer being pursued.',
        ARRAY['archived_reason']);

    -- ========================================================================
    -- OTHER STAGES (5 stages)
    -- ========================================================================

    INSERT INTO opportunity_stages (organization_id, opportunity_type, name, sequence, is_terminal, entry_criteria, required_fields)
    VALUES
    (org_id, 'other', 'Evaluation', 1, false,
        'New opportunity under initial evaluation. Does not fit standard categories.',
        ARRAY['name', 'type']),

    (org_id, 'other', 'Under Review', 2, false,
        'Opportunity being actively reviewed by principals. Financial analysis in progress.',
        ARRAY[]::TEXT[]),

    (org_id, 'other', 'Closing', 3, false,
        'Decision made to proceed. Transaction being finalized.',
        ARRAY[]::TEXT[]),

    (org_id, 'other', 'Closed/Won', 4, true,
        'Transaction complete.',
        ARRAY[]::TEXT[]),

    (org_id, 'other', 'Archived', 5, true,
        'Opportunity archived. No longer active.',
        ARRAY['archived_reason']);

    RAISE NOTICE 'Successfully seeded opportunity stages: scattered_lot(9), lot_development(8), community_development(8), lot_purchase(8), other(5) for organization %', org_id;
END $$;
