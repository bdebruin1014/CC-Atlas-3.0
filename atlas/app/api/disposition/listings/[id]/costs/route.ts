import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const CostSchema = z.object({
  category: z
    .enum([
      "commission", "staging", "photography", "marketing",
      "closing_costs", "title_insurance", "recording",
      "transfer_tax", "hoa", "loan_payoff", "taxes",
      "repairs", "other",
    ])
    .optional()
    .nullable(),
  description: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  paid_date: z.string().optional().nullable(),
  vendor_contact_id: z.string().uuid().optional().nullable(),
})

const UpdateCostSchema = CostSchema.extend({
  id: z.string().uuid(),
})

const DeleteCostSchema = z.object({
  id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// GET: List costs for a listing
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("disposition_costs")
      .select(
        `
        *,
        vendor:contacts!disposition_costs_vendor_contact_id_fkey(
          id, first_name, last_name, company
        )
      `
      )
      .eq("listing_id", id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error("GET /api/disposition/listings/[id]/costs error:", err)
    return NextResponse.json(
      { error: "Failed to fetch costs" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create cost
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = CostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("disposition_costs")
      .insert({ ...parsed.data, listing_id: id })
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error("POST /api/disposition/listings/[id]/costs error:", err)
    return NextResponse.json(
      { error: "Failed to create cost" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH: Update cost
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = UpdateCostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { id: costId, ...updates } = parsed.data

    const { data, error } = await supabase
      .from("disposition_costs")
      .update(updates)
      .eq("id", costId)
      .eq("listing_id", listingId)
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err) {
    console.error("PATCH /api/disposition/listings/[id]/costs error:", err)
    return NextResponse.json(
      { error: "Failed to update cost" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE: Delete cost
// ---------------------------------------------------------------------------
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = DeleteCostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("disposition_costs")
      .delete()
      .eq("id", parsed.data.id)
      .eq("listing_id", listingId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/disposition/listings/[id]/costs error:", err)
    return NextResponse.json(
      { error: "Failed to delete cost" },
      { status: 500 }
    )
  }
}
