"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  BarChart3,
  FileSpreadsheet,
  Receipt,
  Wallet,
  Scale,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { FinancialReports } from "@/components/accounting/financial-reports"
import type { ReportType, ReportPeriod } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return { start, end }
}

function getQuarterRange(year: number, quarter: number): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = startMonth + 2
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`
  const lastDay = new Date(year, endMonth, 0).getDate()
  const end = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return { start, end }
}

function getYearRange(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

const REPORT_TYPES: Array<{ value: ReportType; label: string; icon: React.ReactNode; description: string }> = [
  {
    value: "balance_sheet",
    label: "Balance Sheet",
    icon: <Scale className="h-5 w-5 text-blue-500" />,
    description: "Assets, liabilities, and equity at a point in time",
  },
  {
    value: "income_statement",
    label: "Income Statement",
    icon: <Receipt className="h-5 w-5 text-green-500" />,
    description: "Revenue, expenses, and net income for a period",
  },
  {
    value: "cash_flow",
    label: "Cash Flow",
    icon: <Wallet className="h-5 w-5 text-purple-500" />,
    description: "Operating, investing, and financing cash flows",
  },
  {
    value: "trial_balance",
    label: "Trial Balance",
    icon: <FileSpreadsheet className="h-5 w-5 text-amber-500" />,
    description: "All accounts with debit and credit balances",
  },
]

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const params = useParams()
  const router = useRouter()
  const entityId = params.id as string

  const [entityName, setEntityName] = useState("")
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "year" | "custom">("month")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  useEffect(() => {
    async function loadEntity() {
      const supabase = createClient()
      const { data } = await supabase
        .from("entities")
        .select("name")
        .eq("id", entityId)
        .single()
      if (data) setEntityName(data.name)
    }
    loadEntity()
  }, [entityId])

  // Compute period
  const period: ReportPeriod = useMemo(() => {
    switch (periodType) {
      case "month": {
        const range = getMonthRange(selectedYear, selectedMonth)
        return { type: "month", start_date: range.start, end_date: range.end }
      }
      case "quarter": {
        const range = getQuarterRange(selectedYear, selectedQuarter)
        return { type: "quarter", start_date: range.start, end_date: range.end }
      }
      case "year": {
        const range = getYearRange(selectedYear)
        return { type: "year", start_date: range.start, end_date: range.end }
      }
      case "custom":
        return {
          type: "custom",
          start_date: customStart || `${selectedYear}-01-01`,
          end_date: customEnd || `${selectedYear}-12-31`,
        }
    }
  }, [periodType, selectedYear, selectedMonth, selectedQuarter, customStart, customEnd])

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => router.push(`/accounting/entities/${entityId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {entityName || "Entity"}
        </Button>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-sm text-muted-foreground">
            {entityName} - Generate financial statements
          </p>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {REPORT_TYPES.map((rt) => (
          <Card
            key={rt.value}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedReport === rt.value && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedReport(rt.value)}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-2">
                {rt.icon}
                <p className="font-medium text-sm">{rt.label}</p>
                <p className="text-[10px] text-muted-foreground">{rt.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Period Selector */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Period Type</Label>
                <Select value={periodType} onValueChange={(val) => setPeriodType(val as any)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="quarter">Quarter</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {periodType === "month" && (
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {periodType === "quarter" && (
                <div className="space-y-2">
                  <Label>Quarter</Label>
                  <Select value={String(selectedQuarter)} onValueChange={(val) => setSelectedQuarter(parseInt(val))}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Q1</SelectItem>
                      <SelectItem value="2">Q2</SelectItem>
                      <SelectItem value="3">Q3</SelectItem>
                      <SelectItem value="4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {periodType === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Display */}
      {selectedReport && (
        <Card>
          <CardContent className="pt-6">
            <FinancialReports
              reportType={selectedReport}
              entityId={entityId}
              entityName={entityName}
              period={period}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
