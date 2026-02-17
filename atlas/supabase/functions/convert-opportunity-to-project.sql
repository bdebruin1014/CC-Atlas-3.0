-- ============================================================================
-- Function: convert_opportunity_to_project
-- ATLAS Platform - Red Cedar Homes
--
-- Converts an opportunity to a project by:
-- 1. Creating a project from opportunity data
-- 2. Setting the opportunity status to 'converted'
-- 3. Linking the opportunity to the new project
-- 4. Carrying forward contacts
-- 5. Returning the new project ID
-- ============================================================================

CREATE OR REPLACE FUNCTION convert_opportunity_to_project(p_opportunity_id UUID)
RETURNS UUID AS $$
DECLARE
    v_project_id UUID;
    v_project_number TEXT;
    v_opp RECORD;
    v_org_id UUID;
BEGIN
    -- ---------------------------------------------------------------
    -- 1. Fetch opportunity data
    -- ---------------------------------------------------------------
    SELECT *
    INTO v_opp
    FROM opportunities
    WHERE id = p_opportunity_id;

    IF v_opp IS NULL THEN
        RAISE EXCEPTION 'Opportunity not found: %', p_opportunity_id;
    END IF;

    IF v_opp.status = 'converted' THEN
        RAISE EXCEPTION 'Opportunity already converted: %', p_opportunity_id;
    END IF;

    IF v_opp.status = 'archived' THEN
        RAISE EXCEPTION 'Cannot convert archived opportunity: %', p_opportunity_id;
    END IF;

    v_org_id := v_opp.organization_id;

    -- ---------------------------------------------------------------
    -- 2. Generate project number
    -- ---------------------------------------------------------------
    v_project_number := generate_project_number();

    -- ---------------------------------------------------------------
    -- 3. Create the project
    -- ---------------------------------------------------------------
    INSERT INTO projects (
        organization_id,
        project_number,
        name,
        address_street,
        address_city,
        address_state,
        address_zip,
        address_county,
        type,
        owner_entity_id,
        status,
        budget_land_acquisition,
        floor_plan_id,
        lot_width,
        lot_depth,
        lot_sqft,
        zoning,
        source_opportunity_id
    ) VALUES (
        v_org_id,
        v_project_number,
        COALESCE(v_opp.name, 'Project ' || v_project_number),
        v_opp.address_street,
        v_opp.address_city,
        v_opp.address_state,
        v_opp.address_zip,
        v_opp.address_county,
        v_opp.type,
        v_opp.owner_entity_id,
        'pre_construction',
        v_opp.projected_purchase_price,
        v_opp.floor_plan_id,
        v_opp.lot_width,
        v_opp.lot_depth,
        v_opp.lot_sqft,
        v_opp.zoning_current,
        p_opportunity_id
    )
    RETURNING id INTO v_project_id;

    -- ---------------------------------------------------------------
    -- 4. Mark opportunity as converted
    -- ---------------------------------------------------------------
    UPDATE opportunities
    SET status = 'converted',
        converted_to_project_id = v_project_id,
        updated_at = NOW()
    WHERE id = p_opportunity_id;

    -- ---------------------------------------------------------------
    -- 5. Carry forward contact assignments
    -- ---------------------------------------------------------------
    INSERT INTO contact_assignments (contact_id, record_type, record_id, role_on_record)
    SELECT
        ca.contact_id,
        'project',
        v_project_id,
        ca.role_on_record
    FROM contact_assignments ca
    WHERE ca.record_type = 'opportunity'
      AND ca.record_id = p_opportunity_id;

    -- ---------------------------------------------------------------
    -- 6. Copy notes to the new project
    -- ---------------------------------------------------------------
    INSERT INTO notes (record_type, record_id, user_id, content, is_pinned)
    SELECT
        'project',
        v_project_id,
        n.user_id,
        n.content,
        n.is_pinned
    FROM notes n
    WHERE n.record_type = 'opportunity'
      AND n.record_id = p_opportunity_id;

    -- ---------------------------------------------------------------
    -- 7. Create activity log entries
    -- ---------------------------------------------------------------
    INSERT INTO activity_log (
        organization_id, record_type, record_id, action, description, metadata
    ) VALUES (
        v_org_id,
        'opportunity',
        p_opportunity_id,
        'converted',
        'Opportunity converted to project ' || v_project_number,
        jsonb_build_object(
            'project_id', v_project_id,
            'project_number', v_project_number
        )
    );

    INSERT INTO activity_log (
        organization_id, record_type, record_id, action, description, metadata
    ) VALUES (
        v_org_id,
        'project',
        v_project_id,
        'created_from_conversion',
        'Project created from opportunity conversion',
        jsonb_build_object(
            'opportunity_id', p_opportunity_id,
            'project_number', v_project_number
        )
    );

    RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;
