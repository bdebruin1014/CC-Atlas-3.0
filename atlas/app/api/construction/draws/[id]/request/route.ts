import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const ParamsSchema = z.object({
  id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// POST  /api/construction/draws/[id]/request
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
    const { id: drawId } = ParamsSchema.parse({ id })

    // Fetch the draw
    const { data: draw, error: fetchError } = await supabase
      .from("draw_schedules")
      .select("*")
      .eq("id", drawId)
      .single()

    if (fetchError || !draw) {
      return NextResponse.json(
        { error: "Draw schedule not found" },
        { status: 404 }
      )
    }

    if (draw.status === "requested" || draw.status === "approved" || draw.status === "invoiced" || draw.status === "paid") {
      return NextResponse.json(
        { error: `Draw has already been ${draw.status}` },
        { status: 400 }
      )
    }

    // Get the user's organization_id for creating the AR invoice
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "User organization not found" },
        { status: 400 }
      )
    }

    const organizationId = profile.organization_id

    // Auto-generate AR invoice number
    const currentYear = new Date().getFullYear()
    const { count: arCount } = await supabase
      .from("ar_invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)

    const nextNumber = (arCount ?? 0) + 1
    const invoiceNumber = `AR-${currentYear}-${String(nextNumber).padStart(4, "0")}`

    const today = new Date().toISOString().split("T")[0]
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    const dueDateStr = dueDate.toISOString().split("T")[0]

    // Create AR invoice
    const { data: arInvoice, error: arError } = await supabase
      .from("ar_invoices")
      .insert({
        organization_id: organizationId,
        invoice_number: invoiceNumber,
        job_id: draw.job_id,
        client_type: "internal",
        draw_number: draw.draw_number,
        invoice_date: today,
        due_date: dueDateStr,
        amount: draw.amount,
        amount_received: 0,
        balance_due: draw.amount,
        description: `Draw #${draw.draw_number} - ${draw.name}`,
        status: "draft",
      })
      .select()
      .single()

    if (arError) {
      return NextResponse.json({ error: arError.message }, { status: 500 })
    }

    // Update draw status to 'requested'
    const { data: updatedDraw, error: updateError } = await supabase
      .from("draw_schedules")
      .update({
        status: "requested",
        requested_date: today,
        invoice_id: arInvoice.id,
      })
      .eq("id", drawId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        draw: updatedDraw,
        ar_invoice: arInvoice,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
