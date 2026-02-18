import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const CapitalCallFilterSchema = z.object({
  entity_id: z.string().uuid("entity_id is required"),
  status: z
    .enum(["draft", "issued", "partially_funded", "fully_funded", "cancelled"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreateCapitalCallSchema = z.object({
  entity_id: z.string().uuid(),
  total_amount: z.number().positive("Total amount must be positive"),
  purpose: z.string().optional().nullable(),
  due_date: z.string().min(1, "Due date is required"),
  call_date: z.string().optional(),
})

// ---------------------------------------------------------------------------
// GET: List capital calls for entity
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
    const parsed = CapitalCallFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    let query = supabase
      .from("capital_calls")
      .select(
        `
        *,
        responses:capital_call_responses(
          id,
          investor_id,
          amount_called,
          amount_received,
          received_date,
          status,
          investor:investors!capital_call_responses_investor_id_fkey(
            id,
            ownership_pct,
            contact:contacts!investors_contact_id_fkey(id, first_name, last_name, company)
          )
        )
      `,
        { count: "exact" }
      )
      .eq("entity_id", filters.entity_id)
      .order("call_date", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1)

    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Capital calls fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch capital calls" },
        { status: 500 }
      )
    }

    // Enrich with totals
    const enriched = (data || []).map((call) => {
      const responses = (call.responses || []) as unknown as {
        amount_called: number
        amount_received: number
      }[]
      const totalCalled = responses.reduce((s, r) => s + (r.amount_called || 0), 0)
      const totalReceived = responses.reduce((s, r) => s + (r.amount_received || 0), 0)
      return {
        ...call,
        total_called: Math.round(totalCalled * 100) / 100,
        total_received: Math.round(totalReceived * 100) / 100,
        total_outstanding: Math.round((totalCalled - totalReceived) * 100) / 100,
      }
    })

    return NextResponse.json({
      data: enriched,
      total: count || 0,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (err) {
    console.error("Capital calls GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create capital call with auto-generated responses per investor
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
    const parsed = CreateCapitalCallSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Fetch investors for this entity
    const { data: investors } = await supabase
      .from("investors")
      .select("id, ownership_pct")
      .eq("entity_id", input.entity_id)

    if (!investors || investors.length === 0) {
      return NextResponse.json(
        { error: "No investors found", details: "Entity has no investors to create a capital call." },
        { status: 400 }
      )
    }

    // Generate call number
    const { count: callCount } = await supabase
      .from("capital_calls")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", input.entity_id)

    const callNumber = `CC-${((callCount || 0) + 1).toString().padStart(3, "0")}`

    // Create the capital call
    const { data: call, error: createError } = await supabase
      .from("capital_calls")
      .insert({
        entity_id: input.entity_id,
        call_number: callNumber,
        call_date: input.call_date || new Date().toISOString().split("T")[0],
        due_date: input.due_date,
        total_amount: input.total_amount,
        purpose: input.purpose || null,
        status: "draft",
      })
      .select("*")
      .single()

    if (createError) {
      console.error("Create capital call error:", createError)
      return NextResponse.json(
        { error: "Failed to create capital call", details: createError.message },
        { status: 500 }
      )
    }

    // Auto-create responses per investor based on ownership %
    const responsePayloads = investors.map((inv) => {
      const amountCalled = Math.round(
        input.total_amount * ((inv.ownership_pct || 0) / 100) * 100
      ) / 100

      return {
        capital_call_id: call.id,
        investor_id: inv.id,
        amount_called: amountCalled,
        amount_received: 0,
        status: "pending" as const,
      }
    })

    const { data: responses, error: respError } = await supabase
      .from("capital_call_responses")
      .insert(responsePayloads)
      .select("*")

    if (respError) {
      console.error("Create call responses error:", respError)
    }

    return NextResponse.json(
      { data: { ...call, responses: responses || [] } },
      { status: 201 }
    )
  } catch (err) {
    console.error("Capital calls POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
