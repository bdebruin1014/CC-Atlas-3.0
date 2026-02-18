import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const ProcessDistributionSchema = z.object({
  payment_method: z
    .enum(["check", "ach", "wire", "other"])
    .default("ach"),
  payment_reference: z.string().optional().nullable(),
  paid_date: z.string().optional(),
})

// ---------------------------------------------------------------------------
// POST: Process distribution (approved -> distributed)
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
    const parsed = ProcessDistributionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Fetch the distribution
    const { data: distribution, error: fetchError } = await supabase
      .from("distributions")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !distribution) {
      return NextResponse.json(
        { error: "Distribution not found" },
        { status: 404 }
      )
    }

    if (distribution.status !== "approved") {
      return NextResponse.json(
        {
          error: "Invalid state transition",
          details: `Cannot process a distribution with status '${distribution.status}'. Only approved distributions can be processed.`,
        },
        { status: 400 }
      )
    }

    const paidDate = input.paid_date || new Date().toISOString().split("T")[0]

    // Update all allocations with payment details
    const { error: allocUpdateError } = await supabase
      .from("distribution_allocations")
      .update({
        payment_method: input.payment_method,
        payment_reference: input.payment_reference || null,
        paid_date: paidDate,
      })
      .eq("distribution_id", id)

    if (allocUpdateError) {
      console.error("Update allocations error:", allocUpdateError)
      return NextResponse.json(
        { error: "Failed to update allocations", details: allocUpdateError.message },
        { status: 500 }
      )
    }

    // Update investor distributions_to_date
    const { data: allocations } = await supabase
      .from("distribution_allocations")
      .select("investor_id, amount")
      .eq("distribution_id", id)

    if (allocations) {
      for (const alloc of allocations) {
        const { data: rawInvestor } = await supabase
          .from("investors")
          .select("distributions_to_date")
          .eq("id", alloc.investor_id)
          .single()
        const investor = rawInvestor as any

        if (investor) {
          await supabase
            .from("investors")
            .update({
              distributions_to_date: (investor.distributions_to_date || 0) + alloc.amount,
            } as any)
            .eq("id", alloc.investor_id)
        }
      }
    }

    // Update distribution status to distributed
    const { data: updated, error: updateError } = await supabase
      .from("distributions")
      .update({ status: "distributed" })
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("Process distribution error:", updateError)
      return NextResponse.json(
        { error: "Failed to process distribution", details: updateError.message },
        { status: 500 }
      )
    }

    // Create accounting transaction for distribution
    const batchId = crypto.randomUUID()
    const txDate = paidDate
    const period = txDate.slice(0, 7) // YYYY-MM

    // Find the distributions equity account and cash account
    const { data: distAccount } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("entity_id", distribution.entity_id)
      .ilike("account_name", "%distribution%")
      .eq("is_active", true)
      .limit(1)
      .single()

    const { data: cashAccount } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("entity_id", distribution.entity_id)
      .ilike("account_name", "%cash%operating%")
      .eq("is_active", true)
      .limit(1)
      .single()

    if (distAccount && cashAccount) {
      await supabase.from("transactions").insert([
        {
          entity_id: distribution.entity_id,
          date: txDate,
          description: `Distribution - ${distribution.distribution_type} - $${distribution.total_amount}`,
          account_id: distAccount.id,
          debit: distribution.total_amount,
          credit: 0,
          transaction_type: "journal_entry",
          status: "posted",
          period,
          batch_id: batchId,
        },
        {
          entity_id: distribution.entity_id,
          date: txDate,
          description: `Distribution - ${distribution.distribution_type} - $${distribution.total_amount}`,
          account_id: cashAccount.id,
          debit: 0,
          credit: distribution.total_amount,
          transaction_type: "journal_entry",
          status: "posted",
          period,
          batch_id: batchId,
        },
      ])
    }

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: "distribution",
        record_id: id,
        action: "processed",
        description: `Processed distribution of $${distribution.total_amount} via ${input.payment_method}`,
        metadata: {
          entity_id: distribution.entity_id,
          payment_method: input.payment_method,
          paid_date: paidDate,
        },
      })
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error("Distribution process error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
