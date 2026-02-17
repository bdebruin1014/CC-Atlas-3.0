-- ============================================================================
-- Function: generate_project_number
-- ATLAS Platform - Red Cedar Homes
--
-- Generates a project number in YY-XXX format:
--   YY  = last 2 digits of current year
--   XXX = 3-digit zero-padded sequence number within that year
--
-- Example: 25-001, 25-002, ..., 25-999
--
-- Uses a sequence advisory lock to prevent race conditions when
-- multiple projects are created simultaneously.
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_max_seq INTEGER;
    v_next_seq INTEGER;
    v_project_number TEXT;
    v_lock_key BIGINT;
BEGIN
    -- Get the 2-digit year
    v_year := TO_CHAR(NOW(), 'YY');

    -- Use an advisory lock based on the year to prevent race conditions
    -- Convert year to a numeric lock key
    v_lock_key := EXTRACT(YEAR FROM NOW())::BIGINT;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Find the highest sequence number for this year
    SELECT COALESCE(
        MAX(
            CASE
                WHEN project_number ~ ('^' || v_year || '-\d{3}$')
                THEN CAST(SUBSTRING(project_number FROM '\d{3}$') AS INTEGER)
                ELSE 0
            END
        ),
        0
    )
    INTO v_max_seq
    FROM projects
    WHERE project_number LIKE v_year || '-%';

    -- Increment
    v_next_seq := v_max_seq + 1;

    -- Guard against exceeding 999
    IF v_next_seq > 999 THEN
        RAISE EXCEPTION 'Project number sequence exhausted for year 20%', v_year;
    END IF;

    -- Format as YY-XXX
    v_project_number := v_year || '-' || LPAD(v_next_seq::TEXT, 3, '0');

    -- Verify uniqueness (belt and suspenders)
    IF EXISTS (SELECT 1 FROM projects WHERE project_number = v_project_number) THEN
        -- Rare edge case: retry with next number
        v_next_seq := v_next_seq + 1;
        v_project_number := v_year || '-' || LPAD(v_next_seq::TEXT, 3, '0');
    END IF;

    RETURN v_project_number;
END;
$$ LANGUAGE plpgsql;
