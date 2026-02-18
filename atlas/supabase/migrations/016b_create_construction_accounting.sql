-- ============================================================================
-- Migration 016: Construction Management Accounting Tables
-- AP Invoices, Payments, AR Invoices, Retainage, Draw Schedules
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. AP Invoices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ap_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  vendor_contact_id UUID NOT NULL REFERENCES contacts(id),
  po_id UUID REFERENCES purchase_orders(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  unit_id UUID REFERENCES units(id),
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  received_date DATE,
  gross_amount NUMERIC(14,2) NOT NULL,
  retainage_held NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(14,2) NOT NULL,
  description TEXT,
  cost_code TEXT,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','coded','approved','scheduled','partially_paid','paid','disputed','voided')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  accounting_period TEXT,
  supporting_document_id UUID REFERENCES documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, invoice_number)
);

CREATE INDEX idx_ap_invoices_vendor ON ap_invoices(vendor_contact_id);
CREATE INDEX idx_ap_invoices_po ON ap_invoices(po_id);
CREATE INDEX idx_ap_invoices_job ON ap_invoices(job_id);
CREATE INDEX idx_ap_invoices_unit ON ap_invoices(unit_id);
CREATE INDEX idx_ap_invoices_status ON ap_invoices(status);
CREATE INDEX idx_ap_invoices_due_date ON ap_invoices(due_date);
CREATE INDEX idx_ap_invoices_period ON ap_invoices(accounting_period);

-- ---------------------------------------------------------------------------
-- 2. AP Payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ap_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_number TEXT NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'check'
    CHECK (payment_method IN ('check','ach','wire','credit_card')),
  payment_reference TEXT,
  vendor_contact_id UUID NOT NULL REFERENCES contacts(id),
  total_amount NUMERIC(14,2) NOT NULL,
  bank_account TEXT,
  batch_id UUID,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processed','cleared','voided','returned')),
  voided_date DATE,
  voided_reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ap_payments_vendor ON ap_payments(vendor_contact_id);
CREATE INDEX idx_ap_payments_batch ON ap_payments(batch_id);
CREATE INDEX idx_ap_payments_status ON ap_payments(status);
CREATE INDEX idx_ap_payments_date ON ap_payments(payment_date);

-- ---------------------------------------------------------------------------
-- 3. AP Payment Applications (links payments to invoices)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ap_payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES ap_payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES ap_invoices(id) ON DELETE CASCADE,
  amount_applied NUMERIC(14,2) NOT NULL,
  is_retainage_release BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ap_pay_app_payment ON ap_payment_applications(payment_id);
CREATE INDEX idx_ap_pay_app_invoice ON ap_payment_applications(invoice_id);

-- ---------------------------------------------------------------------------
-- 4. AR Invoices (amounts owed TO the builder)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ar_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  job_id UUID NOT NULL REFERENCES jobs(id),
  client_type TEXT NOT NULL DEFAULT 'internal'
    CHECK (client_type IN ('internal','third_party')),
  client_entity_id UUID REFERENCES entities(id),
  client_id UUID REFERENCES contacts(id),
  draw_number INTEGER,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  amount_received NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(14,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','partial','paid','overdue','disputed','written_off')),
  supporting_document_id UUID REFERENCES documents(id),
  accounting_transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ar_invoices_job ON ar_invoices(job_id);
CREATE INDEX idx_ar_invoices_status ON ar_invoices(status);
CREATE INDEX idx_ar_invoices_client ON ar_invoices(client_entity_id);

-- ---------------------------------------------------------------------------
-- 5. Retainage Ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS retainage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id),
  unit_id UUID REFERENCES units(id),
  vendor_contact_id UUID NOT NULL REFERENCES contacts(id),
  po_id UUID NOT NULL REFERENCES purchase_orders(id),
  invoice_id UUID NOT NULL REFERENCES ap_invoices(id),
  amount_held NUMERIC(14,2) NOT NULL,
  amount_released NUMERIC(14,2) NOT NULL DEFAULT 0,
  release_date DATE,
  release_payment_id UUID REFERENCES ap_payments(id),
  lien_waiver_status TEXT NOT NULL DEFAULT 'not_received'
    CHECK (lien_waiver_status IN ('not_received','conditional','unconditional')),
  status TEXT NOT NULL DEFAULT 'held'
    CHECK (status IN ('held','partially_released','released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_retainage_job ON retainage_ledger(job_id);
CREATE INDEX idx_retainage_vendor ON retainage_ledger(vendor_contact_id);
CREATE INDEX idx_retainage_status ON retainage_ledger(status);

-- ---------------------------------------------------------------------------
-- 6. Draw Schedules (5-draw system)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS draw_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  draw_number INTEGER NOT NULL CHECK (draw_number BETWEEN 1 AND 10),
  name TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  milestone_phase INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','eligible','requested','approved','invoiced','paid')),
  requested_date DATE,
  approved_date DATE,
  invoice_id UUID REFERENCES ar_invoices(id),
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, draw_number)
);

CREATE INDEX idx_draw_schedules_job ON draw_schedules(job_id);
CREATE INDEX idx_draw_schedules_status ON draw_schedules(status);

-- ---------------------------------------------------------------------------
-- 7. Add columns to vendor_profiles
-- ---------------------------------------------------------------------------
ALTER TABLE vendor_profiles
  ADD COLUMN IF NOT EXISTS default_payment_terms TEXT DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 8. Vendor 1099 Summary View
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vendor_1099_summary AS
SELECT
  vp.contact_id,
  c.company_name,
  vp.w9_on_file,
  EXTRACT(YEAR FROM p.payment_date)::INTEGER AS tax_year,
  SUM(pa.amount_applied) AS total_payments,
  CASE WHEN SUM(pa.amount_applied) >= 600 THEN true ELSE false END AS is_1099_eligible
FROM vendor_profiles vp
JOIN contacts c ON c.id = vp.contact_id
JOIN ap_invoices ai ON ai.vendor_contact_id = vp.contact_id
JOIN ap_payment_applications pa ON pa.invoice_id = ai.id
JOIN ap_payments p ON p.id = pa.payment_id AND p.status IN ('processed', 'cleared')
GROUP BY vp.contact_id, c.company_name, vp.w9_on_file, EXTRACT(YEAR FROM p.payment_date);

-- ---------------------------------------------------------------------------
-- 9. RLS Policies for new tables
-- ---------------------------------------------------------------------------

ALTER TABLE ap_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_payment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_schedules ENABLE ROW LEVEL SECURITY;

-- AP Invoices policies
CREATE POLICY "ap_invoices_select" ON ap_invoices FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "ap_invoices_insert" ON ap_invoices FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "ap_invoices_update" ON ap_invoices FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- AP Payments policies
CREATE POLICY "ap_payments_select" ON ap_payments FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "ap_payments_insert" ON ap_payments FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "ap_payments_update" ON ap_payments FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- AP Payment Applications policies
CREATE POLICY "ap_pay_app_select" ON ap_payment_applications FOR SELECT USING (
  payment_id IN (SELECT id FROM ap_payments WHERE organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ))
);
CREATE POLICY "ap_pay_app_insert" ON ap_payment_applications FOR INSERT WITH CHECK (
  payment_id IN (SELECT id FROM ap_payments WHERE organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ))
);

-- AR Invoices policies
CREATE POLICY "ar_invoices_select" ON ar_invoices FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "ar_invoices_insert" ON ar_invoices FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "ar_invoices_update" ON ar_invoices FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Retainage Ledger policies
CREATE POLICY "retainage_select" ON retainage_ledger FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "retainage_insert" ON retainage_ledger FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "retainage_update" ON retainage_ledger FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Draw Schedules policies
CREATE POLICY "draw_schedules_select" ON draw_schedules FOR SELECT USING (
  job_id IN (SELECT id FROM jobs WHERE organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ))
);
CREATE POLICY "draw_schedules_insert" ON draw_schedules FOR INSERT WITH CHECK (
  job_id IN (SELECT id FROM jobs WHERE organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ))
);
CREATE POLICY "draw_schedules_update" ON draw_schedules FOR UPDATE USING (
  job_id IN (SELECT id FROM jobs WHERE organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ))
);

-- ---------------------------------------------------------------------------
-- 10. Updated-at triggers for new tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ap_invoices_updated_at
  BEFORE UPDATE ON ap_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_ap_payments_updated_at
  BEFORE UPDATE ON ap_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_ar_invoices_updated_at
  BEFORE UPDATE ON ar_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_draw_schedules_updated_at
  BEFORE UPDATE ON draw_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
