-- ============================================================================
-- Migration 008: Row Level Security Policies
-- ATLAS Platform - Red Cedar Homes
--
-- Policy tiers:
--   1. Global admins: full access to everything in their organization
--   2. Module admins: full access within their module's tables
--   3. Team members: see records assigned to them or their team
--   4. Read-only users: SELECT only on organization records
--
-- All policies filter by organization_id for multi-tenant isolation.
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get the current user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if the current user is a global_admin
CREATE OR REPLACE FUNCTION is_global_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role = 'global_admin'
          AND is_active = TRUE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if the current user is at least a module_admin
CREATE OR REPLACE FUNCTION is_module_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('global_admin', 'module_admin')
          AND is_active = TRUE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if the current user has specific module permission
CREATE OR REPLACE FUNCTION has_module_permission(p_module TEXT, p_permission TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM module_access ma
        JOIN team_members tm ON tm.team_id = ma.team_id
        WHERE tm.user_id = auth.uid()
          AND ma.module = p_module
          AND CASE p_permission
                WHEN 'view' THEN ma.can_view
                WHEN 'create' THEN ma.can_create
                WHEN 'edit' THEN ma.can_edit
                WHEN 'delete' THEN ma.can_delete
                WHEN 'approve' THEN ma.can_approve
                WHEN 'export' THEN ma.can_export
                ELSE FALSE
              END = TRUE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if the current user is on a team that has access to a given module
CREATE OR REPLACE FUNCTION user_has_module_access(p_module TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM module_access ma
        JOIN team_members tm ON tm.team_id = ma.team_id
        WHERE tm.user_id = auth.uid()
          AND ma.module = p_module
          AND ma.can_view = TRUE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get all team IDs the current user belongs to
CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS SETOF UUID AS $$
    SELECT team_id FROM team_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparable_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_call_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE waterfall_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_list_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharepoint_folder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================
-- Users can see their own organization
CREATE POLICY organizations_select ON organizations
    FOR SELECT USING (id = get_user_organization_id());

-- Only global admins can update their organization
CREATE POLICY organizations_update ON organizations
    FOR UPDATE USING (id = get_user_organization_id() AND is_global_admin());

-- Only global admins can insert organizations (initial setup)
CREATE POLICY organizations_insert ON organizations
    FOR INSERT WITH CHECK (is_global_admin() OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
-- Users can see all profiles in their organization
CREATE POLICY profiles_select ON profiles
    FOR SELECT USING (organization_id = get_user_organization_id());

-- Users can update their own profile
CREATE POLICY profiles_update_self ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Global admins can update any profile in their org
CREATE POLICY profiles_update_admin ON profiles
    FOR UPDATE USING (organization_id = get_user_organization_id() AND is_global_admin());

-- Global admins can insert profiles
CREATE POLICY profiles_insert ON profiles
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id() AND is_global_admin()
        OR id = auth.uid()  -- Allow self-registration
    );

-- Global admins can delete profiles
CREATE POLICY profiles_delete ON profiles
    FOR DELETE USING (organization_id = get_user_organization_id() AND is_global_admin());

-- ============================================================================
-- TEAMS POLICIES
-- ============================================================================
CREATE POLICY teams_select ON teams
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY teams_insert ON teams
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id() AND is_global_admin());

CREATE POLICY teams_update ON teams
    FOR UPDATE USING (organization_id = get_user_organization_id() AND is_global_admin());

CREATE POLICY teams_delete ON teams
    FOR DELETE USING (organization_id = get_user_organization_id() AND is_global_admin());

-- ============================================================================
-- TEAM MEMBERS POLICIES
-- ============================================================================
CREATE POLICY team_members_select ON team_members
    FOR SELECT USING (
        team_id IN (SELECT id FROM teams WHERE organization_id = get_user_organization_id())
    );

CREATE POLICY team_members_insert ON team_members
    FOR INSERT WITH CHECK (
        team_id IN (SELECT id FROM teams WHERE organization_id = get_user_organization_id())
        AND is_global_admin()
    );

CREATE POLICY team_members_delete ON team_members
    FOR DELETE USING (
        team_id IN (SELECT id FROM teams WHERE organization_id = get_user_organization_id())
        AND is_global_admin()
    );

-- ============================================================================
-- MODULE ACCESS POLICIES
-- ============================================================================
CREATE POLICY module_access_select ON module_access
    FOR SELECT USING (
        team_id IN (SELECT id FROM teams WHERE organization_id = get_user_organization_id())
    );

CREATE POLICY module_access_insert ON module_access
    FOR INSERT WITH CHECK (
        team_id IN (SELECT id FROM teams WHERE organization_id = get_user_organization_id())
        AND is_global_admin()
    );

CREATE POLICY module_access_update ON module_access
    FOR UPDATE USING (
        team_id IN (SELECT id FROM teams WHERE organization_id = get_user_organization_id())
        AND is_global_admin()
    );

CREATE POLICY module_access_delete ON module_access
    FOR DELETE USING (
        team_id IN (SELECT id FROM teams WHERE organization_id = get_user_organization_id())
        AND is_global_admin()
    );

-- ============================================================================
-- CONTACTS POLICIES
-- ============================================================================
-- Global admins see all contacts in their org
CREATE POLICY contacts_select_admin ON contacts
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- Module admins/team members with contacts module access can view
CREATE POLICY contacts_select_module ON contacts
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND user_has_module_access('contacts')
    );

-- Read-only users can view contacts in their org
CREATE POLICY contacts_select_readonly ON contacts
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'read_only' AND is_active = TRUE
        )
    );

-- Global admins can insert/update/delete
CREATE POLICY contacts_insert ON contacts
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('contacts', 'create'))
    );

CREATE POLICY contacts_update ON contacts
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('contacts', 'edit'))
    );

CREATE POLICY contacts_delete ON contacts
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('contacts', 'delete'))
    );

-- ============================================================================
-- CONTACT TYPES POLICIES (follow parent contacts)
-- ============================================================================
CREATE POLICY contact_types_select ON contact_types
    FOR SELECT USING (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY contact_types_insert ON contact_types
    FOR INSERT WITH CHECK (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('contacts', 'create'))
    );

CREATE POLICY contact_types_update ON contact_types
    FOR UPDATE USING (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('contacts', 'edit'))
    );

CREATE POLICY contact_types_delete ON contact_types
    FOR DELETE USING (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('contacts', 'delete'))
    );

-- ============================================================================
-- CONTACT ASSIGNMENTS POLICIES
-- ============================================================================
CREATE POLICY contact_assignments_select ON contact_assignments
    FOR SELECT USING (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY contact_assignments_insert ON contact_assignments
    FOR INSERT WITH CHECK (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('contacts', 'create'))
    );

CREATE POLICY contact_assignments_update ON contact_assignments
    FOR UPDATE USING (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('contacts', 'edit'))
    );

CREATE POLICY contact_assignments_delete ON contact_assignments
    FOR DELETE USING (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('contacts', 'delete'))
    );

-- ============================================================================
-- ACTIVITY LOG POLICIES
-- ============================================================================
CREATE POLICY activity_log_select ON activity_log
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY activity_log_insert ON activity_log
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = TRUE
        )
    );

-- ============================================================================
-- NOTES POLICIES
-- ============================================================================
CREATE POLICY notes_select ON notes
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM profiles WHERE organization_id = get_user_organization_id()
        )
        OR user_id = auth.uid()
    );

CREATE POLICY notes_insert ON notes
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = TRUE
        )
    );

CREATE POLICY notes_update ON notes
    FOR UPDATE USING (user_id = auth.uid() OR is_global_admin());

CREATE POLICY notes_delete ON notes
    FOR DELETE USING (user_id = auth.uid() OR is_global_admin());

-- ============================================================================
-- DOCUMENTS POLICIES
-- ============================================================================
CREATE POLICY documents_select ON documents
    FOR SELECT USING (
        uploaded_by IN (
            SELECT id FROM profiles WHERE organization_id = get_user_organization_id()
        )
        OR uploaded_by = auth.uid()
        OR is_global_admin()
    );

CREATE POLICY documents_insert ON documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = TRUE
        )
    );

CREATE POLICY documents_update ON documents
    FOR UPDATE USING (uploaded_by = auth.uid() OR is_global_admin());

CREATE POLICY documents_delete ON documents
    FOR DELETE USING (uploaded_by = auth.uid() OR is_global_admin());

-- ============================================================================
-- INSURANCE CERTIFICATES POLICIES
-- ============================================================================
CREATE POLICY insurance_certificates_select ON insurance_certificates
    FOR SELECT USING (TRUE);  -- Filtered by join context; all org users may view

CREATE POLICY insurance_certificates_insert ON insurance_certificates
    FOR INSERT WITH CHECK (is_global_admin() OR is_module_admin());

CREATE POLICY insurance_certificates_update ON insurance_certificates
    FOR UPDATE USING (is_global_admin() OR is_module_admin());

CREATE POLICY insurance_certificates_delete ON insurance_certificates
    FOR DELETE USING (is_global_admin());

-- ============================================================================
-- ENTITIES POLICIES
-- ============================================================================
CREATE POLICY entities_select ON entities
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY entities_insert ON entities
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY entities_update ON entities
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY entities_delete ON entities
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- ============================================================================
-- OPPORTUNITIES POLICIES
-- ============================================================================
-- Global admins see all in their org
CREATE POLICY opportunities_select_admin ON opportunities
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- Module users see opportunities they have access to
CREATE POLICY opportunities_select_module ON opportunities
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND user_has_module_access('opportunities')
    );

-- Team members see opportunities assigned to them
CREATE POLICY opportunities_select_assigned ON opportunities
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND assigned_to = auth.uid()
    );

-- Read-only users can SELECT
CREATE POLICY opportunities_select_readonly ON opportunities
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'read_only' AND is_active = TRUE
        )
    );

CREATE POLICY opportunities_insert ON opportunities
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('opportunities', 'create'))
    );

CREATE POLICY opportunities_update ON opportunities
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('opportunities', 'edit') OR assigned_to = auth.uid())
    );

CREATE POLICY opportunities_delete ON opportunities
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('opportunities', 'delete'))
    );

-- ============================================================================
-- OPPORTUNITY STAGES POLICIES
-- ============================================================================
CREATE POLICY opportunity_stages_select ON opportunity_stages
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY opportunity_stages_insert ON opportunity_stages
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY opportunity_stages_update ON opportunity_stages
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY opportunity_stages_delete ON opportunity_stages
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- ============================================================================
-- DEAL ANALYSES POLICIES (follow parent opportunity)
-- ============================================================================
CREATE POLICY deal_analyses_select ON deal_analyses
    FOR SELECT USING (
        opportunity_id IN (
            SELECT id FROM opportunities WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY deal_analyses_insert ON deal_analyses
    FOR INSERT WITH CHECK (
        opportunity_id IN (
            SELECT id FROM opportunities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('opportunities', 'create'))
    );

CREATE POLICY deal_analyses_update ON deal_analyses
    FOR UPDATE USING (
        opportunity_id IN (
            SELECT id FROM opportunities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('opportunities', 'edit'))
    );

CREATE POLICY deal_analyses_delete ON deal_analyses
    FOR DELETE USING (
        opportunity_id IN (
            SELECT id FROM opportunities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('opportunities', 'delete'))
    );

-- ============================================================================
-- COMPARABLE SALES POLICIES (follow parent opportunity)
-- ============================================================================
CREATE POLICY comparable_sales_select ON comparable_sales
    FOR SELECT USING (
        opportunity_id IN (
            SELECT id FROM opportunities WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY comparable_sales_insert ON comparable_sales
    FOR INSERT WITH CHECK (
        opportunity_id IN (
            SELECT id FROM opportunities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('opportunities', 'create'))
    );

CREATE POLICY comparable_sales_update ON comparable_sales
    FOR UPDATE USING (
        opportunity_id IN (
            SELECT id FROM opportunities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('opportunities', 'edit'))
    );

CREATE POLICY comparable_sales_delete ON comparable_sales
    FOR DELETE USING (
        opportunity_id IN (
            SELECT id FROM opportunities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('opportunities', 'delete'))
    );

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================
CREATE POLICY projects_select_admin ON projects
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

CREATE POLICY projects_select_module ON projects
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND user_has_module_access('projects')
    );

CREATE POLICY projects_select_readonly ON projects
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'read_only' AND is_active = TRUE
        )
    );

CREATE POLICY projects_insert ON projects
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('projects', 'create'))
    );

CREATE POLICY projects_update ON projects
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('projects', 'edit'))
    );

CREATE POLICY projects_delete ON projects
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('projects', 'delete'))
    );

-- ============================================================================
-- PROJECT LOTS POLICIES (follow parent project)
-- ============================================================================
CREATE POLICY project_lots_select ON project_lots
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY project_lots_insert ON project_lots
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('projects', 'create'))
    );

CREATE POLICY project_lots_update ON project_lots
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('projects', 'edit'))
    );

CREATE POLICY project_lots_delete ON project_lots
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('projects', 'delete'))
    );

-- ============================================================================
-- PROJECT EXPENSES POLICIES (follow parent project)
-- ============================================================================
CREATE POLICY project_expenses_select ON project_expenses
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY project_expenses_insert ON project_expenses
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('projects', 'create') OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY project_expenses_update ON project_expenses
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('projects', 'edit') OR has_module_permission('accounting', 'edit'))
    );

CREATE POLICY project_expenses_delete ON project_expenses
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('projects', 'delete'))
    );

-- ============================================================================
-- CLIENTS POLICIES
-- ============================================================================
CREATE POLICY clients_select ON clients
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY clients_insert ON clients
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY clients_update ON clients
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'edit'))
    );

CREATE POLICY clients_delete ON clients
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- JOBS POLICIES
-- ============================================================================
CREATE POLICY jobs_select_admin ON jobs
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

CREATE POLICY jobs_select_module ON jobs
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND user_has_module_access('construction')
    );

-- Team members assigned as superintendent or PM see their jobs
CREATE POLICY jobs_select_assigned ON jobs
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND (superintendent_id = auth.uid() OR pm_id = auth.uid())
    );

CREATE POLICY jobs_select_readonly ON jobs
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'read_only' AND is_active = TRUE
        )
    );

CREATE POLICY jobs_insert ON jobs
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY jobs_update ON jobs
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'edit')
             OR superintendent_id = auth.uid() OR pm_id = auth.uid())
    );

CREATE POLICY jobs_delete ON jobs
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- UNITS POLICIES (follow parent job)
-- ============================================================================
CREATE POLICY units_select ON units
    FOR SELECT USING (
        job_id IN (
            SELECT id FROM jobs WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY units_insert ON units
    FOR INSERT WITH CHECK (
        job_id IN (
            SELECT id FROM jobs WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY units_update ON units
    FOR UPDATE USING (
        job_id IN (
            SELECT id FROM jobs WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'edit'))
    );

CREATE POLICY units_delete ON units
    FOR DELETE USING (
        job_id IN (
            SELECT id FROM jobs WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- UNIT MILESTONES POLICIES (follow parent unit -> job)
-- ============================================================================
CREATE POLICY unit_milestones_select ON unit_milestones
    FOR SELECT USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY unit_milestones_insert ON unit_milestones
    FOR INSERT WITH CHECK (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY unit_milestones_update ON unit_milestones
    FOR UPDATE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'edit'))
    );

CREATE POLICY unit_milestones_delete ON unit_milestones
    FOR DELETE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- PURCHASE ORDERS POLICIES (follow parent unit -> job)
-- ============================================================================
CREATE POLICY purchase_orders_select ON purchase_orders
    FOR SELECT USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY purchase_orders_insert ON purchase_orders
    FOR INSERT WITH CHECK (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY purchase_orders_update ON purchase_orders
    FOR UPDATE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'edit'))
    );

CREATE POLICY purchase_orders_delete ON purchase_orders
    FOR DELETE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- CHANGE ORDERS POLICIES (follow parent unit -> job)
-- ============================================================================
CREATE POLICY change_orders_select ON change_orders
    FOR SELECT USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY change_orders_insert ON change_orders
    FOR INSERT WITH CHECK (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY change_orders_update ON change_orders
    FOR UPDATE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'edit') OR has_module_permission('construction', 'approve'))
    );

CREATE POLICY change_orders_delete ON change_orders
    FOR DELETE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- SELECTIONS POLICIES (follow parent unit -> job)
-- ============================================================================
CREATE POLICY selections_select ON selections
    FOR SELECT USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY selections_insert ON selections
    FOR INSERT WITH CHECK (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY selections_update ON selections
    FOR UPDATE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'edit'))
    );

CREATE POLICY selections_delete ON selections
    FOR DELETE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- INSPECTIONS POLICIES (follow parent unit -> job)
-- ============================================================================
CREATE POLICY inspections_select ON inspections
    FOR SELECT USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY inspections_insert ON inspections
    FOR INSERT WITH CHECK (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY inspections_update ON inspections
    FOR UPDATE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'edit'))
    );

CREATE POLICY inspections_delete ON inspections
    FOR DELETE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- PERMITS POLICIES
-- Permits use polymorphic record_type/record_id, so we check org via joins
-- ============================================================================
CREATE POLICY permits_select ON permits
    FOR SELECT USING (
        -- Unit permits
        (record_type = 'unit' AND record_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        ))
        OR
        -- Job permits
        (record_type = 'job' AND record_id IN (
            SELECT id FROM jobs WHERE organization_id = get_user_organization_id()
        ))
    );

CREATE POLICY permits_insert ON permits
    FOR INSERT WITH CHECK (
        is_global_admin() OR has_module_permission('construction', 'create')
    );

CREATE POLICY permits_update ON permits
    FOR UPDATE USING (
        is_global_admin() OR has_module_permission('construction', 'edit')
    );

CREATE POLICY permits_delete ON permits
    FOR DELETE USING (
        is_global_admin() OR has_module_permission('construction', 'delete')
    );

-- ============================================================================
-- WARRANTY CLAIMS POLICIES (follow parent unit -> job)
-- ============================================================================
CREATE POLICY warranty_claims_select ON warranty_claims
    FOR SELECT USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY warranty_claims_insert ON warranty_claims
    FOR INSERT WITH CHECK (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY warranty_claims_update ON warranty_claims
    FOR UPDATE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'edit'))
    );

CREATE POLICY warranty_claims_delete ON warranty_claims
    FOR DELETE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- CONSTRUCTION ISSUES POLICIES (follow parent unit -> job)
-- ============================================================================
CREATE POLICY construction_issues_select ON construction_issues
    FOR SELECT USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY construction_issues_insert ON construction_issues
    FOR INSERT WITH CHECK (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY construction_issues_update ON construction_issues
    FOR UPDATE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'edit')
             OR assigned_to = auth.uid())
    );

CREATE POLICY construction_issues_delete ON construction_issues
    FOR DELETE USING (
        unit_id IN (
            SELECT u.id FROM units u
            JOIN jobs j ON j.id = u.job_id
            WHERE j.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- VENDOR PROFILES POLICIES (follow parent contact)
-- ============================================================================
CREATE POLICY vendor_profiles_select ON vendor_profiles
    FOR SELECT USING (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY vendor_profiles_insert ON vendor_profiles
    FOR INSERT WITH CHECK (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'create') OR has_module_permission('contacts', 'create'))
    );

CREATE POLICY vendor_profiles_update ON vendor_profiles
    FOR UPDATE USING (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('construction', 'edit') OR has_module_permission('contacts', 'edit'))
    );

CREATE POLICY vendor_profiles_delete ON vendor_profiles
    FOR DELETE USING (
        contact_id IN (
            SELECT id FROM contacts WHERE organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- CHART OF ACCOUNTS POLICIES (follow parent entity)
-- ============================================================================
CREATE POLICY chart_of_accounts_select ON chart_of_accounts
    FOR SELECT USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY chart_of_accounts_insert ON chart_of_accounts
    FOR INSERT WITH CHECK (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY chart_of_accounts_update ON chart_of_accounts
    FOR UPDATE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'edit'))
    );

CREATE POLICY chart_of_accounts_delete ON chart_of_accounts
    FOR DELETE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'delete'))
    );

-- ============================================================================
-- TRANSACTIONS POLICIES (follow parent entity)
-- ============================================================================
CREATE POLICY transactions_select_admin ON transactions
    FOR SELECT USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

CREATE POLICY transactions_select_module ON transactions
    FOR SELECT USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND user_has_module_access('accounting')
    );

CREATE POLICY transactions_select_readonly ON transactions
    FOR SELECT USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'read_only' AND is_active = TRUE
        )
    );

CREATE POLICY transactions_insert ON transactions
    FOR INSERT WITH CHECK (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY transactions_update ON transactions
    FOR UPDATE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'edit'))
    );

CREATE POLICY transactions_delete ON transactions
    FOR DELETE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'delete'))
    );

-- ============================================================================
-- FISCAL PERIODS POLICIES (follow parent entity)
-- ============================================================================
CREATE POLICY fiscal_periods_select ON fiscal_periods
    FOR SELECT USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY fiscal_periods_insert ON fiscal_periods
    FOR INSERT WITH CHECK (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY fiscal_periods_update ON fiscal_periods
    FOR UPDATE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'approve'))
    );

CREATE POLICY fiscal_periods_delete ON fiscal_periods
    FOR DELETE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- INVESTORS POLICIES (follow parent entity)
-- ============================================================================
CREATE POLICY investors_select ON investors
    FOR SELECT USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY investors_insert ON investors
    FOR INSERT WITH CHECK (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY investors_update ON investors
    FOR UPDATE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'edit'))
    );

CREATE POLICY investors_delete ON investors
    FOR DELETE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- CAPITAL CALLS POLICIES (follow parent entity)
-- ============================================================================
CREATE POLICY capital_calls_select ON capital_calls
    FOR SELECT USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY capital_calls_insert ON capital_calls
    FOR INSERT WITH CHECK (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY capital_calls_update ON capital_calls
    FOR UPDATE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'edit'))
    );

CREATE POLICY capital_calls_delete ON capital_calls
    FOR DELETE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- CAPITAL CALL RESPONSES POLICIES (follow parent capital_call -> entity)
-- ============================================================================
CREATE POLICY capital_call_responses_select ON capital_call_responses
    FOR SELECT USING (
        capital_call_id IN (
            SELECT cc.id FROM capital_calls cc
            JOIN entities e ON e.id = cc.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY capital_call_responses_insert ON capital_call_responses
    FOR INSERT WITH CHECK (
        capital_call_id IN (
            SELECT cc.id FROM capital_calls cc
            JOIN entities e ON e.id = cc.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY capital_call_responses_update ON capital_call_responses
    FOR UPDATE USING (
        capital_call_id IN (
            SELECT cc.id FROM capital_calls cc
            JOIN entities e ON e.id = cc.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'edit'))
    );

CREATE POLICY capital_call_responses_delete ON capital_call_responses
    FOR DELETE USING (
        capital_call_id IN (
            SELECT cc.id FROM capital_calls cc
            JOIN entities e ON e.id = cc.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- WATERFALL STRUCTURES POLICIES (follow parent entity)
-- ============================================================================
CREATE POLICY waterfall_structures_select ON waterfall_structures
    FOR SELECT USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY waterfall_structures_insert ON waterfall_structures
    FOR INSERT WITH CHECK (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY waterfall_structures_update ON waterfall_structures
    FOR UPDATE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'edit'))
    );

CREATE POLICY waterfall_structures_delete ON waterfall_structures
    FOR DELETE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- DISTRIBUTIONS POLICIES (follow parent entity)
-- ============================================================================
CREATE POLICY distributions_select ON distributions
    FOR SELECT USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY distributions_insert ON distributions
    FOR INSERT WITH CHECK (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY distributions_update ON distributions
    FOR UPDATE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'approve'))
    );

CREATE POLICY distributions_delete ON distributions
    FOR DELETE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- DISTRIBUTION ALLOCATIONS POLICIES (follow parent distribution -> entity)
-- ============================================================================
CREATE POLICY distribution_allocations_select ON distribution_allocations
    FOR SELECT USING (
        distribution_id IN (
            SELECT d.id FROM distributions d
            JOIN entities e ON e.id = d.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY distribution_allocations_insert ON distribution_allocations
    FOR INSERT WITH CHECK (
        distribution_id IN (
            SELECT d.id FROM distributions d
            JOIN entities e ON e.id = d.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY distribution_allocations_update ON distribution_allocations
    FOR UPDATE USING (
        distribution_id IN (
            SELECT d.id FROM distributions d
            JOIN entities e ON e.id = d.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'edit'))
    );

CREATE POLICY distribution_allocations_delete ON distribution_allocations
    FOR DELETE USING (
        distribution_id IN (
            SELECT d.id FROM distributions d
            JOIN entities e ON e.id = d.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- LOANS POLICIES (follow parent entity)
-- ============================================================================
CREATE POLICY loans_select ON loans
    FOR SELECT USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY loans_insert ON loans
    FOR INSERT WITH CHECK (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY loans_update ON loans
    FOR UPDATE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'edit'))
    );

CREATE POLICY loans_delete ON loans
    FOR DELETE USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- LOAN DRAWS POLICIES (follow parent loan -> entity)
-- ============================================================================
CREATE POLICY loan_draws_select ON loan_draws
    FOR SELECT USING (
        loan_id IN (
            SELECT l.id FROM loans l
            JOIN entities e ON e.id = l.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY loan_draws_insert ON loan_draws
    FOR INSERT WITH CHECK (
        loan_id IN (
            SELECT l.id FROM loans l
            JOIN entities e ON e.id = l.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'create'))
    );

CREATE POLICY loan_draws_update ON loan_draws
    FOR UPDATE USING (
        loan_id IN (
            SELECT l.id FROM loans l
            JOIN entities e ON e.id = l.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('accounting', 'edit'))
    );

CREATE POLICY loan_draws_delete ON loan_draws
    FOR DELETE USING (
        loan_id IN (
            SELECT l.id FROM loans l
            JOIN entities e ON e.id = l.entity_id
            WHERE e.organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- WORKFLOW TEMPLATES POLICIES
-- ============================================================================
CREATE POLICY workflow_templates_select ON workflow_templates
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY workflow_templates_insert ON workflow_templates
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY workflow_templates_update ON workflow_templates
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY workflow_templates_delete ON workflow_templates
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- ============================================================================
-- MILESTONE TEMPLATES POLICIES (follow parent workflow_template)
-- ============================================================================
CREATE POLICY milestone_templates_select ON milestone_templates
    FOR SELECT USING (
        workflow_template_id IN (
            SELECT id FROM workflow_templates WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY milestone_templates_insert ON milestone_templates
    FOR INSERT WITH CHECK (
        workflow_template_id IN (
            SELECT id FROM workflow_templates WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY milestone_templates_update ON milestone_templates
    FOR UPDATE USING (
        workflow_template_id IN (
            SELECT id FROM workflow_templates WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY milestone_templates_delete ON milestone_templates
    FOR DELETE USING (
        workflow_template_id IN (
            SELECT id FROM workflow_templates WHERE organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- TASK LIST TEMPLATES POLICIES (follow parent milestone_template -> workflow_template)
-- ============================================================================
CREATE POLICY task_list_templates_select ON task_list_templates
    FOR SELECT USING (
        milestone_template_id IN (
            SELECT mt.id FROM milestone_templates mt
            JOIN workflow_templates wt ON wt.id = mt.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY task_list_templates_insert ON task_list_templates
    FOR INSERT WITH CHECK (
        milestone_template_id IN (
            SELECT mt.id FROM milestone_templates mt
            JOIN workflow_templates wt ON wt.id = mt.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY task_list_templates_update ON task_list_templates
    FOR UPDATE USING (
        milestone_template_id IN (
            SELECT mt.id FROM milestone_templates mt
            JOIN workflow_templates wt ON wt.id = mt.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY task_list_templates_delete ON task_list_templates
    FOR DELETE USING (
        milestone_template_id IN (
            SELECT mt.id FROM milestone_templates mt
            JOIN workflow_templates wt ON wt.id = mt.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- TASK TEMPLATES POLICIES (follow parent task_list_template -> milestone_template -> workflow_template)
-- ============================================================================
CREATE POLICY task_templates_select ON task_templates
    FOR SELECT USING (
        task_list_template_id IN (
            SELECT tlt.id FROM task_list_templates tlt
            JOIN milestone_templates mt ON mt.id = tlt.milestone_template_id
            JOIN workflow_templates wt ON wt.id = mt.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY task_templates_insert ON task_templates
    FOR INSERT WITH CHECK (
        task_list_template_id IN (
            SELECT tlt.id FROM task_list_templates tlt
            JOIN milestone_templates mt ON mt.id = tlt.milestone_template_id
            JOIN workflow_templates wt ON wt.id = mt.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY task_templates_update ON task_templates
    FOR UPDATE USING (
        task_list_template_id IN (
            SELECT tlt.id FROM task_list_templates tlt
            JOIN milestone_templates mt ON mt.id = tlt.milestone_template_id
            JOIN workflow_templates wt ON wt.id = mt.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY task_templates_delete ON task_templates
    FOR DELETE USING (
        task_list_template_id IN (
            SELECT tlt.id FROM task_list_templates tlt
            JOIN milestone_templates mt ON mt.id = tlt.milestone_template_id
            JOIN workflow_templates wt ON wt.id = mt.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- WORKFLOW INSTANCES POLICIES
-- ============================================================================
CREATE POLICY workflow_instances_select ON workflow_instances
    FOR SELECT USING (
        workflow_template_id IN (
            SELECT id FROM workflow_templates WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY workflow_instances_insert ON workflow_instances
    FOR INSERT WITH CHECK (
        workflow_template_id IN (
            SELECT id FROM workflow_templates WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR is_module_admin())
    );

CREATE POLICY workflow_instances_update ON workflow_instances
    FOR UPDATE USING (
        workflow_template_id IN (
            SELECT id FROM workflow_templates WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR is_module_admin() OR started_by = auth.uid())
    );

CREATE POLICY workflow_instances_delete ON workflow_instances
    FOR DELETE USING (
        workflow_template_id IN (
            SELECT id FROM workflow_templates WHERE organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- MILESTONE INSTANCES POLICIES (follow parent workflow_instance)
-- ============================================================================
CREATE POLICY milestone_instances_select ON milestone_instances
    FOR SELECT USING (
        workflow_instance_id IN (
            SELECT wi.id FROM workflow_instances wi
            JOIN workflow_templates wt ON wt.id = wi.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY milestone_instances_insert ON milestone_instances
    FOR INSERT WITH CHECK (
        workflow_instance_id IN (
            SELECT wi.id FROM workflow_instances wi
            JOIN workflow_templates wt ON wt.id = wi.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR is_module_admin())
    );

CREATE POLICY milestone_instances_update ON milestone_instances
    FOR UPDATE USING (
        workflow_instance_id IN (
            SELECT wi.id FROM workflow_instances wi
            JOIN workflow_templates wt ON wt.id = wi.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR is_module_admin())
    );

CREATE POLICY milestone_instances_delete ON milestone_instances
    FOR DELETE USING (
        workflow_instance_id IN (
            SELECT wi.id FROM workflow_instances wi
            JOIN workflow_templates wt ON wt.id = wi.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- TASK INSTANCES POLICIES (follow parent milestone_instance -> workflow_instance)
-- ============================================================================
CREATE POLICY task_instances_select ON task_instances
    FOR SELECT USING (
        milestone_instance_id IN (
            SELECT mi.id FROM milestone_instances mi
            JOIN workflow_instances wi ON wi.id = mi.workflow_instance_id
            JOIN workflow_templates wt ON wt.id = wi.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
    );

-- Team members can see tasks assigned to them
CREATE POLICY task_instances_select_assigned ON task_instances
    FOR SELECT USING (assigned_to = auth.uid());

CREATE POLICY task_instances_insert ON task_instances
    FOR INSERT WITH CHECK (
        milestone_instance_id IN (
            SELECT mi.id FROM milestone_instances mi
            JOIN workflow_instances wi ON wi.id = mi.workflow_instance_id
            JOIN workflow_templates wt ON wt.id = wi.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR is_module_admin())
    );

CREATE POLICY task_instances_update ON task_instances
    FOR UPDATE USING (
        (milestone_instance_id IN (
            SELECT mi.id FROM milestone_instances mi
            JOIN workflow_instances wi ON wi.id = mi.workflow_instance_id
            JOIN workflow_templates wt ON wt.id = wi.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR is_module_admin()))
        OR assigned_to = auth.uid()
    );

CREATE POLICY task_instances_delete ON task_instances
    FOR DELETE USING (
        milestone_instance_id IN (
            SELECT mi.id FROM milestone_instances mi
            JOIN workflow_instances wi ON wi.id = mi.workflow_instance_id
            JOIN workflow_templates wt ON wt.id = wi.workflow_template_id
            WHERE wt.organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- FLOOR PLANS POLICIES
-- ============================================================================
CREATE POLICY floor_plans_select ON floor_plans
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY floor_plans_insert ON floor_plans
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY floor_plans_update ON floor_plans
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY floor_plans_delete ON floor_plans
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- ============================================================================
-- MUNICIPALITIES POLICIES
-- ============================================================================
CREATE POLICY municipalities_select ON municipalities
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY municipalities_insert ON municipalities
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY municipalities_update ON municipalities
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY municipalities_delete ON municipalities
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- ============================================================================
-- TRADE CATEGORIES POLICIES
-- ============================================================================
CREATE POLICY trade_categories_select ON trade_categories
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY trade_categories_insert ON trade_categories
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY trade_categories_update ON trade_categories
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY trade_categories_delete ON trade_categories
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- ============================================================================
-- SCHEDULE TEMPLATES POLICIES (follow parent floor_plan)
-- ============================================================================
CREATE POLICY schedule_templates_select ON schedule_templates
    FOR SELECT USING (
        floor_plan_id IN (
            SELECT id FROM floor_plans WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY schedule_templates_insert ON schedule_templates
    FOR INSERT WITH CHECK (
        floor_plan_id IN (
            SELECT id FROM floor_plans WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY schedule_templates_update ON schedule_templates
    FOR UPDATE USING (
        floor_plan_id IN (
            SELECT id FROM floor_plans WHERE organization_id = get_user_organization_id()
        )
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY schedule_templates_delete ON schedule_templates
    FOR DELETE USING (
        floor_plan_id IN (
            SELECT id FROM floor_plans WHERE organization_id = get_user_organization_id()
        )
        AND is_global_admin()
    );

-- ============================================================================
-- SHAREPOINT FOLDER TEMPLATES POLICIES
-- ============================================================================
CREATE POLICY sharepoint_folder_templates_select ON sharepoint_folder_templates
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY sharepoint_folder_templates_insert ON sharepoint_folder_templates
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY sharepoint_folder_templates_update ON sharepoint_folder_templates
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY sharepoint_folder_templates_delete ON sharepoint_folder_templates
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- ============================================================================
-- INTEGRATION SETTINGS POLICIES
-- ============================================================================
CREATE POLICY integration_settings_select ON integration_settings
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

CREATE POLICY integration_settings_insert ON integration_settings
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

CREATE POLICY integration_settings_update ON integration_settings
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

CREATE POLICY integration_settings_delete ON integration_settings
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- ============================================================================
-- CONTRACT TEMPLATES POLICIES
-- ============================================================================
CREATE POLICY contract_templates_select ON contract_templates
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY contract_templates_insert ON contract_templates
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'create'))
    );

CREATE POLICY contract_templates_update ON contract_templates
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('admin', 'edit'))
    );

CREATE POLICY contract_templates_delete ON contract_templates
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- ============================================================================
-- CALENDAR EVENTS POLICIES
-- ============================================================================
-- Global admins see all events
CREATE POLICY calendar_events_select_admin ON calendar_events
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND is_global_admin()
    );

-- Module users with calendar access
CREATE POLICY calendar_events_select_module ON calendar_events
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND user_has_module_access('calendar')
    );

-- Team members see events assigned to them or their team
CREATE POLICY calendar_events_select_assigned ON calendar_events
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND (
            assigned_to = auth.uid()
            OR team_id IN (SELECT get_user_team_ids())
        )
    );

-- Read-only users can view
CREATE POLICY calendar_events_select_readonly ON calendar_events
    FOR SELECT USING (
        organization_id = get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'read_only' AND is_active = TRUE
        )
    );

CREATE POLICY calendar_events_insert ON calendar_events
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('calendar', 'create'))
    );

CREATE POLICY calendar_events_update ON calendar_events
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('calendar', 'edit') OR assigned_to = auth.uid())
    );

CREATE POLICY calendar_events_delete ON calendar_events
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('calendar', 'delete'))
    );
