-- ============================================================================
-- Migration 014: Seed Workflow Templates
-- ATLAS Platform - Red Cedar Homes
-- Seeds detailed workflow templates for acquisition and project processes
-- ============================================================================

DO $$
DECLARE
    org_id UUID;
    -- Scattered Lot Acquisition workflow
    wf_scattered_acq_id UUID;
    ms_1_id UUID; ms_2_id UUID; ms_3_id UUID; ms_4_id UUID; ms_5_id UUID; ms_6_id UUID;
    tl_1_1_id UUID; tl_1_2_id UUID; tl_1_3_id UUID;
    tl_2_1_id UUID; tl_2_2_id UUID;
    tl_3_1_id UUID; tl_3_2_id UUID;
    tl_4_1_id UUID;
    tl_5_1_id UUID;
    tl_6_1_id UUID; tl_6_2_id UUID;
    -- Lot Development Acquisition workflow
    wf_lotdev_acq_id UUID;
    ld_ms_1_id UUID; ld_ms_2_id UUID; ld_ms_3_id UUID; ld_ms_4_id UUID;
    ld_tl_1_1_id UUID; ld_tl_1_2_id UUID;
    ld_tl_2_1_id UUID; ld_tl_2_2_id UUID;
    ld_tl_3_1_id UUID; ld_tl_3_2_id UUID;
    ld_tl_4_1_id UUID; ld_tl_4_2_id UUID;
    -- Lot Purchase Acquisition workflow
    wf_lotpur_acq_id UUID;
    lp_ms_1_id UUID; lp_ms_2_id UUID; lp_ms_3_id UUID;
    lp_tl_1_1_id UUID; lp_tl_1_2_id UUID;
    lp_tl_2_1_id UUID;
    lp_tl_3_1_id UUID; lp_tl_3_2_id UUID;
    -- Scattered Lot Project workflow
    wf_scattered_proj_id UUID;
    sp_ms_1_id UUID; sp_ms_2_id UUID; sp_ms_3_id UUID;
    sp_tl_1_1_id UUID; sp_tl_1_2_id UUID;
    sp_tl_2_1_id UUID;
    sp_tl_3_1_id UUID; sp_tl_3_2_id UUID;
BEGIN
    -- Get the default organization
    SELECT id INTO org_id FROM organizations WHERE name = 'Red Cedar Homes' LIMIT 1;
    IF org_id IS NULL THEN
        INSERT INTO organizations (name) VALUES ('Red Cedar Homes') RETURNING id INTO org_id;
    END IF;

    -- ========================================================================
    -- WORKFLOW 1: SCATTERED LOT ACQUISITION (most detailed)
    -- ========================================================================
    INSERT INTO workflow_templates (organization_id, name, description, workflow_type, trigger_event, is_active)
    VALUES (org_id,
        'Scattered Lot Acquisition',
        'Complete workflow for acquiring individual scattered lots. Covers deal sourcing through post-close setup. Module: opportunities, Record Type: scattered_lot.',
        'opportunity', 'opportunity_created_scattered_lot', true)
    RETURNING id INTO wf_scattered_acq_id;

    -- ----------------------------------------------------------------
    -- MILESTONE 1: Pre-Offer - Site Identification and Analysis
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_scattered_acq_id,
        'Pre-Offer — Site Identification and Analysis',
        'Initial deal sourcing, site screening, feasibility analysis, and viability decision before making an offer.',
        1, 21, true)
    RETURNING id INTO ms_1_id;

    -- Task List 1.1: Deal Sourcing and Initial Screening (6 tasks)
    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_1_id, 'Deal Sourcing and Initial Screening',
        'Identify and initially screen potential scattered lot acquisitions.', 1)
    RETURNING id INTO tl_1_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_1_1_id, 'Log new opportunity in ATLAS', 'Create opportunity record with address, source, and initial notes. Attach any listing information or photos.', 1, 'acquisition_manager', 1, true),
    (tl_1_1_id, 'Pull parcel data and tax records', 'Retrieve parcel dimensions, tax assessed value, ownership info, and deed history from county GIS/tax records.', 2, 'site_analyst', 2, true),
    (tl_1_1_id, 'Verify zoning and land use', 'Confirm current zoning allows residential construction. Check overlay districts, historic designations, and setback requirements.', 3, 'site_analyst', 2, true),
    (tl_1_1_id, 'Check utility availability', 'Verify water, sewer, electric, and gas availability at the site. Note if any require extension or alternative solutions.', 4, 'site_analyst', 2, true),
    (tl_1_1_id, 'Pull comparable sales data', 'Research recent comparable sales within 0.5 mile radius. Document at least 3 comps with price, SF, and sale date.', 5, 'sales_market_analyst', 3, true),
    (tl_1_1_id, 'Complete initial screening checklist', 'Review all initial data and complete go/no-go screening checklist. Flag any deal-breakers or concerns.', 6, 'acquisition_manager', 1, true);

    -- Task List 1.2: Site Analysis and Feasibility (8 tasks)
    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_1_id, 'Site Analysis and Feasibility',
        'Detailed site analysis and financial feasibility assessment.', 2)
    RETURNING id INTO tl_1_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_1_2_id, 'Conduct site visit and photo documentation', 'Visit the site in person. Document conditions, access, topography, neighboring properties, and any visible concerns. Take photos.', 1, 'acquisition_manager', 2, true),
    (tl_1_2_id, 'Evaluate floor plan fit', 'Based on lot dimensions, setbacks, and topography, determine which floor plans fit the site. Select best-fit model.', 2, 'site_analyst', 2, true),
    (tl_1_2_id, 'Determine garage position and orientation', 'Based on lot configuration, determine optimal garage position (front, side, rear, none) and house orientation.', 3, 'site_analyst', 1, true),
    (tl_1_2_id, 'Estimate site work costs', 'Estimate clearing, grading, foundation type, driveway, and any retaining wall costs based on site conditions.', 4, 'site_analyst', 2, true),
    (tl_1_2_id, 'Identify municipality and pull fee schedule', 'Determine governing municipality. Pull permit fees, impact fees, water/sewer tap fees, and any special assessments.', 5, 'site_analyst', 1, true),
    (tl_1_2_id, 'Run deal analysis in ATLAS', 'Complete full deal analysis with purchase price, construction costs, soft costs, projected sale price, and margin calculation.', 6, 'acquisition_manager', 2, true),
    (tl_1_2_id, 'Research HOA/deed restrictions', 'Check for HOA covenants, deed restrictions, easements, or other encumbrances that could affect the build.', 7, 'site_analyst', 2, false),
    (tl_1_2_id, 'Check flood zone and environmental', 'Verify FEMA flood zone status. Check for wetlands, endangered species habitat, or environmental contamination concerns.', 8, 'site_analyst', 1, true);

    -- Task List 1.3: Viability Decision (4 tasks)
    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_1_id, 'Viability Decision',
        'Final go/no-go decision on whether to proceed with an offer.', 3)
    RETURNING id INTO tl_1_3_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_1_3_id, 'Prepare deal summary package', 'Compile site analysis, deal analysis, comps, photos, and risk factors into a deal summary for principal review.', 1, 'acquisition_manager', 1, true),
    (tl_1_3_id, 'Principal review and approval', 'Owner/principal reviews deal summary and provides go/no-go decision. Document any conditions or price adjustments.', 2, 'owner_principal', 2, true),
    (tl_1_3_id, 'Determine offer strategy and price', 'Based on approval, determine offer price, terms, contingencies, and negotiation strategy.', 3, 'acquisition_manager', 1, true),
    (tl_1_3_id, 'Advance stage to Offer/LOI', 'Update opportunity stage in ATLAS to Offer/LOI. Ensure all required fields are populated.', 4, 'acquisition_manager', 1, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 2: Offer and Negotiation
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_scattered_acq_id,
        'Offer and Negotiation',
        'Contract preparation, offer submission, negotiation, and post-execution setup.',
        2, 14, true)
    RETURNING id INTO ms_2_id;

    -- Task List 2.1: Contract Preparation and Execution (5 tasks)
    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_2_id, 'Contract Preparation and Execution',
        'Prepare and submit offer, negotiate terms, and execute purchase contract.', 1)
    RETURNING id INTO tl_2_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_2_1_id, 'Draft purchase contract or LOI', 'Prepare purchase contract or LOI with approved terms, price, contingencies, and timeline.', 1, 'acquisition_manager', 2, true),
    (tl_2_1_id, 'Legal review of contract', 'Attorney reviews contract terms, title requirements, and contingency language.', 2, 'attorney_legal', 3, true),
    (tl_2_1_id, 'Submit offer to seller/agent', 'Deliver executed offer to seller or listing agent. Document submission method and timestamp.', 3, 'acquisition_manager', 1, true),
    (tl_2_1_id, 'Negotiate terms and counteroffers', 'Handle any counteroffers or term negotiations. Document all changes and get principal approval on material changes.', 4, 'acquisition_manager', 5, true),
    (tl_2_1_id, 'Execute final contract', 'All parties sign final contract. Deliver earnest money. Record binding agreement date.', 5, 'acquisition_manager', 2, true);

    -- Task List 2.2: Post-Execution Setup (5 tasks)
    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_2_id, 'Post-Execution Setup',
        'Immediately after contract execution, set up tracking and notify team.', 2)
    RETURNING id INTO tl_2_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_2_2_id, 'Update ATLAS to Under Contract stage', 'Update opportunity stage, contract date, DD deadline, and projected close date in ATLAS.', 1, 'acquisition_manager', 1, true),
    (tl_2_2_id, 'Upload executed contract to ATLAS', 'Scan and upload fully executed purchase contract and any addenda to the opportunity record.', 2, 'operations_coordinator', 1, true),
    (tl_2_2_id, 'Deliver earnest money deposit', 'Deliver earnest money to escrow holder per contract terms. Document check number and delivery confirmation.', 3, 'accounting', 2, true),
    (tl_2_2_id, 'Set up DD deadline calendar alerts', 'Create calendar reminders for due diligence deadline, closing date, and any other contract milestones.', 4, 'operations_coordinator', 1, true),
    (tl_2_2_id, 'Notify internal team of new contract', 'Send notification to operations, accounting, and construction teams about the new acquisition under contract.', 5, 'acquisition_manager', 1, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 3: Under Contract - Due Diligence
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_scattered_acq_id,
        'Under Contract — Due Diligence',
        'Comprehensive due diligence during the contract period including survey, title, environmental, and construction planning.',
        3, 30, true)
    RETURNING id INTO ms_3_id;

    -- Task List 3.1: Contract Distribution and Notification (3 tasks)
    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_3_id, 'Contract Distribution and Notification',
        'Distribute contract to relevant parties and initiate DD processes.', 1)
    RETURNING id INTO tl_3_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_3_1_id, 'Send contract to title company', 'Deliver executed contract to title company. Request title search and preliminary title commitment.', 1, 'operations_coordinator', 1, true),
    (tl_3_1_id, 'Send contract to lender', 'Deliver executed contract to lender for financing pre-qualification if applicable.', 2, 'operations_coordinator', 1, true),
    (tl_3_1_id, 'Send contract to attorney for title review', 'Deliver contract and order title opinion from attorney. Flag any title exceptions.', 3, 'operations_coordinator', 1, true);

    -- Task List 3.2: Due Diligence Execution (10 tasks)
    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_3_id, 'Due Diligence Execution',
        'Complete all due diligence items during the contract DD period.', 2)
    RETURNING id INTO tl_3_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_3_2_id, 'Order and review boundary survey', 'Commission boundary survey from licensed surveyor. Review for encroachments, easements, and buildable area confirmation.', 1, 'acquisition_manager', 14, true),
    (tl_3_2_id, 'Review preliminary title commitment', 'Review title commitment for liens, encumbrances, easements, and exceptions. Clear any objections with seller.', 2, 'attorney_legal', 7, true),
    (tl_3_2_id, 'Verify soil conditions', 'Obtain soil report or geotechnical study if needed. Confirm foundation type suitability.', 3, 'site_analyst', 10, false),
    (tl_3_2_id, 'Confirm utility connections and costs', 'Get written confirmation of utility availability and connection costs from each provider. Update deal analysis.', 4, 'site_analyst', 7, true),
    (tl_3_2_id, 'Obtain preliminary site plan approval', 'If required, submit preliminary site plan to municipality for review. Confirm setbacks and coverage meet plan.', 5, 'site_analyst', 14, false),
    (tl_3_2_id, 'Complete environmental screening', 'Phase I environmental assessment if warranted. Check for contamination, underground storage tanks, or hazardous materials.', 6, 'site_analyst', 14, false),
    (tl_3_2_id, 'Finalize floor plan selection', 'Based on survey and site analysis, finalize floor plan and upgrade package selection. Lock in construction pricing.', 7, 'acquisition_manager', 5, true),
    (tl_3_2_id, 'Update deal analysis with final numbers', 'Incorporate all DD findings into deal analysis. Update costs, timeline, and projected margins.', 8, 'acquisition_manager', 2, true),
    (tl_3_2_id, 'DD review meeting with principal', 'Present complete DD findings to owner/principal. Get final go/no-go decision to proceed past DD deadline.', 9, 'acquisition_manager', 1, true),
    (tl_3_2_id, 'Waive or extend DD contingency', 'If proceeding, formally waive DD contingency per contract terms. If issues found, negotiate extension or termination.', 10, 'acquisition_manager', 1, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 4: Financing
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_scattered_acq_id,
        'Financing',
        'Assemble and submit lender package for construction/acquisition financing.',
        4, 21, true)
    RETURNING id INTO ms_4_id;

    -- Task List 4.1: Lender Package (6 tasks)
    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_4_id, 'Lender Package',
        'Prepare and submit financing package to lender.', 1)
    RETURNING id INTO tl_4_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_4_1_id, 'Prepare construction budget for lender', 'Create detailed construction budget with line items matching lender draw schedule requirements.', 1, 'operations_director', 3, true),
    (tl_4_1_id, 'Compile lender package documents', 'Assemble contract, survey, title commitment, plans, specs, budget, comps, and entity documents for lender submission.', 2, 'operations_coordinator', 3, true),
    (tl_4_1_id, 'Submit loan application and package', 'Submit complete lender package to construction lender. Track submission and confirm receipt.', 3, 'operations_director', 1, true),
    (tl_4_1_id, 'Order appraisal (if required by lender)', 'Coordinate appraisal if required. Provide comps and specifications to appraiser.', 4, 'operations_coordinator', 14, false),
    (tl_4_1_id, 'Respond to lender conditions', 'Address any conditions or additional documentation requests from lender underwriting.', 5, 'operations_director', 5, true),
    (tl_4_1_id, 'Receive and review loan commitment', 'Review loan commitment terms, interest rate, draw schedule, and conditions. Flag any issues.', 6, 'operations_director', 2, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 5: Closing Preparation
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_scattered_acq_id,
        'Closing Preparation',
        'Pre-closing activities including insurance, entity setup, and document preparation.',
        5, 14, true)
    RETURNING id INTO ms_5_id;

    -- Task List 5.1: Pre-Closing Activities (9 tasks)
    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_5_id, 'Pre-Closing Activities',
        'Complete all pre-closing requirements for a smooth closing.', 1)
    RETURNING id INTO tl_5_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_5_1_id, 'Set up or confirm SPE entity', 'Confirm or create the special purpose entity (LLC) for property acquisition. File articles if new.', 1, 'attorney_legal', 5, true),
    (tl_5_1_id, 'Obtain builders risk insurance', 'Bind builders risk insurance policy for the property. Provide certificate to lender.', 2, 'operations_coordinator', 5, true),
    (tl_5_1_id, 'Obtain title insurance commitment', 'Confirm title insurance commitment is issued and all exceptions are acceptable.', 3, 'attorney_legal', 5, true),
    (tl_5_1_id, 'Review and approve closing statement', 'Review preliminary closing disclosure/HUD-1. Verify purchase price, prorations, and all closing costs.', 4, 'operations_director', 2, true),
    (tl_5_1_id, 'Wire closing funds', 'Arrange wire transfer of equity contribution and closing costs to escrow. Verify wire instructions.', 5, 'accounting', 2, true),
    (tl_5_1_id, 'Confirm lender closing instructions', 'Confirm lender has sent closing instructions and funding authorization to title company.', 6, 'operations_coordinator', 2, true),
    (tl_5_1_id, 'Schedule closing date and time', 'Coordinate closing date with all parties: buyer, seller, title company, lender, and attorneys.', 7, 'operations_coordinator', 3, true),
    (tl_5_1_id, 'Review closing documents in advance', 'Review all closing documents 48 hours before closing. Flag any discrepancies or issues.', 8, 'attorney_legal', 2, true),
    (tl_5_1_id, 'Confirm all contract conditions met', 'Final verification that all contract conditions and contingencies have been satisfied or waived.', 9, 'acquisition_manager', 1, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 6: Closing and Post-Close
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_scattered_acq_id,
        'Closing and Post-Close',
        'Execute closing and complete all post-close setup for project initiation.',
        6, 10, true)
    RETURNING id INTO ms_6_id;

    -- Task List 6.1: Closing Execution (3 tasks)
    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_6_id, 'Closing Execution',
        'Execute the property closing and transfer of ownership.', 1)
    RETURNING id INTO tl_6_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_6_1_id, 'Execute closing documents', 'Sign all closing documents. Verify recording instructions and disbursement authorization.', 1, 'owner_principal', 1, true),
    (tl_6_1_id, 'Confirm recording and funding', 'Verify deed recorded with county. Confirm all funds disbursed per closing statement.', 2, 'operations_coordinator', 2, true),
    (tl_6_1_id, 'Receive recorded deed and title policy', 'Obtain recorded deed and owners title insurance policy. File in entity records.', 3, 'operations_coordinator', 5, true);

    -- Task List 6.2: Post-Close Setup (7 tasks)
    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_6_id, 'Post-Close Setup',
        'Complete post-close tasks to transition from acquisition to construction.', 2)
    RETURNING id INTO tl_6_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_6_2_id, 'Update ATLAS to Closed/Won stage', 'Mark opportunity as Closed/Won in ATLAS. Record actual close date and final purchase price.', 1, 'acquisition_manager', 1, true),
    (tl_6_2_id, 'Create project record in ATLAS', 'Convert opportunity to project. Populate project with floor plan, budget, and timeline information.', 2, 'operations_coordinator', 1, true),
    (tl_6_2_id, 'Set up entity chart of accounts', 'Create COA entries for the SPE entity in accounting system. Set up project cost tracking.', 3, 'accounting', 2, true),
    (tl_6_2_id, 'Record acquisition in accounting', 'Record land acquisition journal entry. Debit land asset, credit cash/loan accounts.', 4, 'accounting', 1, true),
    (tl_6_2_id, 'Assign superintendent and PM', 'Assign construction superintendent and project manager to the new project.', 5, 'operations_director', 2, true),
    (tl_6_2_id, 'Initiate permit application', 'Begin building permit application process with the governing municipality.', 6, 'superintendent', 3, true),
    (tl_6_2_id, 'Schedule pre-construction meeting', 'Schedule pre-construction meeting with superintendent, PM, and key trades to review scope and timeline.', 7, 'operations_coordinator', 3, true);

    -- ========================================================================
    -- WORKFLOW 2: LOT DEVELOPMENT ACQUISITION (4 milestones)
    -- ========================================================================
    INSERT INTO workflow_templates (organization_id, name, description, workflow_type, trigger_event, is_active)
    VALUES (org_id,
        'Lot Development Acquisition',
        'Workflow for acquiring land for subdivision development. Covers feasibility through closing. Module: opportunities, Record Type: lot_development.',
        'opportunity', 'opportunity_created_lot_development', true)
    RETURNING id INTO wf_lotdev_acq_id;

    -- Milestone 1: Feasibility and Site Selection
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_lotdev_acq_id, 'Feasibility and Site Selection',
        'Market analysis, site evaluation, and feasibility study for lot development potential.',
        1, 30, true)
    RETURNING id INTO ld_ms_1_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ld_ms_1_id, 'Market and Site Analysis', 'Evaluate market demand and site suitability for development.', 1)
    RETURNING id INTO ld_tl_1_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (ld_tl_1_1_id, 'Log opportunity and pull parcel data', 'Create opportunity record. Pull acreage, zoning, and ownership data from county records.', 1, 'acquisition_manager', 2, true),
    (ld_tl_1_1_id, 'Conduct market demand analysis', 'Analyze housing demand, absorption rates, and competitive supply in the target market area.', 2, 'sales_market_analyst', 7, true),
    (ld_tl_1_1_id, 'Evaluate zoning and entitlement path', 'Determine current zoning, required rezoning, and timeline for entitlement approvals.', 3, 'site_analyst', 5, true),
    (ld_tl_1_1_id, 'Estimate lot yield and infrastructure costs', 'Develop preliminary lot layout concept. Estimate lot count, road/utility infrastructure costs.', 4, 'site_analyst', 7, true),
    (ld_tl_1_1_id, 'Run development proforma', 'Build comprehensive development proforma with land cost, infrastructure, lot pricing, and projected returns.', 5, 'acquisition_manager', 3, true);

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ld_ms_1_id, 'Viability Decision', 'Final review and approval to proceed with offer.', 2)
    RETURNING id INTO ld_tl_1_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (ld_tl_1_2_id, 'Present feasibility to principals', 'Compile and present feasibility package for principal review and go/no-go decision.', 1, 'acquisition_manager', 2, true),
    (ld_tl_1_2_id, 'Determine offer strategy', 'Based on approval, set offer price, terms, and contingencies for land acquisition.', 2, 'acquisition_manager', 2, true);

    -- Milestone 2: Contract and Entitlement Due Diligence
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_lotdev_acq_id, 'Contract and Entitlement Due Diligence',
        'Contract negotiation, entitlement process, and comprehensive due diligence.',
        2, 60, true)
    RETURNING id INTO ld_ms_2_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ld_ms_2_id, 'Contract Execution', 'Negotiate and execute land purchase contract.', 1)
    RETURNING id INTO ld_tl_2_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (ld_tl_2_1_id, 'Draft and negotiate purchase contract', 'Prepare purchase contract with appropriate DD period and entitlement contingencies.', 1, 'acquisition_manager', 7, true),
    (ld_tl_2_1_id, 'Legal review and execution', 'Attorney review, final negotiations, and contract execution.', 2, 'attorney_legal', 5, true),
    (ld_tl_2_1_id, 'Deliver earnest money and notify team', 'Deliver EMD and set up internal tracking for all DD deadlines.', 3, 'operations_coordinator', 2, true);

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ld_ms_2_id, 'Entitlement and DD Execution', 'Complete entitlement and due diligence activities.', 2)
    RETURNING id INTO ld_tl_2_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (ld_tl_2_2_id, 'Engage civil engineer for preliminary plat', 'Retain civil engineer to develop preliminary plat/site plan with lot layout, roads, and utilities.', 1, 'acquisition_manager', 30, true),
    (ld_tl_2_2_id, 'Submit rezoning application if needed', 'Prepare and submit rezoning application to municipality. Attend public hearings.', 2, 'site_analyst', 45, false),
    (ld_tl_2_2_id, 'Order environmental and geotechnical studies', 'Commission Phase I environmental, wetland delineation, and geotechnical investigation.', 3, 'site_analyst', 21, true),
    (ld_tl_2_2_id, 'Obtain utility commitment letters', 'Get written capacity and willingness-to-serve letters from all utility providers.', 4, 'site_analyst', 14, true),
    (ld_tl_2_2_id, 'Complete title and survey review', 'Review boundary survey, title commitment, and resolve any exceptions.', 5, 'attorney_legal', 14, true);

    -- Milestone 3: Financing
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_lotdev_acq_id, 'Financing',
        'Secure development and construction financing.',
        3, 30, true)
    RETURNING id INTO ld_ms_3_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ld_ms_3_id, 'Development Financing', 'Assemble and submit development loan package.', 1)
    RETURNING id INTO ld_tl_3_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (ld_tl_3_1_id, 'Prepare development budget and proforma', 'Create detailed development budget with phasing and draw schedule.', 1, 'operations_director', 5, true),
    (ld_tl_3_1_id, 'Submit loan package to lender', 'Compile and submit complete financing package to development lender.', 2, 'operations_director', 2, true),
    (ld_tl_3_1_id, 'Satisfy lender conditions and receive commitment', 'Address underwriting conditions. Receive and review loan commitment.', 3, 'operations_director', 21, true);

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ld_ms_3_id, 'Investor Coordination', 'Coordinate with investors if applicable.', 2)
    RETURNING id INTO ld_tl_3_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (ld_tl_3_2_id, 'Prepare investor package and operating agreement', 'If investor capital needed, prepare investment summary and operating agreement.', 1, 'owner_principal', 10, false),
    (ld_tl_3_2_id, 'Secure investor commitments', 'Obtain signed subscription agreements and capital commitments.', 2, 'owner_principal', 14, false);

    -- Milestone 4: Closing and Post-Close
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_lotdev_acq_id, 'Closing and Post-Close',
        'Execute land closing and initiate development project.',
        4, 14, true)
    RETURNING id INTO ld_ms_4_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ld_ms_4_id, 'Closing Execution', 'Execute land closing and transfer.', 1)
    RETURNING id INTO ld_tl_4_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (ld_tl_4_1_id, 'Review and execute closing documents', 'Review closing statement, sign documents, and fund closing.', 1, 'owner_principal', 2, true),
    (ld_tl_4_1_id, 'Confirm recording and insurance', 'Verify deed recording and title insurance policy issuance.', 2, 'operations_coordinator', 3, true);

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ld_ms_4_id, 'Post-Close Development Setup', 'Set up development project tracking.', 2)
    RETURNING id INTO ld_tl_4_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (ld_tl_4_2_id, 'Create development project in ATLAS', 'Convert opportunity to project with lot inventory, phasing, and budget.', 1, 'operations_coordinator', 2, true),
    (ld_tl_4_2_id, 'Set up entity accounting', 'Create SPE chart of accounts and project cost tracking.', 2, 'accounting', 2, true),
    (ld_tl_4_2_id, 'Engage civil engineer for construction documents', 'Commission final construction documents for infrastructure.', 3, 'operations_director', 5, true);

    -- ========================================================================
    -- WORKFLOW 3: LOT PURCHASE ACQUISITION (3 milestones)
    -- ========================================================================
    INSERT INTO workflow_templates (organization_id, name, description, workflow_type, trigger_event, is_active)
    VALUES (org_id,
        'Lot Purchase Acquisition',
        'Streamlined workflow for purchasing improved/finished lots. Module: opportunities, Record Type: lot_purchase.',
        'opportunity', 'opportunity_created_lot_purchase', true)
    RETURNING id INTO wf_lotpur_acq_id;

    -- Milestone 1: Lot Evaluation and Offer
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_lotpur_acq_id, 'Lot Evaluation and Offer',
        'Evaluate improved lot, analyze deal, and submit offer.',
        1, 14, true)
    RETURNING id INTO lp_ms_1_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (lp_ms_1_id, 'Lot Analysis', 'Evaluate lot suitability and run deal analysis.', 1)
    RETURNING id INTO lp_tl_1_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (lp_tl_1_1_id, 'Log opportunity and pull lot data', 'Create record with lot dimensions, HOA info, and available utilities.', 1, 'acquisition_manager', 1, true),
    (lp_tl_1_1_id, 'Evaluate floor plan fit and site conditions', 'Determine best-fit floor plan based on lot dimensions and restrictions.', 2, 'site_analyst', 2, true),
    (lp_tl_1_1_id, 'Pull comps and run deal analysis', 'Research comps and complete deal analysis in ATLAS.', 3, 'acquisition_manager', 2, true),
    (lp_tl_1_1_id, 'Get principal approval and submit offer', 'Present deal to principal, get approval, submit offer.', 4, 'acquisition_manager', 3, true);

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (lp_ms_1_id, 'Contract Execution', 'Negotiate and execute purchase agreement.', 2)
    RETURNING id INTO lp_tl_1_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (lp_tl_1_2_id, 'Negotiate and execute contract', 'Handle negotiations and get contract fully executed.', 1, 'acquisition_manager', 5, true),
    (lp_tl_1_2_id, 'Deliver EMD and update ATLAS', 'Deliver earnest money and update opportunity stage.', 2, 'operations_coordinator', 2, true);

    -- Milestone 2: Due Diligence and Verification
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_lotpur_acq_id, 'Due Diligence and Verification',
        'Verify lot conditions, utilities, and buildability during DD period.',
        2, 21, true)
    RETURNING id INTO lp_ms_2_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (lp_ms_2_id, 'Verification Activities', 'Complete lot verification and DD.', 1)
    RETURNING id INTO lp_tl_2_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (lp_tl_2_1_id, 'Review lot survey and plat', 'Review existing survey/plat. Order new survey if needed.', 1, 'site_analyst', 7, true),
    (lp_tl_2_1_id, 'Verify HOA restrictions and ARC requirements', 'Review HOA covenants, architectural review requirements, and approval process.', 2, 'site_analyst', 5, true),
    (lp_tl_2_1_id, 'Confirm utility connections', 'Verify all utility connections are available and confirm tap fee status.', 3, 'site_analyst', 5, true),
    (lp_tl_2_1_id, 'Review title commitment', 'Review title for any issues. Clear exceptions with seller.', 4, 'attorney_legal', 7, true),
    (lp_tl_2_1_id, 'Finalize plan selection and waive DD', 'Lock floor plan, confirm budget, and waive DD contingency.', 5, 'acquisition_manager', 2, true);

    -- Milestone 3: Closing
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_lotpur_acq_id, 'Closing and Post-Close',
        'Close lot purchase and set up for construction.',
        3, 10, true)
    RETURNING id INTO lp_ms_3_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (lp_ms_3_id, 'Pre-Closing and Closing', 'Complete pre-closing and execute closing.', 1)
    RETURNING id INTO lp_tl_3_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (lp_tl_3_1_id, 'Arrange financing and insurance', 'Secure lot financing if needed. Bind builders risk insurance.', 1, 'operations_coordinator', 5, true),
    (lp_tl_3_1_id, 'Review closing statement and fund', 'Review closing docs, wire funds, and execute closing.', 2, 'operations_director', 2, true),
    (lp_tl_3_1_id, 'Confirm recording', 'Verify deed recorded and title policy issued.', 3, 'operations_coordinator', 3, true);

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (lp_ms_3_id, 'Post-Close Setup', 'Set up project for construction.', 2)
    RETURNING id INTO lp_tl_3_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (lp_tl_3_2_id, 'Convert to project in ATLAS', 'Create project record from opportunity with full budget and timeline.', 1, 'operations_coordinator', 1, true),
    (lp_tl_3_2_id, 'Set up accounting and assign team', 'Create COA, record acquisition, and assign superintendent.', 2, 'accounting', 2, true),
    (lp_tl_3_2_id, 'Initiate permit and pre-construction', 'Submit permit application and schedule pre-construction meeting.', 3, 'superintendent', 3, true);

    -- ========================================================================
    -- WORKFLOW 4: SCATTERED LOT PROJECT (3 milestones)
    -- ========================================================================
    INSERT INTO workflow_templates (organization_id, name, description, workflow_type, trigger_event, is_active)
    VALUES (org_id,
        'Scattered Lot Project',
        'Post-acquisition project workflow for scattered lot construction. Covers pre-construction through warranty. Module: projects, Record Type: scattered_lot.',
        'project', 'project_created_scattered_lot', true)
    RETURNING id INTO wf_scattered_proj_id;

    -- Milestone 1: Pre-Construction
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_scattered_proj_id, 'Pre-Construction Setup',
        'Complete all pre-construction activities before vertical construction begins.',
        1, 30, true)
    RETURNING id INTO sp_ms_1_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (sp_ms_1_id, 'Permitting and Plans', 'Obtain permits and finalize construction documents.', 1)
    RETURNING id INTO sp_tl_1_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (sp_tl_1_1_id, 'Submit building permit application', 'Submit complete permit package to municipality with plans, site plan, and fees.', 1, 'superintendent', 2, true),
    (sp_tl_1_1_id, 'Order structural engineering if needed', 'Commission structural engineering for non-standard conditions.', 2, 'superintendent', 7, false),
    (sp_tl_1_1_id, 'Obtain building permit', 'Follow up on permit review. Address any plan review comments. Receive approved permit.', 3, 'superintendent', 21, true),
    (sp_tl_1_1_id, 'Submit for HOA/ARC approval if applicable', 'Submit architectural plans to HOA architectural review committee.', 4, 'superintendent', 14, false);

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (sp_ms_1_id, 'Construction Planning', 'Set up construction budget, schedule, and vendors.', 2)
    RETURNING id INTO sp_tl_1_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (sp_tl_1_2_id, 'Create detailed construction budget', 'Build line-item construction budget by trade category in ATLAS.', 1, 'superintendent', 3, true),
    (sp_tl_1_2_id, 'Issue POs to trades', 'Create and issue purchase orders to all trade vendors for the project.', 2, 'superintendent', 5, true),
    (sp_tl_1_2_id, 'Build construction schedule', 'Create project schedule using schedule template with actual dates.', 3, 'superintendent', 2, true),
    (sp_tl_1_2_id, 'Hold pre-construction meeting', 'Meet with key trades to review scope, schedule, and site logistics.', 4, 'superintendent', 1, true),
    (sp_tl_1_2_id, 'Order materials for Phase 1-3', 'Place orders for dumpster, portable toilet, foundation, and lumber materials.', 5, 'superintendent', 3, true);

    -- Milestone 2: Construction Execution
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_scattered_proj_id, 'Construction Execution',
        'Active construction from site work through punch list. Managed through 16-phase milestone system.',
        2, 125, true)
    RETURNING id INTO sp_ms_2_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (sp_ms_2_id, 'Construction Management', 'Ongoing construction management activities.', 1)
    RETURNING id INTO sp_tl_2_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (sp_tl_2_1_id, 'Manage construction through 16-phase milestones', 'Track progress through all 16 construction phases using ATLAS milestone system.', 1, 'superintendent', 125, true),
    (sp_tl_2_1_id, 'Process draw requests monthly', 'Submit construction draw requests to lender with progress documentation.', 2, 'operations_coordinator', 120, true),
    (sp_tl_2_1_id, 'Manage change orders and budget variance', 'Track and approve change orders. Monitor budget variance and report exceptions.', 3, 'superintendent', 125, true),
    (sp_tl_2_1_id, 'Schedule and pass all required inspections', 'Coordinate all municipal inspections per schedule template requirements.', 4, 'superintendent', 125, true),
    (sp_tl_2_1_id, 'Obtain Certificate of Occupancy', 'Pass final inspection and receive CO from municipality.', 5, 'superintendent', 1, true);

    -- Milestone 3: Close-Out and Sale
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_scattered_proj_id, 'Close-Out and Sale',
        'Project close-out, sale, and warranty initiation.',
        3, 30, true)
    RETURNING id INTO sp_ms_3_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (sp_ms_3_id, 'Project Close-Out', 'Finalize construction and close out project.', 1)
    RETURNING id INTO sp_tl_3_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (sp_tl_3_1_id, 'Complete punch list and final clean', 'Address all punch list items. Complete final construction clean.', 1, 'superintendent', 5, true),
    (sp_tl_3_1_id, 'Collect all lien waivers', 'Obtain final unconditional lien waivers from all trades and suppliers.', 2, 'operations_coordinator', 7, true),
    (sp_tl_3_1_id, 'Compile warranty package', 'Assemble manufacturer warranties, trade warranties, and builder warranty documents.', 3, 'operations_coordinator', 3, true),
    (sp_tl_3_1_id, 'Final budget reconciliation', 'Reconcile all costs, process final invoices, and close out budget in ATLAS.', 4, 'accounting', 5, true);

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (sp_ms_3_id, 'Sale and Transfer', 'Complete sale and transfer to buyer.', 2)
    RETURNING id INTO sp_tl_3_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (sp_tl_3_2_id, 'Coordinate with listing agent/buyer', 'Manage sale process with listing agent or direct buyer.', 1, 'sales_market_analyst', 14, true),
    (sp_tl_3_2_id, 'Review buyer contract and appraisal', 'Review purchase contract terms and support appraisal process.', 2, 'operations_director', 7, true),
    (sp_tl_3_2_id, 'Complete closing and transfer', 'Execute sale closing. Transfer warranties and home documentation to buyer.', 3, 'operations_coordinator', 2, true),
    (sp_tl_3_2_id, 'Record sale in accounting', 'Record home sale revenue, COGS, and close out project accounting.', 4, 'accounting', 2, true),
    (sp_tl_3_2_id, 'Initiate warranty period tracking', 'Set warranty start date in ATLAS. Configure warranty claim tracking.', 5, 'operations_coordinator', 1, true),
    (sp_tl_3_2_id, 'Pay off construction loan', 'Coordinate construction loan payoff with lender from sale proceeds.', 6, 'accounting', 3, true),
    (sp_tl_3_2_id, 'Final investor distribution if applicable', 'Calculate and distribute returns to investors per operating agreement waterfall.', 7, 'accounting', 5, false);

    RAISE NOTICE 'Successfully seeded 4 workflow templates with milestones, task lists, and tasks for organization %', org_id;
END $$;
