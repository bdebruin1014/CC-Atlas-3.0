import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation Schema
// ---------------------------------------------------------------------------
const FilterSchema = z.object({
  job_id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CostCodeBreakdown {
  cost_code: string
  budget: number
  committed: number
  actual: number
  projected: number
  variance: number
}

interface UnitCostReport {
  unit_id: string
  unit_number: string | null
  lot_address: string | null
  total_budget: number
  total_committed: number
  total_actual: number
  total_projected: number
  total_variance: number
  cost_codes: CostCodeBreakdown[]
}

// ---------------------------------------------------------------------------
// GET  /api/construction/job-cost
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = FilterSchema.parse(Object.fromEntries(searchParams))

    // Fetch all units for the job
    const { data: units, error: unitsError } = await supabase
      .from("units")
      .select("id, unit_number, lot_address, total_budget")
      .eq("job_id", params.job_id)
      .order("unit_number", { ascending: true })

    if (unitsError) {
      return NextResponse.json({ error: unitsError.message }, { status: 500 })
    }

    if (!units || units.length === 0) {
      return NextResponse.json({ data: { job_id: params.job_id, units: [], totals: {} } })
    }

    const unitIds = units.map((u) => u.id)

    // Fetch POs (committed amounts) grouped by unit and trade_category as cost code
    const { data: pos, error: posError } = await supabase
      .from("purchase_orders")
      .select("unit_id, trade_category, amount, status")
      .in("unit_id", unitIds)
      .not("status", "eq", "draft")

    if (posError) {
      return NextResponse.json({ error: posError.message }, { status: 500 })
    }

    // Fetch paid invoices (actual amounts) grouped by unit and cost code
    const { data: rawInvoices, error: invError } = await supabase
      .from("ap_invoices")
      .select("unit_id, cost_code, amount_paid, status")
      .eq("job_id", params.job_id)
      .in("unit_id", unitIds)
    const invoices = rawInvoices as any[]

    if (invError) {
      return NextResponse.json({ error: invError.message }, { status: 500 })
    }

    // Build the per-unit breakdown
    const unitReports: UnitCostReport[] = units.map((unit) => {
      // Aggregate PO committed amounts by cost code (trade_category)
      const committedByCostCode = new Map<string, number>()
      for (const po of pos ?? []) {
        if (po.unit_id !== unit.id) continue
        const code = po.trade_category || "uncoded"
        committedByCostCode.set(
          code,
          (committedByCostCode.get(code) ?? 0) + Number(po.amount)
        )
      }

      // Aggregate actual paid amounts by cost code
      const actualByCostCode = new Map<string, number>()
      for (const inv of invoices ?? []) {
        if (inv.unit_id !== unit.id) continue
        const code = inv.cost_code || "uncoded"
        actualByCostCode.set(
          code,
          (actualByCostCode.get(code) ?? 0) + Number(inv.amount_paid)
        )
      }

      // Collect all unique cost codes
      const allCostCodes = new Set<string>([
        ...committedByCostCode.keys(),
        ...actualByCostCode.keys(),
      ])

      let totalCommitted = 0
      let totalActual = 0

      const costCodes: CostCodeBreakdown[] = Array.from(allCostCodes)
        .sort()
        .map((code) => {
          const committed = committedByCostCode.get(code) ?? 0
          const actual = actualByCostCode.get(code) ?? 0
          // Projected: higher of committed or actual (if actual exceeds committed, use actual)
          const projected = Math.max(committed, actual)
          const budget = committed // Budget at cost-code level approximated from committed
          const variance = budget - projected

          totalCommitted += committed
          totalActual += actual

          return {
            cost_code: code,
            budget: Math.round(budget * 100) / 100,
            committed: Math.round(committed * 100) / 100,
            actual: Math.round(actual * 100) / 100,
            projected: Math.round(projected * 100) / 100,
            variance: Math.round(variance * 100) / 100,
          }
        })

      const unitBudget = Number(unit.total_budget) || 0
      const totalProjected = Math.max(totalCommitted, totalActual)

      return {
        unit_id: unit.id,
        unit_number: unit.unit_number,
        lot_address: unit.lot_address,
        total_budget: Math.round(unitBudget * 100) / 100,
        total_committed: Math.round(totalCommitted * 100) / 100,
        total_actual: Math.round(totalActual * 100) / 100,
        total_projected: Math.round(totalProjected * 100) / 100,
        total_variance: Math.round((unitBudget - totalProjected) * 100) / 100,
        cost_codes: costCodes,
      }
    })

    // Compute job-level totals
    const jobTotals = {
      total_budget: 0,
      total_committed: 0,
      total_actual: 0,
      total_projected: 0,
      total_variance: 0,
    }
    for (const report of unitReports) {
      jobTotals.total_budget += report.total_budget
      jobTotals.total_committed += report.total_committed
      jobTotals.total_actual += report.total_actual
      jobTotals.total_projected += report.total_projected
      jobTotals.total_variance += report.total_variance
    }

    // Round job totals
    jobTotals.total_budget = Math.round(jobTotals.total_budget * 100) / 100
    jobTotals.total_committed = Math.round(jobTotals.total_committed * 100) / 100
    jobTotals.total_actual = Math.round(jobTotals.total_actual * 100) / 100
    jobTotals.total_projected = Math.round(jobTotals.total_projected * 100) / 100
    jobTotals.total_variance = Math.round(jobTotals.total_variance * 100) / 100

    return NextResponse.json({
      data: {
        job_id: params.job_id,
        units: unitReports,
        totals: jobTotals,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
