"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  ArrowLeft,
  Users,
  Loader2,
  X,
  UserPlus,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

interface Team {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  member_count?: number
}

interface TeamMember {
  id: string
  team_id: string
  user_id: string
  profile?: {
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
  }
}

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
}

export default function TeamsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showManageDialog, setShowManageDialog] = useState(false)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .order("name", { ascending: true })

      if (teamsError) throw teamsError

      const teamsWithCounts: Team[] = []
      for (const team of (teamsData as unknown as Team[]) || []) {
        const { count } = await supabase
          .from("team_members")
          .select("id", { count: "exact", head: true })
          .eq("team_id", team.id)

        teamsWithCounts.push({
          ...(team as any),
          member_count: count ?? 0,
        })
      }

      setTeams(teamsWithCounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch teams")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const handleCreateTeam = async (data: { name: string; description: string }) => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error: insertError } = await supabase.from("teams").insert({
        organization_id: user?.user_metadata?.organization_id || "",
        name: data.name,
        description: data.description || null,
      })

      if (insertError) throw insertError
      toast({ title: "Team created" })
      fetchTeams()
      setShowCreateDialog(false)
    } catch {
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
          <p className="text-sm text-muted-foreground">
            {teams.length} team{teams.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          Create Team
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchTeams}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && teams.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No teams yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first team to organize members and permissions.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Cards */}
      {!loading && !error && teams.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => {
                setSelectedTeam(team)
                setShowManageDialog(true)
              }}
            >
              <CardHeader>
                <CardTitle className="text-lg">{team.name}</CardTitle>
                {team.description && (
                  <CardDescription>{team.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {team.member_count} member
                    {team.member_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateTeamDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSave={handleCreateTeam}
      />

      {/* Manage Dialog */}
      {selectedTeam && (
        <ManageTeamDialog
          team={selectedTeam}
          open={showManageDialog}
          onOpenChange={setShowManageDialog}
          onUpdate={fetchTeams}
        />
      )}
    </div>
  )
}

function CreateTeamDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { name: string; description: string }) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (open) {
      setName("")
      setDescription("")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({ name, description })
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Teams are used to organize members and manage permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Team Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Construction Management"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this team's purpose..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ManageTeamDialog({
  team,
  open,
  onOpenChange,
  onUpdate,
}: {
  team: Team
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}) {
  const { toast } = useToast()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [adding, setAdding] = useState(false)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const { data: memberData } = await supabase
        .from("team_members")
        .select("*, profile:profiles(first_name, last_name, email, role)")
        .eq("team_id", team.id)

      setMembers((memberData as unknown as TeamMember[]) || [])

      const memberUserIds = ((memberData || []) as unknown as { user_id: string }[]).map((m) => m.user_id)

      const { data: allUsers } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role")
        .eq("is_active", true)

      const available = (allUsers || []).filter(
        (u: Profile) => !memberUserIds.includes(u.id)
      )
      setAvailableUsers(available)
    } catch {
      setMembers([])
      setAvailableUsers([])
    } finally {
      setLoading(false)
    }
  }, [team.id])

  useEffect(() => {
    if (open) {
      fetchMembers()
    }
  }, [open, fetchMembers])

  const addMember = async () => {
    if (!selectedUserId) return
    setAdding(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: selectedUserId,
      })

      if (error) throw error
      toast({ title: "Member added" })
      setSelectedUserId("")
      fetchMembers()
      onUpdate()
    } catch {
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive",
      })
    } finally {
      setAdding(false)
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId)

      if (error) throw error
      toast({ title: "Member removed" })
      fetchMembers()
      onUpdate()
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      })
    }
  }

  const getRoleBadgeStyle = (role: string | null) => {
    switch (role) {
      case "global_admin":
        return "bg-red-100 text-red-800"
      case "module_admin":
        return "bg-orange-100 text-orange-800"
      case "team_member":
        return "bg-blue-100 text-blue-800"
      case "read_only":
        return "bg-gray-100 text-gray-600"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case "global_admin":
        return "Global Admin"
      case "module_admin":
        return "Module Admin"
      case "team_member":
        return "Team Member"
      case "read_only":
        return "Read Only"
      default:
        return "Unknown"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{team.name}</DialogTitle>
          <DialogDescription>
            {team.description || "Manage team members"}
          </DialogDescription>
        </DialogHeader>

        {/* Add Member */}
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a user to add..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.length === 0 ? (
                <SelectItem value="none" disabled>
                  No available users
                </SelectItem>
              ) : (
                availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}{" "}
                    {user.email ? `(${user.email})` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={addMember}
            disabled={!selectedUserId || adding}
          >
            <UserPlus className="h-4 w-4" />
            {adding ? "Adding..." : "Add"}
          </Button>
        </div>

        {/* Members List */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">
            Members ({members.length})
          </h4>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No members in this team yet.
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {(member.profile?.first_name?.[0] || "?").toUpperCase()}
                      {(member.profile?.last_name?.[0] || "").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.profile?.first_name || "Unknown"}{" "}
                        {member.profile?.last_name || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.profile?.email || "No email"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "text-xs",
                        getRoleBadgeStyle(member.profile?.role || null)
                      )}
                    >
                      {getRoleLabel(member.profile?.role || null)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMember(member.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
