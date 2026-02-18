"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Landmark,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Banknote,
  CalendarDays,
  Settings,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { EntityHierarchy } from "@/components/accounting/entity-hierarchy"
import type { Entity, Loan, Transaction, AccountingPeriod } from "@/lib/types/accounting"
import { ENTITY_USE_TYPE_LABELS } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Mock data for initial render (replaced by Supabase fetch)
// ---------------------------------------------------------------------------

const MOCK_ENTITIES: Entity[] = [
  {
    id: "e1",
    organization_id: "org1",
    name: "Olive Brynn LLC",
    legal_name: "Olive Brynn LLC",
    use_type: "holding_company",
    legal_type: "llc",
    ein: "12-3456789",
    state_of_formation: "SC",
    formation_date: "2020-01-15",
    registered_agent: "CT Corporation",
    parent_entity_id: null,
    status: "active",
    notes: null,
    created_at: "2020-01-15T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "e2",
    organization_id: "org1",
    name: "Red Cedar Homes SC LLC",
    legal_name: "Red Cedar Homes SC LLC",
    use_type: "operating_company",
    legal_type: "llc",
    ein: "23-4567890",
    state_of_formation: "SC",
    formation_date: "2020-03-01",
    registered_agent: "CT Corporation",
    parent_entity_id: "e1",
    status: "active",
    notes: null,
    created_at: "2020-03-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "e3",
    organization_id: "org1",
    name: "SPE - Greenview Phase I",
    legal_name: "RCH Greenview Phase I LLC",
    use_type: "single_purpose_entity",
    legal_type: "llc",
    ein: "34-5678901",
    state_of_formation: "SC",
    formation_date: "2022-06-01",
    registered_agent: "CT Corporation",
    parent_entity_id: "e2",
    status: "active",
    notes: null,
    created_at: "2022-06-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "e4",
    organization_id: "org1",
    name: "SPE - Oakmont Reserve",
    legal_name: "RCH Oakmont Reserve LLC",
    use_type: "single_purpose_entity",
    legal_type: "llc",
    ein: "45-6789012",
    state_of_formation: "SC",
    formation_date: "2023-01-15",
    registered_agent: "CT Corporation",
    parent_entity_id: "e2",
    status: "active",
    notes: null,
    created_at: "2023-01-15T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "e5",
    organization_id: "org1",
    name: "Red Cedar Homes NC LLC",
    legal_name: "Red Cedar Homes NC LLC",
    use_type: "operating_company",
    legal_type: "llc",
    ein: "56-7890123",
    state_of_formation: "NC",
    formation_date: "2023-06-01",
    registered_agent: "CT Corporation",
    parent_entity_id: "e1",
    status: "active",
    notes: null,
    created_at: "2023-06-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "e6",
    organization_id: "org1",
    name: "Red Cedar Scattered Lot Fund I",
    legal_name: "Red Cedar Scattered Lot Fund I LP",
    use_type: "fund_syndication",
    legal_type: "lp",
    ein: "67-8901234",
    state_of_formation: "DE",
    formation_date: "2023-09-01",
    registered_agent: "Corporation Service Company",
    parent_entity_id: null,
    status: "active",
    notes: null,
    created_at: "2023-09-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "e7",
    organization_id: "org1",
    name: "Red Cedar Scattered Lot Fund II",
    legal_name: "Red Cedar Scattered Lot Fund II LP",
    use_type: "fund_syndication",
    legal_type: "lp",
    ein: "78-9012345",
    state_of_formation: "DE",
    formation_date: "2024-06-01",
    registered_agent: "Corporation Service Company",
    parent_entity_id: null,
    status: "active",
    notes: null,
    created_at: "2024-06-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
  },
]

const MOCK_LOANS: Array<{ id: string; lender_name: string; loan_type: string; current_balance: number; maturity_date: string; status: string; entity_name: string }> = [
  { id: "l1", lender_name: "First National Bank", loan_type: "construction_loan", current_balance: 2450000, maturity_date: "2026-04-15", status: "active", entity_name: "SPE - Greenview Phase I" },
  { id: "l2", lender_name: "Regional Community Bank", loan_type: "acquisition_loan", current_balance: 1800000, maturity_date: "2026-09-30", status: "active", entity_name: "SPE - Oakmont Reserve" },
  { id: "l3", lender_name: "Heritage Credit Union", loan_type: "line_of_credit", current_balance: 500000, maturity_date: "2027-01-15", status: "active", entity_name: "Red Cedar Homes SC LLC" },
]

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function AccountingDashboardPage() {
  const router = useRouter()
  const [entities, setEntities] = useState<Entity[]>(MOCK_ENTITIES)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Load entities from Supabase
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setLoadError(null)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .order("name")

      if (error) {
        setLoadError("Failed to load entities. Using cached data.")
      } else if (data && data.length > 0) {
        setEntities(data as unknown as Entity[])
      }
      setLoading(false)
    }
    loadData()
  }, [])

  // Compute summary stats
  const totalEntities = entities.length
  const totalAssets = 12_450_000 // Would be computed from actual COA balances
  const totalLiabilities = 4_750_000
  const netEquity = totalAssets - totalLiabilities

  // Maturity alerts
  const loansWithAlerts = useMemo(() => {
    const today = new Date()
    return MOCK_LOANS.map((loan) => {
      const maturity = new Date(loan.maturity_date)
      const daysRemaining = Math.ceil(
        (maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
      let alertLevel: "none" | "yellow" | "orange" | "red" = "none"
      if (daysRemaining <= 30) alertLevel = "red"
      else if (daysRemaining <= 60) alertLevel = "orange"
      else if (daysRemaining <= 90) alertLevel = "yellow"
      return { ...loan, daysRemaining, alertLevel }
    }).filter((l) => l.alertLevel !== "none")
  }, [])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Entity management, financial tracking, and investor reporting
          </p>
        </div>
        <Button onClick={() => router.push("/accounting/entities")}>
          <Settings className="h-4 w-4" />
          Manage Entities
        </Button>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {loadError}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              Total Entities
            </div>
            <p className="text-3xl font-bold">{totalEntities}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {entities.filter((e) => e.status === "active").length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Assets
            </div>
            <p className="text-3xl font-bold">{formatCurrency(totalAssets, { compact: true })}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all entities</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Total Liabilities
            </div>
            <p className="text-3xl font-bold">{formatCurrency(totalLiabilities, { compact: true })}</p>
            <p className="text-xs text-muted-foreground mt-1">Loans + payables</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Net Equity
            </div>
            <p className="text-3xl font-bold">{formatCurrency(netEquity, { compact: true })}</p>
            <p className="text-xs text-muted-foreground mt-1">Assets - Liabilities</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity Hierarchy */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Entity Hierarchy
            </CardTitle>
            <CardDescription>
              Parent-child relationships between legal entities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : (
              <EntityHierarchy entities={entities} />
            )}
          </CardContent>
        </Card>

        {/* Quick Links + Loan Alerts */}
        <div className="space-y-6">
          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => router.push("/accounting/entities")}
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Recent Transactions
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => router.push("/accounting/period-close")}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Pending Approvals
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => router.push("/accounting/period-close")}
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Open Periods
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => router.push("/accounting/loans")}
              >
                <span className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Active Loans
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Active Loans with Maturity Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Maturity Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loansWithAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming maturities within 90 days
                </p>
              ) : (
                <div className="space-y-3">
                  {loansWithAlerts.map((loan) => (
                    <div
                      key={loan.id}
                      className={cn(
                        "rounded-md border p-3 cursor-pointer transition-colors hover:bg-muted/50",
                        loan.alertLevel === "red" && "border-red-300 bg-red-50",
                        loan.alertLevel === "orange" && "border-orange-300 bg-orange-50",
                        loan.alertLevel === "yellow" && "border-yellow-300 bg-yellow-50"
                      )}
                      onClick={() => router.push("/accounting/loans")}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{loan.lender_name}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            loan.alertLevel === "red" && "bg-red-200 text-red-800",
                            loan.alertLevel === "orange" && "bg-orange-200 text-orange-800",
                            loan.alertLevel === "yellow" && "bg-yellow-200 text-yellow-800"
                          )}
                        >
                          {loan.daysRemaining} days
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{loan.entity_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {formatCurrency(loan.current_balance)} | Matures: {formatDate(loan.maturity_date)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
