-- ============================================================================
-- Migration 006: Workflow Tables
-- ATLAS Platform - Red Cedar Homes
-- Tables: workflow_templates, milestone_templates, task_list_templates,
--         task_templates, workflow_instances, milestone_instances,
--         task_instances
-- ============================================================================

-- ============================================================================
-- WORKFLOW TEMPLATES
-- ============================================================================
CREATE TABLE workflow_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    description         TEXT,
    workflow_type       TEXT CHECK (workflow_type IN (
                            'opportunity', 'project', 'construction',
                            'onboarding', 'closing', 'custom'
                        )),
    trigger_event       TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    version             INTEGER DEFAULT 1,
    created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_templates_organization_id ON workflow_templates(organization_id);
CREATE INDEX idx_workflow_templates_workflow_type ON workflow_templates(workflow_type);
CREATE INDEX idx_workflow_templates_is_active ON workflow_templates(is_active);

-- ============================================================================
-- MILESTONE TEMPLATES
-- ============================================================================
CREATE TABLE milestone_templates (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_template_id    UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,
    description             TEXT,
    sequence                INTEGER NOT NULL,
    duration_days           INTEGER,
    is_required             BOOLEAN DEFAULT TRUE,
    entry_criteria          TEXT,
    exit_criteria           TEXT,
    UNIQUE(workflow_template_id, sequence)
);

CREATE INDEX idx_milestone_templates_workflow_template_id ON milestone_templates(workflow_template_id);

-- ============================================================================
-- TASK LIST TEMPLATES
-- ============================================================================
CREATE TABLE task_list_templates (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_template_id       UUID NOT NULL REFERENCES milestone_templates(id) ON DELETE CASCADE,
    name                        TEXT NOT NULL,
    description                 TEXT,
    sequence                    INTEGER NOT NULL,
    UNIQUE(milestone_template_id, sequence)
);

CREATE INDEX idx_task_list_templates_milestone_template_id ON task_list_templates(milestone_template_id);

-- ============================================================================
-- TASK TEMPLATES
-- ============================================================================
CREATE TABLE task_templates (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_list_template_id       UUID NOT NULL REFERENCES task_list_templates(id) ON DELETE CASCADE,
    name                        TEXT NOT NULL,
    description                 TEXT,
    sequence                    INTEGER NOT NULL,
    default_assignee_role       TEXT,
    duration_days               INTEGER,
    is_required                 BOOLEAN DEFAULT TRUE,
    depends_on_task_template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
    auto_complete_trigger       TEXT,
    UNIQUE(task_list_template_id, sequence)
);

CREATE INDEX idx_task_templates_task_list_template_id ON task_templates(task_list_template_id);
CREATE INDEX idx_task_templates_depends_on ON task_templates(depends_on_task_template_id);

-- ============================================================================
-- WORKFLOW INSTANCES
-- ============================================================================
CREATE TABLE workflow_instances (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_template_id    UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE RESTRICT,
    record_type             TEXT,
    record_id               UUID,
    name                    TEXT NOT NULL,
    status                  TEXT CHECK (status IN (
                                'not_started', 'in_progress', 'completed',
                                'cancelled', 'on_hold'
                            )) DEFAULT 'not_started',
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    started_by              UUID REFERENCES profiles(id) ON DELETE SET NULL,
    current_milestone_id    UUID,  -- FK added below after milestone_instances created
    progress_pct            NUMERIC(5,2) DEFAULT 0,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_instances_workflow_template_id ON workflow_instances(workflow_template_id);
CREATE INDEX idx_workflow_instances_record ON workflow_instances(record_type, record_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);

-- ============================================================================
-- MILESTONE INSTANCES
-- ============================================================================
CREATE TABLE milestone_instances (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id        UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    milestone_template_id       UUID REFERENCES milestone_templates(id) ON DELETE SET NULL,
    name                        TEXT NOT NULL,
    sequence                    INTEGER NOT NULL,
    status                      TEXT CHECK (status IN (
                                    'not_started', 'in_progress', 'completed',
                                    'skipped', 'blocked'
                                )) DEFAULT 'not_started',
    planned_start_date          DATE,
    planned_end_date            DATE,
    actual_start_date           DATE,
    actual_end_date             DATE,
    completed_by                UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestone_instances_workflow_instance_id ON milestone_instances(workflow_instance_id);
CREATE INDEX idx_milestone_instances_status ON milestone_instances(status);

-- Add FK from workflow_instances.current_milestone_id to milestone_instances
ALTER TABLE workflow_instances
    ADD CONSTRAINT fk_workflow_instances_current_milestone
    FOREIGN KEY (current_milestone_id) REFERENCES milestone_instances(id) ON DELETE SET NULL;

-- ============================================================================
-- TASK INSTANCES
-- ============================================================================
CREATE TABLE task_instances (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_instance_id       UUID NOT NULL REFERENCES milestone_instances(id) ON DELETE CASCADE,
    task_template_id            UUID REFERENCES task_templates(id) ON DELETE SET NULL,
    task_list_name              TEXT,
    name                        TEXT NOT NULL,
    description                 TEXT,
    sequence                    INTEGER NOT NULL,
    assigned_to                 UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status                      TEXT CHECK (status IN (
                                    'not_started', 'in_progress', 'completed',
                                    'skipped', 'blocked'
                                )) DEFAULT 'not_started',
    due_date                    DATE,
    completed_at                TIMESTAMPTZ,
    completed_by                UUID REFERENCES profiles(id) ON DELETE SET NULL,
    depends_on_task_instance_id UUID REFERENCES task_instances(id) ON DELETE SET NULL,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_instances_milestone_instance_id ON task_instances(milestone_instance_id);
CREATE INDEX idx_task_instances_assigned_to ON task_instances(assigned_to);
CREATE INDEX idx_task_instances_status ON task_instances(status);
CREATE INDEX idx_task_instances_due_date ON task_instances(due_date);
CREATE INDEX idx_task_instances_depends_on ON task_instances(depends_on_task_instance_id);

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_workflow_templates
    BEFORE UPDATE ON workflow_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_workflow_instances
    BEFORE UPDATE ON workflow_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_milestone_instances
    BEFORE UPDATE ON milestone_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_task_instances
    BEFORE UPDATE ON task_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
