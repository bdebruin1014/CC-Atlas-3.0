import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const CreateListingSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  job_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
  entity_id: z.string().uuid().optional().nullable(),
  property_address: z.string().optional().nullable(),
  property_city: z.string().optional().nullable(),
  property_state: z.string().optional().nullable(),
  property_zip: z.string().optional().nullable(),
  property_county: z.string().optional().nullable(),
  property_type: z
    .enum(["single_family", "townhome", "lot", "condo", "duplex", "land"])
    .optional()
    .nullable(),
  list_price: z.number().optional().nullable(),
  original_list_price: z.number().optional().nullable(),
  listing_date: z.string().optional().nullable(),
  expiration_date: z.string().optional().nullable(),
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
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getOrgId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: "Unauthorized" as const, status: 401 }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id)
    return { error: "No organization" as const, status: 403 }

  return { userId: user.id, orgId: profile.organization_id as string }
}

async function generateListingNumber(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgId: string
) {
  const year = new Date().getFullYear().toString().slice(-2)
  const { count } = await supabase
    .from("disposition_listings")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)

  const seq = String((count ?? 0) + 1).padStart(3, "0")
  return `DL-${year}-${seq}`
}

// ---------------------------------------------------------------------------
// GET: List listings with filters, pagination, sorting
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const auth = await getOrgId(supabase)
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status })

    const params = request.nextUrl.searchParams

    // Count query
    let countQuery = supabase
      .from("disposition_listings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", auth.orgId)

    // Data query
    let query = supabase
      .from("disposition_listings")
      .select(
        `
        *,
        project:projects(id, name),
        entity:entities(id, name),
        listing_agent:contacts!disposition_listings_listing_agent_contact_id_fkey(
          id, first_name, last_name, company, email, phone
        )
      `
      )
      .eq("organization_id", auth.orgId)

    // Filters
    const status = params.get("status")
    if (status) {
      const vals = status.split(",")
      query = query.in("status", vals)
      countQuery = countQuery.in("status", vals)
    }

    const projectId = params.get("project_id")
    if (projectId) {
      query = query.eq("project_id", projectId)
      countQuery = countQuery.eq("project_id", projectId)
    }

    const entityId = params.get("entity_id")
    if (entityId) {
      query = query.eq("entity_id", entityId)
      countQuery = countQuery.eq("entity_id", entityId)
    }

    const propertyType = params.get("property_type")
    if (propertyType) {
      query = query.eq("property_type", propertyType)
      countQuery = countQuery.eq("property_type", propertyType)
    }

    const search = params.get("search")
    if (search) {
      const filter = `property_address.ilike.%${search}%,listing_number.ilike.%${search}%,mls_number.ilike.%${search}%`
      query = query.or(filter)
      countQuery = countQuery.or(filter)
    }

    // Sorting
    const sortBy = params.get("sort_by") || "created_at"
    const sortDir = params.get("sort_dir") === "asc" ? true : false
    query = query.order(sortBy, { ascending: sortDir })

    // Pagination
    const page = parseInt(params.get("page") || "1", 10)
    const pageSize = parseInt(params.get("page_size") || "25", 10)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const [{ data, error }, { count }] = await Promise.all([query, countQuery])

    if (error) throw error

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      page_size: pageSize,
    })
  } catch (err) {
    console.error("GET /api/disposition/listings error:", err)
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create a listing
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const auth = await getOrgId(supabase)
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json()
    const parsed = CreateListingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const listingNumber = await generateListingNumber(supabase, auth.orgId)

    const { data, error } = await supabase
      .from("disposition_listings")
      .insert({
        ...parsed.data,
        organization_id: auth.orgId,
        listing_number: listingNumber,
        original_list_price: parsed.data.original_list_price ?? parsed.data.list_price,
      })
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error("POST /api/disposition/listings error:", err)
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    )
  }
}
