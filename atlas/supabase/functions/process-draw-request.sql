-- ============================================================================
-- Function: process_draw_request
-- ATLAS Platform - Red Cedar Homes
--
-- When a construction draw is approved, this function:
-- 1. Creates a lender draw request record (loan_draws)
-- 2. Updates the project budget actuals from draw line items
-- 3. Creates an AR journal entry in the entity's accounting
-- 4. Updates the loan's drawn/available amounts
--
-- Parameters:
--   p_loan_id           - The loan to draw against
--   p_draw_amount       - Total draw amount
--   p_draw_date         - Date of the draw
--   p_description       - Description of the draw
--   p_project_id        - Associated project
--   p_approved_by       - User who approved
-- ============================================================================

CREATE OR REPLACE FUNCTION process_draw_request(
    p_loan_id UUID,
    p_draw_amount NUMERIC,
    p_draw_date DATE DEFAULT CURRENT_DATE,
    p_description TEXT DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_approved_by UUID DEFAULT NULL
)
RETURNS TABLE (
    draw_id UUID,
    loan_draw_number INTEGER,
    new_amount_drawn NUMERIC,
    new_amount_available NUMERIC,
    batch_id UUID,
    status TEXT
) AS $$
DECLARE
    v_loan RECORD;
    v_draw_id UUID;
    v_draw_number INTEGER;
    v_batch_id UUID;
    v_entity_id UUID;
    v_period TEXT;
    v_cash_account UUID;
    v_loan_payable_account UUID;
    v_new_drawn NUMERIC;
    v_new_available NUMERIC;
BEGIN
    -- ---------------------------------------------------------------
    -- 1. Validate the loan
    -- ---------------------------------------------------------------
    SELECT *
    INTO v_loan
    FROM loans
    WHERE id = p_loan_id;

    IF v_loan IS NULL THEN
        draw_id := NULL;
        loan_draw_number := 0;
        new_amount_drawn := 0;
        new_amount_available := 0;
        batch_id := NULL;
        status := 'error: loan not found';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_loan.status NOT IN ('active', 'pending') THEN
        draw_id := NULL;
        loan_draw_number := 0;
        new_amount_drawn := COALESCE(v_loan.amount_drawn, 0);
        new_amount_available := COALESCE(v_loan.amount_available, 0);
        batch_id := NULL;
        status := 'error: loan status is ' || v_loan.status;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Validate draw amount doesn't exceed available
    IF p_draw_amount > COALESCE(v_loan.amount_available, v_loan.original_amount - COALESCE(v_loan.amount_drawn, 0)) THEN
        draw_id := NULL;
        loan_draw_number := 0;
        new_amount_drawn := COALESCE(v_loan.amount_drawn, 0);
        new_amount_available := COALESCE(v_loan.amount_available, 0);
        batch_id := NULL;
        status := 'error: draw amount exceeds available balance';
        RETURN NEXT;
        RETURN;
    END IF;

    IF p_draw_amount <= 0 THEN
        draw_id := NULL;
        loan_draw_number := 0;
        new_amount_drawn := COALESCE(v_loan.amount_drawn, 0);
        new_amount_available := COALESCE(v_loan.amount_available, 0);
        batch_id := NULL;
        status := 'error: draw amount must be positive';
        RETURN NEXT;
        RETURN;
    END IF;

    v_entity_id := v_loan.entity_id;
    v_period := TO_CHAR(p_draw_date, 'YYYY-MM');
    v_batch_id := gen_random_uuid();

    -- ---------------------------------------------------------------
    -- 2. Determine next draw number
    -- ---------------------------------------------------------------
    SELECT COALESCE(MAX(ld.draw_number), 0) + 1
    INTO v_draw_number
    FROM loan_draws ld
    WHERE ld.loan_id = p_loan_id;

    -- ---------------------------------------------------------------
    -- 3. Create the loan draw record
    -- ---------------------------------------------------------------
    INSERT INTO loan_draws (
        loan_id,
        draw_number,
        amount,
        draw_date,
        description,
        linked_construction_draw,
        status
    ) VALUES (
        p_loan_id,
        v_draw_number,
        p_draw_amount,
        p_draw_date,
        COALESCE(p_description, 'Draw #' || v_draw_number),
        p_project_id::TEXT,
        'funded'
    )
    RETURNING id INTO v_draw_id;

    -- ---------------------------------------------------------------
    -- 4. Update loan amounts
    -- ---------------------------------------------------------------
    v_new_drawn := COALESCE(v_loan.amount_drawn, 0) + p_draw_amount;
    v_new_available := COALESCE(v_loan.original_amount, 0) - v_new_drawn;

    UPDATE loans
    SET amount_drawn = v_new_drawn,
        amount_available = v_new_available,
        status = CASE
            WHEN v_new_available <= 0 THEN 'drawn_in_full'
            WHEN status = 'pending' THEN 'active'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_loan_id;

    -- ---------------------------------------------------------------
    -- 5. Create journal entries (Debit Cash, Credit Loan Payable)
    -- ---------------------------------------------------------------
    -- Find cash account
    SELECT coa.id INTO v_cash_account
    FROM chart_of_accounts coa
    WHERE coa.entity_id = v_entity_id
      AND coa.account_type = 'asset'
      AND (coa.account_name ILIKE '%cash%'
           OR coa.account_name ILIKE '%checking%'
           OR coa.account_number LIKE '1000%'
           OR coa.account_number LIKE '1100%')
      AND coa.is_active = TRUE
    ORDER BY coa.account_number ASC
    LIMIT 1;

    -- Find loan payable account
    SELECT coa.id INTO v_loan_payable_account
    FROM chart_of_accounts coa
    WHERE coa.entity_id = v_entity_id
      AND coa.account_type = 'liability'
      AND (coa.account_name ILIKE '%loan%payable%'
           OR coa.account_name ILIKE '%construction%loan%'
           OR coa.account_name ILIKE '%notes%payable%')
      AND coa.is_active = TRUE
    ORDER BY coa.account_number ASC
    LIMIT 1;

    -- Only create journal entries if both accounts exist
    IF v_cash_account IS NOT NULL AND v_loan_payable_account IS NOT NULL THEN
        -- Debit: Cash (asset increases)
        INSERT INTO transactions (
            entity_id,
            date,
            description,
            account_id,
            debit,
            credit,
            project_id,
            transaction_type,
            status,
            period,
            batch_id,
            reference_number
        ) VALUES (
            v_entity_id,
            p_draw_date,
            'Construction draw #' || v_draw_number || ' - ' || COALESCE(p_description, 'Loan draw'),
            v_cash_account,
            p_draw_amount,
            0,
            p_project_id,
            'receipt',
            'posted',
            v_period,
            v_batch_id,
            'DRAW-' || v_draw_number
        );

        -- Credit: Loan Payable (liability increases)
        INSERT INTO transactions (
            entity_id,
            date,
            description,
            account_id,
            debit,
            credit,
            project_id,
            transaction_type,
            status,
            period,
            batch_id,
            reference_number
        ) VALUES (
            v_entity_id,
            p_draw_date,
            'Construction draw #' || v_draw_number || ' - ' || COALESCE(p_description, 'Loan draw'),
            v_loan_payable_account,
            0,
            p_draw_amount,
            p_project_id,
            'receipt',
            'posted',
            v_period,
            v_batch_id,
            'DRAW-' || v_draw_number
        );
    END IF;

    -- ---------------------------------------------------------------
    -- 6. Update project actuals if linked
    -- ---------------------------------------------------------------
    IF p_project_id IS NOT NULL THEN
        UPDATE projects
        SET actual_total_cost = COALESCE(actual_total_cost, 0) + p_draw_amount,
            budget_variance = COALESCE(budget_total, 0) - (COALESCE(actual_total_cost, 0) + p_draw_amount),
            updated_at = NOW()
        WHERE id = p_project_id;
    END IF;

    -- ---------------------------------------------------------------
    -- 7. Create activity log
    -- ---------------------------------------------------------------
    INSERT INTO activity_log (
        organization_id,
        user_id,
        record_type,
        record_id,
        action,
        description,
        metadata
    )
    SELECT
        (SELECT organization_id FROM entities WHERE id = v_entity_id LIMIT 1),
        p_approved_by,
        'loan',
        p_loan_id,
        'draw_processed',
        'Construction draw #' || v_draw_number || ' for $' || p_draw_amount::TEXT || ' processed',
        jsonb_build_object(
            'draw_id', v_draw_id,
            'draw_number', v_draw_number,
            'amount', p_draw_amount,
            'project_id', p_project_id,
            'new_drawn', v_new_drawn,
            'new_available', v_new_available
        );

    -- ---------------------------------------------------------------
    -- 8. Return results
    -- ---------------------------------------------------------------
    draw_id := v_draw_id;
    loan_draw_number := v_draw_number;
    new_amount_drawn := v_new_drawn;
    new_amount_available := v_new_available;
    batch_id := v_batch_id;
    status := 'success';
    RETURN NEXT;

    RETURN;
END;
$$ LANGUAGE plpgsql;
