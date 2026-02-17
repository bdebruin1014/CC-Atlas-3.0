-- ============================================================================
-- Migration 002: Opportunities Tables
-- ATLAS Platform - Red Cedar Homes
-- Tables: entities, opportunities, opportunity_stages, deal_analyses,
--         comparable_sales
-- ============================================================================

-- ============================================================================
-- ENTITIES
-- ============================================================================
CREATE TABLE entities (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                            TEXT NOT NULL,
    use_type                        TEXT CHECK (use_type IN (
                                        'operating_company', 'holding_company', 'spe',
                                        'fund_syndication', 'other'
                                    )),
    legal_type                      TEXT CHECK (legal_type IN (
                                        'llc', 's_corp', 'partnership', 'c_corp',
                                        'sole_proprietorship', 'trust'
                                    )),
    parent_entity_id                UUID REFERENCES entities(id) ON DELETE SET NULL,
    ein                             TEXT,
    state_of_formation              TEXT,
    formation_date                  DATE,
    registered_agent                TEXT,
    operating_agreement_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    is_active                       BOOLEAN DEFAULT TRUE,
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entities_organization_id ON entities(organization_id);
CREATE INDEX idx_entities_parent_entity_id ON entities(parent_entity_id);
CREATE INDEX idx_entities_use_type ON entities(use_type);
CREATE INDEX idx_entities_is_active ON entities(is_active);

-- Now add the FK from organizations to entities
ALTER TABLE organizations
    ADD CONSTRAINT fk_organizations_default_entity
    FOREIGN KEY (default_entity_id) REFERENCES entities(id) ON DELETE SET NULL;

-- ============================================================================
-- OPPORTUNITIES
-- ============================================================================
CREATE TABLE opportunities (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                            TEXT,
    -- Address fields
    address_street                  TEXT,
    address_city                    TEXT,
    address_state                   TEXT,
    address_zip                     TEXT,
    address_county                  TEXT,
    parcel_tms_number               TEXT,
    -- Classification
    type                            TEXT CHECK (type IN (
                                        'scattered_lot', 'lot_development',
                                        'community_development', 'lot_purchase', 'other'
                                    )),
    current_stage                   TEXT NOT NULL,
    source                          TEXT CHECK (source IN (
                                        'mls', 'direct_mail', 'referral', 'driving_for_dollars',
                                        'auction', 'wholesaler', 'builder_referral',
                                        'agent_relationship', 'online_listing', 'other'
                                    )),
    -- Assignments
    assigned_to                     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    owner_entity_id                 UUID REFERENCES entities(id) ON DELETE SET NULL,
    -- Projected values
    projected_purchase_price        NUMERIC(14,2),
    projected_sale_price            NUMERIC(14,2),
    projected_profit                NUMERIC(14,2),
    projected_margin_pct            NUMERIC(7,4),
    -- Key dates
    date_identified                 DATE,
    date_under_contract             DATE,
    due_diligence_deadline          DATE,
    projected_close_date            DATE,
    -- Scattered lot specific fields
    zoning_current                  TEXT,
    build_type                      TEXT CHECK (build_type IN (
                                        'spec', 'pre_sale', 'custom', 'model'
                                    )),
    road_surrounding                TEXT,
    buffers                         TEXT,
    historic_district               BOOLEAN DEFAULT FALSE,
    water_available                 BOOLEAN,
    sewer_available                 BOOLEAN,
    electric_available              BOOLEAN,
    gas_available                   BOOLEAN,
    floor_plan_id                   UUID,  -- FK added after floor_plans created
    best_fit_model                  TEXT,
    garage_position                 TEXT CHECK (garage_position IN (
                                        'front_entry', 'side_entry', 'rear_entry',
                                        'detached', 'none'
                                    )),
    survey_complete                 BOOLEAN DEFAULT FALSE,
    buildable_description           TEXT,
    lot_width                       NUMERIC(10,2),
    lot_depth                       NUMERIC(10,2),
    lot_sqft                        NUMERIC(12,2),
    -- Lot development specific
    total_acreage                   NUMERIC(10,4),
    estimated_total_lots            INTEGER,
    zoning_required                 TEXT,
    preliminary_plat_status         TEXT,
    target_builders                 TEXT,
    infrastructure_scope_estimate   NUMERIC(14,2),
    -- Status
    status                          TEXT CHECK (status IN (
                                        'active', 'archived', 'converted'
                                    )) DEFAULT 'active',
    converted_to_project_id         UUID,  -- FK added after projects created
    archived_reason                 TEXT,
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opportunities_organization_id ON opportunities(organization_id);
CREATE INDEX idx_opportunities_type ON opportunities(type);
CREATE INDEX idx_opportunities_current_stage ON opportunities(current_stage);
CREATE INDEX idx_opportunities_owner_entity_id ON opportunities(owner_entity_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to);

-- ============================================================================
-- OPPORTUNITY STAGES
-- ============================================================================
CREATE TABLE opportunity_stages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    opportunity_type    TEXT,
    name                TEXT NOT NULL,
    sequence            INTEGER NOT NULL,
    is_terminal         BOOLEAN DEFAULT FALSE,
    entry_criteria      TEXT,
    required_fields     TEXT[],
    UNIQUE(organization_id, opportunity_type, sequence)
);

CREATE INDEX idx_opportunity_stages_organization_id ON opportunity_stages(organization_id);
CREATE INDEX idx_opportunity_stages_type ON opportunity_stages(opportunity_type);

-- ============================================================================
-- DEAL ANALYSES
-- ============================================================================
CREATE TABLE deal_analyses (
    id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id                      UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    floor_plan_id                       UUID,  -- FK added after floor_plans created
    upgrade_package                     TEXT CHECK (upgrade_package IN (
                                            'standard', 'classic', 'elegance', 'harmony'
                                        )),
    municipality_id                     UUID,  -- FK added after municipalities created
    -- Input fields
    purchase_price                      NUMERIC(14,2),
    site_work_estimate                  NUMERIC(14,2),
    other_site_costs                    NUMERIC(14,2),
    site_specific_vertical_adjustments  NUMERIC(14,2),
    asset_sales_price                   NUMERIC(14,2),
    selling_concessions                 NUMERIC(14,2),
    project_duration_days               INTEGER,
    interest_rate_override              NUMERIC(5,2),
    -- Section 1: Acquisition costs
    calc_total_acquisition_cost         NUMERIC(14,2),
    -- Section 2: Site costs
    calc_total_site_costs               NUMERIC(14,2),
    -- Section 3: Vertical construction
    calc_base_construction_cost         NUMERIC(14,2),
    calc_upgrade_cost                   NUMERIC(14,2),
    calc_site_specific_adjustments      NUMERIC(14,2),
    calc_total_vertical_cost            NUMERIC(14,2),
    -- Section 4: Soft costs
    calc_permit_fees                    NUMERIC(14,2),
    calc_impact_fees                    NUMERIC(14,2),
    calc_water_sewer_tap                NUMERIC(14,2),
    calc_architecture_engineering       NUMERIC(14,2),
    calc_survey_cost                    NUMERIC(14,2),
    calc_insurance                      NUMERIC(14,2),
    calc_legal_closing                  NUMERIC(14,2),
    calc_contingency                    NUMERIC(14,2),
    calc_total_soft_costs               NUMERIC(14,2),
    -- Section 5: Total project cost
    calc_total_project_cost             NUMERIC(14,2),
    -- Financing
    calc_loan_amount                    NUMERIC(14,2),
    calc_equity_required                NUMERIC(14,2),
    calc_interest_expense               NUMERIC(14,2),
    -- Revenue & Results
    calc_gross_revenue                  NUMERIC(14,2),
    calc_selling_costs                  NUMERIC(14,2),
    calc_net_revenue                    NUMERIC(14,2),
    calc_gross_profit                   NUMERIC(14,2),
    calc_gross_margin_pct               NUMERIC(7,4),
    calc_net_profit                     NUMERIC(14,2),
    calc_net_margin_pct                 NUMERIC(7,4),
    calc_roi                            NUMERIC(7,4),
    calc_annualized_roi                 NUMERIC(7,4),
    calc_cost_per_sf                    NUMERIC(10,2),
    -- Verdict
    verdict                             TEXT CHECK (verdict IN (
                                            'strong_deal', 'good_deal', 'marginal', 'no_go'
                                        )),
    created_by                          UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_current                          BOOLEAN DEFAULT TRUE,
    created_at                          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deal_analyses_opportunity_id ON deal_analyses(opportunity_id);
CREATE INDEX idx_deal_analyses_is_current ON deal_analyses(is_current);
CREATE INDEX idx_deal_analyses_verdict ON deal_analyses(verdict);

-- ============================================================================
-- COMPARABLE SALES
-- ============================================================================
CREATE TABLE comparable_sales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id  UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    mls_link        TEXT,
    address         TEXT,
    bedrooms        INTEGER,
    bathrooms       NUMERIC(3,1),
    heated_sf       INTEGER,
    sale_date       DATE,
    sale_price      NUMERIC(14,2),
    price_per_sf    NUMERIC(10,2),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comparable_sales_opportunity_id ON comparable_sales(opportunity_id);

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_entities
    BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_opportunities
    BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
