"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Resolves the current user's organization_id from their profile.
 * If the profile has no organization_id yet, auto-assigns the first
 * available organization and patches the profile so subsequent loads are instant.
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

        // 2. No org on profile — find the first organization the user can see
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .limit(1)
          .single()

        if (!org) {
          if (!cancelled) setError("No organization found. Please contact your administrator.")
          return
        }

        // 3. Patch the profile so future loads are instant
        await supabase
          .from("profiles")
          .update({ organization_id: org.id })
          .eq("id", user.id)

        if (!cancelled) setOrganizationId(org.id)
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
