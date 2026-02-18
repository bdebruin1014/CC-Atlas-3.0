import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const InterestAccrualSchema = z.object({
  entity_id: z.string().uuid(),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format"),
})

// ---------------------------------------------------------------------------
// POST: Run monthly interest accrual for entity
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
    const parsed = InterestAccrualSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Try to use the database function first
    try {
      const [yearStr, monthStr] = input.period.split("-")
      const accrualDate = `${yearStr}-${monthStr}-01`

      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "accrue_loan_interest",
        { p_accrual_date: accrualDate }
      )

      if (!rpcError && rpcResult) {
        // Filter results for this entity
        const entityResults = (rpcResult as { loan_id: string; entity_id: string; interest_amount: number; batch_id: string; status: string }[])
          .filter((r) => r.entity_id === input.entity_id)

        return NextResponse.json({
          data: entityResults,
          method: "database_function",
        })
      }
    } catch {
      // DB function may not exist, fall through to manual calculation
    }

    // Manual interest accrual calculation
    const { data: rawLoans } = await supabase
      .from("loans")
      .select("*")
      .eq("entity_id", input.entity_id)
      .in("status", ["active", "drawn_in_full"])
    const loans = rawLoans as any[]

    if (!loans || loans.length === 0) {
      return NextResponse.json({
        data: [],
        message: "No active loans found for this entity.",
      })
    }

    // Find interest expense and accrued interest accounts
    const { data: interestExpenseAcct } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("entity_id", input.entity_id)
      .eq("account_type", "expense")
      .or("account_name.ilike.%interest%,account_name.ilike.%financing cost%")
      .eq("is_active", true)
      .limit(1)
      .single()

    const { data: accruedInterestAcct } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("entity_id", input.entity_id)
      .eq("account_type", "liability")
      .or("account_name.ilike.%accrued interest%,account_name.ilike.%interest payable%")
      .eq("is_active", true)
      .limit(1)
      .single()

    if (!interestExpenseAcct || !accruedInterestAcct) {
      return NextResponse.json(
        {
          error: "Missing accounts",
          details: "Could not find interest expense and/or accrued interest liability accounts in the chart of accounts.",
        },
        { status: 400 }
      )
    }

    const results: {
      loan_id: string
      interest_amount: number
      batch_id: string | null
      status: string
    }[] = []

    const [yearStr, monthStr] = input.period.split("-")
    const accrualDate = `${yearStr}-${monthStr}-01`

    for (const loan of loans) {
      if (!loan.interest_rate || loan.interest_rate <= 0) {
        results.push({
          loan_id: loan.id,
          interest_amount: 0,
          batch_id: null,
          status: "skipped_no_rate",
        })
        continue
      }

      const drawnAmount = loan.amount_drawn || 0
      if (drawnAmount <= 0) {
        results.push({
          loan_id: loan.id,
          interest_amount: 0,
          batch_id: null,
          status: "skipped_zero_balance",
        })
        continue
      }

      // Calculate monthly interest: drawn * rate / 100 / 12
      const monthlyInterest = Math.round(
        (drawnAmount * (loan.interest_rate / 100) / 12) * 100
      ) / 100

      const batchId = crypto.randomUUID()

      // Create journal entries
      const { error: txError } = await supabase.from("transactions").insert([
        {
          entity_id: input.entity_id,
          date: accrualDate,
          description: `Monthly interest accrual - Loan ${loan.id.slice(0, 8)} (${loan.loan_type})`,
          account_id: interestExpenseAcct.id,
          debit: monthlyInterest,
          credit: 0,
          transaction_type: "journal_entry",
          status: "posted",
          period: input.period,
          is_adjusting_entry: false,
          batch_id: batchId,
        },
        {
          entity_id: input.entity_id,
          date: accrualDate,
          description: `Monthly interest accrual - Loan ${loan.id.slice(0, 8)} (${loan.loan_type})`,
          account_id: accruedInterestAcct.id,
          debit: 0,
          credit: monthlyInterest,
          transaction_type: "journal_entry",
          status: "posted",
          period: input.period,
          is_adjusting_entry: false,
          batch_id: batchId,
        },
      ])

      if (txError) {
        results.push({
          loan_id: loan.id,
          interest_amount: monthlyInterest,
          batch_id: null,
          status: `error: ${txError.message}`,
        })
        continue
      }

      // Update loan accrued_interest
      await supabase
        .from("loans")
        .update({
          accrued_interest: (loan.accrued_interest || 0) + monthlyInterest,
        })
        .eq("id", loan.id)

      results.push({
        loan_id: loan.id,
        interest_amount: monthlyInterest,
        batch_id: batchId,
        status: "accrued",
      })
    }

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      const totalInterest = results.reduce((s, r) => s + r.interest_amount, 0)
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: "interest_accrual",
        action: "accrued",
        description: `Ran interest accrual for ${input.period}: $${totalInterest.toFixed(2)} across ${results.filter((r) => r.status === "accrued").length} loans`,
        metadata: {
          entity_id: input.entity_id,
          period: input.period,
          total_interest: totalInterest,
          loan_count: results.length,
        },
      })
    }

    return NextResponse.json({
      data: results,
      method: "manual_calculation",
    })
  } catch (err) {
    console.error("Interest accrual error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
