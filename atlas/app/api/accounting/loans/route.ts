import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const LoanFilterSchema = z.object({
  entity_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  status: z.string().optional(),
  loan_type: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreateLoanSchema = z.object({
  entity_id: z.string().uuid(),
  project_id: z.string().uuid().optional().nullable(),
  lender_contact_id: z.string().uuid().optional().nullable(),
  loan_type: z.enum([
    "construction",
    "acquisition",
    "bridge",
    "permanent",
    "line_of_credit",
    "mezzanine",
  ]),
  original_amount: z.number().positive("Original amount must be positive"),
  interest_rate: z.number().min(0).optional().nullable(),
  interest_type: z.enum(["fixed", "variable", "prime_plus"]).optional().nullable(),
  maturity_date: z.string().optional().nullable(),
  ltc_ratio: z.number().optional().nullable(),
  ltv_ratio: z.number().optional().nullable(),
  covenants: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: List loans
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

    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())
    const parsed = LoanFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    let query = supabase
      .from("loans")
      .select(
        `
        *,
        entity:entities!loans_entity_id_fkey(id, name),
        project:projects!loans_project_id_fkey(id, name, project_number),
        lender:contacts!loans_lender_contact_id_fkey(id, first_name, last_name, company)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1)

    if (filters.entity_id) {
      query = query.eq("entity_id", filters.entity_id)
    }
    if (filters.project_id) {
      query = query.eq("project_id", filters.project_id)
    }
    if (filters.status) {
      query = query.eq("status", filters.status)
    }
    if (filters.loan_type) {
      query = query.eq("loan_type", filters.loan_type)
    }
    if (filters.search) {
      query = query.or(
        `covenants.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Loans fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch loans" },
        { status: 500 }
      )
    }

    // Compute available_amount and utilization
    const enriched = (data || []).map((loan) => {
      const originalAmount = loan.original_amount || 0
      const amountDrawn = loan.amount_drawn || 0
      const availableAmount = Math.max(0, originalAmount - amountDrawn)
      const utilization = originalAmount > 0
        ? Math.round((amountDrawn / originalAmount) * 10000) / 100
        : 0

      return {
        ...loan,
        available_amount: Math.round(availableAmount * 100) / 100,
        utilization_pct: utilization,
      }
    })

    return NextResponse.json({
      data: enriched,
      total: count || 0,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (err) {
    console.error("Loans GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create loan
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
    const parsed = CreateLoanSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    const { data: loan, error: createError } = await supabase
      .from("loans")
      .insert({
        entity_id: input.entity_id,
        project_id: input.project_id || null,
        lender_contact_id: input.lender_contact_id || null,
        loan_type: input.loan_type,
        original_amount: input.original_amount,
        amount_drawn: 0,
        amount_available: input.original_amount,
        interest_rate: input.interest_rate || null,
        interest_type: input.interest_type || null,
        maturity_date: input.maturity_date || null,
        ltc_ratio: input.ltc_ratio || null,
        ltv_ratio: input.ltv_ratio || null,
        covenants: input.covenants || null,
        accrued_interest: 0,
        status: "pending",
      })
      .select("*")
      .single()

    if (createError) {
      console.error("Create loan error:", createError)
      return NextResponse.json(
        { error: "Failed to create loan", details: createError.message },
        { status: 500 }
      )
    }

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: "loan",
        record_id: loan.id,
        action: "created",
        description: `Created ${input.loan_type} loan for $${input.original_amount}`,
        metadata: {
          entity_id: input.entity_id,
          project_id: input.project_id,
          loan_type: input.loan_type,
          original_amount: input.original_amount,
        },
      })
    }

    return NextResponse.json({ data: loan }, { status: 201 })
  } catch (err) {
    console.error("Loans POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
