import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const PeriodFilterSchema = z.object({
  entity_id: z.string().uuid("entity_id is required"),
  status: z.enum(["open", "review", "closed", "locked"]).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
})

const CreatePeriodSchema = z.object({
  entity_id: z.string().uuid(),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format"),
})

// ---------------------------------------------------------------------------
// GET: List fiscal periods for entity
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

    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())
    const parsed = PeriodFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    let query = supabase
      .from("fiscal_periods")
      .select(
        `
        *,
        closed_by_user:profiles!fiscal_periods_closed_by_fkey(id, first_name, last_name)
      `
      )
      .eq("entity_id", filters.entity_id)
      .order("period", { ascending: false })

    if (filters.status) {
      query = query.eq("status", filters.status)
    }
    if (filters.year) {
      query = query.like("period", `${filters.year}-%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Periods fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch fiscal periods" },
        { status: 500 }
      )
    }

    // Enrich with transaction counts per period
    const enriched = []
    for (const period of data || []) {
      const { count: txCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("entity_id", filters.entity_id)
        .eq("period", period.period)

      const { count: unpostedCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("entity_id", filters.entity_id)
        .eq("period", period.period)
        .in("status", ["pending", "approved"])

      enriched.push({
        ...period,
        transaction_count: txCount || 0,
        unposted_count: unpostedCount || 0,
      })
    }

    return NextResponse.json({ data: enriched })
  } catch (err) {
    console.error("Periods GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Open new fiscal period
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreatePeriodSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Check if period already exists
    const { data: existingPeriod } = await supabase
      .from("fiscal_periods")
      .select("id, status")
      .eq("entity_id", input.entity_id)
      .eq("period", input.period)
      .single()

    if (existingPeriod) {
      return NextResponse.json(
        {
          error: "Period already exists",
          details: `Period ${input.period} already exists with status: ${existingPeriod.status}`,
        },
        { status: 409 }
      )
    }

    // Calculate the previous period
    const [yearStr, monthStr] = input.period.split("-")
    let prevYear = parseInt(yearStr, 10)
    let prevMonth = parseInt(monthStr, 10) - 1
    if (prevMonth === 0) {
      prevMonth = 12
      prevYear -= 1
    }
    const prevPeriod = `${prevYear}-${prevMonth.toString().padStart(2, "0")}`

    // Validate previous period is closed or locked (if it exists)
    const { data: prevPeriodData } = await supabase
      .from("fiscal_periods")
      .select("id, status")
      .eq("entity_id", input.entity_id)
      .eq("period", prevPeriod)
      .single()

    if (prevPeriodData && !["closed", "locked"].includes(prevPeriodData.status)) {
      return NextResponse.json(
        {
          error: "Previous period not closed",
          details: `Previous period ${prevPeriod} has status '${prevPeriodData.status}'. It must be closed or locked before opening a new period.`,
        },
        { status: 400 }
      )
    }

    // Create the new period
    const { data: period, error: createError } = await supabase
      .from("fiscal_periods")
      .insert({
        entity_id: input.entity_id,
        period: input.period,
        status: "open",
      })
      .select("*")
      .single()

    if (createError) {
      console.error("Create period error:", createError)
      return NextResponse.json(
        { error: "Failed to create period", details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: period }, { status: 201 })
  } catch (err) {
    console.error("Periods POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
