"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate, cn } from "@/lib/utils/format"
import { Users, TrendingUp, DollarSign } from "lucide-react"

interface InvestorStatementProps {
  data: {
    investor_name: string
    entity_name?: string
    period?: string
    beginning_balance: number
    contributions: number
    preferred_return: number
    distributions: number
    ending_balance: number
    irr: number | null
    equity_multiple: number
    preferred_return_status?: "current" | "in_arrears"
    cash_flows: {
      date: string
      amount: number
      type: string
      description: string
    }[]
  }
}

export function InvestorStatement({ data }: InvestorStatementProps) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Total Contributed</p>
            <p className="text-xl font-bold font-mono tabular-nums">
              {formatCurrency(data.contributions + data.beginning_balance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Total Distributed</p>
            <p className="text-xl font-bold font-mono tabular-nums text-green-600">
              {formatCurrency(Math.abs(data.distributions))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> IRR
            </p>
            <p className="text-xl font-bold text-blue-600">
              {data.irr !== null ? `${(data.irr * 100).toFixed(1)}%` : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Equity Multiple
            </p>
            <p className="text-xl font-bold">
              {data.equity_multiple.toFixed(2)}x
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Capital Account Waterfall */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Capital Account — {data.investor_name}
          </CardTitle>
          {data.entity_name && (
            <p className="text-sm text-muted-foreground">{data.entity_name}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between px-4 py-2.5 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Beginning Balance</span>
              <span className="text-sm font-bold font-mono tabular-nums">
                {formatCurrency(data.beginning_balance)}
              </span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-sm text-green-700">+ Contributions</span>
              <span className="text-sm font-medium font-mono tabular-nums text-green-700">
                {formatCurrency(data.contributions)}
              </span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-sm text-blue-700">+ Preferred Return Accrued</span>
              <span className="text-sm font-medium font-mono tabular-nums text-blue-700">
                {formatCurrency(data.preferred_return)}
              </span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-sm text-red-600">- Distributions</span>
              <span className="text-sm font-medium font-mono tabular-nums text-red-600">
                ({formatCurrency(Math.abs(data.distributions))})
              </span>
            </div>
            <Separator />
            <div className="flex justify-between px-4 py-2.5 bg-primary/5 rounded-lg">
              <span className="font-semibold">Ending Balance</span>
              <span className="font-bold text-lg font-mono tabular-nums">
                {formatCurrency(data.ending_balance)}
              </span>
            </div>
            {data.preferred_return_status && (
              <div className="flex justify-end px-4 pt-1">
                <Badge
                  variant={data.preferred_return_status === "current" ? "default" : "destructive"}
                >
                  Pref Return: {data.preferred_return_status === "current" ? "Current" : "In Arrears"}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow History */}
      {data.cash_flows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cash Flow History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.cash_flows.map((cf, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-mono">
                      {formatDate(cf.date)}
                    </TableCell>
                    <TableCell className="text-sm">{cf.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">
                        {cf.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right text-sm font-mono tabular-nums font-medium",
                      cf.amount < 0 ? "text-red-600" : cf.amount > 0 ? "text-green-600" : ""
                    )}>
                      {cf.amount < 0
                        ? `(${formatCurrency(Math.abs(cf.amount))})`
                        : formatCurrency(cf.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
