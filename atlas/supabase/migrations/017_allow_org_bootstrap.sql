-- ============================================================================
-- Migration 017: Allow organization bootstrap for users without an org
-- ============================================================================
-- The original policies only allowed org inserts by global_admins or users
-- with no profile row.  This left a gap: a user whose profile exists but
-- has a NULL organization_id could not create the first organization, nor
-- read it back after creation.  This migration widens the INSERT and SELECT
-- policies so that bootstrapping a brand-new org works end-to-end.
-- ============================================================================

-- Allow INSERT when the user has no org assigned yet
DROP POLICY IF EXISTS organizations_insert ON organizations;

CREATE POLICY organizations_insert ON organizations
    FOR INSERT WITH CHECK (
        is_global_admin()
        OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
        OR (SELECT organization_id FROM profiles WHERE id = auth.uid()) IS NULL
    );

-- Allow SELECT for the user's own org AND for any org when the user has
-- no org assigned yet (needed to read back the row right after INSERT,
-- before the profile is patched).
DROP POLICY IF EXISTS organizations_select ON organizations;

CREATE POLICY organizations_select ON organizations
    FOR SELECT USING (
        id = get_user_organization_id()
        OR (SELECT organization_id FROM profiles WHERE id = auth.uid()) IS NULL
    );
