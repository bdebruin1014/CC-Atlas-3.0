"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Building2,
  ArrowLeft,
  BookOpen,
  FileText,
  Users,
  DollarSign,
  BarChart3,
  ExternalLink,
  Edit,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import type { Entity, EntityUseType } from "@/lib/types/accounting"
import {
  ENTITY_USE_TYPE_LABELS,
  ENTITY_LEGAL_TYPE_LABELS,
} from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUseTypeBadgeClass(useType: EntityUseType): string {
  switch (useType) {
    case "holding_company": return "bg-purple-100 text-purple-800 hover:bg-purple-100"
    case "operating_company": return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "single_purpose_entity": return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
    case "fund_syndication": return "bg-amber-100 text-amber-800 hover:bg-amber-100"
    default: return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function EntityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const entityId = params.id as string

  const [entity, setEntity] = useState<Entity | null>(null)
  const [parentEntity, setParentEntity] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    async function loadEntity() {
      setLoading(true)
      const supabase = createClient()

      const { data } = await supabase
        .from("entities")
        .select("*")
        .eq("id", entityId)
        .single()

      if (data) {
        const e = data as Entity
        setEntity(e)

        // Load parent if exists
        if (e.parent_entity_id) {
          const { data: parentData } = await supabase
            .from("entities")
            .select("*")
            .eq("id", e.parent_entity_id)
            .single()
          if (parentData) setParentEntity(parentData as Entity)
        }
      }
      setLoading(false)
    }
    loadEntity()
  }, [entityId])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!entity) {
    return (
      <div className="flex flex-col items-center justify-center py-24 p-6">
        <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-1">Entity not found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The entity you are looking for does not exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => router.push("/accounting/entities")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Entities
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Back button + Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => router.push("/accounting/entities")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Entities
        </Button>

        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{entity.name}</h1>
              <Badge
                variant="secondary"
                className={cn("text-xs", getUseTypeBadgeClass(entity.use_type))}
              >
                {ENTITY_USE_TYPE_LABELS[entity.use_type]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {ENTITY_LEGAL_TYPE_LABELS[entity.legal_type]}
              </Badge>
            </div>
            {parentEntity && (
              <p className="text-sm text-muted-foreground">
                Parent:{" "}
                <button
                  className="text-primary hover:underline"
                  onClick={() => router.push(`/accounting/entities/${parentEntity.id}`)}
                >
                  {parentEntity.name}
                </button>
              </p>
            )}
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              entity.status === "active"
                ? "bg-green-100 text-green-800 hover:bg-green-100"
                : entity.status === "dissolved"
                ? "bg-red-100 text-red-800 hover:bg-red-100"
                : "bg-gray-100 text-gray-600 hover:bg-gray-100"
            )}
          >
            {entity.status}
          </Badge>
        </div>
      </div>

      {/* Key Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">EIN</p>
              <p className="text-sm font-medium font-mono">
                {entity.ein || "--"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">State of Formation</p>
              <p className="text-sm font-medium">{entity.state_of_formation || "--"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Formation Date</p>
              <p className="text-sm font-medium">{formatDate(entity.formation_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Registered Agent</p>
              <p className="text-sm font-medium">{entity.registered_agent || "--"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="investors">Investors</TabsTrigger>
          <TabsTrigger value="distributions">Distributions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Summary Financials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Total Assets</p>
                <p className="text-2xl font-bold">{formatCurrency(0, { decimals: 2 })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Total Liabilities</p>
                <p className="text-2xl font-bold">{formatCurrency(0, { decimals: 2 })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Net Equity</p>
                <p className="text-2xl font-bold">{formatCurrency(0, { decimals: 2 })}</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => router.push(`/accounting/entities/${entityId}/coa`)}
            >
              <CardContent className="flex items-center gap-3 pt-6">
                <BookOpen className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium">Chart of Accounts</p>
                  <p className="text-xs text-muted-foreground">Manage accounts</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => router.push(`/accounting/entities/${entityId}/transactions`)}
            >
              <CardContent className="flex items-center gap-3 pt-6">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium">Transactions</p>
                  <p className="text-xs text-muted-foreground">View ledger</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => router.push(`/accounting/entities/${entityId}/investors`)}
            >
              <CardContent className="flex items-center gap-3 pt-6">
                <Users className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="font-medium">Investors</p>
                  <p className="text-xs text-muted-foreground">Manage cap table</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => router.push(`/accounting/entities/${entityId}/distributions`)}
            >
              <CardContent className="flex items-center gap-3 pt-6">
                <DollarSign className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="font-medium">Distributions</p>
                  <p className="text-xs text-muted-foreground">Waterfall calculator</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => router.push(`/accounting/entities/${entityId}/reports`)}
            >
              <CardContent className="flex items-center gap-3 pt-6">
                <BarChart3 className="h-8 w-8 text-red-500" />
                <div>
                  <p className="font-medium">Reports</p>
                  <p className="text-xs text-muted-foreground">Financial statements</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {entity.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {entity.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="coa" className="mt-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                View and manage the chart of accounts for this entity.
              </p>
              <Button onClick={() => router.push(`/accounting/entities/${entityId}/coa`)}>
                <ExternalLink className="h-4 w-4" />
                Open Chart of Accounts
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                View and manage transactions for this entity.
              </p>
              <Button onClick={() => router.push(`/accounting/entities/${entityId}/transactions`)}>
                <ExternalLink className="h-4 w-4" />
                Open Transaction Ledger
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investors" className="mt-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Manage investor allocations and capital calls.
              </p>
              <Button onClick={() => router.push(`/accounting/entities/${entityId}/investors`)}>
                <ExternalLink className="h-4 w-4" />
                Open Investor Management
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributions" className="mt-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <DollarSign className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Calculate and manage distribution waterfalls.
              </p>
              <Button onClick={() => router.push(`/accounting/entities/${entityId}/distributions`)}>
                <ExternalLink className="h-4 w-4" />
                Open Distributions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Generate financial reports for this entity.
              </p>
              <Button onClick={() => router.push(`/accounting/entities/${entityId}/reports`)}>
                <ExternalLink className="h-4 w-4" />
                Open Financial Reports
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
