-- ============================================================================
-- Migration 019: Seed Disposition Workflow Templates
-- ATLAS Platform - Red Cedar Homes
-- Seeds a disposition/listing lifecycle workflow with 5 milestones
-- ============================================================================

DO $$
DECLARE
    org_id UUID;
    wf_dispo_id UUID;
    -- Milestones
    ms_1_id UUID; ms_2_id UUID; ms_3_id UUID; ms_4_id UUID; ms_5_id UUID;
    -- Task lists (one per milestone)
    tl_1_id UUID; tl_2_id UUID; tl_3_id UUID; tl_4_id UUID; tl_5_id UUID;
BEGIN
    -- Get the default organization
    SELECT id INTO org_id FROM organizations WHERE name = 'Red Cedar Homes' LIMIT 1;
    IF org_id IS NULL THEN
        INSERT INTO organizations (name) VALUES ('Red Cedar Homes') RETURNING id INTO org_id;
    END IF;

    -- ========================================================================
    -- WORKFLOW: DISPOSITION — LISTING LIFECYCLE
    -- ========================================================================
    INSERT INTO workflow_templates (organization_id, name, description, workflow_type, trigger_event, is_active)
    VALUES (org_id,
        'Disposition — Listing Lifecycle',
        'End-to-end workflow for selling a property: pre-listing prep through closing and post-close. Module: disposition, Record Type: listing.',
        'closing', 'listing_created', true)
    RETURNING id INTO wf_dispo_id;

    -- ----------------------------------------------------------------
    -- MILESTONE 1: Pre-Listing Preparation
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_dispo_id,
        'Pre-Listing Preparation',
        'Prepare the property for market: photos, pricing, marketing materials, and MLS entry.',
        1, 14, true)
    RETURNING id INTO ms_1_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_1_id, 'Listing Setup', 'Prepare all materials and systems for going active on market.', 1)
    RETURNING id INTO tl_1_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_1_id, 'Order photos', 'Schedule professional photography and drone shots. Ensure property is staged and clean before shoot.', 1, 'listing_agent', 2, true),
    (tl_1_id, 'Write marketing description', 'Draft compelling property description highlighting key features, upgrades, and neighborhood amenities.', 2, 'listing_agent', 2, true),
    (tl_1_id, 'Set list price', 'Perform CMA, review comps, and set competitive list price. Get seller approval on pricing strategy.', 3, 'listing_agent', 2, true),
    (tl_1_id, 'Prepare showing instructions', 'Document access instructions, lockbox code, alarm codes, pet info, and any showing restrictions.', 4, 'listing_agent', 1, true),
    (tl_1_id, 'Install sign and lockbox', 'Place yard sign, directional signs if applicable, and install electronic lockbox.', 5, 'listing_agent', 1, true),
    (tl_1_id, 'Enter MLS listing', 'Input all property data into MLS. Upload photos, disclosures, and documents. Set to Coming Soon or Active.', 6, 'listing_agent', 1, true),
    (tl_1_id, 'Create flyer', 'Design and print property flyers for open houses and agent distribution.', 7, 'listing_agent', 2, false),
    (tl_1_id, 'Notify agent network', 'Send new listing announcement to broker network, top agents, and buyer agents with active clients.', 8, 'listing_agent', 1, false);

    -- ----------------------------------------------------------------
    -- MILESTONE 2: Active Marketing
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_dispo_id,
        'Active Marketing',
        'Property is live on market. Monitor activity, gather feedback, and adjust strategy as needed.',
        2, 30, true)
    RETURNING id INTO ms_2_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_2_id, 'Marketing Monitoring', 'Track listing performance and adjust marketing strategy.', 1)
    RETURNING id INTO tl_2_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_2_id, 'Confirm MLS active', 'Verify listing is active in MLS, syndicating to Zillow/Realtor.com/Redfin, and displaying correctly.', 1, 'listing_agent', 1, true),
    (tl_2_id, 'Schedule open house', 'Plan and promote first open house. Coordinate staging, refreshments, and sign-in sheets.', 2, 'listing_agent', 3, false),
    (tl_2_id, 'Monitor showing feedback', 'Collect and review feedback from all showings. Note recurring concerns or positive reactions.', 3, 'listing_agent', 7, true),
    (tl_2_id, 'Review weekly activity report', 'Analyze showing count, online views, saved searches, and inquiry volume for the week.', 4, 'listing_agent', 7, true),
    (tl_2_id, 'Evaluate price position', '14-day check: compare DOM and activity to competing listings. Recommend price adjustment if needed.', 5, 'listing_agent', 14, true),
    (tl_2_id, 'Update marketing if needed', 'Refresh photos, adjust description, add virtual tour, or boost social media ads based on feedback.', 6, 'listing_agent', 14, false);

    -- ----------------------------------------------------------------
    -- MILESTONE 3: Offer and Negotiation
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_dispo_id,
        'Offer and Negotiation',
        'Receive, evaluate, and negotiate offers. Execute contract and collect earnest money.',
        3, 10, true)
    RETURNING id INTO ms_3_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_3_id, 'Offer Processing', 'Review, negotiate, and execute an offer to purchase.', 1)
    RETURNING id INTO tl_3_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_3_id, 'Review offer terms', 'Analyze price, financing, contingencies, closing timeline, and special conditions of the offer.', 1, 'listing_agent', 1, true),
    (tl_3_id, 'Calculate net to seller', 'Run net sheet: sale price minus commissions, closing costs, prorations, and outstanding liens.', 2, 'listing_agent', 1, true),
    (tl_3_id, 'Present offer to seller', 'Present full offer analysis to seller with recommendation. Discuss strengths, risks, and alternatives.', 3, 'listing_agent', 1, true),
    (tl_3_id, 'Prepare counter if needed', 'Draft counter-offer addressing price, terms, or contingency modifications per seller direction.', 4, 'listing_agent', 1, false),
    (tl_3_id, 'Negotiate terms', 'Manage back-and-forth negotiation between parties until agreement or rejection.', 5, 'listing_agent', 3, true),
    (tl_3_id, 'Accept or reject offer', 'Execute acceptance or communicate rejection. Ensure all parties have signed copies.', 6, 'listing_agent', 1, true),
    (tl_3_id, 'Collect earnest money', 'Verify earnest money deposit is delivered to escrow within contract deadline.', 7, 'listing_agent', 3, true),
    (tl_3_id, 'Open escrow', 'Deliver executed contract to title company. Confirm escrow is opened and timeline is set.', 8, 'listing_agent', 2, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 4: Under Contract to Close
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_dispo_id,
        'Under Contract to Close',
        'Manage all contract contingencies, inspections, appraisal, financing, and prepare for closing.',
        4, 30, true)
    RETURNING id INTO ms_4_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_4_id, 'Contract Management', 'Monitor and clear all contingencies through to closing.', 1)
    RETURNING id INTO tl_4_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_4_id, 'Confirm earnest money received', 'Verify with title company that earnest money has been deposited and cleared.', 1, 'listing_agent', 2, true),
    (tl_4_id, 'Schedule inspection', 'Coordinate buyer inspection access. Prepare property and ensure utilities are on.', 2, 'listing_agent', 5, true),
    (tl_4_id, 'Review inspection results', 'Review inspection report. Negotiate repair requests or credits with buyer agent.', 3, 'listing_agent', 3, true),
    (tl_4_id, 'Order appraisal', 'Confirm lender has ordered appraisal. Provide comps and property info to appraiser if requested.', 4, 'listing_agent', 7, true),
    (tl_4_id, 'Monitor financing status', 'Track loan progress: underwriting, conditions, and clear-to-close status with buyer agent and lender.', 5, 'listing_agent', 14, true),
    (tl_4_id, 'Order title work', 'Confirm title search is ordered and review preliminary title commitment for any issues.', 6, 'listing_agent', 7, true),
    (tl_4_id, 'Schedule final walk-through', 'Coordinate final walk-through 24-48 hours before closing. Ensure all agreed repairs are complete.', 7, 'listing_agent', 1, true),
    (tl_4_id, 'Confirm clear to close', 'Verify all contingencies cleared: financing approved, appraisal accepted, title clear, inspections resolved.', 8, 'listing_agent', 1, true),
    (tl_4_id, 'Schedule closing', 'Confirm closing date, time, and location with all parties. Distribute settlement statement for review.', 9, 'listing_agent', 2, true);

    -- ----------------------------------------------------------------
    -- MILESTONE 5: Closing and Post-Close
    -- ----------------------------------------------------------------
    INSERT INTO milestone_templates (workflow_template_id, name, description, sequence, duration_days, is_required)
    VALUES (wf_dispo_id,
        'Closing and Post-Close',
        'Execute closing, confirm funding, and complete all post-closing tasks.',
        5, 7, true)
    RETURNING id INTO ms_5_id;

    INSERT INTO task_list_templates (milestone_template_id, name, description, sequence)
    VALUES (ms_5_id, 'Closing Execution', 'Complete the closing and all post-close administrative tasks.', 1)
    RETURNING id INTO tl_5_id;

    INSERT INTO task_templates (task_list_template_id, name, description, sequence, default_assignee_role, duration_days, is_required) VALUES
    (tl_5_id, 'Attend closing', 'Attend or coordinate closing. Ensure all documents are properly executed and notarized.', 1, 'listing_agent', 1, true),
    (tl_5_id, 'Confirm funding', 'Verify buyer funds have been disbursed and seller proceeds are wired or issued.', 2, 'listing_agent', 1, true),
    (tl_5_id, 'Record deed', 'Confirm deed and mortgage are recorded with the county. Obtain recording references.', 3, 'listing_agent', 2, true),
    (tl_5_id, 'Confirm wire received', 'Verify seller net proceeds wire has been received in the designated account.', 4, 'listing_agent', 1, true),
    (tl_5_id, 'Remove sign and lockbox', 'Remove yard sign, directional signs, and electronic lockbox from property.', 5, 'listing_agent', 2, true),
    (tl_5_id, 'Update MLS to sold', 'Change MLS status to Sold/Closed with final sale price and closing date.', 6, 'listing_agent', 1, true),
    (tl_5_id, 'Archive documents', 'Upload all closing documents, contracts, and disclosures to project document archive.', 7, 'listing_agent', 3, true),
    (tl_5_id, 'Send closing package to accounting', 'Deliver settlement statement, commission receipts, and wire confirmation to accounting team.', 8, 'listing_agent', 2, true);

    RAISE NOTICE 'Disposition workflow template seeded: % (5 milestones, 5 task lists, 39 tasks)', wf_dispo_id;
END
$$;
