import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const UpdateOfferSchema = z.object({
  buyer_name: z.string().optional().nullable(),
  buyer_agent_name: z.string().optional().nullable(),
  buyer_agent_company: z.string().optional().nullable(),
  buyer_agent_email: z.string().optional().nullable(),
  buyer_agent_phone: z.string().optional().nullable(),
  offer_price: z.number().optional().nullable(),
  earnest_money: z.number().optional().nullable(),
  em_due_date: z.string().optional().nullable(),
  em_received: z.boolean().optional(),
  financing_type: z
    .enum(["cash", "conventional", "fha", "va", "usda", "other"])
    .optional()
    .nullable(),
  loan_amount: z.number().optional().nullable(),
  down_payment: z.number().optional().nullable(),
  closing_cost_assistance: z.number().optional().nullable(),
  other_concessions: z.number().optional().nullable(),
  concession_notes: z.string().optional().nullable(),
  contingency_financing: z.boolean().optional(),
  contingency_inspection: z.boolean().optional(),
  contingency_appraisal: z.boolean().optional(),
  contingency_sale: z.boolean().optional(),
  proposed_closing_date: z.string().optional().nullable(),
  proposed_possession_date: z.string().optional().nullable(),
  expiration_date: z.string().optional().nullable(),
  status: z
    .enum([
      "received", "reviewing", "countered", "accepted",
      "rejected", "expired", "withdrawn",
    ])
    .optional(),
  counter_price: z.number().optional().nullable(),
  counter_notes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// PATCH: Update offer. On acceptance: create contract, update listing, reject others.
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const { id: listingId, offerId } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = UpdateOfferSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Update the offer
    const { data: offer, error } = await supabase
      .from("disposition_offers")
      .update(parsed.data)
      .eq("id", offerId)
      .eq("listing_id", listingId)
      .select("*")
      .single()

    if (error) throw error

    // Side effects when offer is accepted
    if (parsed.data.status === "accepted" && offer) {
      // Generate contract number
      const year = new Date().getFullYear().toString().slice(-2)
      const { count } = await supabase
        .from("disposition_contracts")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listingId)

      const seq = String((count ?? 0) + 1).padStart(3, "0")
      const contractNumber = `CON-${year}-${seq}`

      // Create contract from accepted offer
      await supabase.from("disposition_contracts").insert({
        listing_id: listingId,
        offer_id: offerId,
        contract_number: contractNumber,
        status: "pending",
        purchase_price: offer.offer_price,
        earnest_money: offer.earnest_money,
        closing_date: offer.proposed_closing_date,
        possession_date: offer.proposed_possession_date,
      })

      // Update listing status to under_contract
      await supabase
        .from("disposition_listings")
        .update({ status: "under_contract" })
        .eq("id", listingId)

      // Reject all other active offers
      await supabase
        .from("disposition_offers")
        .update({ status: "rejected" })
        .eq("listing_id", listingId)
        .neq("id", offerId)
        .in("status", ["received", "reviewing", "countered"])
    }

    return NextResponse.json({ data: offer })
  } catch (err) {
    console.error("PATCH /api/disposition/listings/[id]/offers/[offerId] error:", err)
    return NextResponse.json(
      { error: "Failed to update offer" },
      { status: 500 }
    )
  }
}
