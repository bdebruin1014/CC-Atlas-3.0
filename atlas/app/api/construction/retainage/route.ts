import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------
const FilterSchema = z.object({
  job_id: z.string().uuid().optional(),
  vendor_contact_id: z.string().uuid().optional(),
  status: z.enum(["held", "partially_released", "released"]).optional(),
})

const ReleaseRetainageSchema = z.object({
  retainage_ids: z.array(z.string().uuid()).min(1),
  payment_method: z.enum(["check", "ach", "wire", "credit_card"]),
  bank_account: z.string().optional(),
})

// ---------------------------------------------------------------------------
// GET  /api/construction/retainage
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
      .from("retainage_ledger")
      .select(
        `
        *,
        vendor:contacts!vendor_contact_id (
          id, first_name, last_name, company
        ),
        invoice:ap_invoices!invoice_id (
          id, invoice_number
        )
      `
      )

    if (params.job_id) {
      query = query.eq("job_id", params.job_id)
    }
    if (params.vendor_contact_id) {
      query = query.eq("vendor_contact_id", params.vendor_contact_id)
    }
    if (params.status) {
      query = query.eq("status", params.status)
    }

    query = query.order("created_at", { ascending: false })

    const { data: retainage, error: queryError } = await query

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    // Compute summary totals
    const summary = {
      total_held: 0,
      total_released: 0,
      total_outstanding: 0,
    }
    for (const entry of retainage ?? []) {
      summary.total_held += Number(entry.amount_held)
      summary.total_released += Number(entry.amount_released)
    }
    summary.total_outstanding =
      Math.round((summary.total_held - summary.total_released) * 100) / 100
    summary.total_held = Math.round(summary.total_held * 100) / 100
    summary.total_released = Math.round(summary.total_released * 100) / 100

    return NextResponse.json({ data: retainage, summary })
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
// POST  /api/construction/retainage  (release retainage)
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
    const input = ReleaseRetainageSchema.parse(body)

    // Get the user's organization_id
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

    // Fetch the retainage entries
    const { data: entries, error: fetchError } = await supabase
      .from("retainage_ledger")
      .select("*")
      .in("id", input.retainage_ids)
      .neq("status", "released")

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { error: "No releasable retainage entries found" },
        { status: 400 }
      )
    }

    // Group entries by vendor
    const vendorGroups = new Map<string, typeof entries>()
    for (const entry of entries) {
      const vendorId = entry.vendor_contact_id
      if (!vendorGroups.has(vendorId)) {
        vendorGroups.set(vendorId, [])
      }
      vendorGroups.get(vendorId)!.push(entry)
    }

    // Generate payment number
    const { count: paymentCount } = await supabase
      .from("ap_payments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)

    let paymentSeq = (paymentCount ?? 0) + 1
    const currentYear = new Date().getFullYear()
    const today = new Date().toISOString().split("T")[0]

    const createdPayments: Array<Record<string, unknown>> = []

    for (const [vendorContactId, vendorEntries] of vendorGroups) {
      const totalRelease = vendorEntries.reduce(
        (sum, e) => sum + (Number(e.amount_held) - Number(e.amount_released)),
        0
      )
      const roundedTotal = Math.round(totalRelease * 100) / 100

      if (roundedTotal <= 0) continue

      const paymentNumber = `RET-${currentYear}-${String(paymentSeq).padStart(4, "0")}`
      paymentSeq++

      // Create payment for retainage release
      const { data: payment, error: payError } = await supabase
        .from("ap_payments")
        .insert({
          organization_id: organizationId,
          payment_number: paymentNumber,
          payment_date: today,
          payment_method: input.payment_method,
          vendor_contact_id: vendorContactId,
          total_amount: roundedTotal,
          bank_account: input.bank_account ?? null,
          status: "pending",
          created_by: user.id,
        })
        .select()
        .single()

      if (payError || !payment) {
        console.error("Failed to create retainage release payment:", payError)
        continue
      }

      // Update each retainage entry
      for (const entry of vendorEntries) {
        const releaseAmount = Number(entry.amount_held) - Number(entry.amount_released)

        const { error: updateError } = await supabase
          .from("retainage_ledger")
          .update({
            amount_released: Number(entry.amount_held),
            release_date: today,
            release_payment_id: payment.id,
            status: "released",
          })
          .eq("id", entry.id)

        if (updateError) {
          console.error("Failed to update retainage entry:", updateError)
          continue
        }

        // Create a payment application linked to the original invoice
        const { error: appError } = await supabase
          .from("ap_payment_applications")
          .insert({
            payment_id: payment.id,
            invoice_id: entry.invoice_id,
            amount_applied: releaseAmount,
            is_retainage_release: true,
          })

        if (appError) {
          console.error("Failed to create retainage payment application:", appError)
        }
      }

      createdPayments.push(payment)
    }

    return NextResponse.json(
      {
        data: {
          payments: createdPayments,
          entries_released: entries.length,
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
