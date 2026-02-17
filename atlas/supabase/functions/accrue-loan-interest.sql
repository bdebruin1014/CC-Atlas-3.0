-- ============================================================================
-- Function: accrue_loan_interest
-- ATLAS Platform - Red Cedar Homes
--
-- Monthly interest accrual for all active loans.
-- For each active loan:
-- 1. Calculate monthly interest based on the outstanding balance
-- 2. Create a journal entry (debit interest expense, credit accrued interest)
-- 3. Update the loan's accrued_interest total
--
-- Intended to be called monthly via pg_cron or similar scheduler.
-- ============================================================================

CREATE OR REPLACE FUNCTION accrue_loan_interest(
    p_accrual_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    loan_id UUID,
    entity_id UUID,
    interest_amount NUMERIC,
    batch_id UUID,
    status TEXT
) AS $$
DECLARE
    v_loan RECORD;
    v_monthly_interest NUMERIC;
    v_batch_id UUID;
    v_period TEXT;
    v_interest_expense_account UUID;
    v_accrued_interest_account UUID;
BEGIN
    v_period := TO_CHAR(p_accrual_date, 'YYYY-MM');

    FOR v_loan IN
        SELECT
            l.id,
            l.entity_id,
            l.original_amount,
            l.amount_drawn,
            l.interest_rate,
            l.interest_type,
            l.accrued_interest,
            l.status AS loan_status
        FROM loans l
        WHERE l.status IN ('active', 'drawn_in_full')
          AND l.interest_rate IS NOT NULL
          AND l.interest_rate > 0
    LOOP
        BEGIN
            -- Calculate monthly interest on the drawn amount
            -- Simple interest: drawn_amount * (rate / 100) / 12
            v_monthly_interest := ROUND(
                COALESCE(v_loan.amount_drawn, 0) *
                (v_loan.interest_rate / 100.0) /
                12.0,
                2
            );

            -- Skip if zero interest
            IF v_monthly_interest <= 0 THEN
                loan_id := v_loan.id;
                entity_id := v_loan.entity_id;
                interest_amount := 0;
                batch_id := NULL;
                status := 'skipped_zero_balance';
                RETURN NEXT;
                CONTINUE;
            END IF;

            -- Generate a batch ID for this journal entry pair
            v_batch_id := gen_random_uuid();

            -- Find or default the interest expense account
            SELECT coa.id INTO v_interest_expense_account
            FROM chart_of_accounts coa
            WHERE coa.entity_id = v_loan.entity_id
              AND coa.account_type = 'expense'
              AND coa.account_name ILIKE '%interest%expense%'
              AND coa.is_active = TRUE
            LIMIT 1;

            -- Find or default the accrued interest liability account
            SELECT coa.id INTO v_accrued_interest_account
            FROM chart_of_accounts coa
            WHERE coa.entity_id = v_loan.entity_id
              AND coa.account_type = 'liability'
              AND (coa.account_name ILIKE '%accrued%interest%'
                   OR coa.account_name ILIKE '%interest%payable%')
              AND coa.is_active = TRUE
            LIMIT 1;

            -- If accounts don't exist, skip with error
            IF v_interest_expense_account IS NULL OR v_accrued_interest_account IS NULL THEN
                loan_id := v_loan.id;
                entity_id := v_loan.entity_id;
                interest_amount := v_monthly_interest;
                batch_id := NULL;
                status := 'skipped_no_accounts';
                RETURN NEXT;
                CONTINUE;
            END IF;

            -- Create journal entry: Debit Interest Expense
            INSERT INTO transactions (
                entity_id,
                date,
                description,
                account_id,
                debit,
                credit,
                transaction_type,
                status,
                period,
                is_adjusting_entry,
                batch_id
            ) VALUES (
                v_loan.entity_id,
                p_accrual_date,
                'Monthly interest accrual - Loan ' || v_loan.id::TEXT,
                v_interest_expense_account,
                v_monthly_interest,
                0,
                'journal_entry',
                'posted',
                v_period,
                FALSE,
                v_batch_id
            );

            -- Create journal entry: Credit Accrued Interest (Liability)
            INSERT INTO transactions (
                entity_id,
                date,
                description,
                account_id,
                debit,
                credit,
                transaction_type,
                status,
                period,
                is_adjusting_entry,
                batch_id
            ) VALUES (
                v_loan.entity_id,
                p_accrual_date,
                'Monthly interest accrual - Loan ' || v_loan.id::TEXT,
                v_accrued_interest_account,
                0,
                v_monthly_interest,
                'journal_entry',
                'posted',
                v_period,
                FALSE,
                v_batch_id
            );

            -- Update loan accrued_interest
            UPDATE loans
            SET accrued_interest = COALESCE(accrued_interest, 0) + v_monthly_interest,
                updated_at = NOW()
            WHERE id = v_loan.id;

            -- Return success row
            loan_id := v_loan.id;
            entity_id := v_loan.entity_id;
            interest_amount := v_monthly_interest;
            batch_id := v_batch_id;
            status := 'accrued';
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue processing other loans
            loan_id := v_loan.id;
            entity_id := v_loan.entity_id;
            interest_amount := v_monthly_interest;
            batch_id := NULL;
            status := 'error: ' || SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Optional: pg_cron schedule (run on 1st of each month)
-- Uncomment if pg_cron is available:
--
-- SELECT cron.schedule(
--     'monthly-loan-interest-accrual',
--     '0 2 1 * *',
--     $$SELECT * FROM accrue_loan_interest()$$
-- );
-- ============================================================================
