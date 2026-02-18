import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const CreateDrawSchema = z.object({
  amount: z.number().positive("Draw amount must be positive"),
  draw_date: z.string().min(1, "Draw date is required"),
  description: z.string().optional().nullable(),
  linked_construction_draw: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// GET: List draws for a loan
// ---------------------------------------------------------------------------
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: draws, error } = await supabase
      .from("loan_draws")
      .select("*")
      .eq("loan_id", id)
      .order("draw_number", { ascending: true })

    if (error) {
      console.error("Loan draws fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch loan draws" },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: draws || [] })
  } catch (err) {
    console.error("Loan draws GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Request a draw
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateDrawSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Fetch the loan
    const { data: rawLoan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", id)
      .single()
    const loan = rawLoan as any

    if (loanError || !loan) {
      return NextResponse.json(
        { error: "Loan not found" },
        { status: 404 }
      )
    }

    // Validate amount <= available
    const available = (loan.original_amount || 0) - (loan.amount_drawn || 0)
    if (input.amount > available) {
      return NextResponse.json(
        {
          error: "Insufficient available amount",
          details: `Requested $${input.amount} but only $${available.toFixed(2)} is available.`,
        },
        { status: 400 }
      )
    }

    // Get next draw number
    const { count: drawCount } = await supabase
      .from("loan_draws")
      .select("id", { count: "exact", head: true })
      .eq("loan_id", id)

    const drawNumber = (drawCount || 0) + 1

    // Create the draw
    const { data: draw, error: createError } = await supabase
      .from("loan_draws")
      .insert({
        loan_id: id,
        draw_number: drawNumber,
        amount: input.amount,
        draw_date: input.draw_date,
        description: input.description || null,
        linked_construction_draw: input.linked_construction_draw || null,
        status: "requested",
      })
      .select("*")
      .single()

    if (createError) {
      console.error("Create draw error:", createError)
      return NextResponse.json(
        { error: "Failed to create draw", details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: draw }, { status: 201 })
  } catch (err) {
    console.error("Loan draws POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
