-- ============================================================================
-- Migration 005: Accounting Tables
-- ATLAS Platform - Red Cedar Homes
-- Tables: chart_of_accounts, transactions, fiscal_periods, investors,
--         capital_calls, capital_call_responses, waterfall_structures,
--         distributions, distribution_allocations, loans, loan_draws
-- ============================================================================

-- ============================================================================
-- CHART OF ACCOUNTS
-- ============================================================================
CREATE TABLE chart_of_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id           UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    account_number      TEXT NOT NULL,
    account_name        TEXT NOT NULL,
    account_type        TEXT CHECK (account_type IN (
                            'asset', 'liability', 'equity',
                            'revenue', 'expense', 'contra'
                        )),
    parent_account_id   UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    is_active           BOOLEAN DEFAULT TRUE,
    description         TEXT,
    normal_balance      TEXT CHECK (normal_balance IN ('debit', 'credit')),
    UNIQUE(entity_id, account_number)
);

CREATE INDEX idx_chart_of_accounts_entity_id ON chart_of_accounts(entity_id);
CREATE INDEX idx_chart_of_accounts_account_type ON chart_of_accounts(account_type);
CREATE INDEX idx_chart_of_accounts_parent_account_id ON chart_of_accounts(parent_account_id);
CREATE INDEX idx_chart_of_accounts_is_active ON chart_of_accounts(is_active);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================
CREATE TABLE transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id               UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    date                    DATE NOT NULL,
    description             TEXT,
    account_id              UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    debit                   NUMERIC(14,2) DEFAULT 0,
    credit                  NUMERIC(14,2) DEFAULT 0,
    project_id              UUID REFERENCES projects(id) ON DELETE SET NULL,
    unit_id                 UUID REFERENCES units(id) ON DELETE SET NULL,
    reference_number        TEXT,
    transaction_type        TEXT CHECK (transaction_type IN (
                                'journal_entry', 'invoice', 'payment',
                                'receipt', 'transfer', 'adjustment', 'closing'
                            )),
    supporting_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
    status                  TEXT CHECK (status IN (
                                'pending', 'approved', 'posted', 'voided'
                            )) DEFAULT 'pending',
    approved_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
    period                  TEXT,
    is_adjusting_entry      BOOLEAN DEFAULT FALSE,
    batch_id                UUID,
    akaunting_synced        BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_entity_id ON transactions(entity_id);
CREATE INDEX idx_transactions_period ON transactions(period);
CREATE INDEX idx_transactions_project_id ON transactions(project_id);
CREATE INDEX idx_transactions_unit_id ON transactions(unit_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_batch_id ON transactions(batch_id);

-- Now add the FK from project_expenses.accounting_transaction_id to transactions
ALTER TABLE project_expenses
    ADD CONSTRAINT fk_project_expenses_accounting_transaction
    FOREIGN KEY (accounting_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

-- ============================================================================
-- FISCAL PERIODS
-- ============================================================================
CREATE TABLE fiscal_periods (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    period      TEXT NOT NULL,
    status      TEXT CHECK (status IN (
                    'open', 'review', 'closed', 'locked'
                )) DEFAULT 'open',
    closed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
    closed_at   TIMESTAMPTZ,
    UNIQUE(entity_id, period)
);

CREATE INDEX idx_fiscal_periods_entity_id ON fiscal_periods(entity_id);
CREATE INDEX idx_fiscal_periods_status ON fiscal_periods(status);

-- ============================================================================
-- INVESTORS
-- ============================================================================
CREATE TABLE investors (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id                       UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    contact_id                      UUID REFERENCES contacts(id) ON DELETE SET NULL,
    ownership_pct                   NUMERIC(7,4),
    capital_commitment              NUMERIC(14,2),
    contributed_to_date             NUMERIC(14,2) DEFAULT 0,
    preferred_return_rate           NUMERIC(7,4),
    promote_carry_structure         TEXT,
    accreditation_status            TEXT CHECK (accreditation_status IN (
                                        'accredited', 'qualified_purchaser',
                                        'non_accredited', 'pending_verification'
                                    )),
    accreditation_verification_date DATE,
    subscription_document_id        UUID REFERENCES documents(id) ON DELETE SET NULL,
    operating_agreement_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_investors_entity_id ON investors(entity_id);
CREATE INDEX idx_investors_contact_id ON investors(contact_id);

-- ============================================================================
-- CAPITAL CALLS
-- ============================================================================
CREATE TABLE capital_calls (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id           UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    call_number         TEXT,
    call_date           DATE NOT NULL,
    due_date            DATE,
    total_amount        NUMERIC(14,2) NOT NULL,
    purpose             TEXT,
    status              TEXT CHECK (status IN (
                            'draft', 'issued', 'partially_funded',
                            'fully_funded', 'cancelled'
                        )) DEFAULT 'draft',
    document_id         UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_capital_calls_entity_id ON capital_calls(entity_id);
CREATE INDEX idx_capital_calls_status ON capital_calls(status);

-- ============================================================================
-- CAPITAL CALL RESPONSES
-- ============================================================================
CREATE TABLE capital_call_responses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capital_call_id     UUID NOT NULL REFERENCES capital_calls(id) ON DELETE CASCADE,
    investor_id         UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    amount_called       NUMERIC(14,2) NOT NULL,
    amount_received     NUMERIC(14,2) DEFAULT 0,
    received_date       DATE,
    status              TEXT CHECK (status IN (
                            'pending', 'partial', 'received', 'overdue', 'waived'
                        )) DEFAULT 'pending',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_capital_call_responses_capital_call_id ON capital_call_responses(capital_call_id);
CREATE INDEX idx_capital_call_responses_investor_id ON capital_call_responses(investor_id);
CREATE INDEX idx_capital_call_responses_status ON capital_call_responses(status);

-- ============================================================================
-- WATERFALL STRUCTURES
-- ============================================================================
CREATE TABLE waterfall_structures (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    type        TEXT CHECK (type IN (
                    'preferred_return', 'catch_up', 'residual_split'
                )),
    tiers       JSONB NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waterfall_structures_entity_id ON waterfall_structures(entity_id);
CREATE INDEX idx_waterfall_structures_is_active ON waterfall_structures(is_active);

-- ============================================================================
-- DISTRIBUTIONS
-- ============================================================================
CREATE TABLE distributions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id               UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    distribution_date       DATE NOT NULL,
    total_amount            NUMERIC(14,2) NOT NULL,
    distribution_type       TEXT CHECK (distribution_type IN (
                                'return_of_capital', 'preferred_return',
                                'profit_distribution', 'liquidating'
                            )),
    waterfall_structure_id  UUID REFERENCES waterfall_structures(id) ON DELETE SET NULL,
    source_project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
    notes                   TEXT,
    status                  TEXT CHECK (status IN (
                                'draft', 'approved', 'distributed', 'cancelled'
                            )) DEFAULT 'draft',
    approved_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_distributions_entity_id ON distributions(entity_id);
CREATE INDEX idx_distributions_status ON distributions(status);
CREATE INDEX idx_distributions_source_project_id ON distributions(source_project_id);

-- ============================================================================
-- DISTRIBUTION ALLOCATIONS
-- ============================================================================
CREATE TABLE distribution_allocations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribution_id     UUID NOT NULL REFERENCES distributions(id) ON DELETE CASCADE,
    investor_id         UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    amount              NUMERIC(14,2) NOT NULL,
    allocation_type     TEXT CHECK (allocation_type IN (
                            'return_of_capital', 'preferred_return',
                            'profit_share', 'promote'
                        )),
    payment_method      TEXT,
    payment_reference   TEXT,
    paid_date           DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_distribution_allocations_distribution_id ON distribution_allocations(distribution_id);
CREATE INDEX idx_distribution_allocations_investor_id ON distribution_allocations(investor_id);

-- ============================================================================
-- LOANS
-- ============================================================================
CREATE TABLE loans (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id               UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    project_id              UUID REFERENCES projects(id) ON DELETE SET NULL,
    lender_contact_id       UUID REFERENCES contacts(id) ON DELETE SET NULL,
    loan_type               TEXT CHECK (loan_type IN (
                                'construction', 'acquisition', 'bridge',
                                'permanent', 'line_of_credit', 'mezzanine'
                            )),
    original_amount         NUMERIC(14,2),
    amount_drawn            NUMERIC(14,2) DEFAULT 0,
    amount_available        NUMERIC(14,2),
    interest_rate           NUMERIC(7,4),
    interest_type           TEXT CHECK (interest_type IN (
                                'fixed', 'variable', 'prime_plus'
                            )),
    maturity_date           DATE,
    ltc_ratio               NUMERIC(5,2),
    ltv_ratio               NUMERIC(5,2),
    covenants               TEXT,
    accrued_interest        NUMERIC(14,2) DEFAULT 0,
    status                  TEXT CHECK (status IN (
                                'pending', 'active', 'drawn_in_full',
                                'paid_off', 'defaulted', 'refinanced'
                            )) DEFAULT 'pending',
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loans_entity_id ON loans(entity_id);
CREATE INDEX idx_loans_project_id ON loans(project_id);
CREATE INDEX idx_loans_lender_contact_id ON loans(lender_contact_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_loan_type ON loans(loan_type);

-- ============================================================================
-- LOAN DRAWS
-- ============================================================================
CREATE TABLE loan_draws (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id                     UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    draw_number                 INTEGER,
    amount                      NUMERIC(14,2) NOT NULL,
    draw_date                   DATE NOT NULL,
    description                 TEXT,
    linked_construction_draw    TEXT,
    status                      TEXT CHECK (status IN (
                                    'requested', 'approved', 'funded', 'rejected'
                                )) DEFAULT 'requested',
    document_id                 UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loan_draws_loan_id ON loan_draws(loan_id);
CREATE INDEX idx_loan_draws_status ON loan_draws(status);

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_transactions
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_loans
    BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
