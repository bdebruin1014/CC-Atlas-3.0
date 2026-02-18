import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type {
  PunchItem,
  PunchItemRoom,
  PunchItemCategory,
  PunchItemPriority,
} from "@/lib/supabase/types"

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
const keys = {
  all: ["punch-items"] as const,
  byUnit: (unitId: string) => [...keys.all, "unit", unitId] as const,
  byJob: (jobId: string) => [...keys.all, "job", jobId] as const,
  jobSummary: (jobId: string) => [...keys.all, "job-summary", jobId] as const,
}

// ---------------------------------------------------------------------------
// Room / Category / Priority config
// ---------------------------------------------------------------------------
export const PUNCH_ROOM_CONFIG: Record<PunchItemRoom, { label: string }> = {
  exterior: { label: "Exterior" },
  garage: { label: "Garage" },
  kitchen: { label: "Kitchen" },
  living_room: { label: "Living Room" },
  dining_room: { label: "Dining Room" },
  master_bedroom: { label: "Master Bedroom" },
  master_bath: { label: "Master Bath" },
  bedroom_2: { label: "Bedroom 2" },
  bedroom_3: { label: "Bedroom 3" },
  bathroom_2: { label: "Bathroom 2" },
  bathroom_3: { label: "Bathroom 3" },
  laundry: { label: "Laundry" },
  hallway: { label: "Hallway" },
  closet: { label: "Closet" },
  porch_patio: { label: "Porch / Patio" },
  other: { label: "Other" },
}

export const PUNCH_CATEGORY_CONFIG: Record<
  PunchItemCategory,
  { label: string; color: string }
> = {
  paint: { label: "Paint", color: "bg-purple-100 text-purple-700" },
  drywall: { label: "Drywall", color: "bg-gray-100 text-gray-700" },
  trim: { label: "Trim", color: "bg-amber-100 text-amber-700" },
  flooring: { label: "Flooring", color: "bg-orange-100 text-orange-700" },
  plumbing: { label: "Plumbing", color: "bg-blue-100 text-blue-700" },
  electrical: { label: "Electrical", color: "bg-yellow-100 text-yellow-700" },
  hvac: { label: "HVAC", color: "bg-cyan-100 text-cyan-700" },
  appliance: { label: "Appliance", color: "bg-slate-100 text-slate-700" },
  door_window: { label: "Door / Window", color: "bg-teal-100 text-teal-700" },
  hardware: { label: "Hardware", color: "bg-zinc-100 text-zinc-700" },
  cleaning: { label: "Cleaning", color: "bg-green-100 text-green-700" },
  landscaping: { label: "Landscaping", color: "bg-emerald-100 text-emerald-700" },
  concrete: { label: "Concrete", color: "bg-stone-100 text-stone-700" },
  other: { label: "Other", color: "bg-neutral-100 text-neutral-700" },
}

export const PUNCH_PRIORITY_CONFIG: Record<
  PunchItemPriority,
  { label: string; dot: string }
> = {
  low: { label: "Low", dot: "bg-gray-400" },
  medium: { label: "Medium", dot: "bg-yellow-400" },
  high: { label: "High", dot: "bg-orange-500" },
  critical: { label: "Critical", dot: "bg-red-500" },
}

export const PUNCH_STATUS_CONFIG: Record<
  PunchItem["status"],
  { label: string; bgColor: string }
> = {
  open: { label: "Open", bgColor: "bg-red-100 text-red-700" },
  in_progress: { label: "In Progress", bgColor: "bg-blue-100 text-blue-700" },
  complete: { label: "Complete", bgColor: "bg-green-100 text-green-700" },
  verified: { label: "Verified", bgColor: "bg-emerald-100 text-emerald-800" },
  disputed: { label: "Disputed", bgColor: "bg-orange-100 text-orange-700" },
}

// ---------------------------------------------------------------------------
// usePunchItems — list items for a unit
// ---------------------------------------------------------------------------
export function usePunchItems(unitId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.byUnit(unitId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("punch_items")
        .select("*")
        .eq("unit_id", unitId)
        .order("item_number", { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as PunchItem[]
    },
    enabled: !!unitId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

// ---------------------------------------------------------------------------
// usePunchItemsByJob — list all punch items for a job (summary)
// ---------------------------------------------------------------------------
export function usePunchItemsByJob(jobId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.byJob(jobId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("punch_items")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as PunchItem[]
    },
    enabled: !!jobId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

// ---------------------------------------------------------------------------
// useCreatePunchItem
// ---------------------------------------------------------------------------
export interface CreatePunchItemInput {
  organization_id?: string
  job_id: string
  unit_id: string
  room: PunchItemRoom
  category: PunchItemCategory
  description: string
  assigned_vendor_contact_id?: string | null
  priority?: PunchItemPriority
  photos?: string[]
  notes?: string
}

export function useCreatePunchItem() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePunchItemInput) => {
      const { data, error } = await supabase
        .from("punch_items")
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data as unknown as PunchItem
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.byUnit(vars.unit_id) })
      qc.invalidateQueries({ queryKey: keys.byJob(vars.job_id) })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdatePunchItem
// ---------------------------------------------------------------------------
export function useUpdatePunchItem() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      unitId,
      jobId,
      ...updates
    }: Partial<PunchItem> & { id: string; unitId: string; jobId: string }) => {
      const { data, error } = await supabase
        .from("punch_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as PunchItem
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.byUnit(vars.unitId) })
      qc.invalidateQueries({ queryKey: keys.byJob(vars.jobId) })
    },
  })
}

// ---------------------------------------------------------------------------
// useCompletePunchItem — quick-complete
// ---------------------------------------------------------------------------
export function useCompletePunchItem() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      unitId,
      jobId,
    }: {
      id: string
      unitId: string
      jobId: string
    }) => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from("punch_items")
        .update({
          status: "complete" as const,
          completed_at: now,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as PunchItem
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.byUnit(vars.unitId) })
      qc.invalidateQueries({ queryKey: keys.byJob(vars.jobId) })
    },
  })
}

// ---------------------------------------------------------------------------
// useVerifyPunchItem
// ---------------------------------------------------------------------------
export function useVerifyPunchItem() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      unitId,
      jobId,
    }: {
      id: string
      unitId: string
      jobId: string
    }) => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from("punch_items")
        .update({
          status: "verified" as const,
          verified_at: now,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as PunchItem
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.byUnit(vars.unitId) })
      qc.invalidateQueries({ queryKey: keys.byJob(vars.jobId) })
    },
  })
}

// ---------------------------------------------------------------------------
// useBulkVerifyComplete — verify all items with status='complete'
// ---------------------------------------------------------------------------
export function useBulkVerifyComplete() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      unitId,
      jobId,
    }: {
      unitId: string
      jobId: string
    }) => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from("punch_items")
        .update({
          status: "verified" as const,
          verified_at: now,
        })
        .eq("unit_id", unitId)
        .eq("status", "complete")
        .select()

      if (error) throw error
      return (data ?? []) as unknown as PunchItem[]
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.byUnit(vars.unitId) })
      qc.invalidateQueries({ queryKey: keys.byJob(vars.jobId) })
    },
  })
}

// ---------------------------------------------------------------------------
// useStartNewRound — copies unresolved items to a new round
// ---------------------------------------------------------------------------
export function useStartNewRound() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      unitId,
      jobId,
    }: {
      unitId: string
      jobId: string
    }) => {
      // Get current max round
      const { data: existing, error: fetchError } = await supabase
        .from("punch_items")
        .select("*")
        .eq("unit_id", unitId)
        .in("status", ["open", "in_progress", "disputed"])
        .order("round", { ascending: false })

      if (fetchError) throw fetchError
      const items = (existing ?? []) as unknown as PunchItem[]
      if (items.length === 0) return []

      const maxRound = Math.max(...items.map((i) => i.round))
      const newRound = maxRound + 1

      // Insert copies with new round
      const copies = items.map((item) => ({
        organization_id: item.organization_id,
        job_id: item.job_id,
        unit_id: item.unit_id,
        room: item.room,
        category: item.category,
        description: item.description,
        assigned_vendor_contact_id: item.assigned_vendor_contact_id,
        priority: item.priority,
        status: "open" as const,
        round: newRound,
        photos: item.photos,
        back_charge_vendor_contact_id: item.back_charge_vendor_contact_id,
        back_charge_amount: item.back_charge_amount,
        notes: item.notes ? `[Carried from Round ${item.round}] ${item.notes}` : `Carried from Round ${item.round}`,
      }))

      const { data, error } = await supabase
        .from("punch_items")
        .insert(copies)
        .select()

      if (error) throw error
      return (data ?? []) as unknown as PunchItem[]
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.byUnit(vars.unitId) })
      qc.invalidateQueries({ queryKey: keys.byJob(vars.jobId) })
    },
  })
}
