import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { UnitMilestone } from "@/lib/supabase/types"

// Phases that require a passed inspection before completion
export const INSPECTION_GATED_PHASES = [3, 4, 6, 7, 8, 9, 15]

const milestoneKeys = {
  milestones: (unitId: string) => ["units", "milestones", unitId] as const,
  unit: (unitId: string) => ["units", "detail", unitId] as const,
  unitList: () => ["units", "list"] as const,
}

function today() {
  return new Date().toISOString()
}

// ---------------------------------------------------------------------------
// useStartMilestone — sets status='in_progress', actual_start_date=now
// ---------------------------------------------------------------------------
export function useStartMilestone() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, unitId }: { id: string; unitId: string }) => {
      const { data, error } = await supabase
        .from("unit_milestones")
        .update({
          status: "in_progress" as const,
          actual_start_date: today(),
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as unknown as UnitMilestone
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: milestoneKeys.milestones(vars.unitId) })
      qc.invalidateQueries({ queryKey: milestoneKeys.unit(vars.unitId) })
      qc.invalidateQueries({ queryKey: milestoneKeys.unitList() })
    },
  })
}

// ---------------------------------------------------------------------------
// useCompleteMilestone — completes current, auto-activates next, recalculates
// ---------------------------------------------------------------------------
export function useCompleteMilestone() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      unitId,
      overrideNote,
    }: {
      id: string
      unitId: string
      overrideNote?: string
    }) => {
      const now = today()

      // Complete the current milestone
      const updatePayload: Record<string, unknown> = {
        status: "complete",
        actual_end_date: now,
      }
      if (overrideNote) {
        updatePayload.override_note = overrideNote
      }

      const { data: completed, error } = await supabase
        .from("unit_milestones")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error

      const completedMs = completed as unknown as UnitMilestone

      // Fetch all milestones to find the next one
      const { data: allMs } = await supabase
        .from("unit_milestones")
        .select("*")
        .eq("unit_id", unitId)
        .order("phase_number", { ascending: true })

      const milestones = (allMs ?? []) as unknown as UnitMilestone[]
      const currentIdx = milestones.findIndex((m) => m.id === id)

      // Auto-activate the next milestone
      if (currentIdx >= 0 && currentIdx < milestones.length - 1) {
        const next = milestones[currentIdx + 1]
        if (next.status === "not_started") {
          await supabase
            .from("unit_milestones")
            .update({
              status: "in_progress" as const,
              actual_start_date: now,
            })
            .eq("id", next.id)
        }
      }

      // Recalculate downstream planned dates based on variance
      if (completedMs.planned_end_date && completedMs.actual_end_date) {
        const plannedEnd = new Date(completedMs.planned_end_date).getTime()
        const actualEnd = new Date(completedMs.actual_end_date).getTime()
        const varianceDays = Math.round((actualEnd - plannedEnd) / (1000 * 60 * 60 * 24))

        if (varianceDays !== 0) {
          for (let i = currentIdx + 1; i < milestones.length; i++) {
            const m = milestones[i]
            if (m.status === "complete") continue
            const updates: Record<string, unknown> = {}
            if (m.planned_start_date) {
              const adj = new Date(m.planned_start_date)
              adj.setDate(adj.getDate() + varianceDays)
              updates.planned_start_date = adj.toISOString()
            }
            if (m.planned_end_date) {
              const adj = new Date(m.planned_end_date)
              adj.setDate(adj.getDate() + varianceDays)
              updates.planned_end_date = adj.toISOString()
            }
            if (Object.keys(updates).length > 0) {
              await supabase
                .from("unit_milestones")
                .update(updates)
                .eq("id", m.id)
            }
          }
        }
      }

      // Update unit's current_milestone to next phase number
      const nextMs = currentIdx < milestones.length - 1 ? milestones[currentIdx + 1] : null
      await supabase
        .from("units")
        .update({
          current_milestone: nextMs?.phase_number ?? completedMs.phase_number + 1,
        })
        .eq("id", unitId)

      return completedMs
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: milestoneKeys.milestones(vars.unitId) })
      qc.invalidateQueries({ queryKey: milestoneKeys.unit(vars.unitId) })
      qc.invalidateQueries({ queryKey: milestoneKeys.unitList() })
    },
  })
}

// ---------------------------------------------------------------------------
// useBlockMilestone — sets status='blocked' with reason
// ---------------------------------------------------------------------------
export function useBlockMilestone() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      unitId,
      reason,
    }: {
      id: string
      unitId: string
      reason: string
    }) => {
      const { data, error } = await supabase
        .from("unit_milestones")
        .update({
          status: "blocked" as const,
          override_note: `[BLOCKED] ${reason}`,
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as unknown as UnitMilestone
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: milestoneKeys.milestones(vars.unitId) })
      qc.invalidateQueries({ queryKey: milestoneKeys.unit(vars.unitId) })
    },
  })
}

// ---------------------------------------------------------------------------
// useUnblockMilestone — resets to 'in_progress'
// ---------------------------------------------------------------------------
export function useUnblockMilestone() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, unitId }: { id: string; unitId: string }) => {
      const { data, error } = await supabase
        .from("unit_milestones")
        .update({
          status: "in_progress" as const,
          override_note: null,
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as unknown as UnitMilestone
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: milestoneKeys.milestones(vars.unitId) })
      qc.invalidateQueries({ queryKey: milestoneKeys.unit(vars.unitId) })
    },
  })
}

// ---------------------------------------------------------------------------
// Inspection check helper (client-side, called before completing)
// ---------------------------------------------------------------------------
export async function checkInspectionPassed(
  unitId: string,
  phaseNumber: number
): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from("inspections")
    .select("id, result")
    .eq("unit_id", unitId)
    .eq("linked_milestone_phase", phaseNumber)
    .eq("result", "pass")
    .limit(1)

  return (data ?? []).length > 0
}
