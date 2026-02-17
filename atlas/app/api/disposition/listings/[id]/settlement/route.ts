import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const CreateSettlementSchema = z.object({
  contract_id: z.string().uuid(),
  closing_date: z.string().optional().nullable(),
  title_company: z.string().optional().nullable(),
  closing_attorney: z.string().optional().nullable(),
  escrow_officer: z.string().optional().nullable(),
  escrow_number: z.string().optional().nullable(),
  units_conveyed: z.number().int().optional().nullable(),
  lot_numbers: z.string().optional().nullable(),
  gross_sale_price: z.number().optional().nullable(),
  credit_contract_price: z.number().optional().nullable(),
  credit_earnest_money: z.number().optional().nullable(),
  credit_other: z.number().optional().nullable(),
  charge_commission: z.number().optional().nullable(),
  charge_title_insurance: z.number().optional().nullable(),
  charge_settlement_fee: z.number().optional().nullable(),
  charge_recording_fees: z.number().optional().nullable(),
  charge_transfer_tax: z.number().optional().nullable(),
  charge_hoa_transfer: z.number().optional().nullable(),
  charge_loan_payoff: z.number().optional().nullable(),
  charge_prorated_taxes: z.number().optional().nullable(),
  charge_other: z.number().optional().nullable(),
})

const UpdateSettlementSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "scheduled", "closed"]).optional(),
  closing_date: z.string().optional().nullable(),
  title_company: z.string().optional().nullable(),
  closing_attorney: z.string().optional().nullable(),
  escrow_officer: z.string().optional().nullable(),
  escrow_number: z.string().optional().nullable(),
  units_conveyed: z.number().int().optional().nullable(),
  lot_numbers: z.string().optional().nullable(),
  gross_sale_price: z.number().optional().nullable(),
  credit_contract_price: z.number().optional().nullable(),
  credit_earnest_money: z.number().optional().nullable(),
  credit_other: z.number().optional().nullable(),
  charge_commission: z.number().optional().nullable(),
  charge_title_insurance: z.number().optional().nullable(),
  charge_settlement_fee: z.number().optional().nullable(),
  charge_recording_fees: z.number().optional().nullable(),
  charge_transfer_tax: z.number().optional().nullable(),
  charge_hoa_transfer: z.number().optional().nullable(),
  charge_loan_payoff: z.number().optional().nullable(),
  charge_prorated_taxes: z.number().optional().nullable(),
  charge_other: z.number().optional().nullable(),
  total_credits: z.number().optional().nullable(),
  total_charges: z.number().optional().nullable(),
  net_to_seller: z.number().optional().nullable(),
  funds_received: z.boolean().optional(),
  date_received: z.string().optional().nullable(),
  amount_received: z.number().optional().nullable(),
  wire_confirmation: z.string().optional().nullable(),
})

/**
 * Accounting integration hook — PLAN-2 Phase 8 will replace this
 * with actual GL entry creation.
 */
export function onClosingRecorded(settlementId: string) {
  console.log(
    `ACCOUNTING_HOOK: Settlement ${settlementId} closed — GL entries pending PLAN-2 integration`
  )
}

// ---------------------------------------------------------------------------
// GET: Settlement for a listing
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("disposition_settlements")
      .select(
        `
        *,
        contract:disposition_contracts(
          id, contract_number, purchase_price, buyer_entity
        )
      `
      )
      .eq("listing_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err) {
    console.error("GET /api/disposition/listings/[id]/settlement error:", err)
    return NextResponse.json(
      { error: "Failed to fetch settlement" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create settlement
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = CreateSettlementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Generate settlement number
    const year = new Date().getFullYear().toString().slice(-2)
    const { count } = await supabase
      .from("disposition_settlements")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", id)

    const seq = String((count ?? 0) + 1).padStart(3, "0")
    const settlementNumber = `SET-${year}-${seq}`

    // Calculate totals
    const credits =
      (parsed.data.credit_contract_price ?? 0) +
      (parsed.data.credit_earnest_money ?? 0) +
      (parsed.data.credit_other ?? 0)

    const charges =
      (parsed.data.charge_commission ?? 0) +
      (parsed.data.charge_title_insurance ?? 0) +
      (parsed.data.charge_settlement_fee ?? 0) +
      (parsed.data.charge_recording_fees ?? 0) +
      (parsed.data.charge_transfer_tax ?? 0) +
      (parsed.data.charge_hoa_transfer ?? 0) +
      (parsed.data.charge_loan_payoff ?? 0) +
      (parsed.data.charge_prorated_taxes ?? 0) +
      (parsed.data.charge_other ?? 0)

    const { data, error } = await supabase
      .from("disposition_settlements")
      .insert({
        ...parsed.data,
        listing_id: id,
        settlement_number: settlementNumber,
        total_credits: credits,
        total_charges: charges,
        net_to_seller: credits - charges,
      })
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error("POST /api/disposition/listings/[id]/settlement error:", err)
    return NextResponse.json(
      { error: "Failed to create settlement" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH: Update settlement. On status='closed': close listing, update unit.
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = UpdateSettlementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { id: settlementId, ...updates } = parsed.data

    const { data, error } = await supabase
      .from("disposition_settlements")
      .update(updates)
      .eq("id", settlementId)
      .eq("listing_id", listingId)
      .select("*")
      .single()

    if (error) throw error

    // Side effects when settlement closed
    if (updates.status === "closed" && data) {
      // Update listing status to closed
      await supabase
        .from("disposition_listings")
        .update({ status: "closed" })
        .eq("id", listingId)

      // Update linked unit status if applicable
      const { data: listing } = await supabase
        .from("disposition_listings")
        .select("unit_id")
        .eq("id", listingId)
        .single()

      if (listing?.unit_id) {
        // Mark unit's actual_completion_date
        await supabase
          .from("units")
          .update({ actual_completion_date: data.closing_date })
          .eq("id", listing.unit_id)
      }

      // Trigger accounting hook
      onClosingRecorded(settlementId)

      // Update contract status to closed
      if (data.contract_id) {
        await supabase
          .from("disposition_contracts")
          .update({ status: "closed" })
          .eq("id", data.contract_id)
      }
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error("PATCH /api/disposition/listings/[id]/settlement error:", err)
    return NextResponse.json(
      { error: "Failed to update settlement" },
      { status: 500 }
    )
  }
}
