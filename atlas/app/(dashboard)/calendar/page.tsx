"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clock,
  User,
  Tag,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils/format"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CalendarView,
  getEventColors,
  type CalendarEvent,
  type CalendarViewMode,
} from "@/components/calendar/calendar-view"
import { useToast } from "@/components/ui/use-toast"

// ---------------------------------------------------------------------------
// Event type labels
// ---------------------------------------------------------------------------
const EVENT_TYPE_LABELS: Record<string, string> = {
  inspection: "Inspection",
  closing: "Closing",
  meeting: "Meeting",
  deadline: "Deadline",
  milestone: "Milestone",
  permit: "Permit",
  walkthrough: "Walkthrough",
  open_house: "Open House",
  draw_request: "Draw Request",
  other: "Other",
  milestone_due: "Milestone Due",
  land_committee: "Land Committee",
  handoff_meeting: "Handoff Meeting",
  permit_expiration: "Permit Expiration",
  insurance_expiration: "Insurance Expiration",
  loan_maturity: "Loan Maturity",
  task_due: "Task Due",
  custom: "Custom",
}

// ---------------------------------------------------------------------------
// Linked record helpers
// ---------------------------------------------------------------------------
function getRecordPath(recordType: string | null, recordId: string | null): string | null {
  if (!recordType || !recordId) return null
  switch (recordType) {
    case "opportunity":
      return `/opportunities/${recordId}`
    case "project":
      return `/projects/${recordId}`
    case "job":
      return `/construction/jobs/${recordId}`
    case "unit":
      return null // units are nested under jobs
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // State
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<CalendarViewMode>("dayGridMonth")
  const [isCompanyCalendar, setIsCompanyCalendar] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  })

  // Event detail dialog
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventDetail, setShowEventDetail] = useState(false)

  // Create event dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    event_type: "other" as string,
    start_date: "",
    end_date: "",
    all_day: false,
    linked_record_type: "" as string,
    linked_record_id: "",
  })
  const [creating, setCreating] = useState(false)

  // Users for assigning
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])
  const [assignedTo, setAssignedTo] = useState<string>("")

  // Load current user
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    loadUser()
  }, [supabase])

  // Load team members for assignment
  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("is_active", true)
        .order("last_name")
      if (data) {
        setUsers(
          data.map((u) => ({
            id: u.id,
            full_name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unknown",
          }))
        )
      }
    }
    loadUsers()
  }, [supabase])

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("calendar_events")
        .select(
          `
          id,
          title,
          description,
          event_type,
          start_date,
          end_date,
          all_day,
          linked_record_type,
          linked_record_id,
          assigned_to,
          assigned_user:profiles!calendar_events_assigned_to_fkey(
            id, first_name, last_name, avatar_url
          )
        `
        )
        .gte("start_date", dateRange.start.toISOString())
        .lte("start_date", dateRange.end.toISOString())
        .order("start_date", { ascending: true })

      // Filter to only user's events if "My Calendar"
      if (!isCompanyCalendar && currentUserId) {
        query = query.eq("assigned_to", currentUserId)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching calendar events:", error)
        toast({
          title: "Error loading events",
          description: error.message,
          variant: "destructive",
        })
        setEvents([])
        return
      }

      const mapped: CalendarEvent[] = (data || []).map((row: Record<string, unknown>) => {
        const assignedUser = row.assigned_user as Record<string, unknown> | null
        return {
          id: row.id as string,
          title: row.title as string,
          description: row.description as string | null,
          event_type: row.event_type as string,
          start_date: row.start_date as string,
          end_date: row.end_date as string | null,
          all_day: row.all_day as boolean,
          linked_record_type: row.linked_record_type as string | null,
          linked_record_id: row.linked_record_id as string | null,
          assigned_to: row.assigned_to as string | null,
          assigned_user: assignedUser
            ? {
                id: assignedUser.id as string,
                full_name: [assignedUser.first_name, assignedUser.last_name]
                  .filter(Boolean)
                  .join(" "),
                avatar_url: assignedUser.avatar_url as string | null,
              }
            : null,
        }
      })

      setEvents(mapped)
    } catch (err) {
      console.error("Failed to fetch events:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange, isCompanyCalendar, currentUserId, toast])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Handle date range change from calendar navigation
  function handleDatesChange(start: Date, end: Date) {
    setDateRange({ start, end })
  }

  // View event detail
  function handleEventClick(event: CalendarEvent) {
    setSelectedEvent(event)
    setShowEventDetail(true)
  }

  // Navigate to linked record
  function navigateToRecord() {
    if (!selectedEvent) return
    const path = getRecordPath(selectedEvent.linked_record_type ?? null, selectedEvent.linked_record_id ?? null)
    if (path) {
      router.push(path)
    }
  }

  // Open create dialog from date click
  function handleDateClick(date: Date) {
    const isoDate = date.toISOString().slice(0, 16)
    setCreateForm({
      title: "",
      description: "",
      event_type: "other",
      start_date: isoDate,
      end_date: "",
      all_day: false,
      linked_record_type: "",
      linked_record_id: "",
    })
    setAssignedTo("")
    setShowCreateDialog(true)
  }

  // Create event
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm.title.trim() || !createForm.start_date) {
      toast({
        title: "Validation error",
        description: "Title and start date are required.",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const orgId = user?.user_metadata?.organization_id

      const payload: Record<string, unknown> = {
        organization_id: orgId,
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        event_type: createForm.event_type,
        start_date: new Date(createForm.start_date).toISOString(),
        end_date: createForm.end_date
          ? new Date(createForm.end_date).toISOString()
          : null,
        all_day: createForm.all_day,
        assigned_to: assignedTo || null,
        linked_record_type: createForm.linked_record_type || null,
        linked_record_id: createForm.linked_record_id || null,
      }

      const { error } = await supabase.from("calendar_events").insert(payload)

      if (error) {
        toast({
          title: "Failed to create event",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({ title: "Event created", description: "Calendar event has been added." })
      setShowCreateDialog(false)
      fetchEvents()
    } catch (err) {
      console.error("Create event error:", err)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  // Memoized event type badge color
  const eventTypeBadge = useMemo(() => {
    if (!selectedEvent) return null
    const colors = getEventColors(selectedEvent.event_type)
    return (
      <Badge
        style={{ backgroundColor: colors.bg, color: colors.text }}
        className="text-xs"
      >
        {EVENT_TYPE_LABELS[selectedEvent.event_type] || selectedEvent.event_type}
      </Badge>
    )
  }, [selectedEvent])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Manage events, deadlines, and milestones
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Company / My Calendar toggle */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium",
                isCompanyCalendar
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Company
            </span>
            <Switch
              checked={!isCompanyCalendar}
              onCheckedChange={(checked) => setIsCompanyCalendar(!checked)}
            />
            <span
              className={cn(
                "text-sm font-medium",
                !isCompanyCalendar
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              My Calendar
            </span>
          </div>

          {/* View toggle buttons */}
          <div className="hidden sm:flex items-center rounded-lg border border-border p-1">
            <Button
              variant={viewMode === "dayGridMonth" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("dayGridMonth")}
            >
              Month
            </Button>
            <Button
              variant={viewMode === "timeGridWeek" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeGridWeek")}
            >
              Week
            </Button>
            <Button
              variant={viewMode === "timeGridDay" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeGridDay")}
            >
              Day
            </Button>
          </div>

          <Button onClick={() => {
            const now = new Date()
            setCreateForm({
              title: "",
              description: "",
              event_type: "other",
              start_date: now.toISOString().slice(0, 16),
              end_date: "",
              all_day: false,
              linked_record_type: "",
              linked_record_id: "",
            })
            setAssignedTo("")
            setShowCreateDialog(true)
          }}>
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <CalendarView
        events={events}
        view={viewMode}
        loading={loading}
        editable={false}
        onEventClick={handleEventClick}
        onDateClick={handleDateClick}
        onDatesChange={handleDatesChange}
      />

      {/* Event Detail Dialog */}
      <Dialog open={showEventDetail} onOpenChange={setShowEventDetail}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>Event details</DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {/* Type badge */}
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {eventTypeBadge}
              </div>

              {/* Date/time */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {selectedEvent.all_day
                    ? formatDate(selectedEvent.start_date)
                    : formatDate(selectedEvent.start_date, { includeTime: true })}
                  {selectedEvent.end_date && (
                    <>
                      {" - "}
                      {selectedEvent.all_day
                        ? formatDate(selectedEvent.end_date)
                        : formatDate(selectedEvent.end_date, { includeTime: true })}
                    </>
                  )}
                </span>
              </div>

              {/* Assigned user */}
              {selectedEvent.assigned_user && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEvent.assigned_user.full_name}</span>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Linked record */}
              {selectedEvent.linked_record_type && selectedEvent.linked_record_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={navigateToRecord}
                  disabled={!getRecordPath(selectedEvent.linked_record_type, selectedEvent.linked_record_id)}
                >
                  <ExternalLink className="h-4 w-4" />
                  View {selectedEvent.linked_record_type.charAt(0).toUpperCase() +
                    selectedEvent.linked_record_type.slice(1)}
                </Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDetail(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Add a new event to the calendar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEvent} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="event-title">Title *</Label>
              <Input
                id="event-title"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Event title"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="event-desc">Description</Label>
              <Textarea
                id="event-desc"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Optional description..."
                rows={3}
              />
            </div>

            {/* Event type */}
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select
                value={createForm.event_type}
                onValueChange={(val) =>
                  setCreateForm((p) => ({ ...p, event_type: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="permit">Permit</SelectItem>
                  <SelectItem value="walkthrough">Walkthrough</SelectItem>
                  <SelectItem value="open_house">Open House</SelectItem>
                  <SelectItem value="draw_request">Draw Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={createForm.start_date}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, start_date: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={createForm.end_date}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, end_date: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* All day toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="all-day"
                checked={createForm.all_day}
                onCheckedChange={(checked) =>
                  setCreateForm((p) => ({ ...p, all_day: checked }))
                }
              />
              <Label htmlFor="all-day">All day event</Label>
            </div>

            {/* Assign to */}
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link to record */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link To</Label>
                <Select
                  value={createForm.linked_record_type}
                  onValueChange={(val) =>
                    setCreateForm((p) => ({ ...p, linked_record_type: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Record type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="job">Job</SelectItem>
                    <SelectItem value="unit">Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {createForm.linked_record_type && (
                <div className="space-y-2">
                  <Label htmlFor="record-id">Record ID</Label>
                  <Input
                    id="record-id"
                    value={createForm.linked_record_id}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        linked_record_id: e.target.value,
                      }))
                    }
                    placeholder="UUID of the record"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
