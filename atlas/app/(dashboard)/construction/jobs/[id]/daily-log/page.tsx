"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  Loader2,
  Users,
  HardHat,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "@/lib/hooks/use-toast"
import { useJob } from "@/lib/hooks/use-jobs"
import {
  useDailyLogs,
  useDailyLog,
  useCreateDailyLog,
  useUpdateDailyLog,
} from "@/lib/hooks/use-daily-logs"

// ---- Calendar helpers ----
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

function isWeekday(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month - 1, day).getDay()
  return dow !== 0 && dow !== 6
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const WEATHER_OPTIONS = [
  { value: "sunny", label: "Sunny", icon: Sun },
  { value: "partly_cloudy", label: "Partly Cloudy", icon: Cloud },
  { value: "cloudy", label: "Cloudy", icon: Cloud },
  { value: "rain", label: "Rain", icon: CloudRain },
  { value: "snow", label: "Snow", icon: Snowflake },
  { value: "windy", label: "Windy", icon: Wind },
]

export default function DailyLogPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const { data: job } = useJob(jobId)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const { data: monthLogs = [] } = useDailyLogs(jobId, viewYear, viewMonth)
  const { data: selectedLog, isLoading: logLoading } = useDailyLog(
    jobId,
    selectedDate ?? ""
  )

  const createMutation = useCreateDailyLog()
  const updateMutation = useUpdateDailyLog()

  // Form state
  const [weather, setWeather] = useState("")
  const [tempHigh, setTempHigh] = useState("")
  const [tempLow, setTempLow] = useState("")
  const [wind, setWind] = useState("")
  const [crewCount, setCrewCount] = useState("")
  const [subcontractors, setSubcontractors] = useState("")
  const [workPerformed, setWorkPerformed] = useState("")
  const [materialsDelivered, setMaterialsDelivered] = useState("")
  const [equipmentOnSite, setEquipmentOnSite] = useState("")
  const [safetyIncidents, setSafetyIncidents] = useState("")
  const [visitorLog, setVisitorLog] = useState("")
  const [delays, setDelays] = useState("")
  const [delayReason, setDelayReason] = useState("")
  const [notes, setNotes] = useState("")

  // Build a set of dates with logs
  const loggedDates = useMemo(
    () => new Set(monthLogs.map((l) => l.log_date)),
    [monthLogs]
  )

  const loadFormFromLog = useCallback(
    (log: typeof selectedLog) => {
      if (!log) {
        setWeather("")
        setTempHigh("")
        setTempLow("")
        setWind("")
        setCrewCount("")
        setSubcontractors("")
        setWorkPerformed("")
        setMaterialsDelivered("")
        setEquipmentOnSite("")
        setSafetyIncidents("")
        setVisitorLog("")
        setDelays("")
        setDelayReason("")
        setNotes("")
        return
      }
      setWeather(log.weather ?? "")
      setTempHigh(log.temperature_high?.toString() ?? "")
      setTempLow(log.temperature_low?.toString() ?? "")
      setWind(log.wind ?? "")
      setCrewCount(log.crew_count?.toString() ?? "")
      setSubcontractors(log.subcontractors_on_site?.join(", ") ?? "")
      setWorkPerformed(log.work_performed)
      setMaterialsDelivered(log.materials_delivered ?? "")
      setEquipmentOnSite(log.equipment_on_site ?? "")
      setSafetyIncidents(log.safety_incidents ?? "")
      setVisitorLog(log.visitor_log ?? "")
      setDelays(log.delays ?? "")
      setDelayReason(log.delay_reason ?? "")
      setNotes(log.notes ?? "")
    },
    []
  )

  // When selected log changes, load it into form
  const prevLogRef = useState<string | null>(null)
  if (selectedLog !== undefined && selectedDate && prevLogRef[0] !== selectedDate) {
    prevLogRef[1](selectedDate)
    loadFormFromLog(selectedLog)
  }

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr)
    prevLogRef[1](null) // force reload
  }

  const handlePrevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }

  const handleNextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  const handleSave = async () => {
    if (!selectedDate || !workPerformed.trim()) return
    const subs = subcontractors.split(",").map((s) => s.trim()).filter(Boolean)

    const payload = {
      job_id: jobId,
      log_date: selectedDate,
      weather: weather || undefined,
      temperature_high: tempHigh ? parseInt(tempHigh) : undefined,
      temperature_low: tempLow ? parseInt(tempLow) : undefined,
      wind: wind || undefined,
      crew_count: crewCount ? parseInt(crewCount) : undefined,
      subcontractors_on_site: subs.length > 0 ? subs : undefined,
      work_performed: workPerformed,
      materials_delivered: materialsDelivered || undefined,
      equipment_on_site: equipmentOnSite || undefined,
      safety_incidents: safetyIncidents || undefined,
      visitor_log: visitorLog || undefined,
      delays: delays || undefined,
      delay_reason: delayReason || undefined,
      notes: notes || undefined,
    }

    try {
      if (selectedLog) {
        await updateMutation.mutateAsync({ id: selectedLog.id, jobId, ...payload })
        toast({ title: "Daily log updated" })
      } else {
        await createMutation.mutateAsync(payload)
        toast({ title: "Daily log created" })
      }
    } catch {
      toast({ title: "Failed to save daily log", variant: "destructive" })
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth)
  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/construction/jobs/${jobId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {job?.name ?? "Job"}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Daily Construction Log
        </h1>
        <p className="text-sm text-muted-foreground">
          Record daily site conditions, crew, and work performed
        </p>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        {/* ---- Calendar View ---- */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base">
                {MONTHS[viewMonth - 1]} {viewYear}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarCells.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />
                const dateStr = toDateStr(viewYear, viewMonth, day)
                const hasLog = loggedDates.has(dateStr)
                const weekday = isWeekday(viewYear, viewMonth, day)
                const isPast = dateStr < todayStr
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                const isMissing = weekday && isPast && !hasLog

                return (
                  <button
                    key={day}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-md py-2 text-sm transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isToday
                          ? "bg-blue-50 dark:bg-blue-950 font-bold"
                          : "hover:bg-muted",
                      !weekday && "text-muted-foreground/50"
                    )}
                    onClick={() => handleSelectDate(dateStr)}
                  >
                    {day}
                    {weekday && (
                      <span
                        className={cn(
                          "absolute bottom-0.5 h-1.5 w-1.5 rounded-full",
                          hasLog
                            ? "bg-green-500"
                            : isMissing
                              ? "bg-red-400"
                              : "bg-transparent"
                        )}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Log exists
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                Missing (weekday)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ---- Log Form (mobile-optimized: single column, large targets) ---- */}
        {selectedDate ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {formatDate(selectedDate)}
                  {selectedLog && (
                    <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Logged
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedDate(null)}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Weather section */}
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Sun className="h-4 w-4 text-yellow-500" />
                      Weather Conditions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Weather</Label>
                        <Select value={weather} onValueChange={setWeather}>
                          <SelectTrigger className="h-11 text-base">
                            <SelectValue placeholder="Select weather..." />
                          </SelectTrigger>
                          <SelectContent>
                            {WEATHER_OPTIONS.map((w) => (
                              <SelectItem key={w.value} value={w.value}>
                                {w.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Wind</Label>
                        <Input
                          value={wind}
                          onChange={(e) => setWind(e.target.value)}
                          placeholder="e.g. 10-15 mph NW"
                          className="h-11 text-base"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Temp High (&deg;F)</Label>
                        <Input
                          type="number"
                          value={tempHigh}
                          onChange={(e) => setTempHigh(e.target.value)}
                          placeholder="High"
                          className="h-11 text-base"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Temp Low (&deg;F)</Label>
                        <Input
                          type="number"
                          value={tempLow}
                          onChange={(e) => setTempLow(e.target.value)}
                          placeholder="Low"
                          className="h-11 text-base"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Crew section — PROMINENT */}
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Users className="h-4 w-4 text-blue-500" />
                      Crew &amp; Subcontractors
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Crew Count *</Label>
                        <Input
                          type="number"
                          value={crewCount}
                          onChange={(e) => setCrewCount(e.target.value)}
                          placeholder="Total workers on site"
                          className="h-12 text-lg font-medium"
                          min="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Subcontractors on Site</Label>
                        <Textarea
                          value={subcontractors}
                          onChange={(e) => setSubcontractors(e.target.value)}
                          placeholder="e.g. ABC Plumbing, XYZ Electric (comma separated)"
                          className="text-base min-h-[60px]"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Work Performed — MOST PROMINENT */}
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <HardHat className="h-4 w-4 text-orange-500" />
                      Work Performed *
                    </h3>
                    <Textarea
                      value={workPerformed}
                      onChange={(e) => setWorkPerformed(e.target.value)}
                      placeholder="Describe all work performed today..."
                      className="text-base min-h-[120px]"
                      rows={5}
                    />
                  </div>

                  {/* Materials & Equipment */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Materials &amp; Equipment</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Materials Delivered</Label>
                        <Textarea
                          value={materialsDelivered}
                          onChange={(e) => setMaterialsDelivered(e.target.value)}
                          placeholder="List materials delivered..."
                          className="text-base min-h-[60px]"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Equipment on Site</Label>
                        <Textarea
                          value={equipmentOnSite}
                          onChange={(e) => setEquipmentOnSite(e.target.value)}
                          placeholder="List equipment on site..."
                          className="text-base min-h-[60px]"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Safety & Delays */}
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Safety &amp; Delays
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Safety Incidents</Label>
                        <Textarea
                          value={safetyIncidents}
                          onChange={(e) => setSafetyIncidents(e.target.value)}
                          placeholder="Record any safety incidents or near misses..."
                          className="text-base min-h-[60px]"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Delays</Label>
                          <Textarea
                            value={delays}
                            onChange={(e) => setDelays(e.target.value)}
                            placeholder="Describe any delays..."
                            className="text-base min-h-[60px]"
                            rows={2}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Delay Reason</Label>
                          <Textarea
                            value={delayReason}
                            onChange={(e) => setDelayReason(e.target.value)}
                            placeholder="Root cause..."
                            className="text-base min-h-[60px]"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visitors & Notes */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Visitors &amp; Notes</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Visitor Log</Label>
                        <Textarea
                          value={visitorLog}
                          onChange={(e) => setVisitorLog(e.target.value)}
                          placeholder="Record site visitors..."
                          className="text-base min-h-[60px]"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Additional Notes</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any other observations..."
                          className="text-base min-h-[60px]"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button — large touch target for mobile */}
                  <Button
                    className="w-full h-12 text-base"
                    onClick={handleSave}
                    disabled={!workPerformed.trim() || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                    )}
                    {selectedLog ? "Update Daily Log" : "Save Daily Log"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Clock className="mb-3 h-10 w-10" />
              <p className="text-sm font-medium">Select a date to view or create a log</p>
              <p className="text-xs mt-1">Click any day on the calendar</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
