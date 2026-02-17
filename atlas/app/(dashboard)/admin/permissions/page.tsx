"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Shield,
  Loader2,
  Save,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

interface Team {
  id: string
  name: string
}

interface ModuleAccess {
  id?: string
  module: string
  team_id: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  can_approve: boolean
  can_export: boolean
}

const MODULES = [
  "opportunities",
  "projects",
  "construction",
  "accounting",
  "contacts",
  "calendar",
  "admin",
]

const MODULE_LABELS: Record<string, string> = {
  opportunities: "Opportunities",
  projects: "Projects",
  construction: "Construction",
  accounting: "Accounting",
  contacts: "Contacts",
  calendar: "Calendar",
  admin: "Admin",
}

const PERMISSION_KEYS: Array<{ key: keyof ModuleAccess; label: string; abbrev: string }> = [
  { key: "can_view", label: "View", abbrev: "V" },
  { key: "can_create", label: "Create", abbrev: "C" },
  { key: "can_edit", label: "Edit", abbrev: "E" },
  { key: "can_delete", label: "Delete", abbrev: "D" },
  { key: "can_approve", label: "Approve", abbrev: "A" },
  { key: "can_export", label: "Export", abbrev: "X" },
]

const ROLE_LEGEND = [
  {
    role: "Global Admin",
    description: "Full access to all modules and settings",
    color: "bg-red-100 text-red-800",
  },
  {
    role: "Module Admin",
    description: "Full access to assigned modules",
    color: "bg-orange-100 text-orange-800",
  },
  {
    role: "Team Member",
    description: "View/Create/Edit within team scope",
    color: "bg-blue-100 text-blue-800",
  },
  {
    role: "Read-Only",
    description: "View-only access to assigned modules",
    color: "bg-gray-100 text-gray-600",
  },
]

export default function PermissionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [accessMatrix, setAccessMatrix] = useState<ModuleAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name")
        .order("name", { ascending: true })

      if (teamsError) throw teamsError

      const { data: accessData, error: accessError } = await supabase
        .from("module_access")
        .select("*")

      if (accessError) throw accessError

      setTeams((teamsData as Team[]) || [])

      const existingAccess = (accessData as ModuleAccess[]) || []
      const fullMatrix: ModuleAccess[] = []

      for (const team of teamsData || []) {
        for (const mod of MODULES) {
          const existing = existingAccess.find(
            (a) => a.team_id === team.id && a.module === mod
          )
          fullMatrix.push(
            existing || {
              module: mod,
              team_id: team.id,
              can_view: false,
              can_create: false,
              can_edit: false,
              can_delete: false,
              can_approve: false,
              can_export: false,
            }
          )
        }
      }

      setAccessMatrix(fullMatrix)
      setHasChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load permissions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const togglePermission = (
    teamId: string,
    module: string,
    permKey: keyof ModuleAccess
  ) => {
    setAccessMatrix((prev) =>
      prev.map((access) => {
        if (access.team_id === teamId && access.module === module) {
          return { ...access, [permKey]: !access[permKey] }
        }
        return access
      })
    )
    setHasChanges(true)
  }

  const getAccess = (teamId: string, module: string): ModuleAccess | undefined => {
    return accessMatrix.find(
      (a) => a.team_id === teamId && a.module === module
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()

      const toUpsert = accessMatrix.filter(
        (a) =>
          a.can_view ||
          a.can_create ||
          a.can_edit ||
          a.can_delete ||
          a.can_approve ||
          a.can_export ||
          a.id
      )

      for (const access of toUpsert) {
        if (access.id) {
          const { error: updateError } = await supabase
            .from("module_access")
            .update({
              can_view: access.can_view,
              can_create: access.can_create,
              can_edit: access.can_edit,
              can_delete: access.can_delete,
              can_approve: access.can_approve,
              can_export: access.can_export,
            })
            .eq("id", access.id)

          if (updateError) throw updateError
        } else {
          const hasAnyPermission =
            access.can_view ||
            access.can_create ||
            access.can_edit ||
            access.can_delete ||
            access.can_approve ||
            access.can_export

          if (hasAnyPermission) {
            const { error: insertError } = await supabase
              .from("module_access")
              .insert({
                module: access.module,
                team_id: access.team_id,
                can_view: access.can_view,
                can_create: access.can_create,
                can_edit: access.can_edit,
                can_delete: access.can_delete,
                can_approve: access.can_approve,
                can_export: access.can_export,
              })

            if (insertError) throw insertError
          }
        }
      }

      toast({
        title: "Permissions saved",
        description: "Module access permissions have been updated for all teams.",
      })
      setHasChanges(false)
      fetchData()
    } catch {
      toast({
        title: "Error",
        description: "Failed to save permissions",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Permissions</h1>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Configure module access for each team
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
              Unsaved Changes
            </Badge>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>

      {/* Role Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Role Legend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {ROLE_LEGEND.map((role) => (
              <div key={role.role} className="flex items-center gap-2">
                <Badge className={cn("text-xs", role.color)}>{role.role}</Badge>
                <span className="text-xs text-muted-foreground">
                  {role.description}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {teams.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No teams configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create teams first to configure their module access permissions.
            </p>
            <Button variant="outline" onClick={() => router.push("/admin/teams")}>
              Go to Teams
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Permissions Matrix */}
      {teams.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[180px]">
                    Team / Module
                  </th>
                  {MODULES.map((mod) => (
                    <th
                      key={mod}
                      colSpan={PERMISSION_KEYS.length}
                      className="h-12 px-2 text-center text-sm font-medium text-muted-foreground border-l"
                    >
                      {MODULE_LABELS[mod]}
                    </th>
                  ))}
                </tr>
                <tr className="border-b bg-muted/30">
                  <th className="h-8 px-4 text-left text-xs text-muted-foreground sticky left-0 bg-muted/30 z-10">
                    Permissions
                  </th>
                  {MODULES.map((mod) =>
                    PERMISSION_KEYS.map((perm) => (
                      <th
                        key={`${mod}-${perm.key}`}
                        className={cn(
                          "h-8 px-1 text-center text-xs text-muted-foreground",
                          perm.key === "can_view" && "border-l"
                        )}
                        title={perm.label}
                      >
                        {perm.abbrev}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr
                    key={team.id}
                    className="border-b hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-2 font-medium text-sm sticky left-0 bg-card z-10">
                      {team.name}
                    </td>
                    {MODULES.map((mod) => {
                      const access = getAccess(team.id, mod)
                      return PERMISSION_KEYS.map((perm) => (
                        <td
                          key={`${team.id}-${mod}-${perm.key}`}
                          className={cn(
                            "px-1 py-2 text-center",
                            perm.key === "can_view" && "border-l"
                          )}
                        >
                          <label className="flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={
                                (access?.[perm.key] as boolean) ?? false
                              }
                              onChange={() =>
                                togglePermission(team.id, mod, perm.key)
                              }
                              className={cn(
                                "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer",
                                "accent-primary"
                              )}
                            />
                          </label>
                        </td>
                      ))
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>V = View</span>
              <span>C = Create</span>
              <span>E = Edit</span>
              <span>D = Delete</span>
              <span>A = Approve</span>
              <span>X = Export</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {teams.length} team{teams.length !== 1 ? "s" : ""} x {MODULES.length}{" "}
              modules
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
