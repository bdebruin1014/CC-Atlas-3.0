-- ============================================================================
-- 018_create_disposition.sql
-- Disposition module: listings, showings, offers, contracts, settlements,
--                     costs, price changes, bulk sale agreements, takedowns
-- ============================================================================

-- ============================================================================
-- 1. DISPOSITION LISTINGS
-- ============================================================================
CREATE TABLE disposition_listings (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id                  UUID REFERENCES projects(id) ON DELETE SET NULL,
    job_id                      UUID REFERENCES jobs(id) ON DELETE SET NULL,
    unit_id                     UUID REFERENCES units(id) ON DELETE SET NULL,
    entity_id                   UUID REFERENCES entities(id) ON DELETE SET NULL,
    listing_number              TEXT UNIQUE,
    property_address            TEXT,
    property_city               TEXT,
    property_state              TEXT,
    property_zip                TEXT,
    property_county             TEXT,
    property_type               TEXT CHECK (property_type IN (
                                    'single_family','townhome','lot','condo','duplex','land'
                                )),
    status                      TEXT CHECK (status IN (
                                    'draft','pre_listing','active','under_contract',
                                    'pending_closing','closed','withdrawn','expired'
                                )) DEFAULT 'draft',
    list_price                  NUMERIC(14,2),
    original_list_price         NUMERIC(14,2),
    listing_date                DATE,
    expiration_date             DATE,
    dom                         INTEGER,
    listing_agent_contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
    listing_agent_commission    NUMERIC(5,2),
    buyer_agent_commission      NUMERIC(5,2),
    mls_number                  TEXT,
    mls_status                  TEXT,
    lockbox_code                TEXT,
    showing_instructions        TEXT,
    marketing_description       TEXT,
    virtual_tour_url            TEXT,
    bedrooms                    INTEGER,
    bathrooms                   NUMERIC(3,1),
    sqft                        INTEGER,
    lot_sqft                    INTEGER,
    year_built                  INTEGER,
    garage_spaces               INTEGER,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disposition_listings_org ON disposition_listings(organization_id);
CREATE INDEX idx_disposition_listings_project ON disposition_listings(project_id);
CREATE INDEX idx_disposition_listings_job ON disposition_listings(job_id);
CREATE INDEX idx_disposition_listings_unit ON disposition_listings(unit_id);
CREATE INDEX idx_disposition_listings_entity ON disposition_listings(entity_id);
CREATE INDEX idx_disposition_listings_status ON disposition_listings(status);
CREATE INDEX idx_disposition_listings_listing_date ON disposition_listings(listing_date);
CREATE INDEX idx_disposition_listings_agent ON disposition_listings(listing_agent_contact_id);

-- ============================================================================
-- 2. DISPOSITION SHOWINGS
-- ============================================================================
CREATE TABLE disposition_showings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id              UUID NOT NULL REFERENCES disposition_listings(id) ON DELETE CASCADE,
    showing_date            TIMESTAMPTZ,
    showing_agent_name      TEXT,
    showing_agent_company   TEXT,
    showing_agent_phone     TEXT,
    showing_agent_email     TEXT,
    feedback                TEXT,
    interest_level          TEXT CHECK (interest_level IN (
                                'not_interested','somewhat','very_interested','making_offer'
                            )),
    follow_up_needed        BOOLEAN DEFAULT false,
    follow_up_notes         TEXT,
    follow_up_date          DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disposition_showings_listing ON disposition_showings(listing_id);
CREATE INDEX idx_disposition_showings_date ON disposition_showings(showing_date);
CREATE INDEX idx_disposition_showings_interest ON disposition_showings(interest_level);

-- ============================================================================
-- 3. DISPOSITION OFFERS
-- ============================================================================
CREATE TABLE disposition_offers (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id                  UUID NOT NULL REFERENCES disposition_listings(id) ON DELETE CASCADE,
    offer_number                TEXT,
    buyer_name                  TEXT,
    buyer_agent_name            TEXT,
    buyer_agent_company         TEXT,
    buyer_agent_email           TEXT,
    buyer_agent_phone           TEXT,
    offer_price                 NUMERIC(14,2),
    earnest_money               NUMERIC(14,2),
    em_due_date                 DATE,
    em_received                 BOOLEAN DEFAULT false,
    financing_type              TEXT CHECK (financing_type IN (
                                    'cash','conventional','fha','va','usda','other'
                                )),
    loan_amount                 NUMERIC(14,2),
    down_payment                NUMERIC(14,2),
    closing_cost_assistance     NUMERIC(14,2),
    other_concessions           NUMERIC(14,2),
    concession_notes            TEXT,
    contingency_financing       BOOLEAN DEFAULT false,
    contingency_inspection      BOOLEAN DEFAULT false,
    contingency_appraisal       BOOLEAN DEFAULT false,
    contingency_sale            BOOLEAN DEFAULT false,
    proposed_closing_date       DATE,
    proposed_possession_date    DATE,
    expiration_date             TIMESTAMPTZ,
    status                      TEXT CHECK (status IN (
                                    'received','reviewing','countered','accepted',
                                    'rejected','expired','withdrawn'
                                )) DEFAULT 'received',
    net_to_seller               NUMERIC(14,2),
    projected_profit            NUMERIC(14,2),
    counter_price               NUMERIC(14,2),
    counter_notes               TEXT,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disposition_offers_listing ON disposition_offers(listing_id);
CREATE INDEX idx_disposition_offers_status ON disposition_offers(status);
CREATE INDEX idx_disposition_offers_financing ON disposition_offers(financing_type);

-- ============================================================================
-- 4. DISPOSITION CONTRACTS
-- ============================================================================
CREATE TABLE disposition_contracts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id              UUID NOT NULL REFERENCES disposition_listings(id) ON DELETE CASCADE,
    offer_id                UUID REFERENCES disposition_offers(id) ON DELETE SET NULL,
    contract_number         TEXT,
    status                  TEXT CHECK (status IN (
                                'pending','active','contingent','clear_to_close',
                                'closed','terminated','cancelled'
                            )) DEFAULT 'pending',
    effective_date          DATE,
    dd_deadline             DATE,
    financing_deadline      DATE,
    appraisal_deadline      DATE,
    closing_date            DATE,
    possession_date         DATE,
    purchase_price          NUMERIC(14,2),
    earnest_money           NUMERIC(14,2),
    seller_entity           TEXT,
    seller_contact_id       UUID REFERENCES contacts(id) ON DELETE SET NULL,
    buyer_entity            TEXT,
    buyer_contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,
    title_company           TEXT,
    escrow_officer          TEXT,
    escrow_number           TEXT,
    closing_attorney        TEXT,
    inspection_status       TEXT CHECK (inspection_status IN (
                                'pending','scheduled','passed','failed','waived'
                            )),
    inspection_date         DATE,
    inspection_notes        TEXT,
    appraisal_status        TEXT CHECK (appraisal_status IN (
                                'pending','ordered','received','approved','disputed','waived'
                            )),
    appraisal_value         NUMERIC(14,2),
    appraisal_date          DATE,
    financing_status        TEXT CHECK (financing_status IN (
                                'pending','pre_approved','underwriting','clear_to_close','denied'
                            )),
    loan_commitment_date    DATE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disposition_contracts_listing ON disposition_contracts(listing_id);
CREATE INDEX idx_disposition_contracts_offer ON disposition_contracts(offer_id);
CREATE INDEX idx_disposition_contracts_status ON disposition_contracts(status);
CREATE INDEX idx_disposition_contracts_closing_date ON disposition_contracts(closing_date);
CREATE INDEX idx_disposition_contracts_seller ON disposition_contracts(seller_contact_id);
CREATE INDEX idx_disposition_contracts_buyer ON disposition_contracts(buyer_contact_id);

-- ============================================================================
-- 5. DISPOSITION SETTLEMENTS
-- ============================================================================
CREATE TABLE disposition_settlements (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id             UUID NOT NULL REFERENCES disposition_contracts(id) ON DELETE CASCADE,
    listing_id              UUID NOT NULL REFERENCES disposition_listings(id) ON DELETE CASCADE,
    settlement_number       TEXT,
    status                  TEXT CHECK (status IN (
                                'pending','scheduled','closed'
                            )) DEFAULT 'pending',
    closing_date            DATE,
    title_company           TEXT,
    closing_attorney        TEXT,
    escrow_officer          TEXT,
    escrow_number           TEXT,
    units_conveyed          INTEGER,
    lot_numbers             TEXT,
    gross_sale_price        NUMERIC(14,2),
    credit_contract_price   NUMERIC(14,2),
    credit_earnest_money    NUMERIC(14,2),
    credit_other            NUMERIC(14,2),
    charge_commission       NUMERIC(14,2),
    charge_title_insurance  NUMERIC(14,2),
    charge_settlement_fee   NUMERIC(14,2),
    charge_recording_fees   NUMERIC(14,2),
    charge_transfer_tax     NUMERIC(14,2),
    charge_hoa_transfer     NUMERIC(14,2),
    charge_loan_payoff      NUMERIC(14,2),
    charge_prorated_taxes   NUMERIC(14,2),
    charge_other            NUMERIC(14,2),
    total_credits           NUMERIC(14,2),
    total_charges           NUMERIC(14,2),
    net_to_seller           NUMERIC(14,2),
    funds_received          BOOLEAN DEFAULT false,
    date_received           DATE,
    amount_received         NUMERIC(14,2),
    wire_confirmation       TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disposition_settlements_contract ON disposition_settlements(contract_id);
CREATE INDEX idx_disposition_settlements_listing ON disposition_settlements(listing_id);
CREATE INDEX idx_disposition_settlements_status ON disposition_settlements(status);
CREATE INDEX idx_disposition_settlements_closing_date ON disposition_settlements(closing_date);

-- ============================================================================
-- 6. DISPOSITION COSTS
-- ============================================================================
CREATE TABLE disposition_costs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id          UUID NOT NULL REFERENCES disposition_listings(id) ON DELETE CASCADE,
    category            TEXT CHECK (category IN (
                            'commission','staging','photography','marketing',
                            'closing_costs','title_insurance','recording',
                            'transfer_tax','hoa','loan_payoff','taxes',
                            'repairs','other'
                        )),
    description         TEXT,
    amount              NUMERIC(14,2),
    paid_date           DATE,
    vendor_contact_id   UUID REFERENCES contacts(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disposition_costs_listing ON disposition_costs(listing_id);
CREATE INDEX idx_disposition_costs_category ON disposition_costs(category);
CREATE INDEX idx_disposition_costs_vendor ON disposition_costs(vendor_contact_id);
CREATE INDEX idx_disposition_costs_paid_date ON disposition_costs(paid_date);

-- ============================================================================
-- 7. DISPOSITION PRICE CHANGES
-- ============================================================================
CREATE TABLE disposition_price_changes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES disposition_listings(id) ON DELETE CASCADE,
    change_date     DATE,
    old_price       NUMERIC(14,2),
    new_price       NUMERIC(14,2),
    reason          TEXT,
    created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disposition_price_changes_listing ON disposition_price_changes(listing_id);
CREATE INDEX idx_disposition_price_changes_date ON disposition_price_changes(change_date);
CREATE INDEX idx_disposition_price_changes_created_by ON disposition_price_changes(created_by);

-- ============================================================================
-- 8. DISPOSITION BULK SALE AGREEMENTS
-- ============================================================================
CREATE TABLE disposition_bulk_sale_agreements (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    buyer_entity_name       TEXT,
    buyer_contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,
    total_lots              INTEGER,
    price_per_lot           NUMERIC(14,2),
    total_price             NUMERIC(14,2),
    contract_date           DATE,
    status                  TEXT CHECK (status IN (
                                'negotiating','active','complete','terminated'
                            )) DEFAULT 'negotiating',
    escalation_rate         NUMERIC(5,2),
    escalation_period       TEXT,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disposition_bulk_sale_project ON disposition_bulk_sale_agreements(project_id);
CREATE INDEX idx_disposition_bulk_sale_org ON disposition_bulk_sale_agreements(organization_id);
CREATE INDEX idx_disposition_bulk_sale_buyer ON disposition_bulk_sale_agreements(buyer_contact_id);
CREATE INDEX idx_disposition_bulk_sale_status ON disposition_bulk_sale_agreements(status);
CREATE INDEX idx_disposition_bulk_sale_contract_date ON disposition_bulk_sale_agreements(contract_date);

-- ============================================================================
-- 9. DISPOSITION TAKEDOWN SCHEDULE
-- ============================================================================
CREATE TABLE disposition_takedown_schedule (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bulk_sale_agreement_id      UUID NOT NULL REFERENCES disposition_bulk_sale_agreements(id) ON DELETE CASCADE,
    takedown_number             INTEGER,
    scheduled_date              DATE,
    lots_count                  INTEGER,
    lot_numbers                 TEXT[],
    scheduled_amount            NUMERIC(14,2),
    status                      TEXT CHECK (status IN (
                                    'scheduled','upcoming','completed','delayed'
                                )) DEFAULT 'scheduled',
    actual_date                 DATE,
    actual_amount               NUMERIC(14,2),
    variance                    NUMERIC(14,2),
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disposition_takedown_agreement ON disposition_takedown_schedule(bulk_sale_agreement_id);
CREATE INDEX idx_disposition_takedown_status ON disposition_takedown_schedule(status);
CREATE INDEX idx_disposition_takedown_scheduled_date ON disposition_takedown_schedule(scheduled_date);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER set_updated_at_disposition_listings
    BEFORE UPDATE ON disposition_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_disposition_offers
    BEFORE UPDATE ON disposition_offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_disposition_contracts
    BEFORE UPDATE ON disposition_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_disposition_settlements
    BEFORE UPDATE ON disposition_settlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_disposition_bulk_sale_agreements
    BEFORE UPDATE ON disposition_bulk_sale_agreements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_disposition_takedown_schedule
    BEFORE UPDATE ON disposition_takedown_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- disposition_listings
ALTER TABLE disposition_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disposition listings in their organization"
    ON disposition_listings FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert disposition listings in their organization"
    ON disposition_listings FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update disposition listings in their organization"
    ON disposition_listings FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete disposition listings in their organization"
    ON disposition_listings FOR DELETE
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- disposition_showings (access via listing's org)
ALTER TABLE disposition_showings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disposition showings in their organization"
    ON disposition_showings FOR SELECT
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert disposition showings in their organization"
    ON disposition_showings FOR INSERT
    WITH CHECK (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update disposition showings in their organization"
    ON disposition_showings FOR UPDATE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete disposition showings in their organization"
    ON disposition_showings FOR DELETE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- disposition_offers (access via listing's org)
ALTER TABLE disposition_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disposition offers in their organization"
    ON disposition_offers FOR SELECT
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert disposition offers in their organization"
    ON disposition_offers FOR INSERT
    WITH CHECK (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update disposition offers in their organization"
    ON disposition_offers FOR UPDATE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete disposition offers in their organization"
    ON disposition_offers FOR DELETE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- disposition_contracts (access via listing's org)
ALTER TABLE disposition_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disposition contracts in their organization"
    ON disposition_contracts FOR SELECT
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert disposition contracts in their organization"
    ON disposition_contracts FOR INSERT
    WITH CHECK (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update disposition contracts in their organization"
    ON disposition_contracts FOR UPDATE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete disposition contracts in their organization"
    ON disposition_contracts FOR DELETE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- disposition_settlements (access via listing's org)
ALTER TABLE disposition_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disposition settlements in their organization"
    ON disposition_settlements FOR SELECT
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert disposition settlements in their organization"
    ON disposition_settlements FOR INSERT
    WITH CHECK (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update disposition settlements in their organization"
    ON disposition_settlements FOR UPDATE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete disposition settlements in their organization"
    ON disposition_settlements FOR DELETE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- disposition_costs (access via listing's org)
ALTER TABLE disposition_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disposition costs in their organization"
    ON disposition_costs FOR SELECT
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert disposition costs in their organization"
    ON disposition_costs FOR INSERT
    WITH CHECK (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update disposition costs in their organization"
    ON disposition_costs FOR UPDATE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete disposition costs in their organization"
    ON disposition_costs FOR DELETE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- disposition_price_changes (access via listing's org)
ALTER TABLE disposition_price_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disposition price changes in their organization"
    ON disposition_price_changes FOR SELECT
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert disposition price changes in their organization"
    ON disposition_price_changes FOR INSERT
    WITH CHECK (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update disposition price changes in their organization"
    ON disposition_price_changes FOR UPDATE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete disposition price changes in their organization"
    ON disposition_price_changes FOR DELETE
    USING (listing_id IN (
        SELECT id FROM disposition_listings WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- disposition_bulk_sale_agreements (has organization_id directly)
ALTER TABLE disposition_bulk_sale_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disposition bulk sale agreements in their organization"
    ON disposition_bulk_sale_agreements FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert disposition bulk sale agreements in their organization"
    ON disposition_bulk_sale_agreements FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update disposition bulk sale agreements in their organization"
    ON disposition_bulk_sale_agreements FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete disposition bulk sale agreements in their organization"
    ON disposition_bulk_sale_agreements FOR DELETE
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- disposition_takedown_schedule (access via bulk sale agreement's org)
ALTER TABLE disposition_takedown_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disposition takedowns in their organization"
    ON disposition_takedown_schedule FOR SELECT
    USING (bulk_sale_agreement_id IN (
        SELECT id FROM disposition_bulk_sale_agreements WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert disposition takedowns in their organization"
    ON disposition_takedown_schedule FOR INSERT
    WITH CHECK (bulk_sale_agreement_id IN (
        SELECT id FROM disposition_bulk_sale_agreements WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update disposition takedowns in their organization"
    ON disposition_takedown_schedule FOR UPDATE
    USING (bulk_sale_agreement_id IN (
        SELECT id FROM disposition_bulk_sale_agreements WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete disposition takedowns in their organization"
    ON disposition_takedown_schedule FOR DELETE
    USING (bulk_sale_agreement_id IN (
        SELECT id FROM disposition_bulk_sale_agreements WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));
