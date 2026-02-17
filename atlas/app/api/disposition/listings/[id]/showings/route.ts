import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const CreateShowingSchema = z.object({
  showing_date: z.string().optional().nullable(),
  showing_agent_name: z.string().optional().nullable(),
  showing_agent_company: z.string().optional().nullable(),
  showing_agent_phone: z.string().optional().nullable(),
  showing_agent_email: z.string().optional().nullable(),
  feedback: z.string().optional().nullable(),
  interest_level: z
    .enum(["not_interested", "somewhat", "very_interested", "making_offer"])
    .optional()
    .nullable(),
  follow_up_needed: z.boolean().default(false),
  follow_up_notes: z.string().optional().nullable(),
  follow_up_date: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: List showings for a listing
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("disposition_showings")
      .select("*")
      .eq("listing_id", id)
      .order("showing_date", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error("GET /api/disposition/listings/[id]/showings error:", err)
    return NextResponse.json(
      { error: "Failed to fetch showings" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create showing
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = CreateShowingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("disposition_showings")
      .insert({ ...parsed.data, listing_id: id })
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error("POST /api/disposition/listings/[id]/showings error:", err)
    return NextResponse.json(
      { error: "Failed to create showing" },
      { status: 500 }
    )
  }
}
