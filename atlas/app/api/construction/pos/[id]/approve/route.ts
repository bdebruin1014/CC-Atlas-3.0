import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const ParamsSchema = z.object({
  id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// POST  /api/construction/pos/[id]/approve
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { id: poId } = ParamsSchema.parse({ id })

    // Fetch the PO
    const { data: po, error: fetchError } = await supabase
      .from("purchase_orders")
      .select("id, status")
      .eq("id", poId)
      .single()

    if (fetchError || !po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      )
    }

    if (po.status === "approved") {
      return NextResponse.json(
        { error: "Purchase order is already approved" },
        { status: 400 }
      )
    }

    if (!["draft", "submitted"].includes(po.status)) {
      return NextResponse.json(
        { error: `Cannot approve a purchase order with status '${po.status}'` },
        { status: 400 }
      )
    }

    // Update PO to approved
    const { data: updated, error: updateError } = await supabase
      .from("purchase_orders")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", poId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
