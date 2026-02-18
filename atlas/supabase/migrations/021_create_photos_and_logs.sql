-- ============================================================================
-- Migration 021: Construction Photos, Photo Requirements & Daily Logs
-- ATLAS Platform - Red Cedar Homes
-- Tables: construction_photos, milestone_photo_requirements, daily_logs
-- ============================================================================

-- ============================================================================
-- CONSTRUCTION PHOTOS
-- ============================================================================
CREATE TABLE construction_photos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
    job_id              UUID REFERENCES jobs(id) ON DELETE CASCADE,
    unit_id             UUID REFERENCES units(id) ON DELETE SET NULL,
    milestone_id        UUID REFERENCES unit_milestones(id) ON DELETE SET NULL,
    file_url            TEXT NOT NULL,
    thumbnail_url       TEXT,
    file_name           TEXT,
    file_size           INTEGER,
    caption             TEXT,
    category            TEXT CHECK (category IN (
                            'progress', 'inspection', 'issue', 'completion',
                            'before', 'after', 'aerial', 'other'
                        )) DEFAULT 'progress',
    taken_date          DATE,
    taken_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
    latitude            NUMERIC(10,7),
    longitude           NUMERIC(10,7),
    tags                TEXT[],
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_construction_photos_org ON construction_photos(organization_id);
CREATE INDEX idx_construction_photos_job ON construction_photos(job_id);
CREATE INDEX idx_construction_photos_unit ON construction_photos(unit_id);
CREATE INDEX idx_construction_photos_milestone ON construction_photos(milestone_id);
CREATE INDEX idx_construction_photos_category ON construction_photos(category);
CREATE INDEX idx_construction_photos_taken_date ON construction_photos(taken_date);

-- ============================================================================
-- MILESTONE PHOTO REQUIREMENTS (config table)
-- ============================================================================
CREATE TABLE milestone_photo_requirements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_sequence  INTEGER NOT NULL UNIQUE,
    required_count      INTEGER DEFAULT 2,
    required_angles     TEXT[],
    description         TEXT
);

-- ============================================================================
-- DAILY LOGS
-- ============================================================================
CREATE TABLE daily_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,
    job_id                  UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    log_date                DATE NOT NULL,
    weather                 TEXT,
    temperature_high        INTEGER,
    temperature_low         INTEGER,
    wind                    TEXT,
    crew_count              INTEGER,
    subcontractors_on_site  TEXT[],
    work_performed          TEXT NOT NULL,
    materials_delivered     TEXT,
    equipment_on_site       TEXT,
    safety_incidents        TEXT,
    visitor_log             TEXT,
    delays                  TEXT,
    delay_reason            TEXT,
    notes                   TEXT,
    created_by              UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, log_date)
);

CREATE INDEX idx_daily_logs_org ON daily_logs(organization_id);
CREATE INDEX idx_daily_logs_job ON daily_logs(job_id);
CREATE INDEX idx_daily_logs_date ON daily_logs(log_date);
CREATE INDEX idx_daily_logs_created_by ON daily_logs(created_by);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE construction_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_photo_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- construction_photos policies
CREATE POLICY construction_photos_select ON construction_photos
    FOR SELECT USING (
        organization_id = get_user_organization_id()
    );

CREATE POLICY construction_photos_insert ON construction_photos
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY construction_photos_update ON construction_photos
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'edit'))
    );

CREATE POLICY construction_photos_delete ON construction_photos
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- milestone_photo_requirements policies (read-only for most users)
CREATE POLICY milestone_photo_requirements_select ON milestone_photo_requirements
    FOR SELECT USING (true);

CREATE POLICY milestone_photo_requirements_manage ON milestone_photo_requirements
    FOR ALL USING (is_global_admin());

-- daily_logs policies
CREATE POLICY daily_logs_select ON daily_logs
    FOR SELECT USING (
        organization_id = get_user_organization_id()
    );

CREATE POLICY daily_logs_insert ON daily_logs
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY daily_logs_update ON daily_logs
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'edit'))
    );

CREATE POLICY daily_logs_delete ON daily_logs
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- UPDATED_AT TRIGGER for daily_logs
-- ============================================================================
CREATE OR REPLACE FUNCTION update_daily_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_daily_logs_updated_at
    BEFORE UPDATE ON daily_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_logs_updated_at();

-- ============================================================================
-- SEED MILESTONE PHOTO REQUIREMENTS (all 16 construction phases)
-- ============================================================================
INSERT INTO milestone_photo_requirements (milestone_sequence, required_count, required_angles, description) VALUES
(1,  2, ARRAY['front','site_overview'],                       'Pre-Construction: site conditions before work begins'),
(2,  2, ARRAY['front','permit_board'],                        'Permitting: permit board posted, lot staking'),
(3,  3, ARRAY['front','rear','grading'],                      'Site Work: erosion control, rough grading, utility trenches'),
(4,  4, ARRAY['front','rear','interior','footer'],            'Foundation: footers, stem walls, waterproofing'),
(5,  4, ARRAY['front','rear','interior','framing_detail'],    'Framing: structural framing from all angles'),
(6,  3, ARRAY['front','rear','roof_detail'],                  'Roofing: shingles/membrane installed'),
(7,  3, ARRAY['interior','mechanical_room','rough_plumbing'], 'MEP Rough-In: electrical, plumbing, HVAC rough'),
(8,  2, ARRAY['interior','insulation_detail'],                'Insulation: wall and attic insulation installed'),
(9,  2, ARRAY['interior','drywall_detail'],                   'Drywall: hung, taped, and finished'),
(10, 3, ARRAY['interior','trim_detail','stairs'],             'Interior Trim: baseboards, casings, stairs'),
(11, 3, ARRAY['kitchen','bathrooms','countertops'],           'Cabinets & Countertops: installed and inspected'),
(12, 2, ARRAY['interior','fixtures'],                         'MEP Finish: fixtures, outlets, switches final'),
(13, 3, ARRAY['interior','paint_detail','flooring'],          'Paint & Flooring: final finishes applied'),
(14, 3, ARRAY['front','rear','landscaping'],                  'Exterior Finish: siding, paint, landscaping'),
(15, 4, ARRAY['front','rear','interior','punch_list'],        'Final Punch & Clean: all deficiencies addressed'),
(16, 3, ARRAY['front','rear','interior'],                     'Certificate of Occupancy: final completed condition');
