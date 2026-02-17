-- ============================================================================
-- Migration 004: Construction Tables
-- ATLAS Platform - Red Cedar Homes
-- Tables: clients, jobs, units, unit_milestones, purchase_orders,
--         change_orders, selections, inspections, permits,
--         warranty_claims, construction_issues, vendor_profiles
-- ============================================================================

-- ============================================================================
-- CLIENTS (third-party builder clients)
-- ============================================================================
CREATE TABLE clients (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                            TEXT NOT NULL,
    contact_name                    TEXT,
    email                           TEXT,
    phone                           TEXT,
    billing_address                 TEXT,
    payment_terms                   TEXT,
    insurance_responsibility        TEXT,
    contract_template_preference    TEXT,
    created_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_organization_id ON clients(organization_id);

-- ============================================================================
-- JOBS
-- ============================================================================
CREATE TABLE jobs (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_number                  TEXT UNIQUE,
    name                        TEXT NOT NULL,
    client_type                 TEXT CHECK (client_type IN ('internal', 'third_party')),
    client_entity_id            UUID REFERENCES entities(id) ON DELETE SET NULL,
    client_id                   UUID REFERENCES clients(id) ON DELETE SET NULL,
    contract_type               TEXT CHECK (contract_type IN (
                                    'cost_plus', 'fixed_price', 'time_and_materials',
                                    'guaranteed_maximum', 'unit_price'
                                )),
    contract_amount             NUMERIC(14,2),
    builder_fee                 NUMERIC(14,2),
    status                      TEXT CHECK (status IN (
                                    'pre_construction', 'active', 'punch_list',
                                    'substantial_completion', 'warranty', 'closed'
                                )) DEFAULT 'pre_construction',
    unit_count                  INTEGER DEFAULT 1,
    linked_project_id           UUID REFERENCES projects(id) ON DELETE SET NULL,
    start_date                  DATE,
    projected_completion        DATE,
    superintendent_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
    pm_id                       UUID REFERENCES profiles(id) ON DELETE SET NULL,
    state                       TEXT CHECK (state IN ('SC', 'NC')),
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_organization_id ON jobs(organization_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_client_type ON jobs(client_type);
CREATE INDEX idx_jobs_linked_project_id ON jobs(linked_project_id);
CREATE INDEX idx_jobs_superintendent_id ON jobs(superintendent_id);
CREATE INDEX idx_jobs_pm_id ON jobs(pm_id);

-- ============================================================================
-- UNITS
-- ============================================================================
CREATE TABLE units (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    unit_number                     TEXT,
    lot_address                     TEXT,
    floor_plan_id                   UUID,  -- FK added after floor_plans created
    upgrade_package                 TEXT CHECK (upgrade_package IN (
                                        'standard', 'classic', 'elegance', 'harmony'
                                    )),
    current_milestone               INTEGER DEFAULT 0,
    -- Budget fields
    base_sticks_bricks              NUMERIC(14,2),
    upgrade_cost                    NUMERIC(14,2),
    lot_preparation_cost            NUMERIC(14,2),
    site_specific_adjustments       NUMERIC(14,2),
    soft_costs                      NUMERIC(14,2),
    builder_fee                     NUMERIC(14,2),
    contingency                     NUMERIC(14,2),
    total_budget                    NUMERIC(14,2),
    total_committed                 NUMERIC(14,2) DEFAULT 0,
    total_actual                    NUMERIC(14,2) DEFAULT 0,
    variance                        NUMERIC(14,2) DEFAULT 0,
    -- Key dates
    permit_date                     DATE,
    start_date                      DATE,
    projected_completion_date       DATE,
    actual_completion_date          DATE,
    co_date                         DATE,
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_units_job_id ON units(job_id);
CREATE INDEX idx_units_floor_plan_id ON units(floor_plan_id);
CREATE INDEX idx_units_current_milestone ON units(current_milestone);

-- ============================================================================
-- UNIT MILESTONES
-- ============================================================================
CREATE TABLE unit_milestones (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id                 UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    phase_number            INTEGER NOT NULL CHECK (phase_number >= 1 AND phase_number <= 16),
    name                    TEXT NOT NULL,
    standard_duration_days  INTEGER,
    planned_start_date      DATE,
    planned_end_date        DATE,
    actual_start_date       DATE,
    actual_end_date         DATE,
    status                  TEXT CHECK (status IN (
                                'not_started', 'in_progress', 'complete', 'blocked'
                            )) DEFAULT 'not_started',
    days_in_milestone       INTEGER DEFAULT 0,
    is_overdue              BOOLEAN DEFAULT FALSE,
    override_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
    override_note           TEXT,
    UNIQUE(unit_id, phase_number)
);

CREATE INDEX idx_unit_milestones_unit_id ON unit_milestones(unit_id);
CREATE INDEX idx_unit_milestones_status ON unit_milestones(status);
CREATE INDEX idx_unit_milestones_is_overdue ON unit_milestones(is_overdue);

-- ============================================================================
-- PURCHASE ORDERS
-- ============================================================================
CREATE TABLE purchase_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number           TEXT UNIQUE,
    unit_id             UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    job_id              UUID REFERENCES jobs(id) ON DELETE SET NULL,
    trade_category      TEXT NOT NULL,
    vendor_contact_id   UUID REFERENCES contacts(id) ON DELETE SET NULL,
    description         TEXT,
    amount              NUMERIC(14,2) NOT NULL,
    status              TEXT CHECK (status IN (
                            'draft', 'submitted', 'approved', 'in_progress',
                            'complete', 'invoiced', 'paid'
                        )) DEFAULT 'draft',
    issued_date         DATE,
    due_date            DATE,
    completed_date      DATE,
    invoice_number      TEXT,
    lien_waiver_status  TEXT CHECK (lien_waiver_status IN (
                            'not_required', 'pending', 'conditional', 'unconditional'
                        )),
    retainage_pct       NUMERIC(5,2),
    retainage_amount    NUMERIC(14,2),
    approved_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_unit_id ON purchase_orders(unit_id);
CREATE INDEX idx_purchase_orders_job_id ON purchase_orders(job_id);
CREATE INDEX idx_purchase_orders_vendor_contact_id ON purchase_orders(vendor_contact_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_trade_category ON purchase_orders(trade_category);

-- ============================================================================
-- CHANGE ORDERS
-- ============================================================================
CREATE TABLE change_orders (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    co_number               TEXT UNIQUE,
    linked_po_id            UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    unit_id                 UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    job_id                  UUID REFERENCES jobs(id) ON DELETE SET NULL,
    description             TEXT NOT NULL,
    reason_category         TEXT CHECK (reason_category IN (
                                'owner_request', 'field_condition',
                                'design_error', 'code_requirement', 'other'
                            )),
    cost_impact             NUMERIC(14,2),
    markup_pct              NUMERIC(5,2),
    total_with_markup       NUMERIC(14,2),
    schedule_impact_days    INTEGER DEFAULT 0,
    approval_status         TEXT CHECK (approval_status IN (
                                'pending', 'approved', 'rejected', 'revised'
                            )) DEFAULT 'pending',
    approved_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_change_orders_unit_id ON change_orders(unit_id);
CREATE INDEX idx_change_orders_job_id ON change_orders(job_id);
CREATE INDEX idx_change_orders_linked_po_id ON change_orders(linked_po_id);
CREATE INDEX idx_change_orders_approval_status ON change_orders(approval_status);

-- ============================================================================
-- SELECTIONS
-- ============================================================================
CREATE TABLE selections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id             UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    category            TEXT NOT NULL,
    item_name           TEXT,
    description         TEXT,
    vendor_contact_id   UUID REFERENCES contacts(id) ON DELETE SET NULL,
    base_cost           NUMERIC(14,2),
    upgrade_delta       NUMERIC(14,2) DEFAULT 0,
    status              TEXT CHECK (status IN (
                            'pending', 'selected', 'ordered', 'received', 'installed'
                        )) DEFAULT 'pending',
    linked_po_id        UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_selections_unit_id ON selections(unit_id);
CREATE INDEX idx_selections_status ON selections(status);
CREATE INDEX idx_selections_category ON selections(category);

-- ============================================================================
-- INSPECTIONS
-- ============================================================================
CREATE TABLE inspections (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id                     UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    type                        TEXT NOT NULL,
    linked_milestone_phase      INTEGER,
    municipality_id             UUID,  -- FK added after municipalities created
    inspector_name              TEXT,
    scheduled_date              DATE,
    actual_date                 DATE,
    result                      TEXT CHECK (result IN ('pass', 'fail', 'conditional')),
    notes                       TEXT,
    re_inspection_required      BOOLEAN DEFAULT FALSE,
    re_inspection_date          DATE,
    re_inspection_result        TEXT CHECK (re_inspection_result IN ('pass', 'fail', 'conditional')),
    created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspections_unit_id ON inspections(unit_id);
CREATE INDEX idx_inspections_type ON inspections(type);
CREATE INDEX idx_inspections_result ON inspections(result);
CREATE INDEX idx_inspections_scheduled_date ON inspections(scheduled_date);

-- ============================================================================
-- PERMITS
-- ============================================================================
CREATE TABLE permits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type     TEXT CHECK (record_type IN ('unit', 'job')),
    record_id       UUID,
    permit_type     TEXT CHECK (permit_type IN (
                        'building', 'grading', 'mechanical', 'electrical',
                        'plumbing', 'demolition', 'other'
                    )),
    jurisdiction    TEXT,
    application_date DATE,
    approval_date   DATE,
    expiration_date DATE,
    permit_number   TEXT,
    fee             NUMERIC(14,2),
    status          TEXT CHECK (status IN (
                        'not_submitted', 'submitted', 'in_review',
                        'approved', 'expired', 'revoked'
                    )) DEFAULT 'not_submitted',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permits_record ON permits(record_type, record_id);
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_permit_type ON permits(permit_type);

-- ============================================================================
-- WARRANTY CLAIMS
-- ============================================================================
CREATE TABLE warranty_claims (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id                 UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    claim_date              DATE NOT NULL,
    category                TEXT,
    description             TEXT NOT NULL,
    photos                  TEXT[],
    urgency                 TEXT CHECK (urgency IN (
                                'emergency', 'urgent', 'standard', 'low'
                            )),
    responsible_vendor_id   UUID REFERENCES contacts(id) ON DELETE SET NULL,
    scheduled_repair_date   DATE,
    completed_date          DATE,
    resolution_notes        TEXT,
    owner_signoff           BOOLEAN DEFAULT FALSE,
    cost                    NUMERIC(14,2),
    cost_responsibility     TEXT CHECK (cost_responsibility IN (
                                'builder', 'vendor', 'owner', 'shared', 'warranty'
                            )),
    status                  TEXT CHECK (status IN (
                                'reported', 'scheduled', 'in_progress',
                                'resolved', 'closed'
                            )) DEFAULT 'reported',
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warranty_claims_unit_id ON warranty_claims(unit_id);
CREATE INDEX idx_warranty_claims_status ON warranty_claims(status);
CREATE INDEX idx_warranty_claims_urgency ON warranty_claims(urgency);
CREATE INDEX idx_warranty_claims_responsible_vendor_id ON warranty_claims(responsible_vendor_id);

-- ============================================================================
-- CONSTRUCTION ISSUES
-- ============================================================================
CREATE TABLE construction_issues (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id             UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    milestone_phase     INTEGER,
    category            TEXT CHECK (category IN (
                            'quality', 'safety', 'schedule', 'budget',
                            'design', 'material', 'other'
                        )),
    description         TEXT NOT NULL,
    photos              TEXT[],
    severity            TEXT CHECK (severity IN (
                            'critical', 'high', 'medium', 'low'
                        )),
    assigned_to         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    due_date            DATE,
    resolution          TEXT,
    cost_impact         NUMERIC(14,2),
    status              TEXT CHECK (status IN (
                            'open', 'in_progress', 'resolved', 'closed'
                        )) DEFAULT 'open',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_construction_issues_unit_id ON construction_issues(unit_id);
CREATE INDEX idx_construction_issues_status ON construction_issues(status);
CREATE INDEX idx_construction_issues_severity ON construction_issues(severity);
CREATE INDEX idx_construction_issues_assigned_to ON construction_issues(assigned_to);

-- ============================================================================
-- VENDOR PROFILES
-- ============================================================================
CREATE TABLE vendor_profiles (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id                  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE UNIQUE,
    trades_performed            TEXT[],
    license_number              TEXT,
    license_state               TEXT,
    license_expiration          DATE,
    w9_on_file                  BOOLEAN DEFAULT FALSE,
    bank_name                   TEXT,
    bank_routing_number         TEXT,
    bank_account_number         TEXT,
    payment_method              TEXT CHECK (payment_method IN (
                                    'check', 'ach', 'wire', 'credit_card', 'other'
                                )),
    -- Performance metrics
    performance_score           NUMERIC(5,2),
    on_time_rate                NUMERIC(5,2),
    punch_items_avg             NUMERIC(5,2),
    pm_rating                   NUMERIC(5,2),
    ytd_payments                NUMERIC(14,2) DEFAULT 0,
    is_1099_eligible            BOOLEAN DEFAULT FALSE,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_profiles_contact_id ON vendor_profiles(contact_id);
CREATE INDEX idx_vendor_profiles_performance_score ON vendor_profiles(performance_score);

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_jobs
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_units
    BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_purchase_orders
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_selections
    BEFORE UPDATE ON selections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_vendor_profiles
    BEFORE UPDATE ON vendor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
