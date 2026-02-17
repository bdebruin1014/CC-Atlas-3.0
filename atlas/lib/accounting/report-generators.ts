// ============================================================================
// Financial Report Generation Functions
// Computes Balance Sheet, Income Statement, Trial Balance, Cash Flow
// from posted transactions
// ============================================================================

import type {
  BalanceSheetReport,
  IncomeStatementReport,
  TrialBalanceReport,
  CashFlowReport,
  ReportSection,
  ReportLineItem,
  TrialBalanceLine,
} from "./types"

interface TransactionEntry {
  account_id: string
  account_number: string
  account_name: string
  account_type: string
  debit: number
  credit: number
  date: string
}

/**
 * Generate Balance Sheet from posted transactions
 */
export function generateBalanceSheet(
  entries: TransactionEntry[],
  entityId: string,
  entityName: string,
  asOfDate: string
): BalanceSheetReport {
  // Filter entries up to as-of date
  const filtered = entries.filter(e => e.date <= asOfDate)

  const assets = buildSection("Assets", filtered, "asset")
  const liabilities = buildSection("Liabilities", filtered, "liability")
  const equity = buildSection("Equity", filtered, "equity")

  return {
    as_of_date: asOfDate,
    entity_id: entityId,
    entity_name: entityName,
    assets,
    liabilities,
    equity,
    total_assets: assets.total,
    total_liabilities: liabilities.total,
    total_equity: equity.total,
  }
}

/**
 * Generate Income Statement from posted transactions
 */
export function generateIncomeStatement(
  entries: TransactionEntry[],
  entityId: string,
  entityName: string,
  periodStart: string,
  periodEnd: string
): IncomeStatementReport {
  const filtered = entries.filter(e => e.date >= periodStart && e.date <= periodEnd)

  const revenue = buildSection("Revenue", filtered, "revenue")
  const costOfSales = buildSection("Cost of Sales", filtered, "cost_of_sales")
  const operatingExpenses = buildSection("Operating Expenses", filtered, "operating_expense")

  const grossProfit = revenue.total - costOfSales.total
  const operatingIncome = grossProfit - operatingExpenses.total

  return {
    period_start: periodStart,
    period_end: periodEnd,
    entity_id: entityId,
    entity_name: entityName,
    revenue,
    cost_of_sales: costOfSales,
    operating_expenses: operatingExpenses,
    gross_profit: grossProfit,
    operating_income: operatingIncome,
    net_income: operatingIncome,
  }
}

/**
 * Generate Trial Balance
 */
export function generateTrialBalance(
  entries: TransactionEntry[],
  entityId: string,
  entityName: string,
  asOfDate: string
): TrialBalanceReport {
  const filtered = entries.filter(e => e.date <= asOfDate)

  // Aggregate by account
  const accountMap = new Map<string, TrialBalanceLine>()
  for (const entry of filtered) {
    const key = entry.account_id
    if (!accountMap.has(key)) {
      accountMap.set(key, {
        account_number: entry.account_number,
        account_name: entry.account_name,
        account_type: entry.account_type,
        debit_balance: 0,
        credit_balance: 0,
      })
    }
    const line = accountMap.get(key)!
    line.debit_balance += entry.debit
    line.credit_balance += entry.credit
  }

  // Net the balances
  const accounts = Array.from(accountMap.values())
    .map(line => {
      const net = line.debit_balance - line.credit_balance
      return {
        ...line,
        debit_balance: net > 0 ? net : 0,
        credit_balance: net < 0 ? Math.abs(net) : 0,
      }
    })
    .sort((a, b) => a.account_number.localeCompare(b.account_number))

  const totalDebits = accounts.reduce((sum, a) => sum + a.debit_balance, 0)
  const totalCredits = accounts.reduce((sum, a) => sum + a.credit_balance, 0)

  return {
    as_of_date: asOfDate,
    entity_id: entityId,
    entity_name: entityName,
    accounts,
    total_debits: totalDebits,
    total_credits: totalCredits,
    is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
  }
}

/**
 * Generate Cash Flow Statement
 */
export function generateCashFlow(
  entries: TransactionEntry[],
  entityId: string,
  entityName: string,
  periodStart: string,
  periodEnd: string
): CashFlowReport {
  const filtered = entries.filter(e => e.date >= periodStart && e.date <= periodEnd)
  const allEntries = entries.filter(e => e.date <= periodEnd)
  const priorEntries = entries.filter(e => e.date < periodStart)

  // Operating: revenue, expenses, AP/AR changes
  const operatingItems: ReportLineItem[] = []
  const operatingAccounts = filtered.filter(
    e => ["revenue", "operating_expense", "cost_of_sales"].includes(e.account_type)
  )
  const opMap = aggregateByAccount(operatingAccounts)
  for (const [, item] of opMap) {
    operatingItems.push(item)
  }

  // Investing: asset purchases/sales (non-cash assets)
  const investingItems: ReportLineItem[] = []
  const investingAccounts = filtered.filter(
    e => e.account_type === "asset" && !e.account_number.startsWith("10") // exclude cash
  )
  const invMap = aggregateByAccount(investingAccounts)
  for (const [, item] of invMap) {
    investingItems.push(item)
  }

  // Financing: equity, loans
  const financingItems: ReportLineItem[] = []
  const financingAccounts = filtered.filter(
    e => ["equity", "liability"].includes(e.account_type)
  )
  const finMap = aggregateByAccount(financingAccounts)
  for (const [, item] of finMap) {
    financingItems.push(item)
  }

  const operating: ReportSection = {
    label: "Operating Activities",
    items: operatingItems,
    total: operatingItems.reduce((sum, i) => sum + i.amount, 0),
  }

  const investing: ReportSection = {
    label: "Investing Activities",
    items: investingItems,
    total: investingItems.reduce((sum, i) => sum + i.amount, 0),
  }

  const financing: ReportSection = {
    label: "Financing Activities",
    items: financingItems,
    total: financingItems.reduce((sum, i) => sum + i.amount, 0),
  }

  // Cash balances
  const cashAccounts = allEntries.filter(e => e.account_number.startsWith("10"))
  const endingCash = cashAccounts.reduce((sum, e) => sum + e.debit - e.credit, 0)
  const priorCash = priorEntries
    .filter(e => e.account_number.startsWith("10"))
    .reduce((sum, e) => sum + e.debit - e.credit, 0)

  return {
    period_start: periodStart,
    period_end: periodEnd,
    entity_id: entityId,
    entity_name: entityName,
    operating,
    investing,
    financing,
    net_cash_flow: operating.total + investing.total + financing.total,
    beginning_cash: priorCash,
    ending_cash: endingCash,
  }
}

// ---- Helpers ----

function buildSection(
  label: string,
  entries: TransactionEntry[],
  accountType: string
): ReportSection {
  const typeEntries = entries.filter(e => e.account_type === accountType)
  const accountMap = aggregateByAccount(typeEntries)
  const items = Array.from(accountMap.values()).sort(
    (a, b) => a.account_number.localeCompare(b.account_number)
  )

  return {
    label,
    items,
    total: items.reduce((sum, i) => sum + Math.abs(i.amount), 0),
  }
}

function aggregateByAccount(entries: TransactionEntry[]): Map<string, ReportLineItem> {
  const map = new Map<string, ReportLineItem>()
  for (const entry of entries) {
    if (!map.has(entry.account_id)) {
      map.set(entry.account_id, {
        account_number: entry.account_number,
        account_name: entry.account_name,
        amount: 0,
      })
    }
    const item = map.get(entry.account_id)!
    // Normal balance: assets/expenses are debit-normal, liabilities/equity/revenue are credit-normal
    if (["asset", "operating_expense", "cost_of_sales"].includes(entry.account_type)) {
      item.amount += entry.debit - entry.credit
    } else {
      item.amount += entry.credit - entry.debit
    }
  }
  return map
}
