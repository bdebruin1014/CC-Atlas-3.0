import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const ParamsSchema = z.object({
  id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// POST  /api/construction/invoices/[id]/approve
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
    const { id: invoiceId } = ParamsSchema.parse({ id })

    // Verify invoice exists and is in a state that can be approved
    const { data: rawInvoice, error: fetchError } = await supabase
      .from("ap_invoices")
      .select("id, status")
      .eq("id", invoiceId)
      .single()
    const invoice = rawInvoice as any

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    if (invoice.status === "approved") {
      return NextResponse.json(
        { error: "Invoice is already approved" },
        { status: 400 }
      )
    }

    if (invoice.status === "voided") {
      return NextResponse.json(
        { error: "Cannot approve a voided invoice" },
        { status: 400 }
      )
    }

    // Update invoice to approved
    const { data: updated, error: updateError } = await supabase
      .from("ap_invoices")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
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
