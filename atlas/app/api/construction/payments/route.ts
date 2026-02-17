import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------
const FilterSchema = z.object({
  vendor_contact_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  payment_method: z
    .enum(["check", "ach", "wire", "credit_card"])
    .optional(),
  status: z
    .enum(["pending", "processed", "cleared", "voided", "returned"])
    .optional(),
  batch_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreatePaymentRunSchema = z.object({
  invoice_ids: z.array(z.string().uuid()).min(1),
  payment_method: z.enum(["check", "ach", "wire", "credit_card"]),
  payment_date: z.string(),
  bank_account: z.string().optional(),
})

// ---------------------------------------------------------------------------
// GET  /api/construction/payments
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = FilterSchema.parse(Object.fromEntries(searchParams))

    let query = supabase
      .from("ap_payments")
      .select(
        `
        *,
        vendor:contacts!vendor_contact_id (
          id, first_name, last_name, company
        )
      `,
        { count: "exact" }
      )

    if (params.vendor_contact_id) {
      query = query.eq("vendor_contact_id", params.vendor_contact_id)
    }
    if (params.date_from) {
      query = query.gte("payment_date", params.date_from)
    }
    if (params.date_to) {
      query = query.lte("payment_date", params.date_to)
    }
    if (params.payment_method) {
      query = query.eq("payment_method", params.payment_method)
    }
    if (params.status) {
      query = query.eq("status", params.status)
    }
    if (params.batch_id) {
      query = query.eq("batch_id", params.batch_id)
    }

    query = query
      .order("payment_date", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1)

    const { data: payments, error: queryError, count } = await query

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({ data: payments, count })
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

// ---------------------------------------------------------------------------
// POST  /api/construction/payments  (create payment run / batch)
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const input = CreatePaymentRunSchema.parse(body)

    // Get user's organization
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

    // Fetch all specified invoices
    const { data: invoices, error: invoiceError } = await supabase
      .from("ap_invoices")
      .select("*")
      .in("id", input.invoice_ids)
      .gt("balance_due", 0)

    if (invoiceError) {
      return NextResponse.json({ error: invoiceError.message }, { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { error: "No payable invoices found for the given IDs" },
        { status: 400 }
      )
    }

    // Generate a shared batch_id
    const batchId = crypto.randomUUID()

    // Group invoices by vendor
    const vendorGroups = new Map<string, typeof invoices>()
    for (const inv of invoices) {
      const vendorId = inv.vendor_contact_id
      if (!vendorGroups.has(vendorId)) {
        vendorGroups.set(vendorId, [])
      }
      vendorGroups.get(vendorId)!.push(inv)
    }

    // Generate payment numbers
    const { count: paymentCount } = await supabase
      .from("ap_payments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)

    let paymentSeq = (paymentCount ?? 0) + 1
    const currentYear = new Date().getFullYear()

    const createdPayments: Array<Record<string, unknown>> = []

    // For each vendor group, create a payment and apply to invoices
    for (const [vendorContactId, vendorInvoices] of vendorGroups) {
      const totalAmount = vendorInvoices.reduce(
        (sum, inv) => sum + Number(inv.balance_due),
        0
      )
      const roundedTotal = Math.round(totalAmount * 100) / 100

      const paymentNumber = `PAY-${currentYear}-${String(paymentSeq).padStart(4, "0")}`
      paymentSeq++

      // Create ap_payment
      const { data: payment, error: payError } = await supabase
        .from("ap_payments")
        .insert({
          organization_id: organizationId,
          payment_number: paymentNumber,
          payment_date: input.payment_date,
          payment_method: input.payment_method,
          vendor_contact_id: vendorContactId,
          total_amount: roundedTotal,
          bank_account: input.bank_account ?? null,
          batch_id: batchId,
          status: "pending",
          created_by: user.id,
        })
        .select()
        .single()

      if (payError || !payment) {
        console.error("Failed to create payment for vendor:", vendorContactId, payError)
        continue
      }

      // Create payment applications and update invoices
      for (const inv of vendorInvoices) {
        const amountApplied = Number(inv.balance_due)

        // Create ap_payment_application
        const { error: appError } = await supabase
          .from("ap_payment_applications")
          .insert({
            payment_id: payment.id,
            invoice_id: inv.id,
            amount_applied: amountApplied,
            is_retainage_release: false,
          })

        if (appError) {
          console.error("Failed to create payment application:", appError)
          continue
        }

        // Update invoice amounts and status
        const newAmountPaid =
          Math.round((Number(inv.amount_paid) + amountApplied) * 100) / 100
        const newBalanceDue =
          Math.round((Number(inv.net_amount) - newAmountPaid) * 100) / 100
        const newStatus = newBalanceDue <= 0 ? "paid" : "partially_paid"

        const { error: invUpdateError } = await supabase
          .from("ap_invoices")
          .update({
            amount_paid: newAmountPaid,
            balance_due: Math.max(0, newBalanceDue),
            status: newStatus,
          })
          .eq("id", inv.id)

        if (invUpdateError) {
          console.error("Failed to update invoice:", invUpdateError)
        }
      }

      createdPayments.push(payment)
    }

    return NextResponse.json(
      {
        data: {
          batch_id: batchId,
          payments: createdPayments,
          invoices_processed: invoices.length,
        },
      },
      { status: 201 }
    )
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
