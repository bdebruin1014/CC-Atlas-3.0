import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------
const FilterSchema = z.object({
  job_id: z.string().uuid(),
})

const CreateDrawScheduleSchema = z.object({
  job_id: z.string().uuid(),
  contract_amount: z.number().positive(),
})

// Standard 5-draw percentages and names
const STANDARD_DRAWS = [
  { draw_number: 1, name: "Foundation", percentage: 20 },
  { draw_number: 2, name: "Framing", percentage: 20 },
  { draw_number: 3, name: "Mechanical Rough-In", percentage: 25 },
  { draw_number: 4, name: "Interior Finishes", percentage: 25 },
  { draw_number: 5, name: "Final / Certificate of Occupancy", percentage: 10 },
]

// ---------------------------------------------------------------------------
// GET  /api/construction/draws
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

    const { data: draws, error: queryError } = await supabase
      .from("draw_schedules")
      .select("*")
      .eq("job_id", params.job_id)
      .order("draw_number", { ascending: true })

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({ data: draws })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST  /api/construction/draws  (initialize draw schedule for a job)
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
    const input = CreateDrawScheduleSchema.parse(body)

    // Check that no draw schedule already exists for this job
    const { data: existing } = await supabase
      .from("draw_schedules")
      .select("id")
      .eq("job_id", input.job_id)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Draw schedule already exists for this job" },
        { status: 409 }
      )
    }

    // Create the 5 standard draws
    const drawRecords = STANDARD_DRAWS.map((draw) => ({
      job_id: input.job_id,
      draw_number: draw.draw_number,
      name: draw.name,
      percentage: draw.percentage,
      amount: Math.round(input.contract_amount * (draw.percentage / 100) * 100) / 100,
      milestone_phase: draw.draw_number,
      status: "pending" as const,
    }))

    const { data: draws, error: insertError } = await supabase
      .from("draw_schedules")
      .insert(drawRecords)
      .select()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ data: draws }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
