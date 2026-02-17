import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation Schema
// ---------------------------------------------------------------------------
const FilterSchema = z.object({
  tax_year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .default(new Date().getFullYear()),
})

// ---------------------------------------------------------------------------
// GET  /api/construction/vendors/1099
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

    // Try using the vendor_1099_summary view first
    const { data: summary, error: viewError } = await supabase
      .from("vendor_1099_summary")
      .select("*")
      .eq("tax_year", params.tax_year)

    if (!viewError && summary) {
      return NextResponse.json({
        data: summary.map((row) => ({
          vendor_contact_id: row.contact_id,
          company_name: row.company_name,
          w9_on_file: row.w9_on_file,
          tax_year: row.tax_year,
          total_payments: Number(row.total_payments),
          is_1099_eligible: row.is_1099_eligible,
        })),
        tax_year: params.tax_year,
      })
    }

    // Fallback: compute manually if the view is not available
    // Get the user's organization
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

    // Fetch all vendor profiles with their contact info
    const { data: vendors, error: vendorError } = await supabase
      .from("vendor_profiles")
      .select(
        `
        contact_id,
        w9_on_file,
        contact:contacts!contact_id (
          id, first_name, last_name, company
        )
      `
      )

    if (vendorError) {
      return NextResponse.json({ error: vendorError.message }, { status: 500 })
    }

    if (!vendors || vendors.length === 0) {
      return NextResponse.json({ data: [], tax_year: params.tax_year })
    }

    // Fetch all cleared/processed payments within the tax year
    const yearStart = `${params.tax_year}-01-01`
    const yearEnd = `${params.tax_year}-12-31`

    const { data: payments, error: payError } = await supabase
      .from("ap_payments")
      .select(
        `
        id,
        vendor_contact_id,
        status,
        payment_date
      `
      )
      .eq("organization_id", organizationId)
      .in("status", ["processed", "cleared"])
      .gte("payment_date", yearStart)
      .lte("payment_date", yearEnd)

    if (payError) {
      return NextResponse.json({ error: payError.message }, { status: 500 })
    }

    // Fetch payment applications for those payments
    const paymentIds = (payments ?? []).map((p) => p.id)

    let totalsByVendor = new Map<string, number>()

    if (paymentIds.length > 0) {
      const { data: applications, error: appError } = await supabase
        .from("ap_payment_applications")
        .select("payment_id, amount_applied")
        .in("payment_id", paymentIds)

      if (appError) {
        return NextResponse.json({ error: appError.message }, { status: 500 })
      }

      // Map payment_id to vendor_contact_id
      const paymentToVendor = new Map<string, string>()
      for (const p of payments ?? []) {
        paymentToVendor.set(p.id, p.vendor_contact_id)
      }

      // Sum payment applications by vendor
      for (const app of applications ?? []) {
        const vendorId = paymentToVendor.get(app.payment_id)
        if (!vendorId) continue
        totalsByVendor.set(
          vendorId,
          (totalsByVendor.get(vendorId) ?? 0) + Number(app.amount_applied)
        )
      }
    }

    // Build response
    const result = vendors.map((v) => {
      const contact = v.contact as { id: string; first_name: string; last_name: string; company: string | null } | null
      const totalPayments = totalsByVendor.get(v.contact_id) ?? 0
      return {
        vendor_contact_id: v.contact_id,
        company_name: contact?.company ?? `${contact?.first_name ?? ""} ${contact?.last_name ?? ""}`.trim(),
        w9_on_file: v.w9_on_file,
        tax_year: params.tax_year,
        total_payments: Math.round(totalPayments * 100) / 100,
        is_1099_eligible: totalPayments >= 600,
      }
    })

    // Sort by total_payments descending
    result.sort((a, b) => b.total_payments - a.total_payments)

    return NextResponse.json({ data: result, tax_year: params.tax_year })
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
