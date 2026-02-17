-- ============================================================================
-- Migration 012: Seed Schedule Templates
-- ATLAS Platform - Red Cedar Homes
-- Seeds default 16-phase schedule templates for all 34 floor plans
-- Table created in 007_create_admin_config.sql
-- SFH: 125 calendar days (14-day framing phase)
-- Townhome: 123 calendar days (12-day framing phase, shorter due to shared walls)
-- ============================================================================

DO $$
DECLARE
    fp RECORD;
    framing_days INTEGER;
BEGIN
    -- ========================================================================
    -- Loop through all floor plans and seed the 16-phase schedule for each.
    -- The only difference between SFH and Townhome is Phase 4 (Framing):
    --   SFH = 14 days, Townhome = 12 days (shared party walls reduce framing)
    -- ========================================================================
    FOR fp IN
        SELECT id, name, type
        FROM floor_plans
        WHERE organization_id = (
            SELECT id FROM organizations WHERE name = 'Red Cedar Homes' LIMIT 1
        )
        ORDER BY type, name
    LOOP
        -- Determine framing duration based on building type
        IF fp.type = 'townhome' THEN
            framing_days := 12;
        ELSE
            framing_days := 14;
        END IF;

        INSERT INTO schedule_templates (floor_plan_id, phase_number, phase_name, duration_days, required_inspections) VALUES

        -- Phase 1: Pre-Construction (15 days)
        (fp.id, 1, 'Pre-Construction', 15, ARRAY[]::TEXT[]),

        -- Phase 2: Site Work (10 days)
        (fp.id, 2, 'Site Work', 10, ARRAY['Erosion Control Inspection']),

        -- Phase 3: Foundation (12 days)
        (fp.id, 3, 'Foundation', 12, ARRAY['Footer Inspection', 'Foundation Inspection']),

        -- Phase 4: Framing (14 days SFH / 12 days Townhome)
        (fp.id, 4, 'Framing', framing_days, ARRAY['Framing Inspection']),

        -- Phase 5: Dry-In (7 days)
        (fp.id, 5, 'Dry-In', 7, ARRAY[]::TEXT[]),

        -- Phase 6: MEP Plumbing (5 days)
        (fp.id, 6, 'MEP Plumbing', 5, ARRAY['Plumbing Rough-In Inspection']),

        -- Phase 7: MEP Electrical (5 days)
        (fp.id, 7, 'MEP Electrical', 5, ARRAY['Electrical Rough-In Inspection']),

        -- Phase 8: MEP HVAC (5 days)
        (fp.id, 8, 'MEP HVAC', 5, ARRAY['HVAC Rough-In Inspection']),

        -- Phase 9: Insulation (3 days)
        (fp.id, 9, 'Insulation', 3, ARRAY['Insulation Inspection']),

        -- Phase 10: Drywall (10 days)
        (fp.id, 10, 'Drywall', 10, ARRAY[]::TEXT[]),

        -- Phase 11: Trim & Interior (12 days)
        (fp.id, 11, 'Trim & Interior', 12, ARRAY[]::TEXT[]),

        -- Phase 12: Paint (5 days)
        (fp.id, 12, 'Paint', 5, ARRAY[]::TEXT[]),

        -- Phase 13: Flooring (5 days)
        (fp.id, 13, 'Flooring', 5, ARRAY[]::TEXT[]),

        -- Phase 14: Final MEP (5 days)
        (fp.id, 14, 'Final MEP', 5, ARRAY[]::TEXT[]),

        -- Phase 15: Punch/Final (7 days)
        (fp.id, 15, 'Punch/Final', 7, ARRAY['Final Building Inspection', 'Certificate of Occupancy']),

        -- Phase 16: Close-Out (5 days)
        (fp.id, 16, 'Close-Out', 5, ARRAY[]::TEXT[]);

    END LOOP;

    RAISE NOTICE 'Successfully seeded 16-phase schedule templates for % floor plans (SFH: 125 days, TH: 123 days)',
        (SELECT COUNT(*) FROM floor_plans WHERE organization_id = (
            SELECT id FROM organizations WHERE name = 'Red Cedar Homes' LIMIT 1
        ));
END $$;
