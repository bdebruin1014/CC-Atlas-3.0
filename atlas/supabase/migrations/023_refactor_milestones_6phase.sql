-- ============================================================================
-- Migration 023: Refactor Construction Milestones from 16 to 6
-- ATLAS Platform - Red Cedar Homes
-- Updates phase_number CHECK constraint and seeds a 6-milestone construction
-- workflow template per v4 spec §3.6.
-- ============================================================================

-- 1. Drop and recreate the CHECK constraint on unit_milestones.phase_number
ALTER TABLE unit_milestones DROP CONSTRAINT IF EXISTS unit_milestones_phase_number_check;
ALTER TABLE unit_milestones ADD CONSTRAINT unit_milestones_phase_number_check
  CHECK (phase_number >= 1 AND phase_number <= 6);

-- Note: Existing data with phase_number > 6 from previously launched jobs
-- must be migrated or deleted before this constraint takes effect.
-- For fresh environments this is a no-op.

-- 2. Seed a 6-milestone Construction Workflow Template
DO $$
DECLARE
    org_id UUID;
    wf_id UUID;
    ms_1_id UUID; ms_2_id UUID; ms_3_id UUID; ms_4_id UUID; ms_5_id UUID; ms_6_id UUID;
    tl_1_id UUID; tl_2_id UUID; tl_3_id UUID; tl_4_id UUID; tl_5_id UUID; tl_6_id UUID;
BEGIN
    -- Get the default organization
    SELECT id INTO org_id FROM organizations WHERE name = 'Red Cedar Homes' LIMIT 1;
    IF org_id IS NULL THEN
        INSERT INTO organizations (name) VALUES ('Red Cedar Homes') RETURNING id INTO org_id;
    END IF;

    -- Deactivate any existing construction workflow templates
    UPDATE workflow_templates SET is_active = false
    WHERE workflow_type = 'construction' AND is_active = true;

    -- ========================================================================
    -- WORKFLOW: Construction — 6-Milestone Vertical Build
    -- ========================================================================
    INSERT INTO workflow_templates (organization_id, name, description, workflow_type, trigger_event, is_active)
    VALUES (org_id,
        'Construction — 6-Milestone Vertical Build',
        'Six-milestone vertical construction workflow per v4 spec: Permit → Foundation → Frame → Sheetrock → CO → Complete.',
        'construction', 'job_launched', true)
    RETURNING id INTO wf_id;

    -- ----------------------------------------------------------------
    -- MILESTONE 1: Permit
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_id,
        'Permit',
        'Permit application, plan review, approval, utility setup, site prep, and erosion control.',
        1, 21, true)
    RETURNING id INTO ms_1_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_1_id, 'Permitting Tasks', 'All pre-construction permitting and site prep activities.', 1)
    RETURNING id INTO tl_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_1_id, 'Submit permit application', 'Prepare and submit building permit application to municipality with plans and fees.', 1, 'project_manager', 3, true),
    (tl_1_id, 'Plan review corrections', 'Address any plan review comments from building department. Resubmit if needed.', 2, 'project_manager', 7, false),
    (tl_1_id, 'Receive permit approval', 'Obtain approved building permit. Post permit card on site.', 3, 'project_manager', 1, true),
    (tl_1_id, 'Schedule utility setup', 'Coordinate temporary power, water meter set, and sewer tap with utility providers.', 4, 'superintendent', 5, true),
    (tl_1_id, 'Install erosion control', 'Install silt fence, construction entrance, and erosion control measures per SWPPP.', 5, 'superintendent', 2, true),
    (tl_1_id, 'Site preparation', 'Clear lot, set building corners, and verify setbacks per survey and site plan.', 6, 'superintendent', 3, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 2: Foundation
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_id,
        'Foundation',
        'Sitework, grading, footer dig and pour, foundation walls, waterproofing, backfill, and slab.',
        2, 21, true)
    RETURNING id INTO ms_2_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_2_id, 'Foundation Tasks', 'Excavation through slab pour and backfill.', 1)
    RETURNING id INTO tl_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_2_id, 'Rough grading', 'Excavate and grade building pad to engineered specifications.', 1, 'superintendent', 3, true),
    (tl_2_id, 'Footer dig and inspection', 'Dig footers per plan. Schedule and pass footer inspection before pour.', 2, 'superintendent', 3, true),
    (tl_2_id, 'Footer pour', 'Place concrete for footers per structural plans.', 3, 'superintendent', 1, true),
    (tl_2_id, 'Foundation walls', 'Form and pour foundation walls or install block/ICF per plan.', 4, 'superintendent', 5, true),
    (tl_2_id, 'Foundation inspection', 'Schedule and pass foundation wall inspection.', 5, 'superintendent', 1, true),
    (tl_2_id, 'Waterproofing and drain tile', 'Apply waterproofing membrane and install perimeter drain tile.', 6, 'superintendent', 2, true),
    (tl_2_id, 'Backfill', 'Backfill foundation walls. Compact to specification.', 7, 'superintendent', 2, true),
    (tl_2_id, 'Slab prep and pour', 'Install under-slab plumbing, vapor barrier, gravel, and pour slab.', 8, 'superintendent', 4, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 3: Frame
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_id,
        'Frame',
        'Framing, dry-in (roof, windows, doors), MEP rough-in, and insulation.',
        3, 28, true)
    RETURNING id INTO ms_3_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_3_id, 'Framing & Rough-In Tasks', 'Framing through insulation inspection.', 1)
    RETURNING id INTO tl_3_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_3_id, 'Framing', 'Erect walls, trusses, sheathing, and complete structural framing per plans.', 1, 'superintendent', 10, true),
    (tl_3_id, 'Framing inspection', 'Schedule and pass framing inspection.', 2, 'superintendent', 1, true),
    (tl_3_id, 'Roofing and dry-in', 'Install roof underlayment, shingles, and flash. Set windows and exterior doors.', 3, 'superintendent', 4, true),
    (tl_3_id, 'Plumbing rough-in', 'Install all rough plumbing: supply, drain, waste, and vent lines.', 4, 'superintendent', 4, true),
    (tl_3_id, 'Electrical rough-in', 'Install panel, run circuits, set boxes, and pull wire per plan.', 5, 'superintendent', 4, true),
    (tl_3_id, 'HVAC rough-in', 'Install ductwork, set equipment pads, and run refrigerant lines.', 6, 'superintendent', 3, true),
    (tl_3_id, 'MEP rough-in inspections', 'Schedule and pass plumbing, electrical, HVAC, and insulation inspections.', 7, 'superintendent', 2, true),
    (tl_3_id, 'Insulation', 'Install spray foam and/or batt insulation per energy code. Pass insulation inspection.', 8, 'superintendent', 3, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 4: Sheetrock
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_id,
        'Sheetrock',
        'Drywall hang, mud, tape, sand, prime, trim rough, and paint prep.',
        4, 21, true)
    RETURNING id INTO ms_4_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_4_id, 'Sheetrock Tasks', 'Drywall through paint prep.', 1)
    RETURNING id INTO tl_4_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_4_id, 'Drywall hang', 'Hang drywall throughout interior per plan specifications.', 1, 'superintendent', 4, true),
    (tl_4_id, 'Drywall mud, tape, and sand', 'Tape joints, apply mud coats, and sand to smooth Level 4 finish.', 2, 'superintendent', 6, true),
    (tl_4_id, 'Drywall prime', 'Apply primer coat to all drywall surfaces.', 3, 'superintendent', 2, true),
    (tl_4_id, 'Trim rough-in', 'Install door jambs, window sills, and rough trim elements.', 4, 'superintendent', 4, true),
    (tl_4_id, 'Paint prep', 'Caulk, fill nail holes, mask, and prepare all surfaces for finish paint.', 5, 'superintendent', 3, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 5: CO (Certificate of Occupancy)
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_id,
        'CO',
        'Trim finish, paint, flooring, cabinets, countertops, fixtures, appliances, final MEP, exterior, landscaping, punch list, and final inspections.',
        5, 42, true)
    RETURNING id INTO ms_5_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_5_id, 'Finish & CO Tasks', 'All finish work through Certificate of Occupancy.', 1)
    RETURNING id INTO tl_5_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_5_id, 'Interior paint', 'Apply finish coats to all interior walls, ceilings, and trim.', 1, 'superintendent', 5, true),
    (tl_5_id, 'Cabinet install', 'Install kitchen and bath cabinetry. Level, shim, and secure.', 2, 'superintendent', 3, true),
    (tl_5_id, 'Countertop install', 'Template, fabricate, and install countertops. Connect undermount sinks.', 3, 'superintendent', 3, true),
    (tl_5_id, 'Flooring install', 'Install hardwood, tile, carpet, and LVP per selections.', 4, 'superintendent', 5, true),
    (tl_5_id, 'Trim finish', 'Install baseboard, casing, crown molding, and interior doors.', 5, 'superintendent', 5, true),
    (tl_5_id, 'Plumbing fixtures', 'Install faucets, toilets, shower valves, and all plumbing fixtures.', 6, 'superintendent', 2, true),
    (tl_5_id, 'Electrical fixtures', 'Install switches, outlets, light fixtures, and appliance connections.', 7, 'superintendent', 2, true),
    (tl_5_id, 'HVAC startup', 'Set equipment, charge system, and perform startup. Test all zones.', 8, 'superintendent', 2, true),
    (tl_5_id, 'Appliance install', 'Install and test all appliances per selections.', 9, 'superintendent', 1, true),
    (tl_5_id, 'Exterior finish', 'Complete siding, exterior paint/stain, gutters, garage doors, and exterior trim.', 10, 'superintendent', 5, true),
    (tl_5_id, 'Landscaping', 'Install landscaping, irrigation, and final grading per plan.', 11, 'superintendent', 3, true),
    (tl_5_id, 'Punch list', 'Walk unit, document and complete all punch items.', 12, 'superintendent', 3, true),
    (tl_5_id, 'Final building inspection', 'Schedule and pass final building inspection.', 13, 'superintendent', 1, true),
    (tl_5_id, 'Receive Certificate of Occupancy', 'Obtain CO from municipality. Record CO date in system.', 14, 'superintendent', 1, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 6: Complete
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_id,
        'Complete',
        'Close-out documentation, final lien waivers, as-builts, owner turnover, and final draw.',
        6, 14, true)
    RETURNING id INTO ms_6_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_6_id, 'Close-Out Tasks', 'Final administrative tasks and owner turnover.', 1)
    RETURNING id INTO tl_6_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_6_id, 'Collect final lien waivers', 'Obtain final lien waivers from all trades and suppliers.', 1, 'project_manager', 5, true),
    (tl_6_id, 'Compile close-out documents', 'Assemble warranty manuals, equipment docs, and maintenance guides.', 2, 'project_manager', 3, true),
    (tl_6_id, 'As-built drawings', 'Update plans to reflect as-built conditions. Archive in project documents.', 3, 'project_manager', 3, false),
    (tl_6_id, 'Owner walkthrough and turnover', 'Conduct orientation walkthrough with owner. Transfer keys, remotes, and documents.', 4, 'superintendent', 1, true),
    (tl_6_id, 'Submit final draw', 'Prepare and submit final draw request with all supporting documentation.', 5, 'project_manager', 2, true),
    (tl_6_id, 'Release retainage', 'Process retainage release for all completed trades after lien waiver collection.', 6, 'project_manager', 5, true);

    RAISE NOTICE 'Construction 6-milestone workflow seeded: % (6 milestones, 6 task lists, 47 tasks)', wf_id;
END
$$;
