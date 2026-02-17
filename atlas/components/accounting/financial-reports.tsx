"use client"

import { useState, useEffect, useMemo } from "react"
import { Printer, Download, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import type {
  ReportType,
  ReportPeriod,
  BalanceSheetData,
  IncomeStatementData,
  TrialBalanceData,
  CashFlowData,
  ReportSection,
  Account,
  AccountType,
  Transaction,
} from "@/lib/types/accounting"
import { ACCOUNT_TYPE_LABELS } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FinancialReportsProps {
  reportType: ReportType
  entityId: string
  entityName: string
  period: ReportPeriod
  className?: string
}

// ---------------------------------------------------------------------------
// Report data builder from transactions
// ---------------------------------------------------------------------------

interface AccountBalance {
  account_number: string
  account_name: string
  account_type: AccountType
  normal_balance: "debit" | "credit"
  debit_total: number
  credit_total: number
  balance: number
}

function computeAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): AccountBalance[] {
  const balanceMap = new Map<string, AccountBalance>()

  accounts.forEach((acc) => {
    balanceMap.set(acc.id, {
      account_number: acc.account_number,
      account_name: acc.name,
      account_type: acc.account_type,
      normal_balance: acc.normal_balance,
      debit_total: 0,
      credit_total: 0,
      balance: 0,
    })
  })

  transactions
    .filter((t) => t.status === "posted")
    .forEach((txn) => {
      txn.line_items.forEach((li) => {
        const bal = balanceMap.get(li.account_id)
        if (bal) {
          bal.debit_total += li.debit_amount
          bal.credit_total += li.credit_amount
        }
      })
    })

  // Compute net balance
  balanceMap.forEach((bal) => {
    if (bal.normal_balance === "debit") {
      bal.balance = bal.debit_total - bal.credit_total
    } else {
      bal.balance = bal.credit_total - bal.debit_total
    }
  })

  return Array.from(balanceMap.values()).filter(
    (b) => b.debit_total !== 0 || b.credit_total !== 0 || b.balance !== 0
  )
}

function buildBalanceSheet(balances: AccountBalance[]): BalanceSheetData {
  const toSection = (b: AccountBalance): ReportSection => ({
    account_number: b.account_number,
    account_name: b.account_name,
    balance: Math.abs(b.balance),
  })

  const assets = balances
    .filter((b) => b.account_type === "asset")
    .sort((a, b) => a.account_number.localeCompare(b.account_number))
    .map(toSection)
  const liabilities = balances
    .filter((b) => b.account_type === "liability")
    .sort((a, b) => a.account_number.localeCompare(b.account_number))
    .map(toSection)

  // Equity includes equity accounts plus net income (revenue - COGS - OpEx)
  const equityAccounts = balances
    .filter((b) => b.account_type === "equity")
    .sort((a, b) => a.account_number.localeCompare(b.account_number))
    .map(toSection)

  const totalRevenue = balances
    .filter((b) => b.account_type === "revenue")
    .reduce((sum, b) => sum + b.balance, 0)
  const totalCOS = balances
    .filter((b) => b.account_type === "cost_of_sales")
    .reduce((sum, b) => sum + b.balance, 0)
  const totalOpEx = balances
    .filter((b) => b.account_type === "operating_expense")
    .reduce((sum, b) => sum + b.balance, 0)
  const netIncome = totalRevenue - totalCOS - totalOpEx

  // Add net income as an equity line
  if (netIncome !== 0) {
    equityAccounts.push({
      account_number: "",
      account_name: "Net Income (Current Period)",
      balance: netIncome,
    })
  }

  const total_assets = assets.reduce((s, a) => s + a.balance, 0)
  const total_liabilities = liabilities.reduce((s, l) => s + l.balance, 0)
  const total_equity = equityAccounts.reduce((s, e) => s + e.balance, 0)

  return {
    assets,
    liabilities,
    equity: equityAccounts,
    total_assets,
    total_liabilities,
    total_equity,
    is_balanced: Math.abs(total_assets - (total_liabilities + total_equity)) < 0.01,
  }
}

function buildIncomeStatement(balances: AccountBalance[]): IncomeStatementData {
  const toSection = (b: AccountBalance): ReportSection => ({
    account_number: b.account_number,
    account_name: b.account_name,
    balance: Math.abs(b.balance),
  })

  const revenue = balances
    .filter((b) => b.account_type === "revenue")
    .sort((a, b) => a.account_number.localeCompare(b.account_number))
    .map(toSection)
  const cost_of_sales = balances
    .filter((b) => b.account_type === "cost_of_sales")
    .sort((a, b) => a.account_number.localeCompare(b.account_number))
    .map(toSection)
  const operating_expenses = balances
    .filter((b) => b.account_type === "operating_expense")
    .sort((a, b) => a.account_number.localeCompare(b.account_number))
    .map(toSection)

  const total_revenue = revenue.reduce((s, r) => s + r.balance, 0)
  const total_cost_of_sales = cost_of_sales.reduce((s, c) => s + c.balance, 0)
  const gross_profit = total_revenue - total_cost_of_sales
  const total_operating_expenses = operating_expenses.reduce((s, e) => s + e.balance, 0)
  const net_income = gross_profit - total_operating_expenses

  return {
    revenue,
    cost_of_sales,
    operating_expenses,
    total_revenue,
    total_cost_of_sales,
    gross_profit,
    total_operating_expenses,
    net_income,
  }
}

function buildTrialBalance(balances: AccountBalance[]): TrialBalanceData {
  const accounts = balances
    .sort((a, b) => a.account_number.localeCompare(b.account_number))
    .map((b) => ({
      account_number: b.account_number,
      account_name: b.account_name,
      account_type: b.account_type,
      debit_balance: b.normal_balance === "debit" && b.balance > 0 ? b.balance : b.normal_balance === "credit" && b.balance < 0 ? Math.abs(b.balance) : 0,
      credit_balance: b.normal_balance === "credit" && b.balance > 0 ? b.balance : b.normal_balance === "debit" && b.balance < 0 ? Math.abs(b.balance) : 0,
    }))

  const total_debits = accounts.reduce((s, a) => s + a.debit_balance, 0)
  const total_credits = accounts.reduce((s, a) => s + a.credit_balance, 0)

  return {
    accounts,
    total_debits,
    total_credits,
    is_balanced: Math.abs(total_debits - total_credits) < 0.01,
  }
}

function buildCashFlow(balances: AccountBalance[]): CashFlowData {
  // Simplified cash flow categorization
  const cashAccounts = balances.filter(
    (b) => b.account_type === "asset" && b.account_number.startsWith("10")
  )
  const beginning_cash = 0 // Would come from prior period
  const ending_cash = cashAccounts.reduce((s, b) => s + b.balance, 0)

  // Net income as starting point for operating
  const totalRevenue = balances
    .filter((b) => b.account_type === "revenue")
    .reduce((s, b) => s + b.balance, 0)
  const totalCOS = balances
    .filter((b) => b.account_type === "cost_of_sales")
    .reduce((s, b) => s + b.balance, 0)
  const totalOpEx = balances
    .filter((b) => b.account_type === "operating_expense")
    .reduce((s, b) => s + b.balance, 0)
  const netIncome = totalRevenue - totalCOS - totalOpEx

  const operating: ReportSection[] = [
    { account_number: "", account_name: "Net Income", balance: netIncome },
  ]

  // Working capital changes (AR, AP, Accrued, Prepaid)
  const ar = balances.find((b) => b.account_number === "1050")
  const ap = balances.find((b) => b.account_number === "2000")
  const accrued = balances.find((b) => b.account_number === "2100")
  const prepaid = balances.find((b) => b.account_number === "1400")

  if (ar && ar.balance !== 0) operating.push({ account_number: "1050", account_name: "Changes in Accounts Receivable", balance: -ar.balance })
  if (ap && ap.balance !== 0) operating.push({ account_number: "2000", account_name: "Changes in Accounts Payable", balance: ap.balance })
  if (accrued && accrued.balance !== 0) operating.push({ account_number: "2100", account_name: "Changes in Accrued Expenses", balance: accrued.balance })
  if (prepaid && prepaid.balance !== 0) operating.push({ account_number: "1400", account_name: "Changes in Prepaid Expenses", balance: -prepaid.balance })

  // Depreciation add-back
  const depreciation = balances.find((b) => b.account_number === "6800")
  if (depreciation && depreciation.balance !== 0) {
    operating.push({ account_number: "6800", account_name: "Depreciation Expense (Add-back)", balance: depreciation.balance })
  }

  // Investing: CIP, Land, Building
  const investing: ReportSection[] = []
  const cip = balances.find((b) => b.account_number === "1100")
  const land = balances.find((b) => b.account_number === "1200")
  const building = balances.find((b) => b.account_number === "1300")

  if (cip && cip.balance !== 0) investing.push({ account_number: "1100", account_name: "Construction in Progress", balance: -cip.balance })
  if (land && land.balance !== 0) investing.push({ account_number: "1200", account_name: "Land Purchases", balance: -land.balance })
  if (building && building.balance !== 0) investing.push({ account_number: "1300", account_name: "Building & Improvements", balance: -building.balance })

  // Financing: Loans, Capital, Distributions
  const financing: ReportSection[] = []
  const constLoan = balances.find((b) => b.account_number === "2200")
  const permLoan = balances.find((b) => b.account_number === "2300")
  const memberCapital = balances.find((b) => b.account_number === "3000")
  const memberDist = balances.find((b) => b.account_number === "3100")

  if (constLoan && constLoan.balance !== 0) financing.push({ account_number: "2200", account_name: "Construction Loan Proceeds", balance: constLoan.balance })
  if (permLoan && permLoan.balance !== 0) financing.push({ account_number: "2300", account_name: "Permanent Loan Proceeds", balance: permLoan.balance })
  if (memberCapital && memberCapital.balance !== 0) financing.push({ account_number: "3000", account_name: "Member Capital Contributions", balance: memberCapital.balance })
  if (memberDist && memberDist.balance !== 0) financing.push({ account_number: "3100", account_name: "Member Distributions", balance: -memberDist.balance })

  const total_operating = operating.reduce((s, item) => s + item.balance, 0)
  const total_investing = investing.reduce((s, item) => s + item.balance, 0)
  const total_financing = financing.reduce((s, item) => s + item.balance, 0)

  return {
    operating,
    investing,
    financing,
    total_operating,
    total_investing,
    total_financing,
    net_change: total_operating + total_investing + total_financing,
    beginning_cash,
    ending_cash,
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function FinancialReports({
  reportType,
  entityId,
  entityName,
  period,
  className,
}: FinancialReportsProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const supabase = createClient()

      // Load accounts
      const { data: acctData } = await supabase
        .from("accounts")
        .select("*")
        .eq("entity_id", entityId)

      // Load transactions within period
      const { data: txnData } = await supabase
        .from("transactions")
        .select("*, transaction_line_items(*)")
        .eq("entity_id", entityId)
        .gte("date", period.start_date)
        .lte("date", period.end_date)
        .eq("status", "posted")

      if (acctData) setAccounts(acctData as Account[])
      if (txnData) {
        setTransactions(
          txnData.map((t: any) => ({
            ...t,
            line_items: t.transaction_line_items || [],
            total_debits: (t.transaction_line_items || []).reduce(
              (s: number, li: any) => s + (li.debit_amount || 0),
              0
            ),
            total_credits: (t.transaction_line_items || []).reduce(
              (s: number, li: any) => s + (li.credit_amount || 0),
              0
            ),
          })) as Transaction[]
        )
      }

      setLoading(false)
    }

    loadData()
  }, [entityId, period.start_date, period.end_date])

  const balances = useMemo(
    () => computeAccountBalances(accounts, transactions),
    [accounts, transactions]
  )

  const reportTitle = useMemo(() => {
    switch (reportType) {
      case "balance_sheet":
        return "Balance Sheet"
      case "income_statement":
        return "Income Statement"
      case "trial_balance":
        return "Trial Balance"
      case "cash_flow":
        return "Statement of Cash Flows"
    }
  }, [reportType])

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6 print:space-y-4", className)}>
      {/* Report Header */}
      <div className="text-center print:mb-6">
        <h2 className="text-xl font-bold print:text-2xl">{entityName}</h2>
        <h3 className="text-lg font-semibold text-muted-foreground">{reportTitle}</h3>
        <p className="text-sm text-muted-foreground">
          {period.type === "custom"
            ? `${formatDate(period.start_date)} - ${formatDate(period.end_date)}`
            : `For the period ending ${formatDate(period.end_date)}`}
        </p>
      </div>

      {/* Print / Export buttons */}
      <div className="flex items-center gap-2 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Report Content */}
      {reportType === "balance_sheet" && (
        <BalanceSheetReport data={buildBalanceSheet(balances)} />
      )}
      {reportType === "income_statement" && (
        <IncomeStatementReport data={buildIncomeStatement(balances)} />
      )}
      {reportType === "trial_balance" && (
        <TrialBalanceReport data={buildTrialBalance(balances)} />
      )}
      {reportType === "cash_flow" && (
        <CashFlowReport data={buildCashFlow(balances)} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Report Section Component
// ---------------------------------------------------------------------------

function ReportSectionBlock({
  title,
  items,
  total,
  totalLabel,
  indent = false,
}: {
  title: string
  items: ReportSection[]
  total: number
  totalLabel?: string
  indent?: boolean
}) {
  return (
    <div className="space-y-1">
      <h4 className="font-semibold text-sm border-b border-border pb-1">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-4 py-1">No entries</p>
      ) : (
        items.map((item, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center justify-between text-sm py-0.5",
              indent && "pl-4"
            )}
          >
            <span className="text-muted-foreground">
              {item.account_number ? `${item.account_number} - ` : ""}
              {item.account_name}
            </span>
            <span className={cn("font-mono tabular-nums", item.balance < 0 && "text-destructive")}>
              {formatCurrency(item.balance, { decimals: 2 })}
            </span>
          </div>
        ))
      )}
      <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-1">
        <span>{totalLabel || `Total ${title}`}</span>
        <span className="font-mono tabular-nums">
          {formatCurrency(total, { decimals: 2 })}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Balance Sheet
// ---------------------------------------------------------------------------

function BalanceSheetReport({ data }: { data: BalanceSheetData }) {
  return (
    <div className="space-y-6">
      <ReportSectionBlock
        title="Assets"
        items={data.assets}
        total={data.total_assets}
        indent
      />
      <ReportSectionBlock
        title="Liabilities"
        items={data.liabilities}
        total={data.total_liabilities}
        indent
      />
      <ReportSectionBlock
        title="Equity"
        items={data.equity}
        total={data.total_equity}
        indent
      />

      <Separator />

      <div className="flex items-center justify-between font-bold text-sm">
        <span>Total Liabilities + Equity</span>
        <span className="font-mono tabular-nums">
          {formatCurrency(data.total_liabilities + data.total_equity, { decimals: 2 })}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {data.is_balanced ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Balanced
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Out of Balance by{" "}
            {formatCurrency(
              Math.abs(data.total_assets - (data.total_liabilities + data.total_equity)),
              { decimals: 2 }
            )}
          </Badge>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Income Statement
// ---------------------------------------------------------------------------

function IncomeStatementReport({ data }: { data: IncomeStatementData }) {
  return (
    <div className="space-y-6">
      <ReportSectionBlock
        title="Revenue"
        items={data.revenue}
        total={data.total_revenue}
        indent
      />
      <ReportSectionBlock
        title="Cost of Sales"
        items={data.cost_of_sales}
        total={data.total_cost_of_sales}
        indent
      />

      <div className="flex items-center justify-between font-bold text-sm border-t-2 border-border pt-2">
        <span>Gross Profit</span>
        <span className={cn("font-mono tabular-nums", data.gross_profit < 0 && "text-destructive")}>
          {formatCurrency(data.gross_profit, { decimals: 2 })}
        </span>
      </div>

      <ReportSectionBlock
        title="Operating Expenses"
        items={data.operating_expenses}
        total={data.total_operating_expenses}
        indent
      />

      <Separator className="border-2" />

      <div className="flex items-center justify-between font-bold text-base border-t-2 border-double pt-2">
        <span>Net Income</span>
        <span className={cn("font-mono tabular-nums", data.net_income < 0 && "text-destructive")}>
          {formatCurrency(data.net_income, { decimals: 2 })}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Trial Balance
// ---------------------------------------------------------------------------

function TrialBalanceReport({ data }: { data: TrialBalanceData }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Account #</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Account Name</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Debit</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Credit</th>
            </tr>
          </thead>
          <tbody>
            {data.accounts.map((acct, idx) => (
              <tr key={idx} className="border-b last:border-b-0">
                <td className="px-4 py-2 font-mono text-xs">{acct.account_number}</td>
                <td className="px-4 py-2">{acct.account_name}</td>
                <td className="px-4 py-2">
                  <Badge variant="outline" className="text-[10px]">
                    {ACCOUNT_TYPE_LABELS[acct.account_type]}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">
                  {acct.debit_balance > 0 ? formatCurrency(acct.debit_balance, { decimals: 2 }) : ""}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">
                  {acct.credit_balance > 0 ? formatCurrency(acct.credit_balance, { decimals: 2 }) : ""}
                </td>
              </tr>
            ))}
            {/* Totals */}
            <tr className="border-t-2 bg-muted/30 font-semibold">
              <td colSpan={3} className="px-4 py-2 text-right">
                Totals
              </td>
              <td className="px-4 py-2 text-right font-mono tabular-nums">
                {formatCurrency(data.total_debits, { decimals: 2 })}
              </td>
              <td className="px-4 py-2 text-right font-mono tabular-nums">
                {formatCurrency(data.total_credits, { decimals: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        {data.is_balanced ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Trial Balance is in Balance
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Out of Balance by{" "}
            {formatCurrency(Math.abs(data.total_debits - data.total_credits), { decimals: 2 })}
          </Badge>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cash Flow
// ---------------------------------------------------------------------------

function CashFlowReport({ data }: { data: CashFlowData }) {
  return (
    <div className="space-y-6">
      <ReportSectionBlock
        title="Cash Flows from Operating Activities"
        items={data.operating}
        total={data.total_operating}
        totalLabel="Net Cash from Operating Activities"
        indent
      />
      <ReportSectionBlock
        title="Cash Flows from Investing Activities"
        items={data.investing}
        total={data.total_investing}
        totalLabel="Net Cash from Investing Activities"
        indent
      />
      <ReportSectionBlock
        title="Cash Flows from Financing Activities"
        items={data.financing}
        total={data.total_financing}
        totalLabel="Net Cash from Financing Activities"
        indent
      />

      <Separator className="border-2" />

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Net Change in Cash</span>
          <span className={cn("font-mono tabular-nums", data.net_change < 0 && "text-destructive")}>
            {formatCurrency(data.net_change, { decimals: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Beginning Cash Balance</span>
          <span className="font-mono tabular-nums">
            {formatCurrency(data.beginning_cash, { decimals: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm font-bold border-t-2 border-double pt-2">
          <span>Ending Cash Balance</span>
          <span className="font-mono tabular-nums">
            {formatCurrency(data.ending_cash, { decimals: 2 })}
          </span>
        </div>
      </div>
    </div>
  )
}
