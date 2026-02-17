-- ============================================================================
-- Migration 011: Seed Trade Categories
-- ATLAS Platform - Red Cedar Homes
-- Seeds all 59 trade categories with codes and typical cost ranges
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

    INSERT INTO trade_categories (organization_id, code, name, description, cost_range_low, cost_range_high, is_active) VALUES
    (org_id, '01', 'Dumpster', 'Construction dumpster rental and disposal fees', 800.00, 2500.00, true),
    (org_id, '02', 'Utilities', 'Temporary construction utilities setup and monthly costs', 500.00, 2000.00, true),
    (org_id, '03', 'Portable Toilet', 'Portable toilet rental for construction site', 400.00, 1200.00, true),
    (org_id, '04', 'Permit Box', 'Job site permit box and display requirements', 50.00, 200.00, true),
    (org_id, '05', 'Termite Treatment', 'Pre-construction termite soil treatment and warranty', 600.00, 1500.00, true),
    (org_id, '06', 'Lumber (All Floors)', 'Structural lumber package for all floors including wall framing', 18000.00, 45000.00, true),
    (org_id, '07', 'Framing Labor', 'Rough framing labor for walls, floors, and roof', 12000.00, 28000.00, true),
    (org_id, '08', 'Floor Trusses', 'Engineered floor truss system supply and delivery', 4000.00, 12000.00, true),
    (org_id, '09', 'Roof Trusses', 'Engineered roof truss system supply and delivery', 5000.00, 14000.00, true),
    (org_id, '10', 'Stairs', 'Interior and exterior stair framing and installation', 1200.00, 4500.00, true),
    (org_id, '11', 'I-Joist/EWP', 'I-Joists, LVL beams, and engineered wood products', 2000.00, 8000.00, true),
    (org_id, '12', 'Roofing (Shingle)', 'Asphalt shingle roofing material supply', 3500.00, 9000.00, true),
    (org_id, '13', 'Roofing (Metal)', 'Standing seam or screw-down metal roofing material', 6000.00, 18000.00, true),
    (org_id, '14', 'Roofing Labor & Material', 'Combined roofing labor and material turnkey package', 5500.00, 16000.00, true),
    (org_id, '15', 'Siding Material', 'Exterior siding material (HardiePlank, vinyl, etc.)', 4000.00, 12000.00, true),
    (org_id, '16', 'Siding Labor', 'Exterior siding installation labor', 3500.00, 9000.00, true),
    (org_id, '17', 'Brick', 'Brick veneer material and installation (labor and material)', 5000.00, 18000.00, true),
    (org_id, '18', 'Window Material', 'Window units supply (vinyl, aluminum, wood-clad)', 3000.00, 12000.00, true),
    (org_id, '19', 'Window Labor', 'Window installation labor', 1200.00, 3500.00, true),
    (org_id, '20', 'Exterior Door Material', 'Exterior doors including entry, patio, and garage man-door', 1500.00, 5000.00, true),
    (org_id, '21', 'Exterior Door Labor', 'Exterior door installation labor', 600.00, 1800.00, true),
    (org_id, '22', 'Garage Door', 'Garage door supply and installation with opener', 1200.00, 4500.00, true),
    (org_id, '23', 'Plumbing Turnkey', 'Complete plumbing rough-in and finish (labor and material)', 8000.00, 18000.00, true),
    (org_id, '24', 'HVAC', 'Complete HVAC system rough-in, equipment, and finish', 7000.00, 16000.00, true),
    (org_id, '25', 'Electrical Rough & Trim', 'Complete electrical rough-in and trim-out (labor and material)', 6000.00, 14000.00, true),
    (org_id, '26', 'Blower Test', 'Blower door test for energy code compliance', 200.00, 500.00, true),
    (org_id, '27', 'Low Voltage/AV', 'Low voltage wiring, data, phone, cable, and AV pre-wire', 800.00, 3500.00, true),
    (org_id, '28', 'Insulation', 'Batt, blown, and spray foam insulation (labor and material)', 3000.00, 8000.00, true),
    (org_id, '29', 'Drywall Material', 'Drywall board, mud, tape, and corner bead supply', 3000.00, 7500.00, true),
    (org_id, '30', 'Drywall Labor', 'Drywall hang, tape, mud, and finish labor', 4000.00, 10000.00, true),
    (org_id, '31', 'Exterior Paint', 'Exterior painting labor and material', 2500.00, 6000.00, true),
    (org_id, '32', 'Interior Paint', 'Interior painting labor and material (walls, ceilings, trim)', 3500.00, 8000.00, true),
    (org_id, '33', 'Interior Trim Turnkey', 'Complete interior trim package (labor and material combined)', 6000.00, 16000.00, true),
    (org_id, '34', 'Interior Trim Material', 'Interior trim material (baseboard, casing, crown, etc.)', 3000.00, 8000.00, true),
    (org_id, '35', 'Interior Trim Labor', 'Interior trim carpentry installation labor', 3000.00, 8000.00, true),
    (org_id, '36', 'Door Hardware', 'Interior door handles, hinges, deadbolts, and door stops', 400.00, 1500.00, true),
    (org_id, '37', 'Shelving', 'Closet shelving and pantry shelving installation', 800.00, 3000.00, true),
    (org_id, '38', 'Mirrors', 'Bathroom mirrors supply and installation', 200.00, 800.00, true),
    (org_id, '39', 'Bath Accessories', 'Towel bars, toilet paper holders, robe hooks, etc.', 150.00, 600.00, true),
    (org_id, '40', 'Shower Door', 'Shower door/enclosure supply and installation', 400.00, 2500.00, true),
    (org_id, '41', 'Countertops', 'Kitchen and bathroom countertop fabrication and installation', 2500.00, 8000.00, true),
    (org_id, '42', 'Cabinet Labor & Material', 'Kitchen and bath cabinets supply and installation', 5000.00, 15000.00, true),
    (org_id, '43', 'Tile', 'Floor and wall tile material and installation labor', 2000.00, 8000.00, true),
    (org_id, '44', 'Light Fixtures', 'Interior and exterior light fixture supply', 1200.00, 4000.00, true),
    (org_id, '45', 'Appliances', 'Kitchen and laundry appliance package', 2500.00, 7000.00, true),
    (org_id, '46', 'Carpet', 'Carpet material and installation for bedrooms and closets', 1500.00, 5000.00, true),
    (org_id, '47', 'LVP Flooring', 'Luxury vinyl plank flooring material and installation', 3000.00, 9000.00, true),
    (org_id, '48', 'Interior Clean', 'Construction cleanup - rough clean and final clean', 500.00, 1500.00, true),
    (org_id, '49', 'Gutters', 'Seamless gutter and downspout installation', 1200.00, 3500.00, true),
    (org_id, '50', 'Mailbox', 'Mailbox supply and installation', 75.00, 400.00, true),
    (org_id, '51', 'Pressure Wash', 'Exterior pressure washing before final inspection', 200.00, 600.00, true),
    (org_id, '52', 'Foundation', 'Foundation work including footers, stem walls, slab, or crawl space', 8000.00, 25000.00, true),
    (org_id, '53', 'Landscaping', 'Final grading, sod, shrubs, trees, and mulch', 3000.00, 10000.00, true),
    (org_id, '54', 'Flatwork/Driveway', 'Concrete driveway, sidewalks, patios, and stoops', 4000.00, 12000.00, true),
    (org_id, '55', 'Deck', 'Exterior deck framing and decking material and labor', 3000.00, 15000.00, true),
    (org_id, '56', 'Blinds', 'Window blinds supply and installation', 800.00, 3000.00, true),
    (org_id, '57', 'Waterproofing', 'Foundation waterproofing, drainage board, and French drain', 1500.00, 6000.00, true),
    (org_id, '58', 'Site Work/Grading', 'Lot clearing, grading, erosion control, and site prep', 5000.00, 25000.00, true),
    (org_id, '59', 'Miscellaneous', 'Miscellaneous construction costs and allowances', 500.00, 5000.00, true);

    RAISE NOTICE 'Successfully seeded 59 trade categories for organization %', org_id;
END $$;
