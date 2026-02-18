"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar } from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import { createClient } from "@/lib/supabase/client"

interface ActivityEntry {
  id: string
  action: string
  description: string | null
  created_at: string
  user?: { full_name: string } | null
}

export default function OpportunityActivityPage() {
  const { id } = useParams()
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from("activity_log")
        .select("id, action, description, created_at, user:profiles(full_name)")
        .eq("record_type", "opportunity")
        .eq("record_id", id as string)
        .order("created_at", { ascending: false })
        .limit(50)

      setActivities((data as unknown as ActivityEntry[]) ?? [])
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Calendar className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">
          No activity recorded yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {activities.map((act) => (
        <div
          key={act.id}
          className="flex gap-4 border-l-2 border-border pb-6 pl-4 last:pb-0"
        >
          <div className="flex-1">
            <p className="text-sm font-medium">{act.action}</p>
            {act.description && (
              <p className="text-sm text-muted-foreground">{act.description}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {act.user?.full_name ? `${act.user.full_name} - ` : ""}
              {formatDate(act.created_at, { includeTime: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
