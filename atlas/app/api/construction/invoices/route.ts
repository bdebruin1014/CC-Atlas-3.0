import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------
const FilterSchema = z.object({
  job_id: z.string().uuid().optional(),
  unit_id: z.string().uuid().optional(),
  vendor_contact_id: z.string().uuid().optional(),
  status: z
    .enum([
      "received",
      "coded",
      "approved",
      "scheduled",
      "partially_paid",
      "paid",
      "disputed",
      "voided",
    ])
    .optional(),
  due_date_from: z.string().optional(),
  due_date_to: z.string().optional(),
  aging_bucket: z
    .enum(["current", "1-30", "31-60", "61-90", "over-90"])
    .optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreateInvoiceSchema = z.object({
  vendor_contact_id: z.string().uuid(),
  po_id: z.string().uuid().optional(),
  job_id: z.string().uuid(),
  unit_id: z.string().uuid().optional(),
  invoice_date: z.string(),
  due_date: z.string(),
  received_date: z.string().optional(),
  gross_amount: z.number().positive(),
  retainage_pct: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  cost_code: z.string().optional(),
  accounting_period: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function computeAgingBucket(agingDays: number): string {
  if (agingDays <= 0) return "current"
  if (agingDays <= 30) return "1-30"
  if (agingDays <= 60) return "31-60"
  if (agingDays <= 90) return "61-90"
  return "over-90"
}

// ---------------------------------------------------------------------------
// GET  /api/construction/invoices
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

    // Build query – join vendor contact info
    let query = supabase
      .from("ap_invoices")
      .select(
        `
        *,
        vendor:contacts!vendor_contact_id (
          id, first_name, last_name, company
        )
      `,
        { count: "exact" }
      )

    // Apply filters
    if (params.job_id) {
      query = query.eq("job_id", params.job_id)
    }
    if (params.unit_id) {
      query = query.eq("unit_id", params.unit_id)
    }
    if (params.vendor_contact_id) {
      query = query.eq("vendor_contact_id", params.vendor_contact_id)
    }
    if (params.status) {
      query = query.eq("status", params.status)
    }
    if (params.due_date_from) {
      query = query.gte("due_date", params.due_date_from)
    }
    if (params.due_date_to) {
      query = query.lte("due_date", params.due_date_to)
    }
    if (params.search) {
      query = query.or(
        `invoice_number.ilike.%${params.search}%,description.ilike.%${params.search}%`
      )
    }

    query = query
      .order("due_date", { ascending: true })
      .range(params.offset, params.offset + params.limit - 1)

    const { data: invoices, error: queryError, count } = await query

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    // Compute aging_days and aging_bucket for each invoice
    const today = new Date()
    const enriched = (invoices ?? []).map((inv) => {
      const dueDate = new Date(inv.due_date)
      const diffMs = today.getTime() - dueDate.getTime()
      const agingDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      const agingBucket = computeAgingBucket(agingDays)
      return { ...inv, aging_days: agingDays, aging_bucket: agingBucket }
    })

    // Filter by aging bucket if requested (post-query since it's computed)
    const filtered = params.aging_bucket
      ? enriched.filter((inv) => inv.aging_bucket === params.aging_bucket)
      : enriched

    return NextResponse.json({
      data: filtered,
      count: params.aging_bucket ? filtered.length : count,
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

// ---------------------------------------------------------------------------
// POST  /api/construction/invoices
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
    const input = CreateInvoiceSchema.parse(body)

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

    // Auto-generate invoice_number: INV-YYYY-NNNN
    const currentYear = new Date().getFullYear()
    const { count: invoiceCount } = await supabase
      .from("ap_invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)

    const nextNumber = (invoiceCount ?? 0) + 1
    const invoiceNumber = `INV-${currentYear}-${String(nextNumber).padStart(4, "0")}`

    // Determine retainage
    let retainagePct = input.retainage_pct ?? 0

    // If retainage_pct not provided but a PO is linked, use PO's retainage_pct
    if (input.retainage_pct === undefined && input.po_id) {
      const { data: po } = await supabase
        .from("purchase_orders")
        .select("retainage_pct")
        .eq("id", input.po_id)
        .single()
      if (po?.retainage_pct) {
        retainagePct = Number(po.retainage_pct)
      }
    }

    // If still no retainage_pct, fall back to org default
    if (retainagePct === 0 && input.retainage_pct === undefined) {
      const { data: org } = await supabase
        .from("organizations")
        .select("default_retainage_pct")
        .eq("id", organizationId)
        .single()
      if (org?.default_retainage_pct) {
        retainagePct = Number(org.default_retainage_pct)
      }
    }

    const retainageHeld = Math.round(input.gross_amount * (retainagePct / 100) * 100) / 100
    const netAmount = Math.round((input.gross_amount - retainageHeld) * 100) / 100

    // Insert the invoice
    const { data: invoice, error: insertError } = await supabase
      .from("ap_invoices")
      .insert({
        organization_id: organizationId,
        invoice_number: invoiceNumber,
        vendor_contact_id: input.vendor_contact_id,
        po_id: input.po_id ?? null,
        job_id: input.job_id,
        unit_id: input.unit_id ?? null,
        invoice_date: input.invoice_date,
        due_date: input.due_date,
        received_date: input.received_date ?? null,
        gross_amount: input.gross_amount,
        retainage_held: retainageHeld,
        net_amount: netAmount,
        amount_paid: 0,
        balance_due: netAmount,
        description: input.description ?? null,
        cost_code: input.cost_code ?? null,
        accounting_period: input.accounting_period ?? null,
        status: "received",
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Create retainage_ledger entry if retainage > 0
    if (retainageHeld > 0 && input.po_id) {
      const { error: retainageError } = await supabase
        .from("retainage_ledger")
        .insert({
          organization_id: organizationId,
          job_id: input.job_id,
          unit_id: input.unit_id ?? null,
          vendor_contact_id: input.vendor_contact_id,
          po_id: input.po_id,
          invoice_id: invoice.id,
          amount_held: retainageHeld,
          amount_released: 0,
          status: "held",
        })

      if (retainageError) {
        console.error("Failed to create retainage ledger entry:", retainageError)
      }
    }

    // Update PO status to 'invoiced' if po_id provided
    if (input.po_id) {
      const { error: poError } = await supabase
        .from("purchase_orders")
        .update({ status: "invoiced" })
        .eq("id", input.po_id)

      if (poError) {
        console.error("Failed to update PO status:", poError)
      }
    }

    return NextResponse.json({ data: invoice }, { status: 201 })
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
