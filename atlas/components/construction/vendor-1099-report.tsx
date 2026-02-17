"use client"

import { useMemo } from "react"
import {
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Vendor1099Summary } from "@/lib/construction/accounting-types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Vendor1099ReportProps {
  summaries: Vendor1099Summary[]
  taxYear: number
  onYearChange: (year: number) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const THRESHOLD_1099 = 600 // IRS 1099-NEC threshold

function maskTaxId(id: string | undefined | null): string {
  if (!id) return "—"
  if (id.length < 4) return "***"
  return `***-**-${id.slice(-4)}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function Vendor1099Report({
  summaries,
  taxYear,
  onYearChange,
}: Vendor1099ReportProps) {
  // Summary stats
  const stats = useMemo(() => {
    const total = summaries.length
    const eligible = summaries.filter((s) => s.is_1099_eligible).length
    const eligibleAmount = summaries
      .filter((s) => s.is_1099_eligible)
      .reduce((sum, s) => sum + s.total_payments, 0)
    const missingW9 = summaries.filter(
      (s) => s.is_1099_eligible && !s.w9_on_file
    ).length

    return { total, eligible, eligibleAmount, missingW9 }
  }, [summaries])

  // Available years for selector
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => currentYear - i)
  }, [])

  // Sort: eligible vendors first, then by payment amount desc
  const sorted = useMemo(() => {
    return [...summaries].sort((a, b) => {
      if (a.is_1099_eligible !== b.is_1099_eligible) {
        return a.is_1099_eligible ? -1 : 1
      }
      return b.total_payments - a.total_payments
    })
  }, [summaries])

  return (
    <div className="space-y-6">
      {/* Header with year selector and export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">1099-NEC Report</h3>
          <Select
            value={String(taxYear)}
            onValueChange={(v) => onYearChange(Number(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline">
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Vendors</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">1099 Eligible</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.eligible}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Eligible Total Payments
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.eligibleAmount, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            stats.missingW9 > 0 &&
              "border-red-200 dark:border-red-800"
          )}
        >
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Missing W-9</p>
            <p
              className={cn(
                "text-2xl font-bold",
                stats.missingW9 > 0 ? "text-red-600" : "text-green-600"
              )}
            >
              {stats.missingW9}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Missing W-9 Alert */}
      {stats.missingW9 > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">
              Missing W-9 Forms
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {stats.missingW9} eligible vendor{stats.missingW9 > 1 ? "s are" : " is"}{" "}
              missing a W-9 on file. A valid W-9 is required before issuing a
              1099-NEC form.
            </p>
          </div>
        </div>
      )}

      {/* Vendor Table */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mb-2 opacity-40" />
          <p>No vendor payment data for {taxYear}.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Tax ID</TableHead>
              <TableHead>W-9 Status</TableHead>
              <TableHead className="text-right">YTD Payments</TableHead>
              <TableHead>1099 Eligible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((vendor) => (
              <TableRow
                key={vendor.contact_id}
                className={cn(
                  vendor.is_1099_eligible &&
                    !vendor.w9_on_file &&
                    "bg-red-50/50 dark:bg-red-950/20"
                )}
              >
                <TableCell className="font-medium">
                  {vendor.company_name}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {maskTaxId(vendor.contact_id)}
                </TableCell>
                <TableCell>
                  {vendor.w9_on_file ? (
                    <Badge className="text-xs border-0 bg-green-100 text-green-700 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      On File
                    </Badge>
                  ) : (
                    <Badge className="text-xs border-0 bg-red-100 text-red-700 gap-1">
                      <XCircle className="h-3 w-3" />
                      Missing
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(vendor.total_payments, { decimals: 2 })}
                </TableCell>
                <TableCell>
                  {vendor.is_1099_eligible ? (
                    <Badge className="text-xs border-0 bg-blue-100 text-blue-700">
                      Eligible
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Below ${THRESHOLD_1099}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {/* Totals row */}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell>
                {sorted.length} vendor{sorted.length !== 1 ? "s" : ""}
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="text-right">
                {formatCurrency(
                  sorted.reduce((s, v) => s + v.total_payments, 0),
                  { decimals: 2 }
                )}
              </TableCell>
              <TableCell>
                {stats.eligible} eligible
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  )
}
