import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const ConsolidatedReportSchema = z.object({
  parent_entity_id: z.string().uuid("parent_entity_id is required"),
  report_type: z.enum(["balance_sheet", "income_statement", "trial_balance"]),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Helper: compute account balances for an entity
// ---------------------------------------------------------------------------
async function getEntityBalances(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>,
  entityId: string,
  periodStart?: string,
  periodEnd?: string
) {
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, account_number, account_name, account_type, normal_balance")
    .eq("entity_id", entityId)
    .eq("is_active", true)

  if (!accounts) return []

  let txQuery = supabase
    .from("transactions")
    .select("account_id, debit, credit")
    .eq("entity_id", entityId)
    .eq("status", "posted")

  if (periodStart) txQuery = txQuery.gte("date", periodStart)
  if (periodEnd) txQuery = txQuery.lte("date", periodEnd)

  const { data: transactions } = await txQuery

  const balanceMap: Record<string, { total_debit: number; total_credit: number }> = {}
  if (transactions) {
    for (const tx of transactions) {
      if (!balanceMap[tx.account_id]) {
        balanceMap[tx.account_id] = { total_debit: 0, total_credit: 0 }
      }
      balanceMap[tx.account_id].total_debit += tx.debit || 0
      balanceMap[tx.account_id].total_credit += tx.credit || 0
    }
  }

  return accounts.map((acct) => {
    const bal = balanceMap[acct.id] || { total_debit: 0, total_credit: 0 }
    const balance =
      acct.normal_balance === "debit"
        ? bal.total_debit - bal.total_credit
        : bal.total_credit - bal.total_debit

    return {
      account_number: acct.account_number,
      account_name: acct.account_name,
      account_type: acct.account_type,
      normal_balance: acct.normal_balance,
      balance: Math.round(balance * 100) / 100,
    }
  })
}

// ---------------------------------------------------------------------------
// GET: Consolidated report across entity hierarchy
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
    const parsed = ConsolidatedReportSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    // Fetch parent entity and its children
    const { data: parentEntity } = await supabase
      .from("entities")
      .select("id, name")
      .eq("id", filters.parent_entity_id)
      .single()

    if (!parentEntity) {
      return NextResponse.json(
        { error: "Parent entity not found" },
        { status: 404 }
      )
    }

    const { data: childEntities } = await supabase
      .from("entities")
      .select("id, name")
      .eq("parent_entity_id", filters.parent_entity_id)
      .eq("is_active", true)

    const allEntityIds = [
      filters.parent_entity_id,
      ...(childEntities || []).map((e) => e.id),
    ]

    const allEntities = [
      parentEntity,
      ...(childEntities || []),
    ]

    // Get balances for each entity
    const entityBalances: Record<string, Awaited<ReturnType<typeof getEntityBalances>>> = {}
    for (const entity of allEntities) {
      entityBalances[entity.id] = await getEntityBalances(
        supabase,
        entity.id,
        filters.report_type === "balance_sheet" ? undefined : filters.period_start,
        filters.period_end
      )
    }

    // Aggregate by account_type + account_number
    const consolidated: Record<
      string,
      { account_number: string; account_name: string; account_type: string; normal_balance: string; balance: number; entity_balances: Record<string, number> }
    > = {}

    for (const entityId of allEntityIds) {
      const balances = entityBalances[entityId] || []
      for (const acct of balances) {
        const key = `${acct.account_type}:${acct.account_number}`
        if (!consolidated[key]) {
          consolidated[key] = {
            account_number: acct.account_number,
            account_name: acct.account_name,
            account_type: acct.account_type as string,
            normal_balance: acct.normal_balance as string,
            balance: 0,
            entity_balances: {},
          }
        }
        consolidated[key].balance += acct.balance
        consolidated[key].entity_balances[entityId] = acct.balance
      }
    }

    const consolidatedAccounts = Object.values(consolidated).sort(
      (a, b) => a.account_number.localeCompare(b.account_number)
    )

    if (filters.report_type === "balance_sheet") {
      const assets = consolidatedAccounts.filter((a) => a.account_type === "asset")
      const liabilities = consolidatedAccounts.filter((a) => a.account_type === "liability")
      const equity = consolidatedAccounts.filter((a) => a.account_type === "equity")

      return NextResponse.json({
        data: {
          report_type: "consolidated_balance_sheet",
          parent_entity_id: filters.parent_entity_id,
          entities: allEntities,
          as_of_date: filters.period_end || new Date().toISOString().split("T")[0],
          sections: {
            assets: {
              accounts: assets,
              total: Math.round(assets.reduce((s, a) => s + a.balance, 0) * 100) / 100,
            },
            liabilities: {
              accounts: liabilities,
              total: Math.round(liabilities.reduce((s, a) => s + a.balance, 0) * 100) / 100,
            },
            equity: {
              accounts: equity,
              total: Math.round(equity.reduce((s, a) => s + a.balance, 0) * 100) / 100,
            },
          },
        },
      })
    }

    if (filters.report_type === "income_statement") {
      const revenue = consolidatedAccounts.filter((a) => a.account_type === "revenue")
      const expenses = consolidatedAccounts.filter((a) => a.account_type === "expense")
      const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0)
      const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0)

      return NextResponse.json({
        data: {
          report_type: "consolidated_income_statement",
          parent_entity_id: filters.parent_entity_id,
          entities: allEntities,
          period_start: filters.period_start,
          period_end: filters.period_end,
          sections: {
            revenue: {
              accounts: revenue,
              total: Math.round(totalRevenue * 100) / 100,
            },
            expenses: {
              accounts: expenses,
              total: Math.round(totalExpenses * 100) / 100,
            },
          },
          net_income: Math.round((totalRevenue - totalExpenses) * 100) / 100,
        },
      })
    }

    if (filters.report_type === "trial_balance") {
      return NextResponse.json({
        data: {
          report_type: "consolidated_trial_balance",
          parent_entity_id: filters.parent_entity_id,
          entities: allEntities,
          period_start: filters.period_start,
          period_end: filters.period_end,
          accounts: consolidatedAccounts,
        },
      })
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
  } catch (err) {
    console.error("Consolidated report error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
