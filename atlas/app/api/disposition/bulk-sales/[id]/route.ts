import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const UpdateBulkSaleSchema = z.object({
  buyer_entity_name: z.string().optional().nullable(),
  buyer_contact_id: z.string().uuid().optional().nullable(),
  total_lots: z.number().int().optional().nullable(),
  price_per_lot: z.number().optional().nullable(),
  total_price: z.number().optional().nullable(),
  contract_date: z.string().optional().nullable(),
  status: z
    .enum(["negotiating", "active", "complete", "terminated"])
    .optional(),
  escalation_rate: z.number().optional().nullable(),
  escalation_period: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: Single bulk sale agreement with takedown counts
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
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
      .eq("id", id)
      .single()

    if (error) throw error
    if (!data)
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ data })
  } catch (err) {
    console.error("GET /api/disposition/bulk-sales/[id] error:", err)
    return NextResponse.json(
      { error: "Failed to fetch bulk sale agreement" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH: Update bulk sale agreement
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const parsed = UpdateBulkSaleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("disposition_bulk_sale_agreements")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err) {
    console.error("PATCH /api/disposition/bulk-sales/[id] error:", err)
    return NextResponse.json(
      { error: "Failed to update bulk sale agreement" },
      { status: 500 }
    )
  }
}
