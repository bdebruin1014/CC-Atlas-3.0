-- ============================================================================
-- Migration 009: Seed Floor Plans
-- ATLAS Platform - Red Cedar Homes
-- Seeds all 34 floor plans with September 2025 pricing
-- Table created in 007_create_admin_config.sql
-- ============================================================================

DO $$
DECLARE
    org_id UUID;
    soft_site_cost NUMERIC(14,2) := 13525.00;
BEGIN
    -- Get or create the default organization
    SELECT id INTO org_id FROM organizations WHERE name = 'Red Cedar Homes' LIMIT 1;
    IF org_id IS NULL THEN
        INSERT INTO organizations (name) VALUES ('Red Cedar Homes') RETURNING id INTO org_id;
    END IF;

    -- ========================================================================
    -- SINGLE FAMILY HOMES (18 plans)
    -- ========================================================================

    -- Tulip: 1170 SF, 3/2, 1-Car, 1 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Tulip', 'sfh', 1170, 3, 2.0, '1-Car', 1,
        105821.00, 3000.00, 6500.00,
        105821.00 + soft_site_cost, ROUND(105821.00 / 1170, 2), 30, 50, 'active',
        '{"sb_cost": 105821, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(105821.00/1170, 2) ||', "cost_per_heated_sf_total": '|| ROUND((105821.00+soft_site_cost)/1170, 2) ||', "min_lot": "30x50", "pricing_date": "2025-09-01"}'::jsonb);

    -- Lilac: 1382 SF, 3/3, 1-Car, 1.5 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Lilac', 'sfh', 1382, 3, 3.0, '1-Car', 2,
        122530.00, 4000.00, 9000.00,
        122530.00 + soft_site_cost, ROUND(122530.00 / 1382, 2), 30, 46, 'active',
        '{"sb_cost": 122530, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(122530.00/1382, 2) ||', "cost_per_heated_sf_total": '|| ROUND((122530.00+soft_site_cost)/1382, 2) ||', "min_lot": "30x46", "stories_actual": 1.5, "pricing_date": "2025-09-01"}'::jsonb);

    -- Banyan: 1400 SF, 3/3, 2-Car, 3 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Banyan', 'sfh', 1400, 3, 3.0, '2-Car', 3,
        134058.00, 4600.00, 10300.00,
        134058.00 + soft_site_cost, ROUND(134058.00 / 1400, 2), 28, 24, 'active',
        '{"sb_cost": 134058, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(134058.00/1400, 2) ||', "cost_per_heated_sf_total": '|| ROUND((134058.00+soft_site_cost)/1400, 2) ||', "min_lot": "28x24", "pricing_date": "2025-09-01"}'::jsonb);

    -- Dogwood: 1541 SF, 3/2.5, 2-Car, 2 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Dogwood', 'sfh', 1541, 3, 2.5, '2-Car', 2,
        124031.00, 4000.00, 8300.00,
        124031.00 + soft_site_cost, ROUND(124031.00 / 1541, 2), 29, 36, 'active',
        '{"sb_cost": 124031, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(124031.00/1541, 2) ||', "cost_per_heated_sf_total": '|| ROUND((124031.00+soft_site_cost)/1541, 2) ||', "min_lot": "29x36", "pricing_date": "2025-09-01"}'::jsonb);

    -- Atlas: 1554 SF, 3/2.5, None, 2 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Atlas', 'sfh', 1554, 3, 2.5, 'None', 2,
        113777.00, 4200.00, 8800.00,
        113777.00 + soft_site_cost, ROUND(113777.00 / 1554, 2), 24, 33, 'active',
        '{"sb_cost": 113777, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(113777.00/1554, 2) ||', "cost_per_heated_sf_total": '|| ROUND((113777.00+soft_site_cost)/1554, 2) ||', "min_lot": "24x33", "pricing_date": "2025-09-01"}'::jsonb);

    -- Spruce: 1545 SF, 3/2, 2-Car, 1 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Spruce', 'sfh', 1545, 3, 2.0, '2-Car', 1,
        129518.00, 2800.00, 7300.00,
        129518.00 + soft_site_cost, ROUND(129518.00 / 1545, 2), 39, 54, 'active',
        '{"sb_cost": 129518, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(129518.00/1545, 2) ||', "cost_per_heated_sf_total": '|| ROUND((129518.00+soft_site_cost)/1545, 2) ||', "min_lot": "39x54", "pricing_date": "2025-09-01"}'::jsonb);

    -- Elm: 1712 SF, 4/2.5, 2-Car, 2 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Elm', 'sfh', 1712, 4, 2.5, '2-Car', 2,
        134540.00, 4300.00, 9000.00,
        134540.00 + soft_site_cost, ROUND(134540.00 / 1712, 2), 28, 35, 'active',
        '{"sb_cost": 134540, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(134540.00/1712, 2) ||', "cost_per_heated_sf_total": '|| ROUND((134540.00+soft_site_cost)/1712, 2) ||', "min_lot": "28x35", "pricing_date": "2025-09-01"}'::jsonb);

    -- Hazel: 1713 SF, 4/2.5, 2-Car, 2 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Hazel', 'sfh', 1713, 4, 2.5, '2-Car', 2,
        134200.00, 4450.00, 9100.00,
        134200.00 + soft_site_cost, ROUND(134200.00 / 1713, 2), 28, 34, 'active',
        '{"sb_cost": 134200, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(134200.00/1713, 2) ||', "cost_per_heated_sf_total": '|| ROUND((134200.00+soft_site_cost)/1713, 2) ||', "min_lot": "28x34", "pricing_date": "2025-09-01"}'::jsonb);

    -- Aspen 2-Story: 1788 SF, 3/2.5, 2-Car, 2 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Aspen 2-Story', 'sfh', 1788, 3, 2.5, '2-Car', 2,
        139412.00, 4750.00, 9600.00,
        139412.00 + soft_site_cost, ROUND(139412.00 / 1788, 2), 24, 33, 'active',
        '{"sb_cost": 139412, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(139412.00/1788, 2) ||', "cost_per_heated_sf_total": '|| ROUND((139412.00+soft_site_cost)/1788, 2) ||', "min_lot": "24x33", "pricing_date": "2025-09-01"}'::jsonb);

    -- Willow: 1857 SF, 4/2.5, 1-Car, 2 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Willow', 'sfh', 1857, 4, 2.5, '1-Car', 2,
        133891.00, 4100.00, 9000.00,
        133891.00 + soft_site_cost, ROUND(133891.00 / 1857, 2), 30, 40, 'active',
        '{"sb_cost": 133891, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(133891.00/1857, 2) ||', "cost_per_heated_sf_total": '|| ROUND((133891.00+soft_site_cost)/1857, 2) ||', "min_lot": "30x40", "pricing_date": "2025-09-01"}'::jsonb);

    -- Holly: 2000 SF, 4/2.5, 2-Car, 2 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Holly', 'sfh', 2000, 4, 2.5, '2-Car', 2,
        144355.00, 4000.00, 8500.00,
        144355.00 + soft_site_cost, ROUND(144355.00 / 2000, 2), 29, 48, 'active',
        '{"sb_cost": 144355, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(144355.00/2000, 2) ||', "cost_per_heated_sf_total": '|| ROUND((144355.00+soft_site_cost)/2000, 2) ||', "min_lot": "29x48", "pricing_date": "2025-09-01"}'::jsonb);

    -- Spindle: 2001 SF, 3/2, None, 2 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Spindle', 'sfh', 2001, 3, 2.0, 'None', 2,
        147508.00, 4100.00, 8800.00,
        147508.00 + soft_site_cost, ROUND(147508.00 / 2001, 2), 24, 51, 'active',
        '{"sb_cost": 147508, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(147508.00/2001, 2) ||', "cost_per_heated_sf_total": '|| ROUND((147508.00+soft_site_cost)/2001, 2) ||', "min_lot": "24x51", "pricing_date": "2025-09-01"}'::jsonb);

    -- White Oak: 2005 SF, 4/2.5, 2-Car, 2 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'White Oak', 'sfh', 2005, 4, 2.5, '2-Car', 2,
        143853.00, 4400.00, 6700.00,
        143853.00 + soft_site_cost, ROUND(143853.00 / 2005, 2), 38, 35, 'active',
        '{"sb_cost": 143853, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(143853.00/2005, 2) ||', "cost_per_heated_sf_total": '|| ROUND((143853.00+soft_site_cost)/2005, 2) ||', "min_lot": "38x35", "pricing_date": "2025-09-01"}'::jsonb);

    -- Aspen 3-Story: 2168 SF, 3/2.5, 2-Car, 2 Story (structure is 2-story with walkout/tuck-under)
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Aspen 3-Story', 'sfh', 2168, 3, 2.5, '2-Car', 3,
        160412.00, 5050.00, 10100.00,
        160412.00 + soft_site_cost, ROUND(160412.00 / 2168, 2), 24, 33, 'active',
        '{"sb_cost": 160412, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(160412.00/2168, 2) ||', "cost_per_heated_sf_total": '|| ROUND((160412.00+soft_site_cost)/2168, 2) ||', "min_lot": "24x33", "pricing_date": "2025-09-01"}'::jsonb);

    -- Cherry: 2214 SF, 4/3, 2-Car, 2 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Cherry', 'sfh', 2214, 4, 3.0, '2-Car', 2,
        156913.00, 5000.00, 11000.00,
        156913.00 + soft_site_cost, ROUND(156913.00 / 2214, 2), 38, 38, 'active',
        '{"sb_cost": 156913, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(156913.00/2214, 2) ||', "cost_per_heated_sf_total": '|| ROUND((156913.00+soft_site_cost)/2214, 2) ||', "min_lot": "38x38", "pricing_date": "2025-09-01"}'::jsonb);

    -- Acacia: 2236 SF, 4/3, 2-Car, 1.5 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Acacia', 'sfh', 2236, 4, 3.0, '2-Car', 2,
        165012.00, 4200.00, 10000.00,
        165012.00 + soft_site_cost, ROUND(165012.00 / 2236, 2), 39, 54, 'active',
        '{"sb_cost": 165012, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(165012.00/2236, 2) ||', "cost_per_heated_sf_total": '|| ROUND((165012.00+soft_site_cost)/2236, 2) ||', "min_lot": "39x54", "stories_actual": 1.5, "pricing_date": "2025-09-01"}'::jsonb);

    -- Lily: 2293 SF, 4/3.5, None, 2.5 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Lily', 'sfh', 2293, 4, 3.5, 'None', 3,
        157945.00, 5400.00, 10700.00,
        157945.00 + soft_site_cost, ROUND(157945.00 / 2293, 2), 34, 30, 'active',
        '{"sb_cost": 157945, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(157945.00/2293, 2) ||', "cost_per_heated_sf_total": '|| ROUND((157945.00+soft_site_cost)/2293, 2) ||', "min_lot": "34x30", "stories_actual": 2.5, "pricing_date": "2025-09-01"}'::jsonb);

    -- Magnolia: 2771 SF, 4/3, 2-Car, 2 Story
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, status,
        cost_breakdown)
    VALUES (org_id, 'Magnolia', 'sfh', 2771, 4, 3.0, '2-Car', 2,
        178184.00, 4600.00, 11100.00,
        178184.00 + soft_site_cost, ROUND(178184.00 / 2771, 2), 38, 40, 'active',
        '{"sb_cost": 178184, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(178184.00/2771, 2) ||', "cost_per_heated_sf_total": '|| ROUND((178184.00+soft_site_cost)/2771, 2) ||', "min_lot": "38x40", "pricing_date": "2025-09-01"}'::jsonb);

    -- ========================================================================
    -- TOWNHOMES (16 plans)
    -- ========================================================================

    -- Palmetto: 1304 SF, 3/2.5, None, 2 Story, Frontage 20
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Palmetto', 'townhome', 1304, 3, 2.5, 'None', 2,
        110043.00, 3900.00, 8200.00,
        110043.00 + soft_site_cost, ROUND(110043.00 / 1304, 2), NULL, NULL, 20, 'active',
        '{"sb_cost": 110043, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(110043.00/1304, 2) ||', "cost_per_heated_sf_total": '|| ROUND((110043.00+soft_site_cost)/1304, 2) ||', "frontage": 20, "pricing_date": "2025-09-01"}'::jsonb);

    -- Palmetto II: 1424 SF, 3/2.5, None, 2 Story, Frontage 20
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Palmetto II', 'townhome', 1424, 3, 2.5, 'None', 2,
        111055.00, 4100.00, 7200.00,
        111055.00 + soft_site_cost, ROUND(111055.00 / 1424, 2), NULL, 5000, 20, 'active',
        '{"sb_cost": 111055, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(111055.00/1424, 2) ||', "cost_per_heated_sf_total": '|| ROUND((111055.00+soft_site_cost)/1424, 2) ||', "frontage": 20, "pricing_date": "2025-09-01"}'::jsonb);

    -- Jasmine: 1500 SF, 3/2.5, 1-Car, 2 Story, Frontage 20
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Jasmine', 'townhome', 1500, 3, 2.5, '1-Car', 2,
        127142.00, 3800.00, 8000.00,
        127142.00 + soft_site_cost, ROUND(127142.00 / 1500, 2), NULL, 4500, 20, 'active',
        '{"sb_cost": 127142, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(127142.00/1500, 2) ||', "cost_per_heated_sf_total": '|| ROUND((127142.00+soft_site_cost)/1500, 2) ||', "frontage": 20, "pricing_date": "2025-09-01"}'::jsonb);

    -- Bayberry: 1500 SF, 3/2.5, 1-Car F, 2 Story, Frontage 20
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Bayberry', 'townhome', 1500, 3, 2.5, '1-Car F', 2,
        125252.00, 3600.00, 5500.00,
        125252.00 + soft_site_cost, ROUND(125252.00 / 1500, 2), NULL, 6100, 20, 'active',
        '{"sb_cost": 125252, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(125252.00/1500, 2) ||', "cost_per_heated_sf_total": '|| ROUND((125252.00+soft_site_cost)/1500, 2) ||', "frontage": 20, "pricing_date": "2025-09-01"}'::jsonb);

    -- Poplar: 1483 SF, 3/2.5, 2-Car R, 2 Story, Frontage 20
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Poplar', 'townhome', 1483, 3, 2.5, '2-Car R', 2,
        130814.00, 3900.00, 8200.00,
        130814.00 + soft_site_cost, ROUND(130814.00 / 1483, 2), NULL, 3600, 20, 'active',
        '{"sb_cost": 130814, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(130814.00/1483, 2) ||', "cost_per_heated_sf_total": '|| ROUND((130814.00+soft_site_cost)/1483, 2) ||', "frontage": 20, "pricing_date": "2025-09-01"}'::jsonb);

    -- Locust: 1669 SF, 3/2.5, 1-Car F, 2 Story, Frontage 22
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Locust', 'townhome', 1669, 3, 2.5, '1-Car F', 2,
        133947.00, 4600.00, 7200.00,
        133947.00 + soft_site_cost, ROUND(133947.00 / 1669, 2), NULL, NULL, 22, 'active',
        '{"sb_cost": 133947, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(133947.00/1669, 2) ||', "cost_per_heated_sf_total": '|| ROUND((133947.00+soft_site_cost)/1669, 2) ||', "frontage": 22, "pricing_date": "2025-09-01"}'::jsonb);

    -- Palm II: 1689 SF, 3/2.5, 1-Car F, 2 Story, Frontage 20
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Palm II', 'townhome', 1689, 3, 2.5, '1-Car F', 2,
        132402.00, 5000.00, 8500.00,
        132402.00 + soft_site_cost, ROUND(132402.00 / 1689, 2), NULL, NULL, 20, 'active',
        '{"sb_cost": 132402, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(132402.00/1689, 2) ||', "cost_per_heated_sf_total": '|| ROUND((132402.00+soft_site_cost)/1689, 2) ||', "frontage": 20, "pricing_date": "2025-09-01"}'::jsonb);

    -- Fraser: 1689 SF, 3/2.5, 2-Car R, 2 Story, Frontage 22
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Fraser', 'townhome', 1689, 3, 2.5, '2-Car R', 2,
        133563.00, 3300.00, 2700.00,
        133563.00 + soft_site_cost, ROUND(133563.00 / 1689, 2), NULL, NULL, 22, 'active',
        '{"sb_cost": 133563, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(133563.00/1689, 2) ||', "cost_per_heated_sf_total": '|| ROUND((133563.00+soft_site_cost)/1689, 2) ||', "frontage": 22, "pricing_date": "2025-09-01"}'::jsonb);

    -- Alder: 1700 SF, 3/2.5, 1-Car R, 2 Story, Frontage 20
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Alder', 'townhome', 1700, 3, 2.5, '1-Car R', 2,
        130196.00, 4600.00, 8800.00,
        130196.00 + soft_site_cost, ROUND(130196.00 / 1700, 2), NULL, 5900, 20, 'active',
        '{"sb_cost": 130196, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(130196.00/1700, 2) ||', "cost_per_heated_sf_total": '|| ROUND((130196.00+soft_site_cost)/1700, 2) ||', "frontage": 20, "pricing_date": "2025-09-01"}'::jsonb);

    -- Cottonwood: 1729 SF, 3/2.5, 1-Car F, 3 Story, Frontage 18
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Cottonwood', 'townhome', 1729, 3, 2.5, '1-Car F', 3,
        142078.00, 6500.00, 7100.00,
        142078.00 + soft_site_cost, ROUND(142078.00 / 1729, 2), NULL, NULL, 18, 'active',
        '{"sb_cost": 142078, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(142078.00/1729, 2) ||', "cost_per_heated_sf_total": '|| ROUND((142078.00+soft_site_cost)/1729, 2) ||', "frontage": 18, "pricing_date": "2025-09-01"}'::jsonb);

    -- Pinyon: 1748 SF, 3/3.5, 2-Car, NULL Story, Frontage NULL
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Pinyon', 'townhome', 1748, 3, 3.5, '2-Car', NULL,
        151644.00, 6600.00, 11200.00,
        151644.00 + soft_site_cost, ROUND(151644.00 / 1748, 2), NULL, 6200, NULL, 'active',
        '{"sb_cost": 151644, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(151644.00/1748, 2) ||', "cost_per_heated_sf_total": '|| ROUND((151644.00+soft_site_cost)/1748, 2) ||', "pricing_date": "2025-09-01"}'::jsonb);

    -- Boxelder: 1796 SF, 4/2.5, 2-Car, NULL Story, Frontage 22
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Boxelder', 'townhome', 1796, 4, 2.5, '2-Car', NULL,
        141492.00, 6300.00, 9200.00,
        141492.00 + soft_site_cost, ROUND(141492.00 / 1796, 2), NULL, 4800, 22, 'active',
        '{"sb_cost": 141492, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(141492.00/1796, 2) ||', "cost_per_heated_sf_total": '|| ROUND((141492.00+soft_site_cost)/1796, 2) ||', "frontage": 22, "pricing_date": "2025-09-01"}'::jsonb);

    -- Fig: 1798 SF, 3/3.5, 1-Car R, 3 Story, Frontage 18
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Fig', 'townhome', 1798, 3, 3.5, '1-Car R', 3,
        150175.00, 3900.00, 8200.00,
        150175.00 + soft_site_cost, ROUND(150175.00 / 1798, 2), NULL, 9000, 18, 'active',
        '{"sb_cost": 150175, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(150175.00/1798, 2) ||', "cost_per_heated_sf_total": '|| ROUND((150175.00+soft_site_cost)/1798, 2) ||', "frontage": 18, "pricing_date": "2025-09-01"}'::jsonb);

    -- Conifer: 1892 SF, NULL Bed/Bath, 2-Car, NULL Story, Frontage NULL
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Conifer', 'townhome', 1892, NULL, NULL, '2-Car', NULL,
        163028.00, 4700.00, 5900.00,
        163028.00 + soft_site_cost, ROUND(163028.00 / 1892, 2), NULL, 7700, NULL, 'active',
        '{"sb_cost": 163028, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(163028.00/1892, 2) ||', "cost_per_heated_sf_total": '|| ROUND((163028.00+soft_site_cost)/1892, 2) ||', "pricing_date": "2025-09-01"}'::jsonb);

    -- Sycamore: 1993 SF, 3/2.5, 2-Car R, 2 Story, Frontage NULL
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Sycamore', 'townhome', 1993, 3, 2.5, '2-Car R', 2,
        146861.00, 5500.00, 8600.00,
        146861.00 + soft_site_cost, ROUND(146861.00 / 1993, 2), NULL, 4400, NULL, 'active',
        '{"sb_cost": 146861, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(146861.00/1993, 2) ||', "cost_per_heated_sf_total": '|| ROUND((146861.00+soft_site_cost)/1993, 2) ||', "pricing_date": "2025-09-01"}'::jsonb);

    -- Linville: 2188 SF, 4/2.5, 2-Car F, 2 Story, Frontage 27
    INSERT INTO floor_plans (organization_id, name, type, heated_sf, bedrooms, bathrooms, garage, stories,
        base_cost, upgrade_cost_classic, upgrade_cost_elegance,
        total_cost, cost_per_sf, lot_width_min, lot_depth_min, unit_width, status,
        cost_breakdown)
    VALUES (org_id, 'Linville', 'townhome', 2188, 4, 2.5, '2-Car F', 2,
        160613.00, 4700.00, 8900.00,
        160613.00 + soft_site_cost, ROUND(160613.00 / 2188, 2), NULL, 7300, 27, 'active',
        '{"sb_cost": 160613, "soft_site_cost": 13525, "cost_per_heated_sf_sb": '|| ROUND(160613.00/2188, 2) ||', "cost_per_heated_sf_total": '|| ROUND((160613.00+soft_site_cost)/2188, 2) ||', "frontage": 27, "pricing_date": "2025-09-01"}'::jsonb);

    RAISE NOTICE 'Successfully seeded 34 floor plans (18 SFH + 16 Townhome) for organization %', org_id;
END $$;
