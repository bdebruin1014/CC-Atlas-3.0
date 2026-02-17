"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronRight,
  Building2,
  Download,
  Printer,
  Scale,
  Receipt,
  Wallet,
  FileSpreadsheet,
  Layers,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
import type { Entity, ReportType } from "@/lib/types/accounting"
import { ENTITY_USE_TYPE_LABELS } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_ENTITIES: Entity[] = [
  {
    id: "e1", organization_id: "org1", name: "Olive Brynn LLC", legal_name: "Olive Brynn LLC",
    use_type: "holding_company", legal_type: "llc", ein: "12-3456789", state_of_formation: "SC",
    formation_date: "2020-01-15", registered_agent: "CT Corporation", parent_entity_id: null,
    status: "active", notes: null, created_at: "2020-01-15T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "e2", organization_id: "org1", name: "Red Cedar Homes SC LLC", legal_name: "Red Cedar Homes SC LLC",
    use_type: "operating_company", legal_type: "llc", ein: "23-4567890", state_of_formation: "SC",
    formation_date: "2020-03-01", registered_agent: "CT Corporation", parent_entity_id: "e1",
    status: "active", notes: null, created_at: "2020-03-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "e3", organization_id: "org1", name: "SPE - Greenview Phase I", legal_name: "RCH Greenview Phase I LLC",
    use_type: "single_purpose_entity", legal_type: "llc", ein: "34-5678901", state_of_formation: "SC",
    formation_date: "2022-06-01", registered_agent: "CT Corporation", parent_entity_id: "e2",
    status: "active", notes: null, created_at: "2022-06-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "e4", organization_id: "org1", name: "SPE - Oakmont Reserve", legal_name: "RCH Oakmont Reserve LLC",
    use_type: "single_purpose_entity", legal_type: "llc", ein: "45-6789012", state_of_formation: "SC",
    formation_date: "2023-01-15", registered_agent: "CT Corporation", parent_entity_id: "e2",
    status: "active", notes: null, created_at: "2023-01-15T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
  },
]

interface ConsolidatedLineItem {
  accountNumber: string
  accountName: string
  entities: Record<string, number>
  total: number
}

const MOCK_CONSOLIDATED_DATA: {
  assets: ConsolidatedLineItem[]
  liabilities: ConsolidatedLineItem[]
  equity: ConsolidatedLineItem[]
} = {
  assets: [
    { accountNumber: "1000", accountName: "Cash - Operating", entities: { e1: 250_000, e2: 385_000, e3: 142_000, e4: 98_000 }, total: 875_000 },
    { accountNumber: "1050", accountName: "Accounts Receivable", entities: { e1: 0, e2: 45_000, e3: 125_000, e4: 88_000 }, total: 258_000 },
    { accountNumber: "1100", accountName: "Construction in Progress", entities: { e1: 0, e2: 0, e3: 2_100_000, e4: 3_450_000 }, total: 5_550_000 },
    { accountNumber: "1200", accountName: "Land", entities: { e1: 0, e2: 0, e3: 850_000, e4: 1_200_000 }, total: 2_050_000 },
    { accountNumber: "1400", accountName: "Prepaid Expenses", entities: { e1: 12_000, e2: 35_000, e3: 18_000, e4: 22_000 }, total: 87_000 },
  ],
  liabilities: [
    { accountNumber: "2000", accountName: "Accounts Payable", entities: { e1: 15_000, e2: 85_000, e3: 145_000, e4: 210_000 }, total: 455_000 },
    { accountNumber: "2200", accountName: "Construction Loan Payable", entities: { e1: 0, e2: 0, e3: 1_800_000, e4: 2_450_000 }, total: 4_250_000 },
    { accountNumber: "2400", accountName: "Accrued Interest", entities: { e1: 0, e2: 0, e3: 12_500, e4: 18_200 }, total: 30_700 },
  ],
  equity: [
    { accountNumber: "3000", accountName: "Member Capital", entities: { e1: 500_000, e2: 250_000, e3: 1_100_000, e4: 950_000 }, total: 2_800_000 },
    { accountNumber: "3200", accountName: "Retained Earnings", entities: { e1: -252_000, e2: 130_000, e3: 177_500, e4: 229_800 }, total: 1_284_300 },
  ],
}

// ---------------------------------------------------------------------------
// Report type selector config
// ---------------------------------------------------------------------------

const REPORT_TYPES: Array<{ value: ReportType; label: string; icon: React.ReactNode }> = [
  { value: "balance_sheet", label: "Balance Sheet", icon: <Scale className="h-4 w-4 text-blue-500" /> },
  { value: "income_statement", label: "Income Statement", icon: <Receipt className="h-4 w-4 text-green-500" /> },
  { value: "cash_flow", label: "Cash Flow", icon: <Wallet className="h-4 w-4 text-purple-500" /> },
  { value: "trial_balance", label: "Trial Balance", icon: <FileSpreadsheet className="h-4 w-4 text-amber-500" /> },
]

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ConsolidatedReportsPage() {
  const router = useRouter()

  const [entities, setEntities] = useState<Entity[]>(MOCK_ENTITIES)
  const [loading, setLoading] = useState(false)
  const [selectedParent, setSelectedParent] = useState<string>("e1")
  const [selectedReport, setSelectedReport] = useState<ReportType>("balance_sheet")
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "year">("year")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    async function loadEntities() {
      const supabase = createClient()
      const { data } = await supabase
        .from("entities")
        .select("*")
        .order("name")
      if (data && data.length > 0) {
        setEntities(data as Entity[])
      }
    }
    loadEntities()
  }, [])

  // Get hierarchy from selected parent
  const childEntities = useMemo(() => {
    const getChildren = (parentId: string): Entity[] => {
      const children = entities.filter((e) => e.parent_entity_id === parentId)
      return children.flatMap((c) => [c, ...getChildren(c.id)])
    }
    const parent = entities.find((e) => e.id === selectedParent)
    if (!parent) return []
    return [parent, ...getChildren(selectedParent)]
  }, [entities, selectedParent])

  // Parent entities for selector (entities that have children)
  const parentEntities = useMemo(() => {
    const parentIds = new Set(entities.filter((e) => e.parent_entity_id).map((e) => e.parent_entity_id))
    return entities.filter((e) => parentIds.has(e.id) || !e.parent_entity_id)
  }, [entities])

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

  // Totals
  const totalAssets = MOCK_CONSOLIDATED_DATA.assets.reduce((s, l) => s + l.total, 0)
  const totalLiabilities = MOCK_CONSOLIDATED_DATA.liabilities.reduce((s, l) => s + l.total, 0)
  const totalEquity = MOCK_CONSOLIDATED_DATA.equity.reduce((s, l) => s + l.total, 0)

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
        <span className="text-foreground font-medium">Consolidated</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consolidated Reports</h1>
          <p className="text-sm text-muted-foreground">
            Consolidated financial statements across entity hierarchies
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
            <div className="space-y-2 min-w-[250px]">
              <Label>Parent Entity (Hierarchy Root)</Label>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent entity" />
                </SelectTrigger>
                <SelectContent>
                  {parentEntities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {e.name}
                        <Badge variant="outline" className="text-[10px] ml-1">
                          {ENTITY_USE_TYPE_LABELS[e.use_type]}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={selectedReport} onValueChange={(v) => setSelectedReport(v as ReportType)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      <div className="flex items-center gap-2">
                        {rt.icon}
                        {rt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as any)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          </div>

          {/* Selected hierarchy display */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Consolidating:</span>
            {childEntities.map((e) => (
              <Badge key={e.id} variant="secondary" className="text-xs">
                {e.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Assets</p>
            <p className="text-2xl font-bold font-mono tabular-nums">
              {formatCurrency(totalAssets, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Liabilities</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-red-600">
              {formatCurrency(totalLiabilities, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Equity</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-green-600">
              {formatCurrency(totalEquity, { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Entities</p>
            <p className="text-2xl font-bold">{childEntities.length}</p>
            <p className="text-xs text-muted-foreground mt-1">In consolidation</p>
          </CardContent>
        </Card>
      </div>

      {/* Consolidated Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Consolidated {REPORT_TYPES.find((r) => r.value === selectedReport)?.label}
          </CardTitle>
          <CardDescription>
            {entities.find((e) => e.id === selectedParent)?.name || "All Entities"} - Year {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">Acct #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                  {childEntities.map((e) => (
                    <th key={e.id} className="px-4 py-3 text-right font-medium text-muted-foreground min-w-[120px]">
                      {e.name.length > 15 ? e.name.slice(0, 15) + "..." : e.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground min-w-[120px]">
                    Consolidated
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Assets Section */}
                <tr className="bg-blue-50/50">
                  <td colSpan={childEntities.length + 3} className="px-4 py-2 font-semibold text-blue-800">
                    Assets
                  </td>
                </tr>
                {MOCK_CONSOLIDATED_DATA.assets.map((line) => (
                  <tr key={line.accountNumber} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{line.accountNumber}</td>
                    <td className="px-4 py-2">{line.accountName}</td>
                    {childEntities.map((e) => (
                      <td key={e.id} className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                        {formatCurrency(line.entities[e.id] || 0, { decimals: 0 })}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold">
                      {formatCurrency(line.total, { decimals: 0 })}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-blue-50/30 font-semibold">
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2">Total Assets</td>
                  {childEntities.map((e) => (
                    <td key={e.id} className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                      {formatCurrency(
                        MOCK_CONSOLIDATED_DATA.assets.reduce((s, l) => s + (l.entities[e.id] || 0), 0),
                        { decimals: 0 }
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatCurrency(totalAssets, { decimals: 0 })}
                  </td>
                </tr>

                {/* Liabilities Section */}
                <tr className="bg-red-50/50">
                  <td colSpan={childEntities.length + 3} className="px-4 py-2 font-semibold text-red-800">
                    Liabilities
                  </td>
                </tr>
                {MOCK_CONSOLIDATED_DATA.liabilities.map((line) => (
                  <tr key={line.accountNumber} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{line.accountNumber}</td>
                    <td className="px-4 py-2">{line.accountName}</td>
                    {childEntities.map((e) => (
                      <td key={e.id} className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                        {formatCurrency(line.entities[e.id] || 0, { decimals: 0 })}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold">
                      {formatCurrency(line.total, { decimals: 0 })}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-red-50/30 font-semibold">
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2">Total Liabilities</td>
                  {childEntities.map((e) => (
                    <td key={e.id} className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                      {formatCurrency(
                        MOCK_CONSOLIDATED_DATA.liabilities.reduce((s, l) => s + (l.entities[e.id] || 0), 0),
                        { decimals: 0 }
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatCurrency(totalLiabilities, { decimals: 0 })}
                  </td>
                </tr>

                {/* Equity Section */}
                <tr className="bg-purple-50/50">
                  <td colSpan={childEntities.length + 3} className="px-4 py-2 font-semibold text-purple-800">
                    Equity
                  </td>
                </tr>
                {MOCK_CONSOLIDATED_DATA.equity.map((line) => (
                  <tr key={line.accountNumber} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{line.accountNumber}</td>
                    <td className="px-4 py-2">{line.accountName}</td>
                    {childEntities.map((e) => (
                      <td key={e.id} className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                        {formatCurrency(line.entities[e.id] || 0, { decimals: 0 })}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold">
                      {formatCurrency(line.total, { decimals: 0 })}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-purple-50/30 font-semibold">
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2">Total Equity</td>
                  {childEntities.map((e) => (
                    <td key={e.id} className="px-4 py-2 text-right font-mono tabular-nums text-xs">
                      {formatCurrency(
                        MOCK_CONSOLIDATED_DATA.equity.reduce((s, l) => s + (l.entities[e.id] || 0), 0),
                        { decimals: 0 }
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatCurrency(totalEquity, { decimals: 0 })}
                  </td>
                </tr>

                {/* Total L+E */}
                <tr className="border-t-2 bg-muted/50 font-bold">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3">Total Liabilities + Equity</td>
                  {childEntities.map((e) => (
                    <td key={e.id} className="px-4 py-3 text-right font-mono tabular-nums text-xs">
                      {formatCurrency(
                        MOCK_CONSOLIDATED_DATA.liabilities.reduce((s, l) => s + (l.entities[e.id] || 0), 0) +
                        MOCK_CONSOLIDATED_DATA.equity.reduce((s, l) => s + (l.entities[e.id] || 0), 0),
                        { decimals: 0 }
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatCurrency(totalLiabilities + totalEquity, { decimals: 0 })}
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
