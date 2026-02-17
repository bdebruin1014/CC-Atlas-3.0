import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const ReportFilterSchema = z.object({
  entity_id: z.string().uuid("entity_id is required"),
  report_type: z.enum([
    "balance_sheet",
    "income_statement",
    "trial_balance",
    "cash_flow",
  ]),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  as_of_date: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Helper: compute account balances
// ---------------------------------------------------------------------------
interface AccountBalance {
  account_id: string
  account_number: string
  account_name: string
  account_type: string
  normal_balance: string
  total_debit: number
  total_credit: number
  balance: number
}

async function computeAccountBalances(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>,
  entityId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<AccountBalance[]> {
  // Fetch all accounts
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, account_number, account_name, account_type, normal_balance")
    .eq("entity_id", entityId)
    .eq("is_active", true)
    .order("account_number", { ascending: true })

  if (!accounts) return []

  // Fetch transactions
  let txQuery = supabase
    .from("transactions")
    .select("account_id, debit, credit")
    .eq("entity_id", entityId)
    .eq("status", "posted")

  if (periodStart) {
    txQuery = txQuery.gte("date", periodStart)
  }
  if (periodEnd) {
    txQuery = txQuery.lte("date", periodEnd)
  }

  const { data: transactions } = await txQuery

  // Aggregate by account
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
      account_id: acct.id,
      account_number: acct.account_number,
      account_name: acct.account_name,
      account_type: acct.account_type,
      normal_balance: acct.normal_balance,
      total_debit: Math.round(bal.total_debit * 100) / 100,
      total_credit: Math.round(bal.total_credit * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    }
  })
}

// ---------------------------------------------------------------------------
// GET: Generate financial report
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
    const parsed = ReportFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    if (filters.report_type === "balance_sheet") {
      // Balance sheet: all accounts up to as_of_date/period_end
      const balances = await computeAccountBalances(
        supabase,
        filters.entity_id,
        undefined,
        filters.period_end || filters.as_of_date
      )

      const assets = balances.filter((a) => a.account_type === "asset")
      const liabilities = balances.filter((a) => a.account_type === "liability")
      const equity = balances.filter((a) => a.account_type === "equity")

      const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
      const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0)
      const totalEquity = equity.reduce((s, a) => s + a.balance, 0)

      return NextResponse.json({
        data: {
          report_type: "balance_sheet",
          entity_id: filters.entity_id,
          as_of_date: filters.period_end || filters.as_of_date || new Date().toISOString().split("T")[0],
          sections: {
            assets: { accounts: assets, total: Math.round(totalAssets * 100) / 100 },
            liabilities: { accounts: liabilities, total: Math.round(totalLiabilities * 100) / 100 },
            equity: { accounts: equity, total: Math.round(totalEquity * 100) / 100 },
          },
          total_assets: Math.round(totalAssets * 100) / 100,
          total_liabilities_and_equity: Math.round((totalLiabilities + totalEquity) * 100) / 100,
          balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
        },
      })
    }

    if (filters.report_type === "income_statement") {
      // Income statement: revenue and expenses for period
      const balances = await computeAccountBalances(
        supabase,
        filters.entity_id,
        filters.period_start,
        filters.period_end
      )

      const revenue = balances.filter((a) => a.account_type === "revenue")
      const expenses = balances.filter((a) => a.account_type === "expense")

      const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0)
      const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0)
      const netIncome = totalRevenue - totalExpenses

      return NextResponse.json({
        data: {
          report_type: "income_statement",
          entity_id: filters.entity_id,
          period_start: filters.period_start,
          period_end: filters.period_end,
          sections: {
            revenue: { accounts: revenue, total: Math.round(totalRevenue * 100) / 100 },
            expenses: { accounts: expenses, total: Math.round(totalExpenses * 100) / 100 },
          },
          total_revenue: Math.round(totalRevenue * 100) / 100,
          total_expenses: Math.round(totalExpenses * 100) / 100,
          net_income: Math.round(netIncome * 100) / 100,
          margin_pct: totalRevenue > 0
            ? Math.round((netIncome / totalRevenue) * 10000) / 100
            : 0,
        },
      })
    }

    if (filters.report_type === "trial_balance") {
      // Trial balance: all accounts with debit/credit totals
      const balances = await computeAccountBalances(
        supabase,
        filters.entity_id,
        filters.period_start,
        filters.period_end
      )

      const totalDebits = balances.reduce((s, a) => s + a.total_debit, 0)
      const totalCredits = balances.reduce((s, a) => s + a.total_credit, 0)

      // For trial balance display, show debit/credit balance columns
      const trialBalanceAccounts = balances.map((acct) => ({
        ...acct,
        debit_balance: acct.balance > 0 && acct.normal_balance === "debit" ? acct.balance : (acct.balance < 0 && acct.normal_balance === "credit" ? -acct.balance : 0),
        credit_balance: acct.balance > 0 && acct.normal_balance === "credit" ? acct.balance : (acct.balance < 0 && acct.normal_balance === "debit" ? -acct.balance : 0),
      }))

      return NextResponse.json({
        data: {
          report_type: "trial_balance",
          entity_id: filters.entity_id,
          period_start: filters.period_start,
          period_end: filters.period_end,
          accounts: trialBalanceAccounts,
          total_debits: Math.round(totalDebits * 100) / 100,
          total_credits: Math.round(totalCredits * 100) / 100,
          balanced: Math.abs(totalDebits - totalCredits) < 0.01,
        },
      })
    }

    if (filters.report_type === "cash_flow") {
      // Simplified cash flow statement based on cash account movements
      const { data: cashAccounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_name")
        .eq("entity_id", filters.entity_id)
        .ilike("account_name", "%cash%")
        .eq("is_active", true)

      const cashAccountIds = (cashAccounts || []).map((a) => a.id)

      let cashTxQuery = supabase
        .from("transactions")
        .select("account_id, debit, credit, transaction_type, description, date")
        .eq("entity_id", filters.entity_id)
        .eq("status", "posted")
        .in("account_id", cashAccountIds.length > 0 ? cashAccountIds : ["00000000-0000-0000-0000-000000000000"])

      if (filters.period_start) {
        cashTxQuery = cashTxQuery.gte("date", filters.period_start)
      }
      if (filters.period_end) {
        cashTxQuery = cashTxQuery.lte("date", filters.period_end)
      }

      const { data: cashTransactions } = await cashTxQuery

      // Categorize cash flows
      let operatingInflows = 0
      let operatingOutflows = 0
      let investingInflows = 0
      let investingOutflows = 0
      let financingInflows = 0
      let financingOutflows = 0

      for (const tx of cashTransactions || []) {
        const netCash = (tx.debit || 0) - (tx.credit || 0)
        const desc = (tx.description || "").toLowerCase()

        // Classify based on transaction type and description
        if (desc.includes("loan draw") || desc.includes("capital") || desc.includes("distribution")) {
          if (netCash > 0) financingInflows += netCash
          else financingOutflows += Math.abs(netCash)
        } else if (desc.includes("land") || desc.includes("construction") || desc.includes("fixed asset")) {
          if (netCash > 0) investingInflows += netCash
          else investingOutflows += Math.abs(netCash)
        } else {
          if (netCash > 0) operatingInflows += netCash
          else operatingOutflows += Math.abs(netCash)
        }
      }

      const netOperating = operatingInflows - operatingOutflows
      const netInvesting = investingInflows - investingOutflows
      const netFinancing = financingInflows - financingOutflows
      const netChange = netOperating + netInvesting + netFinancing

      return NextResponse.json({
        data: {
          report_type: "cash_flow",
          entity_id: filters.entity_id,
          period_start: filters.period_start,
          period_end: filters.period_end,
          sections: {
            operating: {
              inflows: Math.round(operatingInflows * 100) / 100,
              outflows: Math.round(operatingOutflows * 100) / 100,
              net: Math.round(netOperating * 100) / 100,
            },
            investing: {
              inflows: Math.round(investingInflows * 100) / 100,
              outflows: Math.round(investingOutflows * 100) / 100,
              net: Math.round(netInvesting * 100) / 100,
            },
            financing: {
              inflows: Math.round(financingInflows * 100) / 100,
              outflows: Math.round(financingOutflows * 100) / 100,
              net: Math.round(netFinancing * 100) / 100,
            },
          },
          net_change_in_cash: Math.round(netChange * 100) / 100,
        },
      })
    }

    return NextResponse.json(
      { error: "Invalid report type" },
      { status: 400 }
    )
  } catch (err) {
    console.error("Reports GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
