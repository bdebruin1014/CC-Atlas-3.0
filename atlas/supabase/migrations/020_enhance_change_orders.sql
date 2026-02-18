-- ============================================================================
-- Migration 020: Enhance Change Orders
-- ATLAS Platform - Red Cedar Homes
-- Adds: approval_notes, approval_threshold, scope_clarification reason,
--        updated_at timestamp for forward compatibility with PLAN-1 Phase 10.
-- ============================================================================

-- Add approval_notes for approver comments
ALTER TABLE change_orders
    ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Add approval_threshold for routing display (CM / Principal)
ALTER TABLE change_orders
    ADD COLUMN IF NOT EXISTS approval_threshold TEXT CHECK (approval_threshold IN (
        'cm', 'cm_principal', 'principal'
    ));

-- Add updated_at for audit trail
ALTER TABLE change_orders
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Widen the reason_category CHECK to include 'scope_clarification'
ALTER TABLE change_orders DROP CONSTRAINT IF EXISTS change_orders_reason_category_check;
ALTER TABLE change_orders
    ADD CONSTRAINT change_orders_reason_category_check
    CHECK (reason_category IN (
        'owner_request', 'field_condition',
        'design_error', 'code_requirement',
        'scope_clarification', 'other'
    ));
