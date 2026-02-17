-- ============================================================================
-- Function & Trigger: sync_milestone_dates
-- ATLAS Platform - Red Cedar Homes
--
-- When a milestone's actual_end_date is set (milestone completed):
-- 1. Auto-set the next sequential milestone's actual_start_date
-- 2. If the milestone finished late, cascade the delay to all
--    downstream milestones' planned dates
--
-- This applies to both unit_milestones (construction) and
-- milestone_instances (workflow).
-- ============================================================================

-- ============================================================================
-- Construction milestones (unit_milestones)
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_construction_milestone_dates()
RETURNS TRIGGER AS $$
DECLARE
    v_delay_days INTEGER;
    v_next_milestone RECORD;
    v_planned_end DATE;
    v_actual_end DATE;
BEGIN
    -- Only act when actual_end_date transitions from NULL to a value
    IF OLD.actual_end_date IS NOT NULL THEN
        RETURN NEW;
    END IF;
    IF NEW.actual_end_date IS NULL THEN
        RETURN NEW;
    END IF;

    v_actual_end := NEW.actual_end_date;
    v_planned_end := NEW.planned_end_date;

    -- ---------------------------------------------------------------
    -- 1. Auto-start the next milestone
    -- ---------------------------------------------------------------
    SELECT *
    INTO v_next_milestone
    FROM unit_milestones
    WHERE unit_id = NEW.unit_id
      AND phase_number = NEW.phase_number + 1;

    IF v_next_milestone IS NOT NULL THEN
        -- Set the next milestone's actual_start_date to the day after completion
        UPDATE unit_milestones
        SET actual_start_date = v_actual_end + INTERVAL '1 day',
            status = CASE
                WHEN status = 'not_started' THEN 'in_progress'
                ELSE status
            END
        WHERE id = v_next_milestone.id
          AND actual_start_date IS NULL;

        -- Update the unit's current_milestone to the next phase
        UPDATE units
        SET current_milestone = NEW.phase_number + 1,
            updated_at = NOW()
        WHERE id = NEW.unit_id
          AND current_milestone <= NEW.phase_number;
    ELSE
        -- No next milestone - this was the last phase
        -- Mark the unit as complete
        UPDATE units
        SET actual_completion_date = v_actual_end,
            updated_at = NOW()
        WHERE id = NEW.unit_id
          AND actual_completion_date IS NULL;
    END IF;

    -- ---------------------------------------------------------------
    -- 2. Cascade delays downstream
    -- ---------------------------------------------------------------
    IF v_planned_end IS NOT NULL AND v_actual_end > v_planned_end THEN
        v_delay_days := v_actual_end - v_planned_end;

        -- Shift all downstream milestones' planned dates
        UPDATE unit_milestones
        SET planned_start_date = planned_start_date + (v_delay_days || ' days')::INTERVAL,
            planned_end_date = planned_end_date + (v_delay_days || ' days')::INTERVAL,
            is_overdue = CASE
                WHEN planned_end_date + (v_delay_days || ' days')::INTERVAL < CURRENT_DATE
                     AND status NOT IN ('complete', 'not_started')
                THEN TRUE
                ELSE is_overdue
            END
        WHERE unit_id = NEW.unit_id
          AND phase_number > NEW.phase_number
          AND actual_end_date IS NULL;

        -- Also update the unit's projected_completion_date
        UPDATE units
        SET projected_completion_date = (
            SELECT MAX(planned_end_date)
            FROM unit_milestones
            WHERE unit_id = NEW.unit_id
        ),
        updated_at = NOW()
        WHERE id = NEW.unit_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_construction_milestone_dates ON unit_milestones;

CREATE TRIGGER trg_sync_construction_milestone_dates
    AFTER UPDATE OF actual_end_date ON unit_milestones
    FOR EACH ROW
    EXECUTE FUNCTION sync_construction_milestone_dates();

-- ============================================================================
-- Workflow milestones (milestone_instances)
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_workflow_milestone_dates()
RETURNS TRIGGER AS $$
DECLARE
    v_delay_days INTEGER;
    v_next_milestone RECORD;
    v_planned_end DATE;
    v_actual_end DATE;
BEGIN
    -- Only act when actual_end_date transitions from NULL to a value
    IF OLD.actual_end_date IS NOT NULL THEN
        RETURN NEW;
    END IF;
    IF NEW.actual_end_date IS NULL THEN
        RETURN NEW;
    END IF;

    v_actual_end := NEW.actual_end_date;
    v_planned_end := NEW.planned_end_date;

    -- ---------------------------------------------------------------
    -- 1. Auto-start the next milestone
    -- ---------------------------------------------------------------
    SELECT *
    INTO v_next_milestone
    FROM milestone_instances
    WHERE workflow_instance_id = NEW.workflow_instance_id
      AND sequence = NEW.sequence + 1;

    IF v_next_milestone IS NOT NULL THEN
        -- Set the next milestone's actual_start_date
        UPDATE milestone_instances
        SET actual_start_date = v_actual_end,
            status = CASE
                WHEN status = 'not_started' THEN 'in_progress'
                ELSE status
            END,
            updated_at = NOW()
        WHERE id = v_next_milestone.id
          AND actual_start_date IS NULL;

        -- Update workflow current milestone
        UPDATE workflow_instances
        SET current_milestone_id = v_next_milestone.id,
            updated_at = NOW()
        WHERE id = NEW.workflow_instance_id
          AND current_milestone_id = NEW.id;
    ELSE
        -- Last milestone completed - mark workflow as complete
        UPDATE workflow_instances
        SET status = 'completed',
            completed_at = NOW(),
            progress_pct = 100,
            updated_at = NOW()
        WHERE id = NEW.workflow_instance_id
          AND status != 'completed';
    END IF;

    -- ---------------------------------------------------------------
    -- 2. Cascade delays downstream
    -- ---------------------------------------------------------------
    IF v_planned_end IS NOT NULL AND v_actual_end > v_planned_end THEN
        v_delay_days := v_actual_end - v_planned_end;

        -- Shift all downstream milestones' planned dates
        UPDATE milestone_instances
        SET planned_start_date = planned_start_date + v_delay_days,
            planned_end_date = planned_end_date + v_delay_days,
            updated_at = NOW()
        WHERE workflow_instance_id = NEW.workflow_instance_id
          AND sequence > NEW.sequence
          AND actual_end_date IS NULL;

        -- Update task due dates for shifted milestones
        UPDATE task_instances ti
        SET due_date = due_date + v_delay_days,
            updated_at = NOW()
        FROM milestone_instances mi
        WHERE ti.milestone_instance_id = mi.id
          AND mi.workflow_instance_id = NEW.workflow_instance_id
          AND mi.sequence > NEW.sequence
          AND ti.status != 'completed'
          AND ti.due_date IS NOT NULL;
    END IF;

    -- ---------------------------------------------------------------
    -- 3. Recalculate workflow progress
    -- ---------------------------------------------------------------
    UPDATE workflow_instances
    SET progress_pct = (
        SELECT ROUND(
            (COUNT(*) FILTER (WHERE status IN ('completed', 'skipped'))::NUMERIC /
             NULLIF(COUNT(*), 0)) * 100,
            2
        )
        FROM milestone_instances
        WHERE workflow_instance_id = NEW.workflow_instance_id
    ),
    updated_at = NOW()
    WHERE id = NEW.workflow_instance_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_workflow_milestone_dates ON milestone_instances;

CREATE TRIGGER trg_sync_workflow_milestone_dates
    AFTER UPDATE OF actual_end_date ON milestone_instances
    FOR EACH ROW
    EXECUTE FUNCTION sync_workflow_milestone_dates();
