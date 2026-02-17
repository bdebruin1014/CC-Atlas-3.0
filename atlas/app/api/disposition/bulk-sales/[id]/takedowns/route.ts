import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const CreateTakedownSchema = z.object({
  takedown_number: z.number().int().optional().nullable(),
  scheduled_date: z.string().optional().nullable(),
  lots_count: z.number().int().optional().nullable(),
  lot_numbers: z.array(z.string()).optional().nullable(),
  scheduled_amount: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: List takedowns for a bulk sale agreement
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("disposition_takedown_schedule")
      .select("*")
      .eq("bulk_sale_agreement_id", id)
      .order("takedown_number", { ascending: true })

    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error(
      "GET /api/disposition/bulk-sales/[id]/takedowns error:",
      err
    )
    return NextResponse.json(
      { error: "Failed to fetch takedowns" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create takedown
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = CreateTakedownSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Auto-assign takedown number if not provided
    let takedownNumber = parsed.data.takedown_number
    if (!takedownNumber) {
      const { count } = await supabase
        .from("disposition_takedown_schedule")
        .select("id", { count: "exact", head: true })
        .eq("bulk_sale_agreement_id", id)

      takedownNumber = (count ?? 0) + 1
    }

    const { data, error } = await supabase
      .from("disposition_takedown_schedule")
      .insert({
        ...parsed.data,
        bulk_sale_agreement_id: id,
        takedown_number: takedownNumber,
      })
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error(
      "POST /api/disposition/bulk-sales/[id]/takedowns error:",
      err
    )
    return NextResponse.json(
      { error: "Failed to create takedown" },
      { status: 500 }
    )
  }
}
