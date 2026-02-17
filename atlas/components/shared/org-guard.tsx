"use client"

import { useOrganizationId } from "@/lib/hooks/use-organization"
import { Loader2, AlertTriangle } from "lucide-react"

/**
 * OrgGuard ensures the current user has a resolved organization_id before
 * rendering dashboard content.  If the user's profile has no org yet, the
 * useOrganizationId hook auto-assigns the first available org.  This guard
 * shows a spinner while that resolution happens and an error banner if the
 * user truly has no org to join.
 */
export function OrgGuard({ children }: { children: React.ReactNode }) {
  const { organizationId, loading, error } = useOrganizationId()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !organizationId) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold">No Organization Found</h2>
          <p className="text-sm text-muted-foreground">
            {error ??
              "Your account is not associated with an organization. Please contact your administrator to get access."}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
