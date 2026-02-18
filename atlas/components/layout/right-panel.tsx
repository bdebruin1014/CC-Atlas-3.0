"use client"

import React, { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import {
  X,
  Plus,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  MessageSquare,
  Activity,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react"
import { format, formatDistanceToNow, isPast, isToday } from "date-fns"

import { cn } from "@/lib/utils/format"
import { useUIStore } from "@/lib/stores/ui-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import {
  useRecordTasks,
  useUpdateTask,
} from "@/lib/hooks/use-tasks"
import type { StandaloneTask } from "@/lib/hooks/use-tasks"

// ---------------------------------------------------------------------------
// Detect which record we're viewing from the URL
// ---------------------------------------------------------------------------

function useRecordContext(): {
  recordType: string
  recordId: string
} | null {
  const pathname = usePathname()

  // /opportunities/[id]...
  const oppMatch = pathname.match(
    /^\/opportunities\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/
  )
  if (oppMatch) return { recordType: "opportunity", recordId: oppMatch[1] }

  // /projects/[id]...
  const projMatch = pathname.match(
    /^\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/
  )
  if (projMatch) return { recordType: "project", recordId: projMatch[1] }

  // /construction/jobs/[id]...
  const conMatch = pathname.match(
    /^\/construction\/jobs\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/
  )
  if (conMatch) return { recordType: "job", recordId: conMatch[1] }

  // /disposition/[id]...
  const dspMatch = pathname.match(
    /^\/disposition\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/
  )
  if (dspMatch) return { recordType: "listing", recordId: dspMatch[1] }

  return null
}

// ---------------------------------------------------------------------------
// Notes types & hooks (inline — lightweight for the panel)
// ---------------------------------------------------------------------------

interface PanelNote {
  id: string
  content: string
  created_by_name: string
  created_at: string
}

function usePanelNotes(recordType: string, recordId: string) {
  const [notes, setNotes] = useState<PanelNote[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotes = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("record_notes")
      .select("id, content, created_by_name, created_at")
      .eq("record_type", recordType)
      .eq("record_id", recordId)
      .order("created_at", { ascending: false })
      .limit(20)

    setNotes((data as PanelNote[]) ?? [])
    setLoading(false)
  }, [recordType, recordId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  return { notes, loading, refetch: fetchNotes }
}

// ---------------------------------------------------------------------------
// Activity types
// ---------------------------------------------------------------------------

interface PanelActivity {
  id: string
  action: string
  description: string | null
  created_at: string
  user?: { full_name: string } | null
}

function usePanelActivity(recordType: string, recordId: string) {
  const [activities, setActivities] = useState<PanelActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from("activity_log")
        .select("id, action, description, created_at, user:profiles(full_name)")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .limit(20)

      setActivities((data as unknown as PanelActivity[]) ?? [])
      setLoading(false)
    }
    fetch()
  }, [recordType, recordId])

  return { activities, loading }
}

// ---------------------------------------------------------------------------
// Collapsible section wrapper
// ---------------------------------------------------------------------------

function PanelSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#5A6B75]">
          {title}
        </span>
        {count !== undefined && (
          <Badge
            variant="secondary"
            className="ml-auto h-4 rounded-full px-1.5 text-[9px] font-medium"
          >
            {count}
          </Badge>
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tasks section content
// ---------------------------------------------------------------------------

function TasksContent({
  recordType,
  recordId,
}: {
  recordType: string
  recordId: string
}) {
  const { data: tasks = [], isLoading } = useRecordTasks(recordType, recordId)
  const updateTask = useUpdateTask()

  const incomplete = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled"
  )
  const completed = tasks.filter((t) => t.status === "completed")

  const toggleTask = (task: StandaloneTask) => {
    const newStatus = task.status === "completed" ? "not_started" : "completed"
    updateTask.mutate({
      id: task.id,
      status: newStatus,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-6 w-full animate-pulse rounded bg-muted" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-amber-600" />
          <p className="text-xs text-amber-800">
            No tasks on this record yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {incomplete.map((task) => (
        <div key={task.id} className="flex items-start gap-2">
          <Checkbox
            checked={false}
            onCheckedChange={() => toggleTask(task)}
            className="mt-0.5 h-3.5 w-3.5"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-tight">{task.title}</p>
            {task.due_date && (
              <p
                className={cn(
                  "text-[10px]",
                  isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {isToday(new Date(task.due_date))
                  ? "Due today"
                  : format(new Date(task.due_date), "MMM d")}
              </p>
            )}
          </div>
        </div>
      ))}
      {completed.length > 0 && (
        <div className="mt-2 border-t border-dashed pt-2">
          <p className="mb-1 text-[10px] text-muted-foreground">
            {completed.length} completed
          </p>
          {completed.slice(0, 3).map((task) => (
            <div key={task.id} className="flex items-start gap-2 opacity-50">
              <Checkbox
                checked={true}
                onCheckedChange={() => toggleTask(task)}
                className="mt-0.5 h-3.5 w-3.5"
              />
              <p className="text-xs leading-tight line-through">
                {task.title}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notes section content
// ---------------------------------------------------------------------------

function NotesContent({
  recordType,
  recordId,
}: {
  recordType: string
  recordId: string
}) {
  const { notes, loading, refetch } = usePanelNotes(recordType, recordId)
  const [newNote, setNewNote] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()

      // Get current user name
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data: profile } = user
        ? await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", user.id)
            .single()
        : { data: null }

      const displayName = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unknown"
        : "Unknown"

      await supabase.from("record_notes").insert({
        record_type: recordType,
        record_id: recordId,
        content: newNote.trim(),
        created_by: user?.id,
        created_by_name: displayName,
      })

      setNewNote("")
      refetch()
    } catch {
      // silent fail
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Add note */}
      <div className="flex gap-1.5">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="min-h-[60px] text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit()
            }
          }}
        />
      </div>
      {newNote.trim() && (
        <Button
          size="sm"
          className="h-6 gap-1 text-xs"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          Save
        </Button>
      )}

      {/* Notes list */}
      {loading ? (
        <div className="space-y-2">
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded border border-border bg-muted/30 p-2"
            >
              <p className="text-xs whitespace-pre-wrap">{note.content}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {note.created_by_name} &middot;{" "}
                {formatDistanceToNow(new Date(note.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Activity section content
// ---------------------------------------------------------------------------

function ActivityContent({
  recordType,
  recordId,
}: {
  recordType: string
  recordId: string
}) {
  const { activities, loading } = usePanelActivity(recordType, recordId)

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-6 w-full animate-pulse rounded bg-muted" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No activity recorded.</p>
    )
  }

  return (
    <div className="space-y-2">
      {activities.map((act) => (
        <div key={act.id} className="flex gap-2">
          <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
          <div className="min-w-0">
            <p className="text-xs">{act.action}</p>
            {act.description && (
              <p className="text-[10px] text-muted-foreground">
                {act.description}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              {act.user?.full_name ? `${act.user.full_name} · ` : ""}
              {formatDistanceToNow(new Date(act.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Right Panel
// ---------------------------------------------------------------------------

const TABS = [
  { key: "tasks" as const, label: "TASKS" },
  { key: "notes" as const, label: "NOTES" },
  { key: "activity" as const, label: "ACTIVITY" },
]

export function RightPanel() {
  const { rightPanelOpen, rightPanelTab, setRightPanelOpen, setRightPanelTab } =
    useUIStore()
  const context = useRecordContext()

  if (!rightPanelOpen) return null

  // Only show on record detail pages
  if (!context) return null

  const { recordType, recordId } = context

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-[var(--border)] bg-white dark:bg-[var(--sidebar)]">
      {/* Tab header */}
      <div className="flex items-center border-b border-[var(--border)]">
        <div className="flex flex-1 items-center">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRightPanelTab(tab.key)}
              className={cn(
                "px-3 py-2.5 text-[11px] font-medium tracking-wide transition-colors",
                rightPanelTab === tab.key
                  ? "border-b-2 border-[#1a5632] text-[#1a5632]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setRightPanelOpen(false)}
          className="mr-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {rightPanelTab === "tasks" && (
            <PanelSection
              title="Tasks"
              defaultOpen={true}
            >
              <TasksContent
                recordType={recordType}
                recordId={recordId}
              />
            </PanelSection>
          )}

          {rightPanelTab === "notes" && (
            <PanelSection
              title="Notes"
              defaultOpen={true}
            >
              <NotesContent
                recordType={recordType}
                recordId={recordId}
              />
            </PanelSection>
          )}

          {rightPanelTab === "activity" && (
            <PanelSection
              title="Activity"
              defaultOpen={true}
            >
              <ActivityContent
                recordType={recordType}
                recordId={recordId}
              />
            </PanelSection>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
