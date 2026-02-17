"use client"

import { useRef, useEffect, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventClickArg, DateSelectArg, DatesSetArg } from "@fullcalendar/core"
import { cn } from "@/lib/utils/format"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Event type color map
// ---------------------------------------------------------------------------
export const EVENT_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  milestone_due:       { bg: "#3b82f6", border: "#2563eb", text: "#ffffff" },
  inspection:          { bg: "#8b5cf6", border: "#7c3aed", text: "#ffffff" },
  closing:             { bg: "#22c55e", border: "#16a34a", text: "#ffffff" },
  land_committee:      { bg: "#f97316", border: "#ea580c", text: "#ffffff" },
  handoff_meeting:     { bg: "#14b8a6", border: "#0d9488", text: "#ffffff" },
  permit_expiration:   { bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
  insurance_expiration:{ bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
  loan_maturity:       { bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
  task_due:            { bg: "#6b7280", border: "#4b5563", text: "#ffffff" },
  milestone:           { bg: "#3b82f6", border: "#2563eb", text: "#ffffff" },
  meeting:             { bg: "#14b8a6", border: "#0d9488", text: "#ffffff" },
  deadline:            { bg: "#f59e0b", border: "#d97706", text: "#ffffff" },
  permit:              { bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
  walkthrough:         { bg: "#8b5cf6", border: "#7c3aed", text: "#ffffff" },
  open_house:          { bg: "#ec4899", border: "#db2777", text: "#ffffff" },
  draw_request:        { bg: "#f97316", border: "#ea580c", text: "#ffffff" },
  custom:              { bg: "#6366f1", border: "#4f46e5", text: "#ffffff" },
  other:               { bg: "#6366f1", border: "#4f46e5", text: "#ffffff" },
}

export function getEventColors(eventType: string) {
  return EVENT_TYPE_COLORS[eventType] || EVENT_TYPE_COLORS.other
}

// ---------------------------------------------------------------------------
// CalendarEvent interface
// ---------------------------------------------------------------------------
export interface CalendarEvent {
  id: string
  title: string
  description?: string | null
  event_type: string
  start_date: string
  end_date?: string | null
  all_day: boolean
  linked_record_type?: string | null
  linked_record_id?: string | null
  assigned_to?: string | null
  assigned_user?: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export type CalendarViewMode = "dayGridMonth" | "timeGridWeek" | "timeGridDay"

interface CalendarViewProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onDateClick?: (date: Date) => void
  onDateSelect?: (start: Date, end: Date) => void
  onDatesChange?: (start: Date, end: Date) => void
  view?: CalendarViewMode
  editable?: boolean
  loading?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CalendarView({
  events,
  onEventClick,
  onDateClick,
  onDateSelect,
  onDatesChange,
  view = "dayGridMonth",
  editable = false,
  loading = false,
  className,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const [currentView, setCurrentView] = useState<CalendarViewMode>(view)

  // Sync external view prop changes
  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi()
      if (api.view.type !== view) {
        api.changeView(view)
        setCurrentView(view)
      }
    }
  }, [view])

  // Map DB events to FullCalendar format
  const fcEvents = events.map((evt) => {
    const colors = getEventColors(evt.event_type)
    return {
      id: evt.id,
      title: evt.title,
      start: evt.start_date,
      end: evt.end_date || undefined,
      allDay: evt.all_day,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: {
        description: evt.description,
        event_type: evt.event_type,
        linked_record_type: evt.linked_record_type,
        linked_record_id: evt.linked_record_id,
        assigned_to: evt.assigned_to,
        assigned_user: evt.assigned_user,
        originalEvent: evt,
      },
    }
  })

  function handleEventClick(info: EventClickArg) {
    const original = info.event.extendedProps.originalEvent as CalendarEvent
    onEventClick?.(original)
  }

  function handleDateClick(info: { date: Date }) {
    onDateClick?.(info.date)
  }

  function handleDateSelect(info: DateSelectArg) {
    onDateSelect?.(info.start, info.end)
  }

  function handleDatesSet(info: DatesSetArg) {
    setCurrentView(info.view.type as CalendarViewMode)
    onDatesChange?.(info.start, info.end)
  }

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className={cn("atlas-calendar", className)}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={currentView}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={fcEvents}
        editable={editable}
        selectable={!!onDateSelect}
        selectMirror
        dayMaxEvents={4}
        weekends
        nowIndicator
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        select={handleDateSelect}
        datesSet={handleDatesSet}
        height="auto"
        eventDisplay="block"
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
        slotMinTime="06:00:00"
        slotMaxTime="20:00:00"
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: "08:00",
          endTime: "17:00",
        }}
      />
    </div>
  )
}
