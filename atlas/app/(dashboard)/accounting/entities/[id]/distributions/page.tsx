"use client"

import { use, useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  DollarSign,
  History,
  Calculator,
  ChevronRight,
  Plus,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { WaterfallCalculatorUI } from "@/components/accounting/waterfall-calculator"
import type {
  Investor,
  WaterfallStructure,
  WaterfallTier,
  Distribution,
} from "@/lib/types/accounting"
import type { WaterfallCalculationResult } from "@/lib/utils/waterfall-calculator"

// ---------------------------------------------------------------------------
// Default waterfall structures (fallback if none in DB)
// ---------------------------------------------------------------------------

const DEFAULT_STRUCTURES: WaterfallStructure[] = [
  {
    id: "ws_default_1",
    entity_id: "",
    name: "Simple Preferred + Promote (8% / 80-20)",
    waterfall_type: "simple_preferred_promote",
    tiers: [
      {
        id: "wt_1_1",
        waterfall_structure_id: "ws_default_1",
        tier_order: 1,
        name: "Preferred Return",
        preferred_return_rate: 8,
        investor_split_percent: 100,
        manager_split_percent: 0,
      },
      {
        id: "wt_1_2",
        waterfall_structure_id: "ws_default_1",
        tier_order: 2,
        name: "Remaining - Promote Split",
        investor_split_percent: 80,
        manager_split_percent: 20,
      },
    ],
    created_at: "",
    updated_at: "",
  },
  {
    id: "ws_default_2",
    entity_id: "",
    name: "Multi-Tier IRR",
    waterfall_type: "multi_tier_irr",
    tiers: [
      {
        id: "wt_2_1",
        waterfall_structure_id: "ws_default_2",
        tier_order: 1,
        name: "Tier 1 (0-8% IRR)",
        irr_hurdle_low: 0,
        irr_hurdle_high: 8,
        investor_split_percent: 100,
        manager_split_percent: 0,
      },
      {
        id: "wt_2_2",
        waterfall_structure_id: "ws_default_2",
        tier_order: 2,
        name: "Tier 2 (8-15% IRR)",
        irr_hurdle_low: 8,
        irr_hurdle_high: 15,
        investor_split_percent: 80,
        manager_split_percent: 20,
      },
      {
        id: "wt_2_3",
        waterfall_structure_id: "ws_default_2",
        tier_order: 3,
        name: "Tier 3 (15%+ IRR)",
        irr_hurdle_low: 15,
        irr_hurdle_high: null,
        investor_split_percent: 60,
        manager_split_percent: 40,
      },
    ],
    created_at: "",
    updated_at: "",
  },
]

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function DistributionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: entityId } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [investors, setInvestors] = useState<Investor[]>([])
  const [waterfallStructures, setWaterfallStructures] = useState<WaterfallStructure[]>(DEFAULT_STRUCTURES)
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [entityName, setEntityName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const supabase = createClient()

      const { data: entityData } = await supabase
        .from("entities")
        .select("name")
        .eq("id", entityId)
        .single()
      if (entityData) setEntityName(entityData.name)

      // Load investors
      const { data: invData } = await supabase
        .from("investors")
        .select("*")
        .eq("entity_id", entityId)
        .eq("status", "active")
        .order("ownership_percent", { ascending: false })
      if (invData) setInvestors(invData as Investor[])

      // Load waterfall structures
      const { data: wsData } = await supabase
        .from("waterfall_structures")
        .select("*, waterfall_tiers(*)")
        .eq("entity_id", entityId)

      if (wsData && wsData.length > 0) {
        setWaterfallStructures(
          wsData.map((ws: any) => ({
            ...ws,
            tiers: (ws.waterfall_tiers || []).sort(
              (a: WaterfallTier, b: WaterfallTier) => a.tier_order - b.tier_order
            ),
          })) as WaterfallStructure[]
        )
      }

      // Load distribution history
      const { data: distData } = await supabase
        .from("distributions")
        .select("*")
        .eq("entity_id", entityId)
        .order("distribution_date", { ascending: false })
      if (distData) setDistributions(distData as Distribution[])

      setLoading(false)
    }
    loadData()
  }, [entityId])

  const handleApproveDistribution = async (
    result: WaterfallCalculationResult,
    structureId: string,
    amount: number
  ) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from("distributions")
      .insert({
        entity_id: entityId,
        waterfall_structure_id: structureId,
        total_amount: amount,
        distribution_date: new Date().toISOString().slice(0, 10),
        status: "approved",
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
        results: result.results,
      })
      .select()
      .single()

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
      return
    }

    if (data) {
      setDistributions((prev) => [data as Distribution, ...prev])
      toast({
        title: "Distribution approved",
        description: `${formatCurrency(amount, { decimals: 2 })} distribution created.`,
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

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
          onClick={() => router.push("/accounting/entities")}
        >
          Entities
        </button>
        <ChevronRight className="h-3 w-3" />
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => router.push(`/accounting/entities/${entityId}`)}
        >
          {entityName || "Entity"}
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Distributions</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Distributions</h1>
          <p className="text-sm text-muted-foreground">
            {entityName} - Calculate and manage distribution waterfalls
          </p>
        </div>
        {investors.length > 0 && (
          <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <Plus className="h-4 w-4" />
            New Distribution
          </Button>
        )}
      </div>

      {/* Waterfall Calculator */}
      {investors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calculator className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No investors</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add investors to this entity before calculating distributions.
            </p>
            <Button onClick={() => router.push(`/accounting/entities/${entityId}/investors`)}>
              Manage Investors
            </Button>
          </CardContent>
        </Card>
      ) : (
        <WaterfallCalculatorUI
          entityId={entityId}
          investors={investors}
          waterfallStructures={waterfallStructures}
          onApproveDistribution={handleApproveDistribution}
        />
      )}

      {/* Distribution History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Distribution History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {distributions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No distributions recorded.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((dist) => (
                    <tr key={dist.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2">{formatDate(dist.distribution_date)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold">
                        {formatCurrency(dist.total_amount, { decimals: 2 })}
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            dist.status === "draft" && "bg-gray-100 text-gray-600 hover:bg-gray-100",
                            dist.status === "approved" && "bg-blue-100 text-blue-800 hover:bg-blue-100",
                            dist.status === "distributed" && "bg-green-100 text-green-800 hover:bg-green-100"
                          )}
                        >
                          {dist.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {dist.approved_at ? formatDate(dist.approved_at, { includeTime: true }) : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
