import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const CreateOfferSchema = z.object({
  buyer_name: z.string().optional().nullable(),
  buyer_agent_name: z.string().optional().nullable(),
  buyer_agent_company: z.string().optional().nullable(),
  buyer_agent_email: z.string().optional().nullable(),
  buyer_agent_phone: z.string().optional().nullable(),
  offer_price: z.number().optional().nullable(),
  earnest_money: z.number().optional().nullable(),
  em_due_date: z.string().optional().nullable(),
  financing_type: z
    .enum(["cash", "conventional", "fha", "va", "usda", "other"])
    .optional()
    .nullable(),
  loan_amount: z.number().optional().nullable(),
  down_payment: z.number().optional().nullable(),
  closing_cost_assistance: z.number().optional().nullable(),
  other_concessions: z.number().optional().nullable(),
  concession_notes: z.string().optional().nullable(),
  contingency_financing: z.boolean().default(false),
  contingency_inspection: z.boolean().default(false),
  contingency_appraisal: z.boolean().default(false),
  contingency_sale: z.boolean().default(false),
  proposed_closing_date: z.string().optional().nullable(),
  proposed_possession_date: z.string().optional().nullable(),
  expiration_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

async function generateOfferNumber(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  listingId: string
) {
  const year = new Date().getFullYear().toString().slice(-2)
  const { count } = await supabase
    .from("disposition_offers")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)

  const seq = String((count ?? 0) + 1).padStart(3, "0")
  return `OFR-${year}-${seq}`
}

async function calculateNetToSeller(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  listingId: string,
  offerPrice: number | null | undefined
) {
  if (!offerPrice) return { net_to_seller: null, projected_profit: null }

  const { data: listing } = await supabase
    .from("disposition_listings")
    .select("listing_agent_commission, buyer_agent_commission, unit_id")
    .eq("id", listingId)
    .single()

  const agentCommission = offerPrice * ((listing?.listing_agent_commission ?? 3) / 100)
  const buyerCommission = offerPrice * ((listing?.buyer_agent_commission ?? 3) / 100)
  const estimatedClosingCosts = offerPrice * 0.015 // ~1.5% estimate
  const net_to_seller = offerPrice - agentCommission - buyerCommission - estimatedClosingCosts

  // Try to calculate projected profit from unit total cost
  let projected_profit: number | null = null
  if (listing?.unit_id) {
    const { data: unit } = await supabase
      .from("units")
      .select("total_budget")
      .eq("id", listing.unit_id)
      .single()
    if (unit?.total_budget) {
      projected_profit = net_to_seller - unit.total_budget
    }
  }

  return { net_to_seller: Math.round(net_to_seller * 100) / 100, projected_profit }
}

// ---------------------------------------------------------------------------
// GET: List offers for a listing
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("disposition_offers")
      .select("*")
      .eq("listing_id", id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error("GET /api/disposition/listings/[id]/offers error:", err)
    return NextResponse.json(
      { error: "Failed to fetch offers" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create offer with auto-calculated fields
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = CreateOfferSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const offerNumber = await generateOfferNumber(supabase, id)
    const calcs = await calculateNetToSeller(supabase, id, parsed.data.offer_price)

    const { data, error } = await supabase
      .from("disposition_offers")
      .insert({
        ...parsed.data,
        listing_id: id,
        offer_number: offerNumber,
        net_to_seller: calcs.net_to_seller,
        projected_profit: calcs.projected_profit,
      })
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error("POST /api/disposition/listings/[id]/offers error:", err)
    return NextResponse.json(
      { error: "Failed to create offer" },
      { status: 500 }
    )
  }
}
