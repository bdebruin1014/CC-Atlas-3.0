"use client"

import { useState, useMemo } from "react"
import { Calendar, Hash, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Account, Transaction } from "@/lib/types/accounting"
import {
  ACCOUNT_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AccountDetailProps {
  account: Account
  transactions: Transaction[]
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAccountTypeBadgeClass(accountType: Account["account_type"]): string {
  switch (accountType) {
    case "asset":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "liability":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    case "equity":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100"
    case "revenue":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "cost_of_sales":
    case "operating_expense":
      return "bg-orange-100 text-orange-800 hover:bg-orange-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

interface FlattenedEntry {
  transactionId: string
  date: string
  description: string
  transactionType: string
  referenceNumber: string | null
  status: string
  debit: number
  credit: number
  memo: string | null
  runningBalance: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountDetail({
  account,
  transactions,
  className,
}: AccountDetailProps) {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Flatten transactions to line items for this account, with date filtering
  const entries = useMemo(() => {
    // Filter and sort transactions by date ascending
    let filtered = transactions
      .filter((t) => t.status !== "voided")
      .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))

    if (dateFrom) {
      filtered = filtered.filter((t) => t.date >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter((t) => t.date <= dateTo)
    }

    let runningBalance = 0
    const result: FlattenedEntry[] = []

    filtered.forEach((txn) => {
      const accountLines = txn.line_items.filter(
        (li) => li.account_id === account.id
      )
      accountLines.forEach((li) => {
        // For debit-normal accounts: debits increase, credits decrease
        // For credit-normal accounts: credits increase, debits decrease
        if (account.normal_balance === "debit") {
          runningBalance += li.debit_amount - li.credit_amount
        } else {
          runningBalance += li.credit_amount - li.debit_amount
        }

        result.push({
          transactionId: txn.id,
          date: txn.date,
          description: txn.description,
          transactionType: txn.transaction_type,
          referenceNumber: txn.reference_number,
          status: txn.status,
          debit: li.debit_amount,
          credit: li.credit_amount,
          memo: li.memo,
          runningBalance,
        })
      })
    })

    return result
  }, [transactions, account.id, account.normal_balance, dateFrom, dateTo])

  // Summary stats
  const totalDebits = useMemo(
    () => entries.reduce((sum, e) => sum + e.debit, 0),
    [entries]
  )
  const totalCredits = useMemo(
    () => entries.reduce((sum, e) => sum + e.credit, 0),
    [entries]
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {account.account_number}
                    </span>
                    <h2 className="text-xl font-bold">{account.name}</h2>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        getAccountTypeBadgeClass(account.account_type)
                      )}
                    >
                      {ACCOUNT_TYPE_LABELS[account.account_type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">
                      Normal: {account.normal_balance}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        account.is_active
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {account.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              {account.description && (
                <p className="text-sm text-muted-foreground mt-2 ml-[52px]">
                  {account.description}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-3xl font-bold tabular-nums">
                {formatCurrency(account.current_balance, { decimals: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Debits</p>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(totalDebits, { decimals: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Credits</p>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(totalCredits, { decimals: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entries</p>
              <p className="text-lg font-bold tabular-nums">{entries.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Date Range:</span>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[160px]"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[160px]"
        />
        {(dateFrom || dateTo) && (
          <button
            className="text-xs text-muted-foreground underline hover:text-foreground"
            onClick={() => {
              setDateFrom("")
              setDateTo("")
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Transaction Register */}
      <div className="overflow-x-auto rounded-md border border-border">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No transactions found for this account</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Running Balance</TableHead>
                <TableHead>Memo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, idx) => (
                <TableRow key={`${entry.transactionId}-${idx}`}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(entry.date, { short: true })}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {entry.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {TRANSACTION_TYPE_LABELS[entry.transactionType as keyof typeof TRANSACTION_TYPE_LABELS] || entry.transactionType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.referenceNumber || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {entry.debit > 0
                      ? formatCurrency(entry.debit, { decimals: 2 })
                      : ""}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {entry.credit > 0
                      ? formatCurrency(entry.credit, { decimals: 2 })
                      : ""}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono tabular-nums font-medium",
                      entry.runningBalance < 0 && "text-red-600"
                    )}
                  >
                    {formatCurrency(entry.runningBalance, { decimals: 2 })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {entry.memo || "—"}
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals row */}
              <TableRow className="border-t-2 bg-muted/30 font-medium">
                <TableCell colSpan={4} className="text-right text-sm">
                  Totals:
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(totalDebits, { decimals: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(totalCredits, { decimals: 2 })}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono tabular-nums font-bold",
                    entries.length > 0 && entries[entries.length - 1].runningBalance < 0 && "text-red-600"
                  )}
                >
                  {entries.length > 0
                    ? formatCurrency(entries[entries.length - 1].runningBalance, {
                        decimals: 2,
                      })
                    : "—"}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
