import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const ApproveDrawSchema = z.object({
  action: z.enum(["approve", "fund", "reject"]).default("approve"),
})

// ---------------------------------------------------------------------------
// POST: Approve or fund a loan draw
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; drawId: string }> }
) {
  try {
    const { id, drawId } = await params
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = ApproveDrawSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { action } = parsed.data

    // Fetch the draw
    const { data: draw, error: drawError } = await supabase
      .from("loan_draws")
      .select("*")
      .eq("id", drawId)
      .eq("loan_id", id)
      .single()

    if (drawError || !draw) {
      return NextResponse.json(
        { error: "Loan draw not found" },
        { status: 404 }
      )
    }

    if (action === "approve") {
      if (draw.status !== "requested") {
        return NextResponse.json(
          {
            error: "Invalid state transition",
            details: `Cannot approve a draw with status '${draw.status}'. Only requested draws can be approved.`,
          },
          { status: 400 }
        )
      }

      const { data: updated, error: updateError } = await supabase
        .from("loan_draws")
        .update({ status: "approved" })
        .eq("id", drawId)
        .select("*")
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to approve draw", details: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ data: updated })
    }

    if (action === "fund") {
      if (!["requested", "approved"].includes(draw.status)) {
        return NextResponse.json(
          {
            error: "Invalid state transition",
            details: `Cannot fund a draw with status '${draw.status}'. Only requested or approved draws can be funded.`,
          },
          { status: 400 }
        )
      }

      // Fetch the loan to update amounts
      const { data: rawLoan } = await supabase
        .from("loans")
        .select("*")
        .eq("id", id)
        .single()
      const loan = rawLoan as any

      if (!loan) {
        return NextResponse.json(
          { error: "Loan not found" },
          { status: 404 }
        )
      }

      // Update draw status
      const { data: updated, error: drawUpdateError } = await supabase
        .from("loan_draws")
        .update({ status: "funded" })
        .eq("id", drawId)
        .select("*")
        .single()

      if (drawUpdateError) {
        return NextResponse.json(
          { error: "Failed to fund draw", details: drawUpdateError.message },
          { status: 500 }
        )
      }

      // Update loan amounts
      const newDrawn = (loan.amount_drawn || 0) + draw.amount
      const newAvailable = (loan.original_amount || 0) - newDrawn
      const newStatus = newAvailable <= 0 ? "drawn_in_full" : "active"

      await supabase
        .from("loans")
        .update({
          amount_drawn: newDrawn,
          amount_available: Math.max(0, newAvailable),
          status: newStatus,
        })
        .eq("id", id)

      // Create accounting entries: Debit Cash, Credit Loan Liability
      const batchId = crypto.randomUUID()
      const period = draw.draw_date.slice(0, 7)

      const { data: cashAccount } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("entity_id", loan.entity_id)
        .ilike("account_name", "%cash%operating%")
        .eq("is_active", true)
        .limit(1)
        .single()

      const { data: loanAccount } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("entity_id", loan.entity_id)
        .ilike("account_name", "%construction loan%")
        .eq("is_active", true)
        .limit(1)
        .single()

      if (cashAccount && loanAccount) {
        await supabase.from("transactions").insert([
          {
            entity_id: loan.entity_id,
            date: draw.draw_date,
            description: `Loan draw #${draw.draw_number} - $${draw.amount}`,
            account_id: cashAccount.id,
            debit: draw.amount,
            credit: 0,
            transaction_type: "receipt",
            status: "posted",
            period,
            batch_id: batchId,
          },
          {
            entity_id: loan.entity_id,
            date: draw.draw_date,
            description: `Loan draw #${draw.draw_number} - $${draw.amount}`,
            account_id: loanAccount.id,
            debit: 0,
            credit: draw.amount,
            transaction_type: "receipt",
            status: "posted",
            period,
            batch_id: batchId,
          },
        ])
      }

      return NextResponse.json({ data: updated })
    }

    if (action === "reject") {
      if (draw.status !== "requested") {
        return NextResponse.json(
          {
            error: "Invalid state transition",
            details: `Cannot reject a draw with status '${draw.status}'.`,
          },
          { status: 400 }
        )
      }

      const { data: updated, error: updateError } = await supabase
        .from("loan_draws")
        .update({ status: "rejected" })
        .eq("id", drawId)
        .select("*")
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to reject draw", details: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ data: updated })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    console.error("Draw approve error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
