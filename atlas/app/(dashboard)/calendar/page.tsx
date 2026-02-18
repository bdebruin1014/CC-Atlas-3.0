"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
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
// Module toggle config
// ---------------------------------------------------------------------------
interface ModuleToggle {
  key: string
  label: string
  color: string
  eventTypes: string[]
}

const MODULE_TOGGLES: ModuleToggle[] = [
  { key: "milestones", label: "Construction Milestones", color: "#f97316", eventTypes: ["milestone_due"] },
  { key: "tasks", label: "Task Due Dates", color: "#3b82f6", eventTypes: ["task_due"] },
  { key: "closings", label: "Closing Dates", color: "#22c55e", eventTypes: ["closing"] },
  { key: "permits", label: "Permit Expirations", color: "#ef4444", eventTypes: ["permit_expiration"] },
  { key: "loans", label: "Loan Maturities", color: "#8b5cf6", eventTypes: ["loan_maturity"] },
  { key: "insurance", label: "Insurance Expirations", color: "#ec4899", eventTypes: ["insurance_expiration"] },
]

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
      return null
    case "task":
      return `/tasks`
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Mini Calendar Component
// ---------------------------------------------------------------------------
function MiniCalendar({
  selectedDate,
  onDateSelect,
}: {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}) {
  const [viewMonth, setViewMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const monthLabel = viewMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  })

  const prevMonth = () =>
    setViewMonth(new Date(year, month - 1, 1))
  const nextMonth = () =>
    setViewMonth(new Date(year, month + 1, 1))

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            className="text-[10px] text-center text-muted-foreground font-medium py-1"
          >
            {d}
          </div>
        ))}
        {days.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />
          const date = new Date(year, month, day)
          const isToday =
            date.toDateString() === today.toDateString()
          const isSelected =
            date.toDateString() === selectedDate.toDateString()
          return (
            <button
              key={day}
              onClick={() => onDateSelect(date)}
              className={cn(
                "text-xs h-7 w-7 mx-auto rounded-full flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-[#1a5632] text-white"
                  : isToday
                    ? "bg-muted font-bold"
                    : "hover:bg-muted"
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [moduleEvents, setModuleEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<CalendarViewMode>("dayGridMonth")
  const [isCompanyCalendar, setIsCompanyCalendar] = useState(true)
  const [isMyCalendar, setIsMyCalendar] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Use a ref for dateRange to break the useCallback dependency cycle.
  // The ref always holds the latest value; the state is only used for triggering fetches.
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  })
  const dateRangeRef = useRef(dateRange)
  dateRangeRef.current = dateRange

  // Track whether initial fetch has happened so we can distinguish first-load from refetches
  const hasFetched = useRef(false)

  // Module toggles — all on by default
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULE_TOGGLES.map((m) => [m.key, true]))
  )

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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load team members for assignment
  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .order("last_name")
      if (data) {
        setUsers(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data as any[]).map((u) => ({
            id: u.id,
            full_name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unknown",
          }))
        )
      }
    }
    loadUsers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Fetch calendar_events (direct events)
  // ---------------------------------------------------------------------------
  const fetchCalendarEvents = useCallback(async () => {
    const range = dateRangeRef.current
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
        .gte("start_date", range.start.toISOString())
        .lte("start_date", range.end.toISOString())
        .order("start_date", { ascending: true })

      if (isMyCalendar && currentUserId) {
        query = query.eq("assigned_to", currentUserId)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching calendar events:", error)
        setCalendarEvents([])
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

      setCalendarEvents(mapped)
    } catch (err) {
      console.error("Failed to fetch calendar events:", err)
    }
  }, [isMyCalendar, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Fetch aggregated module events
  // ---------------------------------------------------------------------------
  const fetchModuleEvents = useCallback(async () => {
    const range = dateRangeRef.current
    const aggregated: CalendarEvent[] = []
    const rangeStart = range.start.toISOString().slice(0, 10)
    const rangeEnd = range.end.toISOString().slice(0, 10)

    // 1. Construction Milestones
    try {
      const { data: milestones } = await supabase
        .from("unit_milestones")
        .select("id, name, phase_number, planned_end_date, actual_end_date, status, unit_id")
        .or(`planned_end_date.gte.${rangeStart},actual_end_date.gte.${rangeStart}`)
        .or(`planned_end_date.lte.${rangeEnd},actual_end_date.lte.${rangeEnd}`)

      if (milestones) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const m of milestones as any[]) {
          const dateStr = m.actual_end_date || m.planned_end_date
          if (!dateStr) continue
          aggregated.push({
            id: `milestone-${m.id}`,
            title: `Milestone: ${m.name}`,
            event_type: "milestone_due",
            start_date: dateStr,
            all_day: true,
            linked_record_type: "job",
            linked_record_id: null,
            description: `Phase ${m.phase_number} — ${m.status}`,
          })
        }
      }
    } catch {
      // table may not exist
    }

    // 2. Task due dates
    try {
      const { data: tasks } = await supabase
        .from("standalone_tasks")
        .select("id, title, due_date, status, module, linked_record_id, priority")
        .not("due_date", "is", null)
        .gte("due_date", rangeStart)
        .lte("due_date", rangeEnd)
        .not("status", "in", '("completed","cancelled")')

      if (tasks) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const t of tasks as any[]) {
          if (!t.due_date) continue
          aggregated.push({
            id: `task-${t.id}`,
            title: t.title,
            event_type: "task_due",
            start_date: t.due_date,
            all_day: true,
            linked_record_type: "task",
            linked_record_id: t.id,
            description: `Priority: ${t.priority} — Module: ${t.module}`,
          })
        }
      }
    } catch {
      // table may not exist
    }

    // 3. Closing dates
    try {
      const { data: contracts } = await supabase
        .from("disposition_contracts")
        .select("id, contract_number, closing_date, status, listing_id")
        .not("closing_date", "is", null)
        .gte("closing_date", rangeStart)
        .lte("closing_date", rangeEnd)

      if (contracts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const c of contracts as any[]) {
          if (!c.closing_date) continue
          aggregated.push({
            id: `closing-${c.id}`,
            title: `Closing: ${c.contract_number || "Contract"}`,
            event_type: "closing",
            start_date: c.closing_date,
            all_day: true,
            linked_record_type: "project",
            linked_record_id: null,
            description: `Status: ${c.status}`,
          })
        }
      }
    } catch {
      // table may not exist
    }

    // 4. Permit expirations
    try {
      const { data: permits } = await supabase
        .from("permits")
        .select("id, permit_type, permit_number, expiration_date, status, record_type, record_id")
        .not("expiration_date", "is", null)
        .gte("expiration_date", rangeStart)
        .lte("expiration_date", rangeEnd)

      if (permits) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const p of permits as any[]) {
          if (!p.expiration_date) continue
          aggregated.push({
            id: `permit-${p.id}`,
            title: `Permit Exp: ${p.permit_type || p.permit_number || "Permit"}`,
            event_type: "permit_expiration",
            start_date: p.expiration_date,
            all_day: true,
            linked_record_type: p.record_type || null,
            linked_record_id: p.record_id || null,
            description: `Permit #${p.permit_number || "N/A"} — ${p.status}`,
          })
        }
      }
    } catch {
      // table may not exist
    }

    // 5. Loan maturities
    try {
      const { data: loans } = await supabase
        .from("loans")
        .select("id, loan_type, maturity_date, original_amount, entity_id, project_id")
        .not("maturity_date", "is", null)
        .gte("maturity_date", rangeStart)
        .lte("maturity_date", rangeEnd)

      if (loans) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const l of loans as any[]) {
          if (!l.maturity_date) continue
          aggregated.push({
            id: `loan-${l.id}`,
            title: `Loan Maturity: ${l.loan_type || "Loan"}`,
            event_type: "loan_maturity",
            start_date: l.maturity_date,
            all_day: true,
            linked_record_type: l.project_id ? "project" : null,
            linked_record_id: l.project_id || null,
            description: l.original_amount
              ? `Original: $${Number(l.original_amount).toLocaleString()}`
              : null,
          })
        }
      }
    } catch {
      // table may not exist
    }

    // 6. Key project dates (permit dates, construction dates)
    try {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, permit_submitted_date, permit_approved_date, construction_start_date, projected_completion_date, co_date, warranty_end_date")

      if (projects) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const p of projects as any[]) {
          const keyDates: { date: string; label: string; type: string }[] = []
          if (p.permit_submitted_date) keyDates.push({ date: p.permit_submitted_date, label: "Permit Submitted", type: "permit_expiration" })
          if (p.permit_approved_date) keyDates.push({ date: p.permit_approved_date, label: "Permit Approved", type: "permit_expiration" })
          if (p.construction_start_date) keyDates.push({ date: p.construction_start_date, label: "Construction Start", type: "milestone_due" })
          if (p.projected_completion_date) keyDates.push({ date: p.projected_completion_date, label: "Projected Completion", type: "milestone_due" })
          if (p.co_date) keyDates.push({ date: p.co_date, label: "CO Date", type: "milestone_due" })

          for (const kd of keyDates) {
            if (kd.date >= rangeStart && kd.date <= rangeEnd) {
              aggregated.push({
                id: `project-${p.id}-${kd.label.replace(/\s/g, "-").toLowerCase()}`,
                title: `${kd.label}: ${p.name}`,
                event_type: kd.type,
                start_date: kd.date,
                all_day: true,
                linked_record_type: "project",
                linked_record_id: p.id,
              })
            }
          }
        }
      }
    } catch {
      // skip
    }

    setModuleEvents(aggregated)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Combined fetch — only show full loading state on first load
  // ---------------------------------------------------------------------------
  const fetchAllEvents = useCallback(async () => {
    if (!hasFetched.current) {
      setLoading(true)
    }
    await Promise.all([fetchCalendarEvents(), fetchModuleEvents()])
    setLoading(false)
    hasFetched.current = true
  }, [fetchCalendarEvents, fetchModuleEvents])

  // Fetch when dateRange, calendar mode, or user changes
  useEffect(() => {
    fetchAllEvents()
  }, [dateRange, isMyCalendar, isCompanyCalendar, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Filter events by enabled modules
  // ---------------------------------------------------------------------------
  const enabledEventTypes = useMemo(() => {
    const types = new Set<string>()
    for (const m of MODULE_TOGGLES) {
      if (enabledModules[m.key]) {
        m.eventTypes.forEach((t) => types.add(t))
      }
    }
    return types
  }, [enabledModules])

  const filteredEvents = useMemo(() => {
    const filtered = moduleEvents.filter((e) => enabledEventTypes.has(e.event_type))
    // Calendar events (direct) are always shown when company/my calendar is on
    const direct = isCompanyCalendar || isMyCalendar ? calendarEvents : []
    return [...direct, ...filtered]
  }, [calendarEvents, moduleEvents, enabledEventTypes, isCompanyCalendar, isMyCalendar])

  // Handle date range change from FullCalendar's own navigation (prev/next)
  function handleDatesChange(start: Date, end: Date) {
    // Only update if range actually changed to prevent re-render loops
    const current = dateRangeRef.current
    if (
      current.start.getTime() === start.getTime() &&
      current.end.getTime() === end.getTime()
    ) {
      return
    }
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

  // Navigate mini calendar to a date
  function handleMiniCalendarSelect(date: Date) {
    setSelectedDate(date)
    setDateRange({
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
    })
  }

  // Today button
  function handleTodayClick() {
    const now = new Date()
    setSelectedDate(now)
    setDateRange({
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    })
  }

  // Toggle module
  function toggleModule(key: string) {
    setEnabledModules((prev) => ({ ...prev, [key]: !prev[key] }))
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("calendar_events").insert(payload as any)

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
      fetchAllEvents()
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
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Manage events, deadlines, and milestones
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Today button */}
          <Button variant="outline" size="sm" onClick={handleTodayClick}>
            Today
          </Button>

          {/* View toggle buttons */}
          <div className="hidden sm:flex items-center rounded-lg border border-border p-1">
            <Button
              variant={viewMode === "dayGridMonth" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("dayGridMonth")}
            >
              Monthly
            </Button>
            <Button
              variant={viewMode === "timeGridWeek" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeGridWeek")}
            >
              Weekly
            </Button>
          </div>

          {/* Create Event */}
          <Button
            className="bg-[#1a5632] hover:bg-[#1a5632]/90 text-white"
            onClick={() => {
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
            }}
          >
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Main layout: sidebar + calendar */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          {/* Mini Calendar */}
          <div className="rounded-lg border border-border p-3">
            <MiniCalendar
              selectedDate={selectedDate}
              onDateSelect={handleMiniCalendarSelect}
            />
          </div>

          {/* Calendar Toggles */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Calendars
            </h3>

            {/* My Calendar */}
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={isMyCalendar}
                onCheckedChange={(v) => {
                  setIsMyCalendar(!!v)
                  if (v) setIsCompanyCalendar(false)
                }}
              />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
              <span className="text-sm">My Calendar</span>
            </label>

            {/* Company Calendar */}
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={isCompanyCalendar}
                onCheckedChange={(v) => {
                  setIsCompanyCalendar(!!v)
                  if (v) setIsMyCalendar(false)
                }}
              />
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
              <span className="text-sm">Company Calendar</span>
            </label>
          </div>

          {/* Module Toggles */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Modules
            </h3>

            {MODULE_TOGGLES.map((m) => (
              <label key={m.key} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={enabledModules[m.key]}
                  onCheckedChange={() => toggleModule(m.key)}
                />
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: m.color }}
                />
                <span className="text-sm">{m.label}</span>
              </label>
            ))}
          </div>
        </aside>

        {/* Calendar */}
        <div className="flex-1 min-w-0">
          <CalendarView
            events={filteredEvents}
            view={viewMode}
            loading={loading}
            editable={false}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            onDatesChange={handleDatesChange}
          />
        </div>
      </div>

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
              <Label htmlFor="event-desc">Notes</Label>
              <Textarea
                id="event-desc"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Optional notes..."
                rows={3}
              />
            </div>

            {/* Event type */}
            <div className="space-y-2">
              <Label>Module</Label>
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
                <Label htmlFor="start-date">Date *</Label>
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
                <Label htmlFor="end-date">Time (optional)</Label>
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
                <Label>Link to Record</Label>
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
              <Button
                type="submit"
                disabled={creating}
                className="bg-[#1a5632] hover:bg-[#1a5632]/90 text-white"
              >
                {creating ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
