-- ============================================================================
-- 017_add_tasks_module.sql
-- Standalone tasks module: standalone_tasks table + all_tasks_view
-- ============================================================================

-- ---------------------------------------------------------------------------
-- standalone_tasks: tasks not tied to any workflow
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS standalone_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'not_started'
                  CHECK (status IN ('not_started','in_progress','completed','cancelled')),
  priority      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  completed_by  UUID REFERENCES profiles(id),
  module        TEXT DEFAULT 'general'
                  CHECK (module IN ('opportunity','project','construction','disposition','general')),
  linked_record_id UUID,
  tags          TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_standalone_tasks_org     ON standalone_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_standalone_tasks_assigned ON standalone_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_standalone_tasks_status   ON standalone_tasks(status);
CREATE INDEX IF NOT EXISTS idx_standalone_tasks_due      ON standalone_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_standalone_tasks_module   ON standalone_tasks(module);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_standalone_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_standalone_tasks_updated_at
  BEFORE UPDATE ON standalone_tasks
  FOR EACH ROW EXECUTE FUNCTION update_standalone_tasks_updated_at();

-- ---------------------------------------------------------------------------
-- all_tasks_view: unified view of standalone + workflow tasks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW all_tasks_view AS
  -- Standalone tasks
  SELECT
    st.id,
    'standalone' AS source,
    st.organization_id,
    st.title,
    st.description,
    st.status,
    st.priority,
    st.assigned_to,
    st.created_by,
    st.due_date,
    st.completed_at,
    st.module,
    st.linked_record_id,
    st.tags,
    st.created_at,
    st.updated_at
  FROM standalone_tasks st

  UNION ALL

  -- Workflow task instances
  SELECT
    ti.id,
    'workflow' AS source,
    wi.organization_id,
    ti.name AS title,
    ti.description,
    ti.status,
    COALESCE(ti.priority, 'medium') AS priority,
    ti.assigned_to,
    wi.created_by,
    ti.due_date,
    ti.completed_at,
    wi.record_type AS module,
    wi.record_id AS linked_record_id,
    '{}'::TEXT[] AS tags,
    ti.created_at,
    ti.updated_at
  FROM task_instances ti
  JOIN milestone_instances mi ON mi.id = ti.milestone_instance_id
  JOIN workflow_instances wi  ON wi.id = mi.workflow_instance_id;

-- RLS policies
ALTER TABLE standalone_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their organization"
  ON standalone_tasks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks in their organization"
  ON standalone_tasks FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their organization"
  ON standalone_tasks FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own standalone tasks"
  ON standalone_tasks FOR DELETE
  USING (
    created_by = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('global_admin','module_admin')
    )
  );
