"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  Plus,
  Pencil,
  ArrowRight,
  MessageSquare,
  Upload,
  Clock,
  Loader2,
  History,
  Trash2,
  Link,
  Eye,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/format"
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionType =
  | "created"
  | "updated"
  | "status_changed"
  | "comment"
  | "document_uploaded"
  | "deleted"
  | "linked"
  | "viewed"
  | "assigned"

interface ActivityEntry {
  id: string
  record_type: string
  record_id: string
  action: ActionType
  description: string
  user_name: string
  user_avatar?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface ActivityFeedProps {
  recordType: string
  recordId: string
  limit?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_ICONS: Record<ActionType, React.ElementType> = {
  created: Plus,
  updated: Pencil,
  status_changed: ArrowRight,
  comment: MessageSquare,
  document_uploaded: Upload,
  deleted: Trash2,
  linked: Link,
  viewed: Eye,
  assigned: UserPlus,
}

const ACTION_COLORS: Record<ActionType, string> = {
  created: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  updated: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  status_changed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  comment: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  document_uploaded: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  deleted: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  linked: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  viewed: "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400",
  assigned: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  const diffWeek = Math.floor(diffDay / 7)

  if (diffSec < 60) return "just now"
  if (diffMin === 1) return "1 minute ago"
  if (diffMin < 60) return `${diffMin} minutes ago`
  if (diffHr === 1) return "1 hour ago"
  if (diffHr < 24) return `${diffHr} hours ago`
  if (diffDay === 1) return "yesterday"
  if (diffDay < 7) return `${diffDay} days ago`
  if (diffWeek === 1) return "1 week ago"
  if (diffWeek < 4) return `${diffWeek} weeks ago`
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

// ---------------------------------------------------------------------------
// ActivityFeed
// ---------------------------------------------------------------------------

export function ActivityFeed({
  recordType,
  recordId,
  limit = 20,
}: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const supabase = createClient()

  // ---- Fetch entries ----
  const fetchEntries = useCallback(
    async (currentOffset: number, append = false) => {
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      try {
        const { data, error } = await supabase
          .from("activity_log")
          .select("*")
          .eq("record_type", recordType)
          .eq("record_id", recordId)
          .order("created_at", { ascending: false })
          .range(currentOffset, currentOffset + limit - 1)

        if (error) throw error

        const fetched = (data as unknown as ActivityEntry[]) ?? []
        setHasMore(fetched.length === limit)

        if (append) {
          setEntries((prev) => [...prev, ...fetched])
        } else {
          setEntries(fetched)
        }
      } catch (err) {
        console.error("Failed to fetch activity log:", err)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [supabase, recordType, recordId, limit]
  )

  useEffect(() => {
    setOffset(0)
    fetchEntries(0)
  }, [fetchEntries])

  const loadMore = useCallback(() => {
    const newOffset = offset + limit
    setOffset(newOffset)
    fetchEntries(newOffset, true)
  }, [offset, limit, fetchEntries])

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Activity</h3>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
              {i < 4 && <div className="h-10 w-px bg-border" />}
            </div>
            <div className="flex-1 space-y-1 pb-4">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          Activity{" "}
          <span className="font-normal text-muted-foreground">({entries.length}{hasMore ? "+" : ""})</span>
        </h3>
      </div>

      {/* Timeline */}
      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No activity recorded yet.
        </p>
      ) : (
        <div className="relative">
          {entries.map((entry, idx) => {
            const Icon = ACTION_ICONS[entry.action] ?? Clock
            const colorClass =
              ACTION_COLORS[entry.action] ??
              "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
            const isLast = idx === entries.length - 1

            return (
              <div key={entry.id} className="flex gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      colorClass
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
                  <p className="text-sm">
                    <span className="font-medium">{entry.user_name}</span>{" "}
                    <span className="text-muted-foreground">{entry.description}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRelativeTime(entry.created_at)}
                  </p>
                  {/* Show status change details if available */}
                  {entry.action === "status_changed" && entry.metadata && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      <span className="rounded bg-muted px-1.5 py-0.5">
                        {String(entry.metadata.from_status ?? "")}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="rounded bg-muted px-1.5 py-0.5">
                        {String(entry.metadata.to_status ?? "")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
