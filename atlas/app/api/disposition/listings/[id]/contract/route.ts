import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const UpdateContractSchema = z.object({
  id: z.string().uuid(),
  status: z
    .enum([
      "pending", "active", "contingent", "clear_to_close",
      "closed", "terminated", "cancelled",
    ])
    .optional(),
  effective_date: z.string().optional().nullable(),
  dd_deadline: z.string().optional().nullable(),
  financing_deadline: z.string().optional().nullable(),
  appraisal_deadline: z.string().optional().nullable(),
  closing_date: z.string().optional().nullable(),
  possession_date: z.string().optional().nullable(),
  purchase_price: z.number().optional().nullable(),
  earnest_money: z.number().optional().nullable(),
  seller_entity: z.string().optional().nullable(),
  seller_contact_id: z.string().uuid().optional().nullable(),
  buyer_entity: z.string().optional().nullable(),
  buyer_contact_id: z.string().uuid().optional().nullable(),
  title_company: z.string().optional().nullable(),
  escrow_officer: z.string().optional().nullable(),
  escrow_number: z.string().optional().nullable(),
  closing_attorney: z.string().optional().nullable(),
  inspection_status: z
    .enum(["pending", "scheduled", "passed", "failed", "waived"])
    .optional()
    .nullable(),
  inspection_date: z.string().optional().nullable(),
  inspection_notes: z.string().optional().nullable(),
  appraisal_status: z
    .enum(["pending", "ordered", "received", "approved", "disputed", "waived"])
    .optional()
    .nullable(),
  appraisal_value: z.number().optional().nullable(),
  appraisal_date: z.string().optional().nullable(),
  financing_status: z
    .enum(["pending", "pre_approved", "underwriting", "clear_to_close", "denied"])
    .optional()
    .nullable(),
  loan_commitment_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: Active contract for a listing
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("disposition_contracts")
      .select(
        `
        *,
        offer:disposition_offers(id, offer_number, buyer_name, offer_price),
        seller:contacts!disposition_contracts_seller_contact_id_fkey(
          id, first_name, last_name, company
        ),
        buyer:contacts!disposition_contracts_buyer_contact_id_fkey(
          id, first_name, last_name, company
        )
      `
      )
      .eq("listing_id", id)
      .not("status", "in", '("terminated","cancelled")')
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err) {
    console.error("GET /api/disposition/listings/[id]/contract error:", err)
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH: Update contract
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = UpdateContractSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { id: contractId, ...updates } = parsed.data

    const { data, error } = await supabase
      .from("disposition_contracts")
      .update(updates)
      .eq("id", contractId)
      .eq("listing_id", listingId)
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err) {
    console.error("PATCH /api/disposition/listings/[id]/contract error:", err)
    return NextResponse.json(
      { error: "Failed to update contract" },
      { status: 500 }
    )
  }
}
