"use client"

import { useMemo } from "react"
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Users,
  Banknote,
  FileText,
  ArrowRight,
  BarChart3,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Entity, Account, Transaction } from "@/lib/types/accounting"
import {
  ENTITY_USE_TYPE_LABELS,
  ENTITY_LEGAL_TYPE_LABELS,
  ACCOUNT_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FinancialSnapshot {
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
}

interface EntityDetailProps {
  entity: Entity
  financialSnapshot: FinancialSnapshot
  accounts: Account[]
  recentTransactions: Transaction[]
  className?: string
  onNavigate?: (tab: string, id?: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBadgeClass(status: Entity["status"]): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "inactive":
      return "bg-gray-100 text-gray-600 hover:bg-gray-100"
    case "dissolved":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

function getTransactionStatusBadge(status: Transaction["status"]) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    case "approved":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "posted":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "voided":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

// ---------------------------------------------------------------------------
// Snapshot Cards
// ---------------------------------------------------------------------------

function SnapshotCard({
  title,
  value,
  icon: Icon,
  iconColor,
  trend,
}: {
  title: string
  value: number
  icon: React.ElementType
  iconColor: string
  trend?: "up" | "down" | "neutral"
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatCurrency(value, { decimals: 0 })}
            </p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              iconColor
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// EntityDetail
// ---------------------------------------------------------------------------

export function EntityDetail({
  entity,
  financialSnapshot,
  accounts,
  recentTransactions,
  className,
  onNavigate,
}: EntityDetailProps) {
  const accountSummary = useMemo(() => {
    const active = accounts.filter((a) => a.is_active)
    const byType: Record<string, number> = {}
    active.forEach((a) => {
      byType[a.account_type] = (byType[a.account_type] || 0) + 1
    })
    return { total: active.length, byType }
  }, [accounts])

  const topAccounts = useMemo(
    () =>
      [...accounts]
        .filter((a) => a.is_active && Math.abs(a.current_balance) > 0)
        .sort((a, b) => Math.abs(b.current_balance) - Math.abs(a.current_balance))
        .slice(0, 5),
    [accounts]
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{entity.name}</h1>
            <Badge
              variant="secondary"
              className={cn("text-xs", getStatusBadgeClass(entity.status))}
            >
              {entity.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {entity.legal_name && (
              <span>{entity.legal_name}</span>
            )}
            <Badge variant="outline" className="text-[10px]">
              {ENTITY_USE_TYPE_LABELS[entity.use_type]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {ENTITY_LEGAL_TYPE_LABELS[entity.legal_type]}
            </Badge>
            {entity.ein && (
              <span className="text-xs">EIN: {entity.ein}</span>
            )}
            {entity.state_of_formation && (
              <span className="text-xs">{entity.state_of_formation}</span>
            )}
            {entity.formation_date && (
              <span className="text-xs">
                Formed: {formatDate(entity.formation_date)}
              </span>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Tabbed Interface */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="investors">Investors</TabsTrigger>
          <TabsTrigger value="distributions">Distributions</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Financial Snapshot Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <SnapshotCard
              title="Total Assets"
              value={financialSnapshot.totalAssets}
              icon={DollarSign}
              iconColor="bg-blue-100 text-blue-600"
            />
            <SnapshotCard
              title="Total Liabilities"
              value={financialSnapshot.totalLiabilities}
              icon={Wallet}
              iconColor="bg-red-100 text-red-600"
            />
            <SnapshotCard
              title="Total Equity"
              value={financialSnapshot.totalEquity}
              icon={TrendingUp}
              iconColor="bg-purple-100 text-purple-600"
            />
            <SnapshotCard
              title="Revenue"
              value={financialSnapshot.totalRevenue}
              icon={TrendingUp}
              iconColor="bg-green-100 text-green-600"
            />
            <SnapshotCard
              title="Expenses"
              value={financialSnapshot.totalExpenses}
              icon={TrendingDown}
              iconColor="bg-orange-100 text-orange-600"
            />
          </div>

          {/* Net Income */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Income</p>
                  <p
                    className={cn(
                      "text-3xl font-bold tabular-nums",
                      financialSnapshot.netIncome >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {formatCurrency(financialSnapshot.netIncome, { decimals: 0 })}
                  </p>
                </div>
                <BarChart3
                  className={cn(
                    "h-8 w-8",
                    financialSnapshot.netIncome >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Top Accounts + Recent Transactions side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Accounts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Top Accounts by Balance</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => onNavigate?.("chart-of-accounts")}
                >
                  View All
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent>
                {topAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No account balances
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topAccounts.map((acct) => (
                      <div
                        key={acct.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs text-muted-foreground">
                            {acct.account_number}
                          </span>
                          <span className="truncate">{acct.name}</span>
                        </div>
                        <span className="font-mono tabular-nums font-medium shrink-0 ml-2">
                          {formatCurrency(acct.current_balance, { decimals: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => onNavigate?.("transactions")}
                >
                  View All
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent transactions
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.slice(0, 5).map((txn) => (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDate(txn.date, { short: true })}
                          </span>
                          <span className="truncate">{txn.description}</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-1.5 py-0 shrink-0",
                              getTransactionStatusBadge(txn.status)
                            )}
                          >
                            {txn.status}
                          </Badge>
                        </div>
                        <span className="font-mono tabular-nums font-medium shrink-0 ml-2">
                          {formatCurrency(txn.total_debits, { decimals: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Chart of Accounts Tab */}
        <TabsContent value="chart-of-accounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Chart of Accounts Summary</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.("chart-of-accounts", entity.id)}
              >
                Manage Accounts
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(accountSummary.byType).map(([type, count]) => (
                  <div
                    key={type}
                    className="rounded-md bg-muted/50 p-3 text-center"
                  >
                    <p className="text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[type as keyof typeof ACCOUNT_TYPE_LABELS] || type}
                    </p>
                    <p className="text-lg font-semibold">{count}</p>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                Total active accounts: <span className="font-medium text-foreground">{accountSummary.total}</span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Transaction Register</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.("transactions", entity.id)}
              >
                Full Register
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No transactions recorded yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Debits</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.slice(0, 10).map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(txn.date, { short: true })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {txn.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {TRANSACTION_TYPE_LABELS[txn.transaction_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(txn.total_debits, { decimals: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(txn.total_credits, { decimals: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              getTransactionStatusBadge(txn.status)
                            )}
                          >
                            {txn.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investors Tab */}
        <TabsContent value="investors" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Investor Management
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.("investors", entity.id)}
              >
                Manage Investors
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Navigate to the investor management page to view and manage investors,
                capital calls, and distributions.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distributions Tab */}
        <TabsContent value="distributions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4" />
                Distribution History
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.("distributions", entity.id)}
              >
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Navigate to distributions to view waterfall calculations,
                distribution history, and investor allocations.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="h-4 w-4" />
                Loan Dashboard
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.("loans", entity.id)}
              >
                View Loans
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Navigate to the loan dashboard to view all loans, draw schedules,
                interest accruals, and maturity tracking.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Financial Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Balance Sheet",
                    description: "Assets, liabilities, and equity snapshot",
                    report: "balance_sheet",
                  },
                  {
                    title: "Income Statement",
                    description: "Revenue, expenses, and net income",
                    report: "income_statement",
                  },
                  {
                    title: "Trial Balance",
                    description: "All accounts with debit/credit balances",
                    report: "trial_balance",
                  },
                  {
                    title: "Cash Flow Statement",
                    description: "Operating, investing, and financing activities",
                    report: "cash_flow",
                  },
                ].map((item) => (
                  <button
                    key={item.report}
                    className="flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
                    onClick={() => onNavigate?.("reports", item.report)}
                  >
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
