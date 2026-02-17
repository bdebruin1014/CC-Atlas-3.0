"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronRight,
  Users,
  Building2,
  Download,
  Printer,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
} from "lucide-react"
import { cn, formatCurrency, formatPercent, formatDate } from "@/lib/utils/format"
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
import type { Entity, Investor } from "@/lib/types/accounting"
import { ENTITY_USE_TYPE_LABELS } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_ENTITIES: Entity[] = [
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
  {
    id: "e6", organization_id: "org1", name: "Red Cedar Scattered Lot Fund I", legal_name: "Red Cedar Scattered Lot Fund I LP",
    use_type: "fund_syndication", legal_type: "lp", ein: "67-8901234", state_of_formation: "DE",
    formation_date: "2023-09-01", registered_agent: "Corporation Service Company", parent_entity_id: null,
    status: "active", notes: null, created_at: "2023-09-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
  },
]

interface MockInvestor {
  id: string
  entityId: string
  name: string
  email: string
  ownershipPercent: number
  capitalCommitment: number
  capitalContributed: number
  capitalRemaining: number
  preferredReturn: number
  accreditation: string
}

const MOCK_INVESTORS: MockInvestor[] = [
  { id: "inv1", entityId: "e3", name: "John Smith", email: "john@example.com", ownershipPercent: 35, capitalCommitment: 385_000, capitalContributed: 385_000, capitalRemaining: 0, preferredReturn: 8, accreditation: "Accredited" },
  { id: "inv2", entityId: "e3", name: "Sarah Johnson", email: "sarah@example.com", ownershipPercent: 25, capitalCommitment: 275_000, capitalContributed: 275_000, capitalRemaining: 0, preferredReturn: 8, accreditation: "Accredited" },
  { id: "inv3", entityId: "e3", name: "Michael Chen", email: "mchen@example.com", ownershipPercent: 20, capitalCommitment: 220_000, capitalContributed: 220_000, capitalRemaining: 0, preferredReturn: 8, accreditation: "Qualified Purchaser" },
  { id: "inv4", entityId: "e3", name: "Red Cedar Homes SC LLC (Sponsor)", email: "admin@redcedar.com", ownershipPercent: 20, capitalCommitment: 220_000, capitalContributed: 220_000, capitalRemaining: 0, preferredReturn: 0, accreditation: "N/A" },
  { id: "inv5", entityId: "e4", name: "Robert Davis", email: "rdavis@example.com", ownershipPercent: 40, capitalCommitment: 380_000, capitalContributed: 285_000, capitalRemaining: 95_000, preferredReturn: 8, accreditation: "Accredited" },
  { id: "inv6", entityId: "e4", name: "Emily Wilson", email: "ewilson@example.com", ownershipPercent: 30, capitalCommitment: 285_000, capitalContributed: 213_750, capitalRemaining: 71_250, preferredReturn: 8, accreditation: "Accredited" },
  { id: "inv7", entityId: "e4", name: "Red Cedar Homes SC LLC (Sponsor)", email: "admin@redcedar.com", ownershipPercent: 30, capitalCommitment: 285_000, capitalContributed: 285_000, capitalRemaining: 0, preferredReturn: 0, accreditation: "N/A" },
  { id: "inv8", entityId: "e6", name: "Thomas Brown", email: "tbrown@example.com", ownershipPercent: 20, capitalCommitment: 500_000, capitalContributed: 350_000, capitalRemaining: 150_000, preferredReturn: 10, accreditation: "Qualified Purchaser" },
  { id: "inv9", entityId: "e6", name: "Jennifer Lee", email: "jlee@example.com", ownershipPercent: 15, capitalCommitment: 375_000, capitalContributed: 262_500, capitalRemaining: 112_500, preferredReturn: 10, accreditation: "Accredited" },
]

interface CapitalActivity {
  date: string
  description: string
  type: "contribution" | "distribution" | "capital_call"
  amount: number
  balance: number
}

const MOCK_CAPITAL_ACTIVITY: Record<string, CapitalActivity[]> = {
  inv1: [
    { date: "2022-07-01", description: "Initial capital contribution", type: "contribution", amount: 192_500, balance: 192_500 },
    { date: "2022-10-15", description: "Capital call #1 - Construction draw", type: "capital_call", amount: 96_250, balance: 288_750 },
    { date: "2023-03-01", description: "Capital call #2 - Site development", type: "capital_call", amount: 96_250, balance: 385_000 },
    { date: "2023-09-15", description: "Q3 2023 Distribution - Home sale proceeds", type: "distribution", amount: -45_000, balance: 340_000 },
    { date: "2024-03-15", description: "Q1 2024 Distribution - Home sale proceeds", type: "distribution", amount: -62_500, balance: 277_500 },
    { date: "2024-06-30", description: "Q2 2024 Distribution - Home sale proceeds", type: "distribution", amount: -38_000, balance: 239_500 },
  ],
  inv2: [
    { date: "2022-07-01", description: "Initial capital contribution", type: "contribution", amount: 137_500, balance: 137_500 },
    { date: "2022-10-15", description: "Capital call #1 - Construction draw", type: "capital_call", amount: 68_750, balance: 206_250 },
    { date: "2023-03-01", description: "Capital call #2 - Site development", type: "capital_call", amount: 68_750, balance: 275_000 },
    { date: "2023-09-15", description: "Q3 2023 Distribution", type: "distribution", amount: -32_143, balance: 242_857 },
    { date: "2024-03-15", description: "Q1 2024 Distribution", type: "distribution", amount: -44_643, balance: 198_214 },
  ],
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function InvestorStatementsPage() {
  const router = useRouter()

  const [entities, setEntities] = useState<Entity[]>(MOCK_ENTITIES)
  const [selectedEntity, setSelectedEntity] = useState<string>("e3")
  const [selectedInvestor, setSelectedInvestor] = useState<string>("")
  const [statementPeriod, setStatementPeriod] = useState<"ytd" | "q1" | "q2" | "q3" | "q4" | "annual">("ytd")
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

  // Investors for selected entity
  const entityInvestors = useMemo(
    () => MOCK_INVESTORS.filter((i) => i.entityId === selectedEntity),
    [selectedEntity]
  )

  // Reset investor selection when entity changes
  useEffect(() => {
    setSelectedInvestor("")
  }, [selectedEntity])

  const investor = MOCK_INVESTORS.find((i) => i.id === selectedInvestor)
  const entity = entities.find((e) => e.id === selectedEntity)
  const activity = MOCK_CAPITAL_ACTIVITY[selectedInvestor] || []

  // Compute statement summary
  const totalContributions = activity
    .filter((a) => a.type === "contribution" || a.type === "capital_call")
    .reduce((s, a) => s + a.amount, 0)
  const totalDistributions = activity
    .filter((a) => a.type === "distribution")
    .reduce((s, a) => s + Math.abs(a.amount), 0)
  const currentBalance = activity.length > 0 ? activity[activity.length - 1].balance : 0
  const totalReturn = totalDistributions > 0 ? ((totalDistributions / totalContributions) * 100) : 0

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
        <span className="text-foreground font-medium">Investor Statements</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investor Statements</h1>
          <p className="text-sm text-muted-foreground">
            Generate and review individual investor capital account statements
          </p>
        </div>
        {investor && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        )}
      </div>

      {/* Selectors */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 min-w-[280px]">
              <Label>Entity</Label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {e.name}
                        <Badge variant="outline" className="text-[10px]">
                          {ENTITY_USE_TYPE_LABELS[e.use_type]}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 min-w-[280px]">
              <Label>Investor</Label>
              <Select value={selectedInvestor} onValueChange={setSelectedInvestor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investor" />
                </SelectTrigger>
                <SelectContent>
                  {entityInvestors.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        {inv.name}
                        <span className="text-[10px] text-muted-foreground">
                          ({inv.ownershipPercent}%)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={statementPeriod} onValueChange={(v) => setStatementPeriod(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  <SelectItem value="q1">Q1</SelectItem>
                  <SelectItem value="q2">Q2</SelectItem>
                  <SelectItem value="q3">Q3</SelectItem>
                  <SelectItem value="q4">Q4</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
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
        </CardContent>
      </Card>

      {/* No investor selected state */}
      {!investor && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Select an Investor</h3>
            <p className="text-sm text-muted-foreground">
              Choose an entity and investor above to generate a capital account statement.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Investor Statement */}
      {investor && (
        <>
          {/* Statement Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Capital Account Statement</CardTitle>
                  <CardDescription>
                    {entity?.legal_name || entity?.name} - {statementPeriod === "ytd" ? "Year to Date" : statementPeriod === "annual" ? "Annual" : statementPeriod.toUpperCase()} {selectedYear}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {investor.accreditation}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Investor Name</p>
                  <p className="text-sm font-medium">{investor.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{investor.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ownership Interest</p>
                  <p className="text-sm font-medium">{investor.ownershipPercent}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preferred Return</p>
                  <p className="text-sm font-medium">{investor.preferredReturn}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Capital Commitment</p>
                <p className="text-2xl font-bold font-mono tabular-nums">
                  {formatCurrency(investor.capitalCommitment, { decimals: 0 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Total Contributed</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-blue-600">
                  {formatCurrency(totalContributions, { decimals: 0 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Total Distributions</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-green-600">
                  {formatCurrency(totalDistributions, { decimals: 0 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold font-mono tabular-nums">
                  {formatCurrency(currentBalance, { decimals: 0 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Return: {totalReturn.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Capital Activity Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Capital Account Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No capital activity recorded for this investor.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening balance */}
                      <tr className="bg-muted/30 font-medium">
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2">Opening Balance</td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {formatCurrency(0, { decimals: 2 })}
                        </td>
                      </tr>
                      {activity.map((act, i) => (
                        <tr key={i} className="border-b last:border-b-0 hover:bg-muted/20">
                          <td className="px-4 py-2 font-mono text-xs">{formatDate(act.date, { short: true })}</td>
                          <td className="px-4 py-2">{act.description}</td>
                          <td className="px-4 py-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                act.type === "contribution" && "bg-blue-100 text-blue-800 hover:bg-blue-100",
                                act.type === "capital_call" && "bg-amber-100 text-amber-800 hover:bg-amber-100",
                                act.type === "distribution" && "bg-green-100 text-green-800 hover:bg-green-100"
                              )}
                            >
                              {act.type === "contribution" ? "Contribution" :
                               act.type === "capital_call" ? "Capital Call" : "Distribution"}
                            </Badge>
                          </td>
                          <td className={cn(
                            "px-4 py-2 text-right font-mono tabular-nums",
                            act.amount >= 0 ? "text-blue-600" : "text-green-600"
                          )}>
                            {act.amount >= 0 ? "+" : ""}{formatCurrency(act.amount, { decimals: 2 })}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums font-medium">
                            {formatCurrency(act.balance, { decimals: 2 })}
                          </td>
                        </tr>
                      ))}
                      {/* Closing balance */}
                      <tr className="border-t-2 bg-muted/50 font-bold">
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3">Closing Balance</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {formatCurrency(currentBalance, { decimals: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Capital Commitment</span>
                  <span className="text-sm font-mono tabular-nums font-medium">
                    {formatCurrency(investor.capitalCommitment, { decimals: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Capital Contributed</span>
                  <span className="text-sm font-mono tabular-nums font-medium text-blue-600">
                    {formatCurrency(totalContributions, { decimals: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Unfunded Commitment</span>
                  <span className="text-sm font-mono tabular-nums font-medium text-amber-600">
                    {formatCurrency(investor.capitalRemaining, { decimals: 2 })}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Distributions Received</span>
                  <span className="text-sm font-mono tabular-nums font-medium text-green-600">
                    {formatCurrency(totalDistributions, { decimals: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Current Capital Account Balance</span>
                  <span className="text-sm font-mono tabular-nums font-bold">
                    {formatCurrency(currentBalance, { decimals: 2 })}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Multiple on Invested Capital (MOIC)</span>
                  <span className="text-sm font-mono tabular-nums font-medium">
                    {totalContributions > 0
                      ? ((currentBalance + totalDistributions) / totalContributions).toFixed(2)
                      : "0.00"}x
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Return on Capital</span>
                  <span className={cn(
                    "text-sm font-mono tabular-nums font-medium",
                    totalReturn > 0 ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {totalReturn.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
            <p>
              This statement is prepared for informational purposes only and is based on the books and
              records of {entity?.legal_name || entity?.name}. This statement does not constitute tax advice.
            </p>
            <p>
              Investors should consult with their own tax advisors regarding the tax implications of their
              investment. K-1 forms will be distributed separately.
            </p>
            <p className="font-medium">
              Generated on {formatDate(new Date().toISOString())}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
