import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const ReportQuerySchema = z.object({
  entityId: z.string().uuid(),
  reportType: z.enum([
    "balance_sheet",
    "income_statement",
    "trial_balance",
    "general_ledger",
    "cash_flow",
  ]),
  period: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Account type classifications
// ---------------------------------------------------------------------------
const BALANCE_SHEET_TYPES = ["asset", "liability", "equity"]
const INCOME_STATEMENT_TYPES = ["revenue", "expense"]

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
    const parsed = ReportQuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { entityId, reportType, period, date_from, date_to } = parsed.data

    // Fetch entity info
    const { data: entity, error: entityError } = await supabase
      .from("entities")
      .select("id, name")
      .eq("id", entityId)
      .single()

    if (entityError || !entity) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      )
    }

    // Fetch chart of accounts for this entity
    const { data: rawAccounts, error: coaError } = await supabase
      .from("chart_of_accounts")
      .select("*")
      .eq("entity_id", entityId)
      .eq("is_active", true)
      .order("account_number", { ascending: true })
    const accounts = rawAccounts as unknown as Account[] | null

    if (coaError) {
      return NextResponse.json(
        { error: "Failed to fetch chart of accounts" },
        { status: 500 }
      )
    }

    // Fetch transactions
    let txQuery = supabase
      .from("transactions")
      .select("account_id, debit, credit")
      .eq("entity_id", entityId)
      .in("status", ["approved", "posted"])

    if (period) {
      txQuery = txQuery.eq("period", period)
    }
    if (date_from) {
      txQuery = txQuery.gte("date", date_from)
    }
    if (date_to) {
      txQuery = txQuery.lte("date", date_to)
    }

    const { data: transactions, error: txError } = await txQuery

    if (txError) {
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      )
    }

    // Aggregate balances by account
    const balances: Record<string, { debit: number; credit: number }> = {}
    for (const tx of transactions || []) {
      const aid = tx.account_id
      if (!balances[aid]) balances[aid] = { debit: 0, credit: 0 }
      balances[aid].debit += tx.debit || 0
      balances[aid].credit += tx.credit || 0
    }

    // Build report based on type
    switch (reportType) {
      case "balance_sheet":
        return NextResponse.json(
          buildBalanceSheet(accounts || [], balances, entity)
        )
      case "income_statement":
        return NextResponse.json(
          buildIncomeStatement(accounts || [], balances, entity, period)
        )
      case "trial_balance":
        return NextResponse.json(
          buildTrialBalance(accounts || [], balances, entity)
        )
      case "general_ledger":
        return NextResponse.json(
          buildGeneralLedger(accounts || [], balances, entity)
        )
      case "cash_flow":
        return NextResponse.json(
          buildCashFlow(accounts || [], balances, entity)
        )
      default:
        return NextResponse.json(
          { error: "Unknown report type" },
          { status: 400 }
        )
    }
  } catch (err) {
    console.error("Reports GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Report builders
// ---------------------------------------------------------------------------

interface Account {
  id: string
  account_number: string
  account_name: string
  account_type: string
  normal_balance: string
  parent_account_id: string | null
}

interface Entity {
  id: string
  name: string
}

function getBalance(
  account: Account,
  balances: Record<string, { debit: number; credit: number }>
): number {
  const b = balances[account.id] || { debit: 0, credit: 0 }
  // For debit-normal accounts: balance = debits - credits
  // For credit-normal accounts: balance = credits - debits
  if (account.normal_balance === "debit") {
    return b.debit - b.credit
  }
  return b.credit - b.debit
}

function buildBalanceSheet(
  accounts: Account[],
  balances: Record<string, { debit: number; credit: number }>,
  entity: Entity
) {
  const assets: { account: string; number: string; balance: number }[] = []
  const liabilities: { account: string; number: string; balance: number }[] = []
  const equity: { account: string; number: string; balance: number }[] = []

  let totalAssets = 0
  let totalLiabilities = 0
  let totalEquity = 0

  for (const acct of accounts) {
    const balance = getBalance(acct, balances)
    if (balance === 0) continue

    const row = {
      account: acct.account_name,
      number: acct.account_number,
      balance,
    }

    switch (acct.account_type) {
      case "asset":
        assets.push(row)
        totalAssets += balance
        break
      case "liability":
        liabilities.push(row)
        totalLiabilities += balance
        break
      case "equity":
        equity.push(row)
        totalEquity += balance
        break
    }
  }

  return {
    report_type: "balance_sheet",
    entity: entity.name,
    generated_at: new Date().toISOString(),
    sections: {
      assets: { items: assets, total: totalAssets },
      liabilities: { items: liabilities, total: totalLiabilities },
      equity: { items: equity, total: totalEquity },
    },
    total_liabilities_and_equity: totalLiabilities + totalEquity,
    is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  }
}

function buildIncomeStatement(
  accounts: Account[],
  balances: Record<string, { debit: number; credit: number }>,
  entity: Entity,
  period?: string
) {
  const revenue: { account: string; number: string; amount: number }[] = []
  const expenses: { account: string; number: string; amount: number }[] = []

  let totalRevenue = 0
  let totalExpenses = 0

  for (const acct of accounts) {
    const balance = getBalance(acct, balances)
    if (balance === 0) continue

    if (acct.account_type === "revenue") {
      revenue.push({
        account: acct.account_name,
        number: acct.account_number,
        amount: balance,
      })
      totalRevenue += balance
    } else if (acct.account_type === "expense") {
      expenses.push({
        account: acct.account_name,
        number: acct.account_number,
        amount: balance,
      })
      totalExpenses += balance
    }
  }

  const netIncome = totalRevenue - totalExpenses

  return {
    report_type: "income_statement",
    entity: entity.name,
    period: period || "All periods",
    generated_at: new Date().toISOString(),
    sections: {
      revenue: { items: revenue, total: totalRevenue },
      expenses: { items: expenses, total: totalExpenses },
    },
    net_income: netIncome,
    net_margin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
  }
}

function buildTrialBalance(
  accounts: Account[],
  balances: Record<string, { debit: number; credit: number }>,
  entity: Entity
) {
  const rows: {
    account_number: string
    account_name: string
    account_type: string
    debit_balance: number
    credit_balance: number
  }[] = []

  let totalDebits = 0
  let totalCredits = 0

  for (const acct of accounts) {
    const b = balances[acct.id] || { debit: 0, credit: 0 }
    if (b.debit === 0 && b.credit === 0) continue

    const balance = getBalance(acct, balances)
    const debitBalance = balance > 0 && acct.normal_balance === "debit" ? balance : 0
    const creditBalance =
      balance > 0 && acct.normal_balance === "credit"
        ? balance
        : balance < 0
        ? Math.abs(balance)
        : 0

    rows.push({
      account_number: acct.account_number,
      account_name: acct.account_name,
      account_type: acct.account_type,
      debit_balance: debitBalance,
      credit_balance: creditBalance,
    })

    totalDebits += debitBalance
    totalCredits += creditBalance
  }

  return {
    report_type: "trial_balance",
    entity: entity.name,
    generated_at: new Date().toISOString(),
    rows,
    total_debits: totalDebits,
    total_credits: totalCredits,
    is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
  }
}

function buildGeneralLedger(
  accounts: Account[],
  balances: Record<string, { debit: number; credit: number }>,
  entity: Entity
) {
  const ledger = accounts
    .filter((acct) => {
      const b = balances[acct.id]
      return b && (b.debit > 0 || b.credit > 0)
    })
    .map((acct) => {
      const b = balances[acct.id] || { debit: 0, credit: 0 }
      return {
        account_number: acct.account_number,
        account_name: acct.account_name,
        account_type: acct.account_type,
        normal_balance: acct.normal_balance,
        total_debits: b.debit,
        total_credits: b.credit,
        net_balance: getBalance(acct, balances),
      }
    })

  return {
    report_type: "general_ledger",
    entity: entity.name,
    generated_at: new Date().toISOString(),
    accounts: ledger,
    account_count: ledger.length,
  }
}

function buildCashFlow(
  accounts: Account[],
  balances: Record<string, { debit: number; credit: number }>,
  entity: Entity
) {
  // Simplified cash flow statement derived from account balances
  let operatingCashFlow = 0
  let investingCashFlow = 0
  let financingCashFlow = 0

  for (const acct of accounts) {
    const balance = getBalance(acct, balances)
    if (balance === 0) continue

    const num = acct.account_number

    // Classify by account number ranges (common convention)
    if (acct.account_type === "revenue" || acct.account_type === "expense") {
      operatingCashFlow += acct.account_type === "revenue" ? balance : -balance
    } else if (
      acct.account_type === "asset" &&
      !num.startsWith("1000") &&
      !num.startsWith("1100")
    ) {
      // Non-cash assets are investing activities
      investingCashFlow -= balance
    } else if (
      acct.account_type === "liability" ||
      acct.account_type === "equity"
    ) {
      financingCashFlow += balance
    }
  }

  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow

  return {
    report_type: "cash_flow",
    entity: entity.name,
    generated_at: new Date().toISOString(),
    sections: {
      operating: operatingCashFlow,
      investing: investingCashFlow,
      financing: financingCashFlow,
    },
    net_cash_flow: netCashFlow,
  }
}
