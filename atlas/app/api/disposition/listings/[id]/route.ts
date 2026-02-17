import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const UpdateListingSchema = z.object({
  property_address: z.string().optional().nullable(),
  property_city: z.string().optional().nullable(),
  property_state: z.string().optional().nullable(),
  property_zip: z.string().optional().nullable(),
  property_county: z.string().optional().nullable(),
  property_type: z
    .enum(["single_family", "townhome", "lot", "condo", "duplex", "land"])
    .optional()
    .nullable(),
  status: z
    .enum([
      "draft", "pre_listing", "active", "under_contract",
      "pending_closing", "closed", "withdrawn", "expired",
    ])
    .optional(),
  list_price: z.number().optional().nullable(),
  listing_date: z.string().optional().nullable(),
  expiration_date: z.string().optional().nullable(),
  dom: z.number().int().optional().nullable(),
  listing_agent_contact_id: z.string().uuid().optional().nullable(),
  listing_agent_commission: z.number().optional().nullable(),
  buyer_agent_commission: z.number().optional().nullable(),
  mls_number: z.string().optional().nullable(),
  mls_status: z.string().optional().nullable(),
  lockbox_code: z.string().optional().nullable(),
  showing_instructions: z.string().optional().nullable(),
  marketing_description: z.string().optional().nullable(),
  virtual_tour_url: z.string().optional().nullable(),
  bedrooms: z.number().int().optional().nullable(),
  bathrooms: z.number().optional().nullable(),
  sqft: z.number().int().optional().nullable(),
  lot_sqft: z.number().int().optional().nullable(),
  year_built: z.number().int().optional().nullable(),
  garage_spaces: z.number().int().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  job_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
  entity_id: z.string().uuid().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: Single listing with related counts
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data: listing, error } = await supabase
      .from("disposition_listings")
      .select(
        `
        *,
        project:projects(id, name, type, status),
        entity:entities(id, name),
        listing_agent:contacts!disposition_listings_listing_agent_contact_id_fkey(
          id, first_name, last_name, company, email, phone
        )
      `
      )
      .eq("id", id)
      .single()

    if (error) throw error
    if (!listing)
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Fetch related counts in parallel
    const [showingsRes, offersRes, contractRes] = await Promise.all([
      supabase
        .from("disposition_showings")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", id),
      supabase
        .from("disposition_offers")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", id),
      supabase
        .from("disposition_contracts")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", id)
        .not("status", "in", '("terminated","cancelled")'),
    ])

    return NextResponse.json({
      data: {
        ...listing,
        showings_count: showingsRes.count ?? 0,
        offers_count: offersRes.count ?? 0,
        active_contracts_count: contractRes.count ?? 0,
      },
    })
  } catch (err) {
    console.error("GET /api/disposition/listings/[id] error:", err)
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH: Update listing
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = UpdateListingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("disposition_listings")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err) {
    console.error("PATCH /api/disposition/listings/[id] error:", err)
    return NextResponse.json(
      { error: "Failed to update listing" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE: Only if draft
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check status first
    const { data: existing } = await supabase
      .from("disposition_listings")
      .select("status")
      .eq("id", id)
      .single()

    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft listings can be deleted" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("disposition_listings")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/disposition/listings/[id] error:", err)
    return NextResponse.json(
      { error: "Failed to delete listing" },
      { status: 500 }
    )
  }
}
