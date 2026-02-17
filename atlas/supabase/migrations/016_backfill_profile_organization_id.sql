-- ---------------------------------------------------------------------------
-- One-time backfill: assign organization_id to profiles that lack one.
--
-- For each profile where organization_id IS NULL, this assigns the ID of
-- the first (oldest) organization visible to the user.  If the deployment
-- is single-tenant (one org), every profile ends up on the same org.
--
-- Safe to re-run: the WHERE clause skips profiles that already have a value.
-- ---------------------------------------------------------------------------

UPDATE profiles
SET    organization_id = (
         SELECT id
         FROM   organizations
         ORDER BY created_at ASC
         LIMIT  1
       ),
       updated_at = now()
WHERE  organization_id IS NULL;
