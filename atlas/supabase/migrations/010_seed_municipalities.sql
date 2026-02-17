-- ============================================================================
-- Migration 010: Seed Municipalities
-- ATLAS Platform - Red Cedar Homes
-- Seeds all SC and NC jurisdictions with realistic fee structures
-- Table created in 007_create_admin_config.sql
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
    -- SOUTH CAROLINA MUNICIPALITIES (15)
    -- ========================================================================

    -- City of Greenville
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee, tree_mitigation_fee,
        road_impact_fee, school_impact_fee, park_impact_fee, fire_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'City of Greenville', 'SC',
        750.00, 350.00, 175.00, 175.00, 175.00,
        3200.00, 4200.00, 2500.00, 500.00, 250.00,
        1200.00, NULL, 800.00, NULL,
        250.00, 375.00, 200.00, 100.00,
        '{"base_fee": 750, "per_sf_rate": 0.35, "plan_review_pct": 0.50, "typical_review_days": 21, "notes": "Permit fee based on construction valuation. Plan review is 50% of permit fee. Additional fees for historic district overlay."}'::jsonb,
        'Primary market. Greenville Water provides water. Metro Sewer or ReWa for sewer.');

    -- City of Spartanburg
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee, tree_mitigation_fee,
        road_impact_fee, school_impact_fee, park_impact_fee, fire_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'City of Spartanburg', 'SC',
        500.00, 250.00, 125.00, 125.00, 125.00,
        2800.00, 3500.00, 1800.00, 400.00, 150.00,
        800.00, NULL, 500.00, NULL,
        200.00, 250.00, 150.00, 75.00,
        '{"base_fee": 500, "per_sf_rate": 0.30, "plan_review_pct": 0.50, "typical_review_days": 14, "notes": "Standard residential permit fees. Reduced impact fees for infill development."}'::jsonb,
        'Secondary market. Spartanburg Water provides water/sewer.');

    -- City of Greer
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee, tree_mitigation_fee,
        road_impact_fee, school_impact_fee, park_impact_fee, fire_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'City of Greer', 'SC',
        600.00, 300.00, 150.00, 150.00, 150.00,
        2500.00, 3800.00, 2000.00, 450.00, 200.00,
        1000.00, NULL, 600.00, NULL,
        175.00, 300.00, 175.00, 85.00,
        '{"base_fee": 600, "per_sf_rate": 0.28, "plan_review_pct": 0.50, "typical_review_days": 18, "notes": "Commission of Public Works handles water/sewer. Separate grading permit required."}'::jsonb,
        'Growing market between Greenville and Spartanburg. CPW for utilities.');

    -- City of Mauldin
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee, tree_mitigation_fee,
        road_impact_fee, school_impact_fee, park_impact_fee, fire_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'City of Mauldin', 'SC',
        450.00, 225.00, 125.00, 125.00, 125.00,
        2200.00, 3200.00, 1500.00, 350.00, 150.00,
        700.00, NULL, 400.00, NULL,
        150.00, 225.00, 125.00, 75.00,
        '{"base_fee": 450, "per_sf_rate": 0.25, "plan_review_pct": 0.50, "typical_review_days": 15, "notes": "Metro Sewer provides sewer service. Water through Greenville Water."}'::jsonb,
        'Suburban Greenville market. Moderate fees.');

    -- City of Simpsonville
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee, tree_mitigation_fee,
        road_impact_fee, school_impact_fee, park_impact_fee, fire_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'City of Simpsonville', 'SC',
        550.00, 275.00, 140.00, 140.00, 140.00,
        2400.00, 3600.00, 1800.00, 400.00, 175.00,
        900.00, NULL, 500.00, NULL,
        175.00, 275.00, 150.00, 80.00,
        '{"base_fee": 550, "per_sf_rate": 0.30, "plan_review_pct": 0.50, "typical_review_days": 18, "notes": "Stormwater management plan required for new construction."}'::jsonb,
        'Southern Greenville suburban market.');

    -- Greenville County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee, tree_mitigation_fee,
        road_impact_fee, school_impact_fee, park_impact_fee, fire_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Greenville County', 'SC',
        400.00, 200.00, 100.00, 100.00, 100.00,
        2800.00, 3500.00, 1200.00, 350.00, 100.00,
        500.00, NULL, 300.00, NULL,
        150.00, 200.00, 100.00, 50.00,
        '{"base_fee": 400, "per_sf_rate": 0.22, "plan_review_pct": 0.50, "typical_review_days": 14, "notes": "Unincorporated county. Water/sewer varies by utility district."}'::jsonb,
        'Unincorporated areas. Generally lower fees than incorporated municipalities.');

    -- Spartanburg County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee, tree_mitigation_fee,
        road_impact_fee, school_impact_fee, park_impact_fee, fire_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Spartanburg County', 'SC',
        350.00, 175.00, 100.00, 100.00, 100.00,
        2200.00, 2800.00, 800.00, 300.00, 75.00,
        400.00, NULL, 200.00, NULL,
        125.00, 175.00, 100.00, 50.00,
        '{"base_fee": 350, "per_sf_rate": 0.20, "plan_review_pct": 0.50, "typical_review_days": 12, "notes": "Unincorporated county. Spartanburg Water handles water/sewer in service area."}'::jsonb,
        'Unincorporated areas. Lower fee structure.');

    -- Town of Travelers Rest
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Town of Travelers Rest', 'SC',
        400.00, 200.00, 100.00, 100.00, 100.00,
        2600.00, 3400.00, 1500.00, 350.00,
        150.00, 200.00, 125.00, 65.00,
        '{"base_fee": 400, "per_sf_rate": 0.25, "plan_review_pct": 0.50, "typical_review_days": 14, "notes": "Town-operated water system. Greenville County sewer."}'::jsonb,
        'Northern Greenville County. Growing town along Swamp Rabbit Trail.');

    -- Town of Lyman
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Town of Lyman', 'SC',
        300.00, 150.00, 75.00, 75.00, 75.00,
        1800.00, 2500.00, 500.00, 200.00,
        100.00, 150.00, 75.00, 50.00,
        '{"base_fee": 300, "per_sf_rate": 0.18, "plan_review_pct": 0.50, "typical_review_days": 10, "notes": "Small town. Spartanburg Water provides water service."}'::jsonb,
        'Small town in Spartanburg County.');

    -- Town of Duncan
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Town of Duncan', 'SC',
        325.00, 160.00, 85.00, 85.00, 85.00,
        1900.00, 2600.00, 600.00, 225.00,
        100.00, 160.00, 75.00, 50.00,
        '{"base_fee": 325, "per_sf_rate": 0.20, "plan_review_pct": 0.50, "typical_review_days": 10, "notes": "Between Greenville and Spartanburg. Mixed utility providers."}'::jsonb,
        'Growing town on I-85 corridor.');

    -- Town of Wellford
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Town of Wellford', 'SC',
        275.00, 140.00, 75.00, 75.00, 75.00,
        1700.00, 2400.00, 500.00, 200.00,
        100.00, 140.00, 75.00, 50.00,
        '{"base_fee": 275, "per_sf_rate": 0.18, "plan_review_pct": 0.50, "typical_review_days": 10, "notes": "Small town in Spartanburg County. Limited municipal services."}'::jsonb,
        'Small town. Low fee structure.');

    -- Town of Inman
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Town of Inman', 'SC',
        300.00, 150.00, 75.00, 75.00, 75.00,
        1800.00, 2500.00, 500.00, 200.00,
        100.00, 150.00, 75.00, 50.00,
        '{"base_fee": 300, "per_sf_rate": 0.18, "plan_review_pct": 0.50, "typical_review_days": 10, "notes": "Growing northern Spartanburg County town. Inman-Campobello Water District."}'::jsonb,
        'Northern Spartanburg County. Growing residential area.');

    -- City of Woodruff
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'City of Woodruff', 'SC',
        250.00, 125.00, 75.00, 75.00, 75.00,
        1500.00, 2200.00, 500.00, 175.00,
        100.00, 125.00, 75.00, 50.00,
        '{"base_fee": 250, "per_sf_rate": 0.18, "plan_review_pct": 0.50, "typical_review_days": 10, "notes": "Small city. City-operated water and sewer."}'::jsonb,
        'Small city in Spartanburg County. Lowest fee tier.');

    -- City of Fountain Inn
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'City of Fountain Inn', 'SC',
        450.00, 225.00, 125.00, 125.00, 125.00,
        2300.00, 3200.00, 1200.00, 350.00,
        150.00, 225.00, 125.00, 65.00,
        '{"base_fee": 450, "per_sf_rate": 0.25, "plan_review_pct": 0.50, "typical_review_days": 15, "notes": "Straddles Greenville and Laurens counties. City-operated water and sewer."}'::jsonb,
        'Southern Greenville market. City straddles county lines.');

    -- Laurens County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Laurens County', 'SC',
        300.00, 150.00, 75.00, 75.00, 75.00,
        2000.00, 2800.00, 600.00, 250.00,
        100.00, 150.00, 75.00, 50.00,
        '{"base_fee": 300, "per_sf_rate": 0.20, "plan_review_pct": 0.50, "typical_review_days": 12, "notes": "Unincorporated county. Laurens County Water and Sewer Commission."}'::jsonb,
        'Rural county. Low fee structure.');

    -- ========================================================================
    -- NORTH CAROLINA JURISDICTIONS (20)
    -- ========================================================================

    -- Alexander County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Alexander County', 'NC',
        350.00, 175.00, 100.00, 100.00, 100.00,
        2000.00, 2500.00, 800.00, 250.00,
        125.00, 175.00, 100.00, 50.00,
        '{"base_fee": 350, "per_sf_rate": 0.22, "plan_review_pct": 0.50, "typical_review_days": 14, "notes": "Rural county west of Statesville. Limited public water/sewer."}'::jsonb,
        'Rural NC county. Limited infrastructure.');

    -- Cabarrus County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee, park_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Cabarrus County', 'NC',
        700.00, 350.00, 175.00, 175.00, 175.00,
        3500.00, 4200.00, 2500.00, 500.00,
        1200.00, 1500.00, 800.00,
        200.00, 350.00, 175.00, 100.00,
        '{"base_fee": 700, "per_sf_rate": 0.35, "plan_review_pct": 0.65, "typical_review_days": 21, "notes": "Charlotte metro area. Concord/Kannapolis water service. School impact fees apply."}'::jsonb,
        'Charlotte metro. Higher fee structure with impact fees.');

    -- Catawba County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Catawba County', 'NC',
        500.00, 250.00, 125.00, 125.00, 125.00,
        2800.00, 3200.00, 1500.00, 400.00,
        800.00,
        150.00, 250.00, 125.00, 75.00,
        '{"base_fee": 500, "per_sf_rate": 0.28, "plan_review_pct": 0.50, "typical_review_days": 16, "notes": "Hickory area. Multiple water/sewer providers."}'::jsonb,
        'Hickory metro area. Moderate fees.');

    -- Cleveland County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Cleveland County', 'NC',
        400.00, 200.00, 100.00, 100.00, 100.00,
        2200.00, 2800.00, 1000.00, 300.00,
        125.00, 200.00, 100.00, 60.00,
        '{"base_fee": 400, "per_sf_rate": 0.22, "plan_review_pct": 0.50, "typical_review_days": 14, "notes": "Shelby area. County water and city sewer in developed areas."}'::jsonb,
        'Shelby area. Moderate to low fees.');

    -- Davidson County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Davidson County', 'NC',
        450.00, 225.00, 115.00, 115.00, 115.00,
        2500.00, 3000.00, 1200.00, 350.00,
        600.00,
        150.00, 225.00, 100.00, 65.00,
        '{"base_fee": 450, "per_sf_rate": 0.25, "plan_review_pct": 0.50, "typical_review_days": 15, "notes": "Thomasville/Lexington area. Davidson Water provides service."}'::jsonb,
        'Triad area. Moderate fee structure.');

    -- Davie County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Davie County', 'NC',
        375.00, 190.00, 100.00, 100.00, 100.00,
        2200.00, 2800.00, 800.00, 275.00,
        125.00, 190.00, 100.00, 55.00,
        '{"base_fee": 375, "per_sf_rate": 0.22, "plan_review_pct": 0.50, "typical_review_days": 12, "notes": "Mocksville area. Davie County water system."}'::jsonb,
        'Rural Triad county. Lower fees.');

    -- Forsyth County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee, park_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Forsyth County', 'NC',
        800.00, 400.00, 200.00, 200.00, 200.00,
        3800.00, 4500.00, 2800.00, 600.00,
        1500.00, 1800.00, 1000.00,
        225.00, 400.00, 200.00, 125.00,
        '{"base_fee": 800, "per_sf_rate": 0.38, "plan_review_pct": 0.65, "typical_review_days": 25, "notes": "Winston-Salem area. City/county utility. Higher fees for urban areas."}'::jsonb,
        'Winston-Salem metro. Higher fee tier with comprehensive impact fees.');

    -- Gaston County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee, park_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Gaston County', 'NC',
        600.00, 300.00, 150.00, 150.00, 150.00,
        3000.00, 3800.00, 2000.00, 450.00,
        800.00, 1000.00, 600.00,
        175.00, 300.00, 150.00, 85.00,
        '{"base_fee": 600, "per_sf_rate": 0.30, "plan_review_pct": 0.50, "typical_review_days": 18, "notes": "Gastonia area. Charlotte metro fringe."}'::jsonb,
        'Charlotte metro fringe. Moderate to high fees.');

    -- Guilford County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee, park_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Guilford County', 'NC',
        750.00, 375.00, 190.00, 190.00, 190.00,
        3600.00, 4300.00, 2500.00, 550.00,
        1200.00, 1500.00, 800.00,
        200.00, 375.00, 175.00, 110.00,
        '{"base_fee": 750, "per_sf_rate": 0.35, "plan_review_pct": 0.65, "typical_review_days": 22, "notes": "Greensboro/High Point area. City water/sewer in incorporated areas."}'::jsonb,
        'Triad metro. Higher fee structure.');

    -- Iredell County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Iredell County', 'NC',
        550.00, 275.00, 140.00, 140.00, 140.00,
        3200.00, 3800.00, 2000.00, 400.00,
        1000.00, 1200.00,
        175.00, 275.00, 150.00, 85.00,
        '{"base_fee": 550, "per_sf_rate": 0.30, "plan_review_pct": 0.50, "typical_review_days": 18, "notes": "Statesville/Mooresville area. Growing Charlotte exurb."}'::jsonb,
        'I-77 corridor. Growing market with increasing fees.');

    -- Lancaster County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Lancaster County', 'NC',
        500.00, 250.00, 125.00, 125.00, 125.00,
        3000.00, 3600.00, 1800.00, 400.00,
        800.00, 1000.00,
        150.00, 250.00, 125.00, 75.00,
        '{"base_fee": 500, "per_sf_rate": 0.28, "plan_review_pct": 0.50, "typical_review_days": 16, "notes": "SC county bordering Charlotte metro. Lancaster County Water and Sewer District."}'::jsonb,
        'Charlotte metro border county. Rapidly growing.');

    -- City of Lexington (NC)
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'City of Lexington', 'NC',
        475.00, 240.00, 120.00, 120.00, 120.00,
        2600.00, 3200.00, 1200.00, 350.00,
        500.00,
        150.00, 240.00, 125.00, 70.00,
        '{"base_fee": 475, "per_sf_rate": 0.25, "plan_review_pct": 0.50, "typical_review_days": 14, "notes": "Davidson County seat. City-operated water and sewer."}'::jsonb,
        'Davidson County. Moderate fees.');

    -- Lincoln County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Lincoln County', 'NC',
        500.00, 250.00, 125.00, 125.00, 125.00,
        2800.00, 3400.00, 1500.00, 375.00,
        600.00, 800.00,
        150.00, 250.00, 125.00, 75.00,
        '{"base_fee": 500, "per_sf_rate": 0.28, "plan_review_pct": 0.50, "typical_review_days": 16, "notes": "Lincolnton area. Growing Charlotte exurb."}'::jsonb,
        'Charlotte exurb. Growing residential market.');

    -- Mecklenburg County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee, park_impact_fee, fire_impact_fee,
        zoning_application_fee, subdivision_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Mecklenburg County', 'NC',
        1200.00, 600.00, 300.00, 300.00, 300.00,
        4500.00, 5000.00, 3000.00, 750.00,
        2000.00, 2500.00, 1500.00, 500.00,
        300.00, 500.00, 600.00, 250.00, 150.00,
        '{"base_fee": 1200, "per_sf_rate": 0.45, "plan_review_pct": 0.65, "typical_review_days": 30, "notes": "Charlotte area. Charlotte Water utility. Highest fees in region. Tree save ordinance."}'::jsonb,
        'Charlotte metro. Highest fee structure in the region.');

    -- Rowan County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Rowan County', 'NC',
        450.00, 225.00, 115.00, 115.00, 115.00,
        2600.00, 3200.00, 1200.00, 350.00,
        500.00,
        150.00, 225.00, 100.00, 65.00,
        '{"base_fee": 450, "per_sf_rate": 0.25, "plan_review_pct": 0.50, "typical_review_days": 15, "notes": "Salisbury area. Salisbury-Rowan Utilities."}'::jsonb,
        'Salisbury area. Moderate growth market.');

    -- Stanly County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Stanly County', 'NC',
        375.00, 190.00, 100.00, 100.00, 100.00,
        2200.00, 2800.00, 800.00, 275.00,
        125.00, 190.00, 100.00, 55.00,
        '{"base_fee": 375, "per_sf_rate": 0.22, "plan_review_pct": 0.50, "typical_review_days": 12, "notes": "Albemarle area. Rural county with growing interest."}'::jsonb,
        'Albemarle area. Lower fee structure.');

    -- Union County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee, park_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Union County', 'NC',
        850.00, 425.00, 215.00, 215.00, 215.00,
        3800.00, 4500.00, 2800.00, 600.00,
        1500.00, 2000.00, 1000.00,
        225.00, 425.00, 200.00, 125.00,
        '{"base_fee": 850, "per_sf_rate": 0.38, "plan_review_pct": 0.65, "typical_review_days": 25, "notes": "Monroe/Indian Trail area. Charlotte metro. High growth with corresponding fees."}'::jsonb,
        'Charlotte metro. High growth area with significant impact fees.');

    -- York County
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee, park_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'York County', 'NC',
        650.00, 325.00, 165.00, 165.00, 165.00,
        3200.00, 4000.00, 2200.00, 500.00,
        1200.00, 1500.00, 800.00,
        200.00, 325.00, 175.00, 100.00,
        '{"base_fee": 650, "per_sf_rate": 0.32, "plan_review_pct": 0.50, "typical_review_days": 20, "notes": "Rock Hill/Fort Mill area. SC county but strong Charlotte metro ties."}'::jsonb,
        'Charlotte metro SC side. Significant growth and fees.');

    -- Town of Clover
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'Town of Clover', 'NC',
        500.00, 250.00, 125.00, 125.00, 125.00,
        2800.00, 3500.00, 1800.00, 400.00,
        800.00, 1000.00,
        150.00, 250.00, 125.00, 75.00,
        '{"base_fee": 500, "per_sf_rate": 0.28, "plan_review_pct": 0.50, "typical_review_days": 16, "notes": "York County town near Lake Wylie. Town-operated water system."}'::jsonb,
        'York County town. Growing residential area near Lake Wylie.');

    -- City of Statesville
    INSERT INTO municipalities (organization_id, name, state,
        building_permit_fee, grading_permit_fee, mechanical_permit_fee, electrical_permit_fee, plumbing_permit_fee,
        water_tap_fee, sewer_tap_fee, impact_fee_per_unit, stormwater_fee,
        road_impact_fee, school_impact_fee,
        zoning_application_fee, plan_review_fee, inspection_fee, certificate_of_occupancy_fee,
        permit_fee_schedule, notes)
    VALUES (org_id, 'City of Statesville', 'NC',
        550.00, 275.00, 140.00, 140.00, 140.00,
        3000.00, 3600.00, 1800.00, 400.00,
        800.00, 1000.00,
        175.00, 275.00, 150.00, 85.00,
        '{"base_fee": 550, "per_sf_rate": 0.30, "plan_review_pct": 0.50, "typical_review_days": 18, "notes": "Iredell County seat. City water and sewer. I-77 and I-40 corridor."}'::jsonb,
        'Iredell County seat. I-77/I-40 crossroads. Growing market.');

    RAISE NOTICE 'Successfully seeded 35 municipalities (15 SC + 20 NC) for organization %', org_id;
END $$;
