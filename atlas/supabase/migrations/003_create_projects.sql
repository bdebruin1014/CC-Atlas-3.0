-- ============================================================================
-- Migration 003: Projects Tables
-- ATLAS Platform - Red Cedar Homes
-- Tables: projects, project_lots, project_expenses
-- ============================================================================

-- ============================================================================
-- PROJECTS
-- ============================================================================
CREATE TABLE projects (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_number                  TEXT UNIQUE,
    name                            TEXT NOT NULL,
    -- Address fields
    address_street                  TEXT,
    address_city                    TEXT,
    address_state                   TEXT,
    address_zip                     TEXT,
    address_county                  TEXT,
    -- Classification
    type                            TEXT CHECK (type IN (
                                        'scattered_lot', 'lot_development',
                                        'community_development', 'lot_purchase', 'other'
                                    )),
    owner_entity_id                 UUID REFERENCES entities(id) ON DELETE SET NULL,
    builder_entity_id               UUID REFERENCES entities(id) ON DELETE SET NULL,
    status                          TEXT CHECK (status IN (
                                        'pre_construction', 'active', 'under_contract',
                                        'complete', 'warranty', 'closed'
                                    )) DEFAULT 'pre_construction',
    -- Acquisition
    acquisition_date                DATE,
    -- Budget fields
    budget_land_acquisition         NUMERIC(14,2),
    budget_site_work                NUMERIC(14,2),
    budget_vertical_construction    NUMERIC(14,2),
    budget_soft_costs               NUMERIC(14,2),
    budget_contingency              NUMERIC(14,2),
    budget_total                    NUMERIC(14,2),
    actual_total_cost               NUMERIC(14,2),
    budget_variance                 NUMERIC(14,2),
    -- Contract tracking
    contract_amount                 NUMERIC(14,2),
    contract_signed_date            DATE,
    contract_document_id            UUID REFERENCES documents(id) ON DELETE SET NULL,
    -- Scattered lot / lot purchase specifics
    lot_width                       NUMERIC(10,2),
    lot_depth                       NUMERIC(10,2),
    lot_sqft                        NUMERIC(12,2),
    zoning                          TEXT,
    setback_front                   NUMERIC(8,2),
    setback_rear                    NUMERIC(8,2),
    setback_left                    NUMERIC(8,2),
    setback_right                   NUMERIC(8,2),
    floor_plan_id                   UUID,  -- FK added after floor_plans created
    upgrade_package                 TEXT CHECK (upgrade_package IN (
                                        'standard', 'classic', 'elegance', 'harmony'
                                    )),
    foundation_type                 TEXT CHECK (foundation_type IN (
                                        'slab', 'crawl_space', 'basement',
                                        'pier_and_beam', 'other'
                                    )),
    water_status                    TEXT,
    sewer_status                    TEXT,
    electric_status                 TEXT,
    gas_status                      TEXT,
    -- Lot development / community specifics
    total_acreage                   NUMERIC(10,4),
    total_lots                      INTEGER,
    phase_breakdown                 JSONB,
    preliminary_plat_status         TEXT,
    final_plat_status               TEXT,
    municipality_id                 UUID,  -- FK added after municipalities created
    impact_fee_total                NUMERIC(14,2),
    bond_amount                     NUMERIC(14,2),
    bond_release_status             TEXT,
    -- Community development additional
    floor_plan_mix                  JSONB,
    sales_pricing_matrix            JSONB,
    model_home_lot                  TEXT,
    hoa_setup_status                TEXT,
    -- Source opportunity
    source_opportunity_id           UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    -- Key dates
    permit_submitted_date           DATE,
    permit_approved_date            DATE,
    construction_start_date         DATE,
    projected_completion_date       DATE,
    actual_completion_date          DATE,
    co_date                         DATE,
    sale_date                       DATE,
    warranty_start_date             DATE,
    warranty_end_date               DATE,
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_type ON projects(type);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_owner_entity_id ON projects(owner_entity_id);
CREATE INDEX idx_projects_builder_entity_id ON projects(builder_entity_id);
CREATE INDEX idx_projects_source_opportunity_id ON projects(source_opportunity_id);

-- Now add the FK from opportunities.converted_to_project_id to projects
ALTER TABLE opportunities
    ADD CONSTRAINT fk_opportunities_converted_to_project
    FOREIGN KEY (converted_to_project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- ============================================================================
-- PROJECT LOTS
-- ============================================================================
CREATE TABLE project_lots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    lot_number              TEXT NOT NULL,
    width                   NUMERIC(10,2),
    depth                   NUMERIC(10,2),
    sqft                    NUMERIC(12,2),
    status                  TEXT CHECK (status IN (
                                'raw', 'graded', 'improved', 'permitted',
                                'under_construction', 'complete', 'sold'
                            )) DEFAULT 'raw',
    assigned_floor_plan_id  UUID,  -- FK added after floor_plans created
    upgrade_package         TEXT CHECK (upgrade_package IN (
                                'standard', 'classic', 'elegance', 'harmony'
                            )),
    list_price              NUMERIC(14,2),
    sale_price              NUMERIC(14,2),
    buyer_contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,
    phase                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_lots_project_id ON project_lots(project_id);
CREATE INDEX idx_project_lots_status ON project_lots(status);
CREATE INDEX idx_project_lots_buyer_contact_id ON project_lots(buyer_contact_id);

-- ============================================================================
-- PROJECT EXPENSES
-- ============================================================================
CREATE TABLE project_expenses (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entity_id                   UUID REFERENCES entities(id) ON DELETE SET NULL,
    date                        DATE NOT NULL,
    description                 TEXT,
    amount                      NUMERIC(14,2) NOT NULL,
    cost_category               TEXT,
    vendor_contact_id           UUID REFERENCES contacts(id) ON DELETE SET NULL,
    reference_number            TEXT,
    document_id                 UUID REFERENCES documents(id) ON DELETE SET NULL,
    accounting_transaction_id   UUID,  -- FK added after transactions created
    status                      TEXT CHECK (status IN (
                                    'pending', 'approved', 'paid', 'rejected'
                                )) DEFAULT 'pending',
    created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_expenses_project_id ON project_expenses(project_id);
CREATE INDEX idx_project_expenses_entity_id ON project_expenses(entity_id);
CREATE INDEX idx_project_expenses_vendor_contact_id ON project_expenses(vendor_contact_id);
CREATE INDEX idx_project_expenses_status ON project_expenses(status);
CREATE INDEX idx_project_expenses_date ON project_expenses(date);

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_projects
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_project_lots
    BEFORE UPDATE ON project_lots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
