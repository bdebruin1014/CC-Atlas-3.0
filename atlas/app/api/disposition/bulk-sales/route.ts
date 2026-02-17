import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const CreateBulkSaleSchema = z.object({
  project_id: z.string().uuid(),
  buyer_entity_name: z.string().optional().nullable(),
  buyer_contact_id: z.string().uuid().optional().nullable(),
  total_lots: z.number().int().optional().nullable(),
  price_per_lot: z.number().optional().nullable(),
  total_price: z.number().optional().nullable(),
  contract_date: z.string().optional().nullable(),
  escalation_rate: z.number().optional().nullable(),
  escalation_period: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: List bulk sale agreements (filtered by project_id)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id)
      return NextResponse.json({ error: "No organization" }, { status: 403 })

    const params = request.nextUrl.searchParams
    let query = supabase
      .from("disposition_bulk_sale_agreements")
      .select(
        `
        *,
        project:projects(id, name),
        buyer:contacts!disposition_bulk_sale_agreements_buyer_contact_id_fkey(
          id, first_name, last_name, company
        )
      `
      )
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })

    const projectId = params.get("project_id")
    if (projectId) {
      query = query.eq("project_id", projectId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error("GET /api/disposition/bulk-sales error:", err)
    return NextResponse.json(
      { error: "Failed to fetch bulk sale agreements" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create bulk sale agreement
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id)
      return NextResponse.json({ error: "No organization" }, { status: 403 })

    const body = await request.json()
    const parsed = CreateBulkSaleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("disposition_bulk_sale_agreements")
      .insert({
        ...parsed.data,
        organization_id: profile.organization_id,
      })
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error("POST /api/disposition/bulk-sales error:", err)
    return NextResponse.json(
      { error: "Failed to create bulk sale agreement" },
      { status: 500 }
    )
  }
}
