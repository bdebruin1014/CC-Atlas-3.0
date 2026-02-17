-- ============================================================================
-- Function & Trigger: update_unit_budget_rollup
-- ATLAS Platform - Red Cedar Homes
--
-- Trigger function that fires after INSERT, UPDATE, or DELETE on
-- purchase_orders. Recalculates the unit-level budget rollup columns:
--
--   total_committed = sum of all PO amounts where status IN
--                     ('submitted', 'approved', 'in_progress', 'complete',
--                      'invoiced', 'paid')
--   total_actual    = sum of all PO amounts where status = 'paid'
--   variance        = total_budget - total_actual
--
-- Also updates the unit's updated_at timestamp.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_unit_budget_rollup()
RETURNS TRIGGER AS $$
DECLARE
    v_unit_id UUID;
    v_committed NUMERIC;
    v_actual NUMERIC;
    v_budget NUMERIC;
BEGIN
    -- Determine which unit to update
    IF TG_OP = 'DELETE' THEN
        v_unit_id := OLD.unit_id;
    ELSE
        v_unit_id := NEW.unit_id;
    END IF;

    -- Skip if unit_id is null
    IF v_unit_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Calculate committed total (all non-draft POs)
    SELECT COALESCE(SUM(po.amount), 0)
    INTO v_committed
    FROM purchase_orders po
    WHERE po.unit_id = v_unit_id
      AND po.status IN (
          'submitted', 'approved', 'in_progress',
          'complete', 'invoiced', 'paid'
      );

    -- Calculate actual total (only paid POs)
    SELECT COALESCE(SUM(po.amount), 0)
    INTO v_actual
    FROM purchase_orders po
    WHERE po.unit_id = v_unit_id
      AND po.status = 'paid';

    -- Get the unit's total budget
    SELECT COALESCE(u.total_budget, 0)
    INTO v_budget
    FROM units u
    WHERE u.id = v_unit_id;

    -- Update the unit
    UPDATE units
    SET total_committed = v_committed,
        total_actual = v_actual,
        variance = v_budget - v_actual,
        updated_at = NOW()
    WHERE id = v_unit_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create the trigger on purchase_orders
-- ============================================================================
DROP TRIGGER IF EXISTS trg_update_unit_budget_rollup ON purchase_orders;

CREATE TRIGGER trg_update_unit_budget_rollup
    AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_unit_budget_rollup();

-- ============================================================================
-- Also update when change orders are approved (they create new POs)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_unit_budget_on_change_order()
RETURNS TRIGGER AS $$
DECLARE
    v_unit_id UUID;
BEGIN
    v_unit_id := NEW.unit_id;

    IF v_unit_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- If approved, recalculate the unit budget including CO impact
    IF NEW.approval_status = 'approved' AND
       (OLD IS NULL OR OLD.approval_status != 'approved') THEN

        -- Add the change order's total to the unit's total_budget
        UPDATE units
        SET total_budget = COALESCE(total_budget, 0) + COALESCE(NEW.total_with_markup, 0),
            updated_at = NOW()
        WHERE id = v_unit_id;
    END IF;

    -- If reversed from approved back to pending/rejected
    IF OLD IS NOT NULL AND OLD.approval_status = 'approved' AND
       NEW.approval_status IN ('pending', 'rejected') THEN

        UPDATE units
        SET total_budget = GREATEST(COALESCE(total_budget, 0) - COALESCE(OLD.total_with_markup, 0), 0),
            updated_at = NOW()
        WHERE id = v_unit_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_unit_budget_on_change_order ON change_orders;

CREATE TRIGGER trg_update_unit_budget_on_change_order
    AFTER INSERT OR UPDATE ON change_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_unit_budget_on_change_order();
