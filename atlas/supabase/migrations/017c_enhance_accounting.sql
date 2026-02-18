-- ============================================================================
-- Migration 017: Accounting Module Enhancements
-- Intercompany tracking, sync fields, approval workflow
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add intercompany and sync fields to transactions table
-- ---------------------------------------------------------------------------
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS intercompany_entity_id UUID REFERENCES entities(id),
  ADD COLUMN IF NOT EXISTS akaunting_synced BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS akaunting_sync_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_record_id UUID,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reversing_batch_id UUID;

-- ---------------------------------------------------------------------------
-- 2. Add auto-posting config to entities
-- ---------------------------------------------------------------------------
ALTER TABLE entities
  ADD COLUMN IF NOT EXISTS auto_post_construction BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_post_threshold NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_post_interest BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 3. Integration settings table for Akaunting mappings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle'
    CHECK (sync_status IN ('idle','syncing','error','success')),
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, integration_name)
);

ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_settings_select" ON integration_settings FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "integration_settings_insert" ON integration_settings FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "integration_settings_update" ON integration_settings FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- ---------------------------------------------------------------------------
-- 4. Add indexes for new transaction columns
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_intercompany ON transactions(intercompany_entity_id);
CREATE INDEX IF NOT EXISTS idx_transactions_akaunting ON transactions(akaunting_synced) WHERE NOT akaunting_synced;
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source_module, source_record_id);

-- ---------------------------------------------------------------------------
-- 5. Enhance investors table
-- ---------------------------------------------------------------------------
ALTER TABLE investors
  ADD COLUMN IF NOT EXISTS contributed_to_date NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distributions_to_date NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_return_accrued NUMERIC(14,2) NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 6. Add capital call response tracking
-- ---------------------------------------------------------------------------
ALTER TABLE capital_call_responses
  ADD COLUMN IF NOT EXISTS received_date DATE,
  ADD COLUMN IF NOT EXISTS transaction_batch_id UUID;

-- ---------------------------------------------------------------------------
-- 7. Add distribution allocation enhancements
-- ---------------------------------------------------------------------------
ALTER TABLE distribution_allocations
  ADD COLUMN IF NOT EXISTS tier_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_date DATE;

-- ---------------------------------------------------------------------------
-- 8. Add loan interest tracking
-- ---------------------------------------------------------------------------
ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS accrued_interest NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_interest_accrual_date DATE;

-- ---------------------------------------------------------------------------
-- 9. Loan draw enhancements
-- ---------------------------------------------------------------------------
ALTER TABLE loan_draws
  ADD COLUMN IF NOT EXISTS linked_construction_draw_id UUID REFERENCES draw_schedules(id),
  ADD COLUMN IF NOT EXISTS transaction_batch_id UUID;

-- ---------------------------------------------------------------------------
-- 10. Updated-at trigger for integration_settings
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_integration_settings_updated_at
  BEFORE UPDATE ON integration_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
