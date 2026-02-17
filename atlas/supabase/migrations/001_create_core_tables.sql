-- ============================================================================
-- Migration 001: Core Tables
-- ATLAS Platform - Red Cedar Homes
-- Tables: organizations, profiles, teams, team_members, module_access,
--         contacts, contact_types, contact_assignments, activity_log,
--         notes, documents, insurance_certificates
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================
CREATE TABLE organizations (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                            TEXT NOT NULL DEFAULT 'Red Cedar Homes',
    logo_url                        TEXT,
    default_entity_id               UUID,  -- FK added after entities table created
    timezone                        TEXT DEFAULT 'America/New_York',
    fiscal_year_start_month         INTEGER DEFAULT 1,
    currency                        TEXT DEFAULT 'USD',
    default_contingency_pct         NUMERIC(5,2) DEFAULT 5.00,
    default_retainage_pct           NUMERIC(5,2) DEFAULT 10.00,
    margin_strong_threshold         NUMERIC(5,2) DEFAULT 10.00,
    margin_good_threshold           NUMERIC(5,2) DEFAULT 7.00,
    margin_marginal_threshold       NUMERIC(5,2) DEFAULT 5.00,
    default_ltc_ratio               NUMERIC(5,2) DEFAULT 85.00,
    default_interest_rate           NUMERIC(5,2),
    default_construction_period_days INTEGER DEFAULT 120,
    default_selling_cost_pct        NUMERIC(5,2) DEFAULT 8.50,
    default_cost_of_capital_rate    NUMERIC(5,2) DEFAULT 16.00,
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE profiles (
    id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id   UUID REFERENCES organizations(id) ON DELETE SET NULL,
    first_name        TEXT,
    last_name         TEXT,
    email             TEXT,
    phone             TEXT,
    role              TEXT CHECK (role IN ('global_admin', 'module_admin', 'team_member', 'read_only')),
    avatar_url        TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================================
-- TEAMS
-- ============================================================================
CREATE TABLE teams (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    description       TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_organization_id ON teams(organization_id);

-- ============================================================================
-- TEAM MEMBERS
-- ============================================================================
CREATE TABLE team_members (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- ============================================================================
-- MODULE ACCESS
-- ============================================================================
CREATE TABLE module_access (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module      TEXT NOT NULL CHECK (module IN (
                    'opportunities', 'projects', 'construction',
                    'accounting', 'contacts', 'calendar', 'admin'
                )),
    team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    can_view    BOOLEAN DEFAULT FALSE,
    can_create  BOOLEAN DEFAULT FALSE,
    can_edit    BOOLEAN DEFAULT FALSE,
    can_delete  BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    can_export  BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_module_access_team_id ON module_access(team_id);
CREATE INDEX idx_module_access_module ON module_access(module);

-- ============================================================================
-- CONTACTS
-- ============================================================================
CREATE TABLE contacts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    first_name              TEXT NOT NULL,
    last_name               TEXT NOT NULL,
    company                 TEXT,
    email                   TEXT,
    phone                   TEXT,
    secondary_phone         TEXT,
    mailing_address_line1   TEXT,
    mailing_address_line2   TEXT,
    mailing_address_city    TEXT,
    mailing_address_state   TEXT,
    mailing_address_zip     TEXT,
    notes                   TEXT,
    status                  TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    tags                    TEXT[],
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_company ON contacts(company);
CREATE INDEX idx_contacts_last_name ON contacts(last_name);

-- ============================================================================
-- CONTACT TYPES
-- ============================================================================
CREATE TABLE contact_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN (
                    'owner_principal', 'investor', 'attorney_legal', 'lender',
                    'surveyor', 'engineer', 'architect', 'appraiser',
                    'real_estate_agent_broker', 'title_company', 'inspector',
                    'municipality_contact', 'subcontractor_vendor',
                    'superintendent', 'project_manager', 'accountant',
                    'insurance_agent', 'utility_provider', 'property_manager',
                    'buyer', 'seller', 'other'
                )),
    UNIQUE(contact_id, type)
);

CREATE INDEX idx_contact_types_contact_id ON contact_types(contact_id);
CREATE INDEX idx_contact_types_type ON contact_types(type);

-- ============================================================================
-- CONTACT ASSIGNMENTS
-- ============================================================================
CREATE TABLE contact_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    record_type     TEXT NOT NULL CHECK (record_type IN (
                        'opportunity', 'project', 'job', 'entity'
                    )),
    record_id       UUID NOT NULL,
    role_on_record  TEXT,
    UNIQUE(contact_id, record_type, record_id, role_on_record)
);

CREATE INDEX idx_contact_assignments_contact_id ON contact_assignments(contact_id);
CREATE INDEX idx_contact_assignments_record ON contact_assignments(record_type, record_id);

-- ============================================================================
-- ACTIVITY LOG
-- ============================================================================
CREATE TABLE activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    record_type     TEXT,
    record_id       UUID,
    action          TEXT NOT NULL,
    description     TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_organization_id ON activity_log(organization_id);
CREATE INDEX idx_activity_log_record ON activity_log(record_type, record_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- ============================================================================
-- NOTES
-- ============================================================================
CREATE TABLE notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type TEXT,
    record_id   UUID,
    user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content     TEXT NOT NULL,
    is_pinned   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_record ON notes(record_type, record_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================
CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type         TEXT,
    record_id           UUID,
    name                TEXT NOT NULL,
    file_type           TEXT,
    file_size_bytes     BIGINT,
    storage_path        TEXT,
    sharepoint_url      TEXT,
    sharepoint_folder   TEXT,
    uploaded_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_record ON documents(record_type, record_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

-- ============================================================================
-- INSURANCE CERTIFICATES
-- ============================================================================
CREATE TABLE insurance_certificates (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    linkable_type                   TEXT CHECK (linkable_type IN ('vendor', 'entity', 'project', 'job')),
    linkable_id                     UUID,
    policy_type                     TEXT CHECK (policy_type IN (
                                        'gl', 'workers_comp', 'auto', 'builders_risk',
                                        'umbrella', 'eo', 'do'
                                    )),
    carrier                         TEXT,
    policy_number                   TEXT,
    effective_date                  DATE,
    expiration_date                 DATE,
    coverage_limits                 TEXT,
    additional_insured_requirements TEXT,
    certificate_document_id         UUID REFERENCES documents(id) ON DELETE SET NULL,
    alert_threshold_days            INTEGER DEFAULT 30,
    created_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insurance_certificates_linkable ON insurance_certificates(linkable_type, linkable_id);
CREATE INDEX idx_insurance_certificates_expiration ON insurance_certificates(expiration_date);

-- ============================================================================
-- Updated_at trigger function (reusable)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_organizations
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_teams
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_contacts
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_notes
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
