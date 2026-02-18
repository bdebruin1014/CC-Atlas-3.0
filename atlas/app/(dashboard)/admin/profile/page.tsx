"use client"

import { useQuery } from "@tanstack/react-query"
import { User, Mail, Shield } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProfilePage() {
  const supabase = createClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
      return { ...(data as any), email: user.email }
    },
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const initials =
    `${(profile?.first_name || "")[0] || ""}${(profile?.last_name || "")[0] || ""}`.toUpperCase() || "?"

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-[#1a5632] text-lg text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">
                {[profile?.first_name, profile?.last_name]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                {(profile?.role || "team_member").replace(/_/g, " ")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">
                  {profile?.email || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-medium capitalize">
                  {(profile?.role || "team_member").replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="text-sm font-medium font-mono text-xs">
                  {profile?.id || "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
