import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const UpdateTakedownSchema = z.object({
  takedown_number: z.number().int().optional().nullable(),
  scheduled_date: z.string().optional().nullable(),
  lots_count: z.number().int().optional().nullable(),
  lot_numbers: z.array(z.string()).optional().nullable(),
  scheduled_amount: z.number().optional().nullable(),
  status: z
    .enum(["scheduled", "upcoming", "completed", "delayed"])
    .optional(),
  actual_date: z.string().optional().nullable(),
  actual_amount: z.number().optional().nullable(),
  variance: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// PATCH: Update takedown
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; takedownId: string }> }
) {
  try {
    const { id: _agreementId, takedownId } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = UpdateTakedownSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Auto-calculate variance if actual_amount provided
    const updates: Record<string, unknown> = { ...parsed.data }
    if (
      parsed.data.actual_amount !== undefined &&
      parsed.data.actual_amount !== null
    ) {
      // Get the scheduled amount to compute variance
      const { data: existing } = await supabase
        .from("disposition_takedown_schedule")
        .select("scheduled_amount")
        .eq("id", takedownId)
        .single()

      if (existing?.scheduled_amount) {
        updates.variance = parsed.data.actual_amount - existing.scheduled_amount
      }
    }

    const { data, error } = await supabase
      .from("disposition_takedown_schedule")
      .update(updates)
      .eq("id", takedownId)
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err) {
    console.error(
      "PATCH /api/disposition/bulk-sales/[id]/takedowns/[takedownId] error:",
      err
    )
    return NextResponse.json(
      { error: "Failed to update takedown" },
      { status: 500 }
    )
  }
}
