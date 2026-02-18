import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const ParamsSchema = z.object({
  id: z.string().uuid(),
})

const VoidPaymentSchema = z.object({
  reason: z.string().min(1).optional(),
})

// ---------------------------------------------------------------------------
// POST  /api/construction/payments/[id]/void
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
    const { id: paymentId } = ParamsSchema.parse({ id })

    const body = await request.json().catch(() => ({}))
    const input = VoidPaymentSchema.parse(body)

    // Fetch the payment
    const { data: rawPayment, error: fetchError } = await supabase
      .from("ap_payments")
      .select("id, status, total_amount, vendor_contact_id")
      .eq("id", paymentId)
      .single()
    const payment = rawPayment as any

    if (fetchError || !payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    if (payment.status === "voided") {
      return NextResponse.json(
        { error: "Payment is already voided" },
        { status: 400 }
      )
    }

    // Fetch all payment applications for this payment
    const { data: rawApplications, error: appError } = await supabase
      .from("ap_payment_applications")
      .select("id, invoice_id, amount_applied")
      .eq("payment_id", paymentId)
    const applications = rawApplications as any[]

    if (appError) {
      return NextResponse.json({ error: appError.message }, { status: 500 })
    }

    // Reverse each payment application: restore invoice balances
    for (const app of applications ?? []) {
      const { data: rawInvoice } = await supabase
        .from("ap_invoices")
        .select("id, amount_paid, net_amount, balance_due, status")
        .eq("id", app.invoice_id)
        .single()
      const invoice = rawInvoice as any

      if (!invoice) continue

      const restoredAmountPaid = Math.max(
        0,
        Math.round((Number(invoice.amount_paid) - Number(app.amount_applied)) * 100) / 100
      )
      const restoredBalanceDue =
        Math.round((Number(invoice.net_amount) - restoredAmountPaid) * 100) / 100

      // Determine new status
      let newStatus: string
      if (restoredAmountPaid <= 0) {
        newStatus = "approved"
      } else if (restoredBalanceDue > 0) {
        newStatus = "partially_paid"
      } else {
        newStatus = "paid"
      }

      const { error: invUpdateError } = await supabase
        .from("ap_invoices")
        .update({
          amount_paid: restoredAmountPaid,
          balance_due: Math.max(0, restoredBalanceDue),
          status: newStatus,
        })
        .eq("id", app.invoice_id)

      if (invUpdateError) {
        console.error("Failed to restore invoice balance:", invUpdateError)
      }
    }

    // Update payment status to voided
    const { data: voidedPayment, error: voidError } = await supabase
      .from("ap_payments")
      .update({
        status: "voided",
        voided_date: new Date().toISOString().split("T")[0],
        voided_reason: input.reason ?? null,
      })
      .eq("id", paymentId)
      .select()
      .single()

    if (voidError) {
      return NextResponse.json({ error: voidError.message }, { status: 500 })
    }

    return NextResponse.json({
      data: voidedPayment,
      reversed_applications: (applications ?? []).length,
    })
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
