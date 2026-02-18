import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const InvestorFilterSchema = z.object({
  entity_id: z.string().uuid("entity_id is required"),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreateInvestorSchema = z.object({
  entity_id: z.string().uuid(),
  contact_id: z.string().uuid().optional().nullable(),
  ownership_pct: z.number().min(0).max(100),
  capital_commitment: z.number().min(0).optional().nullable(),
  preferred_return_rate: z.number().min(0).optional().nullable(),
  promote_carry_structure: z.string().optional().nullable(),
  accreditation_status: z
    .enum(["accredited", "qualified_purchaser", "non_accredited", "pending_verification"])
    .optional()
    .nullable(),
  accreditation_verification_date: z.string().optional().nullable(),
  subscription_document_id: z.string().uuid().optional().nullable(),
  operating_agreement_document_id: z.string().uuid().optional().nullable(),
})

const UpdateInvestorSchema = z.object({
  id: z.string().uuid("Investor ID is required"),
  ownership_pct: z.number().min(0).max(100).optional(),
  capital_commitment: z.number().min(0).optional().nullable(),
  preferred_return_rate: z.number().min(0).optional().nullable(),
  promote_carry_structure: z.string().optional().nullable(),
  accreditation_status: z
    .enum(["accredited", "qualified_purchaser", "non_accredited", "pending_verification"])
    .optional()
    .nullable(),
  accreditation_verification_date: z.string().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: List investors for entity
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
    const parsed = InvestorFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    let query = supabase
      .from("investors")
      .select(
        `
        *,
        contact:contacts!investors_contact_id_fkey(id, first_name, last_name, company, email, phone)
      `,
        { count: "exact" }
      )
      .eq("entity_id", filters.entity_id)
      .order("ownership_pct", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1)

    if (filters.search) {
      // Search by contact name; we filter client-side for simplicity
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Investors fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch investors" },
        { status: 500 }
      )
    }

    // Enrich with computed fields
    const enriched = (data || []).map((inv: any) => {
      const capitalCommitment = inv.capital_commitment || 0
      const contributedToDate = inv.contributed_to_date || 0
      const capitalRemaining = capitalCommitment - contributedToDate
      const distributionsToDate = inv.distributions_to_date || 0

      return {
        ...inv,
        capital_remaining: Math.round(capitalRemaining * 100) / 100,
        distributions_to_date: Math.round(distributionsToDate * 100) / 100,
      }
    })

    // Apply search filter on contact name if provided
    let filtered = enriched
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = enriched.filter((inv) => {
        const contact = inv.contact as { first_name?: string; last_name?: string; company?: string } | null
        if (!contact) return false
        const fullName = `${contact.first_name || ""} ${contact.last_name || ""} ${contact.company || ""}`.toLowerCase()
        return fullName.includes(search)
      })
    }

    return NextResponse.json({
      data: filtered,
      total: count || 0,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (err) {
    console.error("Investors GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create investor
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
    const parsed = CreateInvestorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Validate total ownership <= 100%
    const { data: existingInvestors } = await supabase
      .from("investors")
      .select("ownership_pct")
      .eq("entity_id", input.entity_id)

    const currentTotal = (existingInvestors || []).reduce(
      (sum, inv) => sum + (inv.ownership_pct || 0),
      0
    )

    if (currentTotal + input.ownership_pct > 100) {
      return NextResponse.json(
        {
          error: "Ownership exceeds 100%",
          details: `Current total ownership is ${currentTotal}%. Adding ${input.ownership_pct}% would exceed 100%.`,
        },
        { status: 400 }
      )
    }

    const { data: investor, error: createError } = await supabase
      .from("investors")
      .insert({
        entity_id: input.entity_id,
        contact_id: input.contact_id || null,
        ownership_pct: input.ownership_pct,
        capital_commitment: input.capital_commitment || null,
        preferred_return_rate: input.preferred_return_rate || null,
        promote_carry_structure: input.promote_carry_structure || null,
        accreditation_status: input.accreditation_status || null,
        accreditation_verification_date: input.accreditation_verification_date || null,
        subscription_document_id: input.subscription_document_id || null,
        operating_agreement_document_id: input.operating_agreement_document_id || null,
        contributed_to_date: 0,
      })
      .select("*")
      .single()

    if (createError) {
      console.error("Create investor error:", createError)
      return NextResponse.json(
        { error: "Failed to create investor", details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: investor }, { status: 201 })
  } catch (err) {
    console.error("Investors POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH: Update investor
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
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
    const parsed = UpdateInvestorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ownership_pct, ...updates } = parsed.data

    // If updating ownership, validate total <= 100%
    if (ownership_pct !== undefined) {
      const { data: currentInvestor } = await supabase
        .from("investors")
        .select("entity_id, ownership_pct")
        .eq("id", id)
        .single()

      if (currentInvestor) {
        const { data: otherInvestors } = await supabase
          .from("investors")
          .select("ownership_pct")
          .eq("entity_id", currentInvestor.entity_id)
          .neq("id", id)

        const othersTotal = (otherInvestors || []).reduce(
          (sum, inv) => sum + (inv.ownership_pct || 0),
          0
        )

        if (othersTotal + ownership_pct > 100) {
          return NextResponse.json(
            {
              error: "Ownership exceeds 100%",
              details: `Other investors hold ${othersTotal}%. Setting to ${ownership_pct}% would exceed 100%.`,
            },
            { status: 400 }
          )
        }
      }

      ;(updates as Record<string, unknown>).ownership_pct = ownership_pct
    }

    const { data: investor, error: updateError } = await supabase
      .from("investors")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("Update investor error:", updateError)
      return NextResponse.json(
        { error: "Failed to update investor", details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: investor })
  } catch (err) {
    console.error("Investors PATCH error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
