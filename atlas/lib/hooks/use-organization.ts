"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Resolves the current user's organization_id from their profile.
 * If the profile has no organization_id yet, auto-assigns the first
 * available organization. If NO organizations exist at all, creates a
 * default "Red Cedar Homes" organization so the user can start working
 * immediately. The profile is upserted so subsequent loads are instant.
 */
export function useOrganizationId() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      try {
        const supabase = createClient()
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser()

        if (authErr || !user) {
          if (!cancelled) setError("Not authenticated")
          return
        }

        // 1. Check profile for an existing organization_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single()

        if (profile?.organization_id) {
          if (!cancelled) setOrganizationId(profile.organization_id)
          return
        }

        // 2. No org on profile — find the first organization
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id")
          .limit(1)

        let orgId: string

        if (orgs && orgs.length > 0) {
          orgId = orgs[0].id
        } else {
          // 3. No organizations exist — create the default one.
          //    The RLS policy allows this when the user has no profile
          //    or has no organization_id assigned yet (migration 017).
          const { data: newOrg, error: createErr } = await supabase
            .from("organizations")
            .insert({ name: "Red Cedar Homes" })
            .select("id")
            .single()

          if (createErr || !newOrg) {
            if (!cancelled) {
              setError(
                createErr?.message ??
                  "Failed to create default organization. Please contact your administrator."
              )
            }
            return
          }

          orgId = newOrg.id
        }

        // 4. Upsert the profile so future loads are instant.
        //    Makes the first user a global_admin for full access.
        if (profile) {
          // Profile row exists — just update it
          await supabase
            .from("profiles")
            .update({ organization_id: orgId, role: "global_admin" })
            .eq("id", user.id)
        } else {
          // No profile row yet — insert one
          await supabase
            .from("profiles")
            .insert({
              id: user.id,
              organization_id: orgId,
              role: "global_admin",
              email: user.email ?? null,
              first_name: user.user_metadata?.first_name ?? null,
              last_name: user.user_metadata?.last_name ?? null,
            })
        }

        if (!cancelled) setOrganizationId(orgId)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to resolve organization")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [])

  return { organizationId, loading, error }
}
