"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Printer,
  BarChart3,
  Minus,
} from "lucide-react"
import { cn, formatCurrency, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

interface Project {
  id: string
  name: string
  entityName: string
  entityId: string
  status: string
}

const MOCK_PROJECTS: Project[] = [
  { id: "p1", name: "Greenview Phase I", entityName: "SPE - Greenview Phase I", entityId: "e3", status: "Active" },
  { id: "p2", name: "Oakmont Reserve", entityName: "SPE - Oakmont Reserve", entityId: "e4", status: "Active" },
  { id: "p3", name: "Magnolia Estates", entityName: "Red Cedar Homes SC LLC", entityId: "e2", status: "Planning" },
  { id: "p4", name: "Cypress Pointe", entityName: "Red Cedar Homes NC LLC", entityId: "e5", status: "Pre-Development" },
]

interface PLLineItem {
  category: string
  subcategory: string
  budget: number
  actual: number
  variance: number
  variancePercent: number
}

const MOCK_PL_DATA: Record<string, PLLineItem[]> = {
  p1: [
    // Revenue
    { category: "Revenue", subcategory: "Home Sale Revenue", budget: 8_400_000, actual: 5_250_000, variance: -3_150_000, variancePercent: -37.5 },
    { category: "Revenue", subcategory: "Lot Sale Revenue", budget: 600_000, actual: 450_000, variance: -150_000, variancePercent: -25.0 },
    { category: "Revenue", subcategory: "Other Income", budget: 50_000, actual: 22_000, variance: -28_000, variancePercent: -56.0 },
    // Cost of Sales
    { category: "Cost of Sales", subcategory: "Land Cost", budget: 1_200_000, actual: 1_200_000, variance: 0, variancePercent: 0 },
    { category: "Cost of Sales", subcategory: "Direct Construction", budget: 4_200_000, actual: 2_850_000, variance: -1_350_000, variancePercent: -32.1 },
    { category: "Cost of Sales", subcategory: "Architecture & Engineering", budget: 350_000, actual: 345_000, variance: -5_000, variancePercent: -1.4 },
    { category: "Cost of Sales", subcategory: "Permits & Fees", budget: 280_000, actual: 275_000, variance: -5_000, variancePercent: -1.8 },
    { category: "Cost of Sales", subcategory: "Site Development", budget: 650_000, actual: 620_000, variance: -30_000, variancePercent: -4.6 },
    { category: "Cost of Sales", subcategory: "Closing Costs", budget: 120_000, actual: 78_000, variance: -42_000, variancePercent: -35.0 },
    { category: "Cost of Sales", subcategory: "Real Estate Commissions", budget: 252_000, actual: 157_500, variance: -94_500, variancePercent: -37.5 },
    // Operating Expenses
    { category: "Operating Expenses", subcategory: "Interest Expense", budget: 245_000, actual: 198_000, variance: -47_000, variancePercent: -19.2 },
    { category: "Operating Expenses", subcategory: "Property Taxes", budget: 85_000, actual: 82_000, variance: -3_000, variancePercent: -3.5 },
    { category: "Operating Expenses", subcategory: "Insurance", budget: 48_000, actual: 46_500, variance: -1_500, variancePercent: -3.1 },
    { category: "Operating Expenses", subcategory: "Management Fees", budget: 168_000, actual: 105_000, variance: -63_000, variancePercent: -37.5 },
    { category: "Operating Expenses", subcategory: "Legal & Professional", budget: 75_000, actual: 62_000, variance: -13_000, variancePercent: -17.3 },
    { category: "Operating Expenses", subcategory: "Marketing", budget: 120_000, actual: 95_000, variance: -25_000, variancePercent: -20.8 },
  ],
  p2: [
    { category: "Revenue", subcategory: "Home Sale Revenue", budget: 12_000_000, actual: 2_100_000, variance: -9_900_000, variancePercent: -82.5 },
    { category: "Revenue", subcategory: "Lot Sale Revenue", budget: 900_000, actual: 0, variance: -900_000, variancePercent: -100.0 },
    { category: "Cost of Sales", subcategory: "Land Cost", budget: 1_800_000, actual: 1_800_000, variance: 0, variancePercent: 0 },
    { category: "Cost of Sales", subcategory: "Direct Construction", budget: 6_000_000, actual: 1_450_000, variance: -4_550_000, variancePercent: -75.8 },
    { category: "Cost of Sales", subcategory: "Site Development", budget: 950_000, actual: 780_000, variance: -170_000, variancePercent: -17.9 },
    { category: "Operating Expenses", subcategory: "Interest Expense", budget: 380_000, actual: 165_000, variance: -215_000, variancePercent: -56.6 },
    { category: "Operating Expenses", subcategory: "Insurance", budget: 65_000, actual: 58_000, variance: -7_000, variancePercent: -10.8 },
  ],
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ProjectPLPage() {
  const router = useRouter()

  const [selectedProject, setSelectedProject] = useState<string>("p1")
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "year" | "project_to_date">("project_to_date")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const project = MOCK_PROJECTS.find((p) => p.id === selectedProject)
  const plData = MOCK_PL_DATA[selectedProject] || MOCK_PL_DATA.p1

  // Group by category
  const grouped = useMemo(() => {
    const categories: Record<string, PLLineItem[]> = {}
    plData.forEach((item) => {
      if (!categories[item.category]) categories[item.category] = []
      categories[item.category].push(item)
    })
    return categories
  }, [plData])

  // Totals
  const totalRevenue = useMemo(
    () => (grouped["Revenue"] || []).reduce((s, i) => s + i.actual, 0),
    [grouped]
  )
  const totalReveneBudget = useMemo(
    () => (grouped["Revenue"] || []).reduce((s, i) => s + i.budget, 0),
    [grouped]
  )
  const totalCOS = useMemo(
    () => (grouped["Cost of Sales"] || []).reduce((s, i) => s + i.actual, 0),
    [grouped]
  )
  const totalCOSBudget = useMemo(
    () => (grouped["Cost of Sales"] || []).reduce((s, i) => s + i.budget, 0),
    [grouped]
  )
  const totalOpex = useMemo(
    () => (grouped["Operating Expenses"] || []).reduce((s, i) => s + i.actual, 0),
    [grouped]
  )
  const totalOpexBudget = useMemo(
    () => (grouped["Operating Expenses"] || []).reduce((s, i) => s + i.budget, 0),
    [grouped]
  )
  const grossProfit = totalRevenue - totalCOS
  const grossProfitBudget = totalReveneBudget - totalCOSBudget
  const netIncome = grossProfit - totalOpex
  const netIncomeBudget = grossProfitBudget - totalOpexBudget
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => router.push("/accounting")}
        >
          Accounting
        </button>
        <ChevronRight className="h-3 w-3" />
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => router.push("/accounting")}
        >
          Reports
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Project P&L</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Profit & Loss</h1>
          <p className="text-sm text-muted-foreground">
            Budget vs actual analysis by project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 min-w-[300px]">
              <Label>Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_PROJECTS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        {p.name}
                        <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project_to_date">Project to Date</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType !== "project_to_date" && (
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
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
            )}
          </div>

          {project && (
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>Entity: {project.entityName}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>Status: {project.status}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-green-600">
              {formatCurrency(totalRevenue, { decimals: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Budget: {formatCurrency(totalReveneBudget, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Gross Profit</p>
            <p className="text-2xl font-bold font-mono tabular-nums">
              {formatCurrency(grossProfit, { decimals: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Margin: {grossMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Net Income</p>
            <p className={cn(
              "text-2xl font-bold font-mono tabular-nums",
              netIncome >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(netIncome, { decimals: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Margin: {netMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Budget Variance</p>
            <p className={cn(
              "text-2xl font-bold font-mono tabular-nums",
              netIncome - netIncomeBudget >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(netIncome - netIncomeBudget, { decimals: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              vs budget net income
            </p>
          </CardContent>
        </Card>
      </div>

      {/* P&L Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {project?.name || "Project"} - Profit & Loss
          </CardTitle>
          <CardDescription>
            {periodType === "project_to_date" ? "Project to Date" : `Year ${selectedYear}`} - Budget vs Actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Line Item</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Budget</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actual</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Variance ($)</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Variance (%)</th>
                </tr>
              </thead>
              <tbody>
                {/* Revenue */}
                <tr className="bg-green-50/50">
                  <td colSpan={5} className="px-4 py-2 font-semibold text-green-800">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Revenue
                    </div>
                  </td>
                </tr>
                {(grouped["Revenue"] || []).map((item) => (
                  <tr key={item.subcategory} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-2 pl-8">{item.subcategory}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                      {formatCurrency(item.budget, { decimals: 0 })}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                      {formatCurrency(item.actual, { decimals: 0 })}
                    </td>
                    <td className={cn(
                      "px-4 py-2 text-right font-mono tabular-nums text-xs",
                      item.variance > 0 ? "text-green-600" : item.variance < 0 ? "text-red-600" : ""
                    )}>
                      {formatCurrency(item.variance, { decimals: 0 })}
                    </td>
                    <td className={cn(
                      "px-4 py-2 text-right font-mono tabular-nums text-xs",
                      item.variancePercent > 0 ? "text-green-600" : item.variancePercent < 0 ? "text-red-600" : ""
                    )}>
                      {item.variancePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-green-50/30 font-semibold">
                  <td className="px-4 py-2">Total Revenue</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCurrency(totalReveneBudget, { decimals: 0 })}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCurrency(totalRevenue, { decimals: 0 })}</td>
                  <td className={cn("px-4 py-2 text-right font-mono tabular-nums", totalRevenue - totalReveneBudget >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(totalRevenue - totalReveneBudget, { decimals: 0 })}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {totalReveneBudget > 0 ? (((totalRevenue - totalReveneBudget) / totalReveneBudget) * 100).toFixed(1) : "0.0"}%
                  </td>
                </tr>

                {/* Cost of Sales */}
                <tr className="bg-orange-50/50">
                  <td colSpan={5} className="px-4 py-2 font-semibold text-orange-800">
                    <div className="flex items-center gap-2">
                      <Minus className="h-4 w-4" />
                      Cost of Sales
                    </div>
                  </td>
                </tr>
                {(grouped["Cost of Sales"] || []).map((item) => (
                  <tr key={item.subcategory} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-2 pl-8">{item.subcategory}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                      {formatCurrency(item.budget, { decimals: 0 })}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                      {formatCurrency(item.actual, { decimals: 0 })}
                    </td>
                    <td className={cn(
                      "px-4 py-2 text-right font-mono tabular-nums text-xs",
                      item.variance < 0 ? "text-green-600" : item.variance > 0 ? "text-red-600" : ""
                    )}>
                      {formatCurrency(item.variance, { decimals: 0 })}
                    </td>
                    <td className={cn(
                      "px-4 py-2 text-right font-mono tabular-nums text-xs",
                      item.variancePercent < 0 ? "text-green-600" : item.variancePercent > 0 ? "text-red-600" : ""
                    )}>
                      {item.variancePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-orange-50/30 font-semibold">
                  <td className="px-4 py-2">Total Cost of Sales</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCurrency(totalCOSBudget, { decimals: 0 })}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCurrency(totalCOS, { decimals: 0 })}</td>
                  <td className={cn("px-4 py-2 text-right font-mono tabular-nums", totalCOS - totalCOSBudget <= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(totalCOS - totalCOSBudget, { decimals: 0 })}
                  </td>
                  <td className="px-4 py-2" />
                </tr>

                {/* Gross Profit */}
                <tr className="bg-muted/60 font-bold border-t-2">
                  <td className="px-4 py-3">Gross Profit</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(grossProfitBudget, { decimals: 0 })}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(grossProfit, { decimals: 0 })}</td>
                  <td className={cn("px-4 py-3 text-right font-mono tabular-nums", grossProfit - grossProfitBudget >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(grossProfit - grossProfitBudget, { decimals: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {grossMargin.toFixed(1)}% margin
                  </td>
                </tr>

                {/* Operating Expenses */}
                <tr className="bg-amber-50/50">
                  <td colSpan={5} className="px-4 py-2 font-semibold text-amber-800">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Operating Expenses
                    </div>
                  </td>
                </tr>
                {(grouped["Operating Expenses"] || []).map((item) => (
                  <tr key={item.subcategory} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-2 pl-8">{item.subcategory}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                      {formatCurrency(item.budget, { decimals: 0 })}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                      {formatCurrency(item.actual, { decimals: 0 })}
                    </td>
                    <td className={cn(
                      "px-4 py-2 text-right font-mono tabular-nums text-xs",
                      item.variance < 0 ? "text-green-600" : item.variance > 0 ? "text-red-600" : ""
                    )}>
                      {formatCurrency(item.variance, { decimals: 0 })}
                    </td>
                    <td className={cn(
                      "px-4 py-2 text-right font-mono tabular-nums text-xs",
                      item.variancePercent < 0 ? "text-green-600" : item.variancePercent > 0 ? "text-red-600" : ""
                    )}>
                      {item.variancePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-amber-50/30 font-semibold">
                  <td className="px-4 py-2">Total Operating Expenses</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCurrency(totalOpexBudget, { decimals: 0 })}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCurrency(totalOpex, { decimals: 0 })}</td>
                  <td className={cn("px-4 py-2 text-right font-mono tabular-nums", totalOpex - totalOpexBudget <= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(totalOpex - totalOpexBudget, { decimals: 0 })}
                  </td>
                  <td className="px-4 py-2" />
                </tr>

                {/* Net Income */}
                <tr className="bg-muted/80 font-bold border-t-2 text-base">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Net Income
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(netIncomeBudget, { decimals: 0 })}</td>
                  <td className={cn("px-4 py-3 text-right font-mono tabular-nums", netIncome >= 0 ? "text-green-700" : "text-red-700")}>
                    {formatCurrency(netIncome, { decimals: 0 })}
                  </td>
                  <td className={cn("px-4 py-3 text-right font-mono tabular-nums", netIncome - netIncomeBudget >= 0 ? "text-green-700" : "text-red-700")}>
                    {formatCurrency(netIncome - netIncomeBudget, { decimals: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {netMargin.toFixed(1)}% margin
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
