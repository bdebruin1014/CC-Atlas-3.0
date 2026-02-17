"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ProjectPLData {
  revenue: any[]
  costs: any[]
  gross_profit: number
  operating_expenses: number
  net_income: number
}

interface ProjectPLProps {
  data: ProjectPLData
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function LineItemSection({
  title,
  items,
  total,
  totalLabel,
  isBold,
  colorClass,
}: {
  title: string
  items: any[]
  total: number
  totalLabel?: string
  isBold?: boolean
  colorClass?: string
}) {
  return (
    <>
      {/* Section Header */}
      <TableRow className="bg-muted/30">
        <TableCell colSpan={2} className="font-semibold text-sm py-2">
          {title}
        </TableCell>
      </TableRow>

      {/* Line Items */}
      {items.map((item: any, idx: number) => (
        <TableRow key={item.account_number ?? item.name ?? idx}>
          <TableCell className="pl-6 text-sm">
            <div className="flex items-center gap-2">
              {item.account_number && (
                <span className="text-xs text-muted-foreground font-mono">
                  {item.account_number}
                </span>
              )}
              <span>{item.name ?? item.account_name ?? "—"}</span>
            </div>
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums">
            {formatCurrency(item.amount ?? item.balance ?? 0, { decimals: 2 })}
          </TableCell>
        </TableRow>
      ))}

      {/* Section Total */}
      <TableRow className="border-t">
        <TableCell
          className={cn(
            "pl-6 text-sm",
            isBold && "font-bold",
            !isBold && "font-semibold",
            colorClass
          )}
        >
          {totalLabel ?? `Total ${title}`}
        </TableCell>
        <TableCell
          className={cn(
            "text-right font-mono tabular-nums",
            isBold && "font-bold",
            !isBold && "font-semibold",
            colorClass
          )}
        >
          {formatCurrency(total, { decimals: 2 })}
        </TableCell>
      </TableRow>
    </>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ProjectPL({ data }: ProjectPLProps) {
  const totalRevenue = useMemo(
    () =>
      data.revenue.reduce(
        (sum, item) => sum + (item.amount ?? item.balance ?? 0),
        0
      ),
    [data.revenue]
  )

  const totalCosts = useMemo(
    () =>
      data.costs.reduce(
        (sum, item) => sum + (item.amount ?? item.balance ?? 0),
        0
      ),
    [data.costs]
  )

  const isNetPositive = data.net_income >= 0
  const grossMargin =
    totalRevenue > 0
      ? ((data.gross_profit / totalRevenue) * 100).toFixed(1)
      : "0.0"
  const netMargin =
    totalRevenue > 0
      ? ((data.net_income / totalRevenue) * 100).toFixed(1)
      : "0.0"

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="text-lg font-bold">
              {formatCurrency(totalRevenue, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Cost of Sales</p>
            <p className="text-lg font-bold text-orange-600">
              {formatCurrency(totalCosts, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Gross Profit</p>
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  "text-lg font-bold",
                  data.gross_profit >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {formatCurrency(data.gross_profit, { decimals: 0 })}
              </p>
              <span className="text-xs text-muted-foreground">
                ({grossMargin}%)
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Net Income</p>
            <div className="flex items-center gap-1.5">
              {isNetPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <p
                className={cn(
                  "text-lg font-bold",
                  isNetPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {formatCurrency(data.net_income, { decimals: 0 })}
              </p>
              <span className="text-xs text-muted-foreground">
                ({netMargin}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Profit &amp; Loss Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[180px]">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Revenue Section */}
                <LineItemSection
                  title="Revenue"
                  items={data.revenue}
                  total={totalRevenue}
                />

                <TableRow>
                  <TableCell colSpan={2} className="py-1" />
                </TableRow>

                {/* Cost of Sales Section */}
                <LineItemSection
                  title="Cost of Sales"
                  items={data.costs}
                  total={totalCosts}
                />

                {/* Gross Profit Line */}
                <TableRow className="border-t-2 bg-muted/50">
                  <TableCell className="font-bold text-sm">
                    Gross Profit
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono tabular-nums font-bold",
                      data.gross_profit >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {formatCurrency(data.gross_profit, { decimals: 2 })}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={2} className="py-1" />
                </TableRow>

                {/* Operating Expenses */}
                <TableRow className="bg-muted/30">
                  <TableCell
                    colSpan={2}
                    className="font-semibold text-sm py-2"
                  >
                    Operating Expenses
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6 font-semibold text-sm">
                    Total Operating Expenses
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-semibold">
                    {formatCurrency(data.operating_expenses, { decimals: 2 })}
                  </TableCell>
                </TableRow>

                {/* Net Income Line */}
                <TableRow className="border-t-2 bg-muted/50">
                  <TableCell className="font-bold text-base">
                    Net Income
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono tabular-nums font-bold text-base",
                      isNetPositive ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {formatCurrency(data.net_income, { decimals: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
