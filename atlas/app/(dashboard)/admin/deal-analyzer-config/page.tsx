"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calculator,
  Loader2,
  Save,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { useOrganizationId } from "@/lib/hooks/use-organization"

interface OrgConfig {
  id: string
  margin_strong_threshold: number | null
  margin_good_threshold: number | null
  margin_marginal_threshold: number | null
  default_ltc_ratio: number | null
  default_interest_rate: number | null
  default_construction_period_days: number | null
  default_cost_of_capital_rate: number | null
  default_selling_cost_pct: number | null
  default_contingency_pct: number | null
  default_retainage_pct: number | null
}

const DEFAULT_CONFIG: OrgConfig = {
  id: "",
  margin_strong_threshold: 10.0,
  margin_good_threshold: 7.0,
  margin_marginal_threshold: 5.0,
  default_ltc_ratio: 85.0,
  default_interest_rate: 12.0,
  default_construction_period_days: 120,
  default_cost_of_capital_rate: 16.0,
  default_selling_cost_pct: 8.5,
  default_contingency_pct: 5.0,
  default_retainage_pct: 10.0,
}

export default function DealAnalyzerConfigPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { organizationId, loading: orgLoading, error: orgError } = useOrganizationId()
  const [config, setConfig] = useState<OrgConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from("organizations")
        .select(
          "id, margin_strong_threshold, margin_good_threshold, margin_marginal_threshold, default_ltc_ratio, default_interest_rate, default_construction_period_days, default_cost_of_capital_rate, default_selling_cost_pct, default_contingency_pct, default_retainage_pct"
        )
        .eq("id", organizationId)
        .single()

      if (fetchError) throw fetchError
      if (data) {
        setConfig(data as OrgConfig)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load configuration")
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (!orgLoading && organizationId) {
      fetchConfig()
    } else if (!orgLoading && !organizationId) {
      setLoading(false)
      setError(orgError || "No organization found. Please contact your administrator.")
    }
  }, [orgLoading, organizationId, orgError, fetchConfig])

  const handleSave = async () => {
    if (!config.id) {
      toast({
        title: "Save failed",
        description: "No organization loaded. Cannot save configuration.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const updatePayload = {
        margin_strong_threshold: config.margin_strong_threshold ?? undefined,
        margin_good_threshold: config.margin_good_threshold ?? undefined,
        margin_marginal_threshold: config.margin_marginal_threshold ?? undefined,
        default_ltc_ratio: config.default_ltc_ratio ?? undefined,
        default_interest_rate: config.default_interest_rate ?? undefined,
        default_construction_period_days: config.default_construction_period_days ?? undefined,
        default_cost_of_capital_rate: config.default_cost_of_capital_rate ?? undefined,
        default_selling_cost_pct: config.default_selling_cost_pct ?? undefined,
        default_contingency_pct: config.default_contingency_pct ?? undefined,
        default_retainage_pct: config.default_retainage_pct ?? undefined,
      }
      const { error: updateError } = await supabase
        .from("organizations")
        .update(updatePayload)
        .eq("id", config.id)

      if (updateError) throw updateError

      toast({
        title: "Configuration saved",
        description: "Deal analyzer defaults have been updated successfully.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      toast({
        title: "Save failed",
        description: `Failed to save configuration: ${message}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const updateField = (key: keyof OrgConfig, value: string) => {
    const numValue = value === "" ? null : parseFloat(value)
    setConfig((prev) => ({ ...prev, [key]: numValue }))
  }

  const updateIntField = (key: keyof OrgConfig, value: string) => {
    const numValue = value === "" ? null : parseInt(value)
    setConfig((prev) => ({ ...prev, [key]: numValue }))
  }

  const getVerdict = (margin: number) => {
    const strong = config.margin_strong_threshold ?? 10
    const good = config.margin_good_threshold ?? 7
    const marginal = config.margin_marginal_threshold ?? 5

    if (margin >= strong) return { label: "Strong Deal", color: "text-green-700 bg-green-100", icon: TrendingUp }
    if (margin >= good) return { label: "Good Deal", color: "text-blue-700 bg-blue-100", icon: TrendingUp }
    if (margin >= marginal) return { label: "Marginal Deal", color: "text-amber-700 bg-amber-100", icon: Minus }
    return { label: "Below Threshold", color: "text-red-700 bg-red-100", icon: TrendingDown }
  }

  if (loading || orgLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Deal Analyzer Config</h1>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchConfig}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Deal Analyzer Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure default parameters for the deal analysis engine
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Margin Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Margin Thresholds
            </CardTitle>
            <CardDescription>
              Define the profit margin percentages that determine deal quality verdicts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Strong Deal Threshold (%)
                <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                  Strong
                </Badge>
              </Label>
              <Input
                type="number"
                step="0.01"
                value={config.margin_strong_threshold ?? ""}
                onChange={(e) => updateField("margin_strong_threshold", e.target.value)}
                placeholder="10.00"
              />
              <p className="text-xs text-muted-foreground">
                Margins at or above this value are rated as strong deals
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Good Deal Threshold (%)
                <Badge className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100">
                  Good
                </Badge>
              </Label>
              <Input
                type="number"
                step="0.01"
                value={config.margin_good_threshold ?? ""}
                onChange={(e) => updateField("margin_good_threshold", e.target.value)}
                placeholder="7.00"
              />
              <p className="text-xs text-muted-foreground">
                Margins between this and the strong threshold are rated as good deals
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Marginal Threshold (%)
                <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100">
                  Marginal
                </Badge>
              </Label>
              <Input
                type="number"
                step="0.01"
                value={config.margin_marginal_threshold ?? ""}
                onChange={(e) => updateField("margin_marginal_threshold", e.target.value)}
                placeholder="5.00"
              />
              <p className="text-xs text-muted-foreground">
                Margins below this value are flagged as below threshold
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Financing Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financing Defaults</CardTitle>
            <CardDescription>
              Default financing parameters used in deal analysis calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default LTC Ratio (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.default_ltc_ratio ?? ""}
                onChange={(e) => updateField("default_ltc_ratio", e.target.value)}
                placeholder="85.00"
              />
              <p className="text-xs text-muted-foreground">
                Loan-to-cost ratio for construction financing
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.default_interest_rate ?? ""}
                onChange={(e) => updateField("default_interest_rate", e.target.value)}
                placeholder="12.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Default Construction Period (days)</Label>
              <Input
                type="number"
                value={config.default_construction_period_days ?? ""}
                onChange={(e) =>
                  updateIntField("default_construction_period_days", e.target.value)
                }
                placeholder="120"
              />
            </div>

            <div className="space-y-2">
              <Label>Cost of Capital Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.default_cost_of_capital_rate ?? ""}
                onChange={(e) =>
                  updateField("default_cost_of_capital_rate", e.target.value)
                }
                placeholder="16.00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cost Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Defaults</CardTitle>
            <CardDescription>
              Default cost percentages applied in deal analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Selling Cost (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.default_selling_cost_pct ?? ""}
                onChange={(e) =>
                  updateField("default_selling_cost_pct", e.target.value)
                }
                placeholder="8.50"
              />
              <p className="text-xs text-muted-foreground">
                Includes agent commissions, closing costs, and marketing
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default Contingency (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.default_contingency_pct ?? ""}
                onChange={(e) =>
                  updateField("default_contingency_pct", e.target.value)
                }
                placeholder="5.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Default Retainage (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.default_retainage_pct ?? ""}
                onChange={(e) =>
                  updateField("default_retainage_pct", e.target.value)
                }
                placeholder="10.00"
              />
              <p className="text-xs text-muted-foreground">
                Percentage held back from vendor payments until completion
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Verdict Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verdict Preview</CardTitle>
            <CardDescription>
              How the current thresholds translate to deal verdicts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[15, 12, 10, 8, 7, 6, 5, 3, 0].map((margin) => {
                const verdict = getVerdict(margin)
                const VerdictIcon = verdict.icon
                return (
                  <div
                    key={margin}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-medium w-12 text-right">
                        {margin}%
                      </span>
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                      <span className="text-sm">Profit Margin</span>
                    </div>
                    <Badge className={cn("text-xs", verdict.color)}>
                      <VerdictIcon className="h-3 w-3 mr-1" />
                      {verdict.label}
                    </Badge>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800">
                    Threshold ranges
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Strong: {"\u2265"} {config.margin_strong_threshold ?? 10}% | Good:{" "}
                    {config.margin_good_threshold ?? 7}% -{" "}
                    {(config.margin_strong_threshold ?? 10) - 0.01}% | Marginal:{" "}
                    {config.margin_marginal_threshold ?? 5}% -{" "}
                    {(config.margin_good_threshold ?? 7) - 0.01}% | Below: {"<"}{" "}
                    {config.margin_marginal_threshold ?? 5}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
