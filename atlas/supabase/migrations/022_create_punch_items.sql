-- ============================================================================
-- Migration 022: Punch Items
-- ATLAS Platform - Red Cedar Homes
-- Table: punch_items
-- ============================================================================

CREATE TABLE punch_items (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id             UUID REFERENCES organizations(id) ON DELETE CASCADE,
    job_id                      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    unit_id                     UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    item_number                 INTEGER NOT NULL DEFAULT 0,
    room                        TEXT NOT NULL CHECK (room IN (
                                    'exterior','garage','kitchen','living_room',
                                    'dining_room','master_bedroom','master_bath',
                                    'bedroom_2','bedroom_3','bathroom_2','bathroom_3',
                                    'laundry','hallway','closet','porch_patio','other'
                                )),
    category                    TEXT NOT NULL CHECK (category IN (
                                    'paint','drywall','trim','flooring','plumbing',
                                    'electrical','hvac','appliance','door_window',
                                    'hardware','cleaning','landscaping','concrete','other'
                                )),
    description                 TEXT NOT NULL,
    assigned_vendor_contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
    priority                    TEXT NOT NULL CHECK (priority IN ('low','medium','high','critical')) DEFAULT 'medium',
    status                      TEXT NOT NULL CHECK (status IN ('open','in_progress','complete','verified','disputed')) DEFAULT 'open',
    round                       INTEGER NOT NULL DEFAULT 1,
    photos                      TEXT[],
    back_charge_vendor_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    back_charge_amount          NUMERIC(14,2),
    completed_at                TIMESTAMPTZ,
    completed_by                UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at                 TIMESTAMPTZ,
    verified_by                 UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes                       TEXT,
    created_by                  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUTO-INCREMENT item_number PER UNIT
-- ============================================================================
CREATE OR REPLACE FUNCTION set_punch_item_number()
RETURNS TRIGGER AS $$
BEGIN
    SELECT COALESCE(MAX(item_number), 0) + 1
    INTO NEW.item_number
    FROM punch_items
    WHERE unit_id = NEW.unit_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_punch_item_number
    BEFORE INSERT ON punch_items
    FOR EACH ROW
    EXECUTE FUNCTION set_punch_item_number();

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_punch_items_org ON punch_items(organization_id);
CREATE INDEX idx_punch_items_job ON punch_items(job_id);
CREATE INDEX idx_punch_items_unit ON punch_items(unit_id);
CREATE INDEX idx_punch_items_status ON punch_items(status);
CREATE INDEX idx_punch_items_vendor ON punch_items(assigned_vendor_contact_id);
CREATE INDEX idx_punch_items_room ON punch_items(room);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE punch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY punch_items_select ON punch_items
    FOR SELECT USING (
        organization_id = get_user_organization_id()
    );

CREATE POLICY punch_items_insert ON punch_items
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'create'))
    );

CREATE POLICY punch_items_update ON punch_items
    FOR UPDATE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'edit'))
    );

CREATE POLICY punch_items_delete ON punch_items
    FOR DELETE USING (
        organization_id = get_user_organization_id()
        AND (is_global_admin() OR has_module_permission('construction', 'delete'))
    );

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_punch_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_punch_items_updated_at
    BEFORE UPDATE ON punch_items
    FOR EACH ROW
    EXECUTE FUNCTION update_punch_items_updated_at();
