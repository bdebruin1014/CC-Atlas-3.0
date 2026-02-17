"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Send,
  Loader2,
  MessageSquare,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils/format"
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Note {
  id: string
  record_type: string
  record_id: string
  content: string
  is_pinned: boolean
  created_by: string
  created_by_name: string
  created_by_avatar?: string | null
  created_at: string
  updated_at: string
}

export interface NotesPanelProps {
  recordType: string
  recordId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// ---------------------------------------------------------------------------
// NotesPanel
// ---------------------------------------------------------------------------

export function NotesPanel({ recordType, recordId }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newContent, setNewContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const supabase = createClient()

  // ---- Load current user ----
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
    }
    loadUser()
  }, [supabase.auth])

  // ---- Fetch notes ----
  const fetchNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error
      setNotes((data as Note[]) ?? [])
    } catch (err) {
      console.error("Failed to fetch notes:", err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, recordType, recordId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // ---- Create note ----
  const handleCreate = useCallback(async () => {
    const content = newContent.trim()
    if (!content) return

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase.from("notes").insert({
        record_type: recordType,
        record_id: recordId,
        content,
        is_pinned: false,
        created_by: user.id,
        created_by_name: user.user_metadata?.full_name ?? user.email ?? "Unknown",
        created_by_avatar: user.user_metadata?.avatar_url ?? null,
      })

      if (error) throw error
      setNewContent("")
      await fetchNotes()
    } catch (err) {
      console.error("Failed to create note:", err)
    } finally {
      setIsSaving(false)
    }
  }, [supabase, newContent, recordType, recordId, fetchNotes])

  // ---- Toggle pin ----
  const handleTogglePin = useCallback(
    async (note: Note) => {
      try {
        const { error } = await supabase
          .from("notes")
          .update({ is_pinned: !note.is_pinned })
          .eq("id", note.id)

        if (error) throw error
        await fetchNotes()
      } catch (err) {
        console.error("Failed to toggle pin:", err)
      }
    },
    [supabase, fetchNotes]
  )

  // ---- Edit note ----
  const startEdit = useCallback((note: Note) => {
    setEditingId(note.id)
    setEditContent(note.content)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditContent("")
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId || !editContent.trim()) return

    try {
      const { error } = await supabase
        .from("notes")
        .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
        .eq("id", editingId)

      if (error) throw error
      setEditingId(null)
      setEditContent("")
      await fetchNotes()
    } catch (err) {
      console.error("Failed to update note:", err)
    }
  }, [supabase, editingId, editContent, fetchNotes])

  // ---- Delete note ----
  const handleDelete = useCallback(
    async (noteId: string) => {
      try {
        const { error } = await supabase.from("notes").delete().eq("id", noteId)

        if (error) throw error
        setDeleteConfirmId(null)
        await fetchNotes()
      } catch (err) {
        console.error("Failed to delete note:", err)
      }
    },
    [supabase, fetchNotes]
  )

  // ---- Handle keyboard shortcuts ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleCreate()
      }
    },
    [handleCreate]
  )

  return (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          Notes {!isLoading && <span className="text-muted-foreground">({notes.length})</span>}
        </h3>
      </div>

      {/* New note input */}
      <div className="space-y-2">
        <Textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note..."
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!newContent.trim() || isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Add Note
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-12 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No notes yet. Be the first to add one.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isOwner = currentUserId === note.created_by
            const isEditing = editingId === note.id
            const isDeleting = deleteConfirmId === note.id

            return (
              <div
                key={note.id}
                className={cn(
                  "group rounded-md border border-border p-3",
                  note.is_pinned && "border-amber-300/50 bg-amber-50/30 dark:border-amber-700/30 dark:bg-amber-950/10"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {note.created_by_avatar ? (
                    <img
                      src={note.created_by_avatar}
                      alt={note.created_by_name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {getInitials(note.created_by_name)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    {/* Meta row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{note.created_by_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(note.created_at)}
                        </span>
                        {note.is_pinned && (
                          <Pin className="h-3 w-3 text-amber-500" />
                        )}
                        {note.updated_at !== note.created_at && (
                          <span className="text-xs text-muted-foreground">(edited)</span>
                        )}
                      </div>

                      {isOwner && !isEditing && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTogglePin(note)}>
                              {note.is_pinned ? (
                                <>
                                  <PinOff className="mr-2 h-3.5 w-3.5" /> Unpin
                                </>
                              ) : (
                                <>
                                  <Pin className="mr-2 h-3.5 w-3.5" /> Pin
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => startEdit(note)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteConfirmId(note.id)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Content / Edit */}
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                        {note.content}
                      </p>
                    )}

                    {/* Delete confirmation */}
                    {isDeleting && !isEditing && (
                      <div className="mt-2 flex items-center gap-2 rounded bg-destructive/10 px-3 py-2">
                        <span className="text-xs text-destructive">
                          Are you sure you want to delete this note?
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDelete(note.id)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
