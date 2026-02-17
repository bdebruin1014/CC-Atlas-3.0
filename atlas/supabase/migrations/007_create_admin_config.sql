-- ============================================================================
-- Migration 007: Admin & Configuration Tables
-- ATLAS Platform - Red Cedar Homes
-- Tables: floor_plans, municipalities, trade_categories, schedule_templates,
--         sharepoint_folder_templates, integration_settings,
--         contract_templates, calendar_events
-- Also: Deferred foreign key additions from previous migrations
-- ============================================================================

-- ============================================================================
-- FLOOR PLANS
-- ============================================================================
CREATE TABLE floor_plans (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,
    type                    TEXT CHECK (type IN ('sfh', 'townhome')),
    heated_sf               INTEGER,
    bedrooms                INTEGER,
    bathrooms               NUMERIC(3,1),
    garage                  TEXT,
    unheated_sf             INTEGER,
    stories                 INTEGER,
    lot_width_min           NUMERIC(10,2),
    lot_depth_min           NUMERIC(10,2),
    lot_sqft_min            NUMERIC(12,2),
    unit_width              NUMERIC(10,2),
    -- Costs
    base_cost               NUMERIC(14,2),
    total_cost              NUMERIC(14,2),
    cost_per_sf             NUMERIC(10,2),
    -- Upgrade costs by package
    upgrade_cost_classic    NUMERIC(14,2),
    upgrade_cost_elegance   NUMERIC(14,2),
    upgrade_cost_harmony    NUMERIC(14,2),
    -- URLs
    plan_url                TEXT,
    brochure_url            TEXT,
    -- Notes & status
    notes                   TEXT,
    status                  TEXT CHECK (status IN ('active', 'inactive', 'draft')) DEFAULT 'active',
    cost_breakdown          JSONB,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_floor_plans_organization_id ON floor_plans(organization_id);
CREATE INDEX idx_floor_plans_type ON floor_plans(type);
CREATE INDEX idx_floor_plans_status ON floor_plans(status);

-- ============================================================================
-- MUNICIPALITIES
-- ============================================================================
CREATE TABLE municipalities (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                            TEXT NOT NULL,
    state                           TEXT CHECK (state IN ('SC', 'NC')),
    -- Fee fields
    building_permit_fee             NUMERIC(14,2),
    grading_permit_fee              NUMERIC(14,2),
    mechanical_permit_fee           NUMERIC(14,2),
    electrical_permit_fee           NUMERIC(14,2),
    plumbing_permit_fee             NUMERIC(14,2),
    water_tap_fee                   NUMERIC(14,2),
    sewer_tap_fee                   NUMERIC(14,2),
    impact_fee_per_unit             NUMERIC(14,2),
    stormwater_fee                  NUMERIC(14,2),
    tree_mitigation_fee             NUMERIC(14,2),
    road_impact_fee                 NUMERIC(14,2),
    school_impact_fee               NUMERIC(14,2),
    park_impact_fee                 NUMERIC(14,2),
    fire_impact_fee                 NUMERIC(14,2),
    zoning_application_fee          NUMERIC(14,2),
    subdivision_application_fee     NUMERIC(14,2),
    plan_review_fee                 NUMERIC(14,2),
    inspection_fee                  NUMERIC(14,2),
    certificate_of_occupancy_fee    NUMERIC(14,2),
    permit_fee_schedule             JSONB,
    notes                           TEXT,
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_municipalities_organization_id ON municipalities(organization_id);
CREATE INDEX idx_municipalities_state ON municipalities(state);

-- ============================================================================
-- TRADE CATEGORIES
-- ============================================================================
CREATE TABLE trade_categories (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code                TEXT NOT NULL,
    name                TEXT NOT NULL,
    description         TEXT,
    default_vendor_id   UUID REFERENCES contacts(id) ON DELETE SET NULL,
    cost_range_low      NUMERIC(14,2),
    cost_range_high     NUMERIC(14,2),
    is_active           BOOLEAN DEFAULT TRUE,
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_trade_categories_organization_id ON trade_categories(organization_id);
CREATE INDEX idx_trade_categories_is_active ON trade_categories(is_active);

-- ============================================================================
-- SCHEDULE TEMPLATES
-- ============================================================================
CREATE TABLE schedule_templates (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_plan_id           UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
    phase_number            INTEGER NOT NULL CHECK (phase_number >= 1 AND phase_number <= 16),
    phase_name              TEXT NOT NULL,
    duration_days           INTEGER NOT NULL,
    required_inspections    TEXT[],
    UNIQUE(floor_plan_id, phase_number)
);

CREATE INDEX idx_schedule_templates_floor_plan_id ON schedule_templates(floor_plan_id);

-- ============================================================================
-- SHAREPOINT FOLDER TEMPLATES
-- ============================================================================
CREATE TABLE sharepoint_folder_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_type        TEXT NOT NULL,
    folder_structure    JSONB NOT NULL,
    is_default          BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sharepoint_folder_templates_organization_id ON sharepoint_folder_templates(organization_id);
CREATE INDEX idx_sharepoint_folder_templates_project_type ON sharepoint_folder_templates(project_type);

-- ============================================================================
-- INTEGRATION SETTINGS
-- ============================================================================
CREATE TABLE integration_settings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider            TEXT CHECK (provider IN (
                            'sharepoint', 'outlook', 'akaunting',
                            'quickbooks', 'zapier', 'sendgrid'
                        )),
    config              JSONB NOT NULL DEFAULT '{}',
    is_active           BOOLEAN DEFAULT FALSE,
    last_tested_at      TIMESTAMPTZ,
    test_result         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integration_settings_organization_id ON integration_settings(organization_id);
CREATE INDEX idx_integration_settings_provider ON integration_settings(provider);

-- ============================================================================
-- CONTRACT TEMPLATES
-- ============================================================================
CREATE TABLE contract_templates (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,
    type                    TEXT,
    state                   TEXT CHECK (state IN ('SC', 'NC')),
    merge_fields            JSONB,
    template_document_id    UUID REFERENCES documents(id) ON DELETE SET NULL,
    version                 INTEGER DEFAULT 1,
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_templates_organization_id ON contract_templates(organization_id);
CREATE INDEX idx_contract_templates_type ON contract_templates(type);
CREATE INDEX idx_contract_templates_is_active ON contract_templates(is_active);

-- ============================================================================
-- CALENDAR EVENTS
-- ============================================================================
CREATE TABLE calendar_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title                   TEXT NOT NULL,
    description             TEXT,
    event_type              TEXT CHECK (event_type IN (
                                'inspection', 'closing', 'meeting', 'deadline',
                                'milestone', 'permit', 'walkthrough',
                                'open_house', 'draw_request', 'other'
                            )),
    start_date              TIMESTAMPTZ NOT NULL,
    end_date                TIMESTAMPTZ,
    all_day                 BOOLEAN DEFAULT FALSE,
    is_recurring            BOOLEAN DEFAULT FALSE,
    recurrence_rule         TEXT,
    linked_record_type      TEXT,
    linked_record_id        UUID,
    assigned_to             UUID REFERENCES profiles(id) ON DELETE SET NULL,
    team_id                 UUID REFERENCES teams(id) ON DELETE SET NULL,
    outlook_event_id        TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_organization_id ON calendar_events(organization_id);
CREATE INDEX idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX idx_calendar_events_assigned_to ON calendar_events(assigned_to);
CREATE INDEX idx_calendar_events_team_id ON calendar_events(team_id);
CREATE INDEX idx_calendar_events_linked_record ON calendar_events(linked_record_type, linked_record_id);

-- ============================================================================
-- DEFERRED FOREIGN KEYS
-- Add FKs that reference floor_plans and municipalities from earlier tables
-- ============================================================================

-- opportunities.floor_plan_id -> floor_plans
ALTER TABLE opportunities
    ADD CONSTRAINT fk_opportunities_floor_plan
    FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id) ON DELETE SET NULL;

-- deal_analyses.floor_plan_id -> floor_plans
ALTER TABLE deal_analyses
    ADD CONSTRAINT fk_deal_analyses_floor_plan
    FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id) ON DELETE SET NULL;

-- deal_analyses.municipality_id -> municipalities
ALTER TABLE deal_analyses
    ADD CONSTRAINT fk_deal_analyses_municipality
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE SET NULL;

-- projects.floor_plan_id -> floor_plans
ALTER TABLE projects
    ADD CONSTRAINT fk_projects_floor_plan
    FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id) ON DELETE SET NULL;

-- projects.municipality_id -> municipalities
ALTER TABLE projects
    ADD CONSTRAINT fk_projects_municipality
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE SET NULL;

-- project_lots.assigned_floor_plan_id -> floor_plans
ALTER TABLE project_lots
    ADD CONSTRAINT fk_project_lots_floor_plan
    FOREIGN KEY (assigned_floor_plan_id) REFERENCES floor_plans(id) ON DELETE SET NULL;

-- units.floor_plan_id -> floor_plans
ALTER TABLE units
    ADD CONSTRAINT fk_units_floor_plan
    FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id) ON DELETE SET NULL;

-- inspections.municipality_id -> municipalities
ALTER TABLE inspections
    ADD CONSTRAINT fk_inspections_municipality
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE SET NULL;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_floor_plans
    BEFORE UPDATE ON floor_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_municipalities
    BEFORE UPDATE ON municipalities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_integration_settings
    BEFORE UPDATE ON integration_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
