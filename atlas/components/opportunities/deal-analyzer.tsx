'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn, formatCurrency, formatPercent, formatDate } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import {
  calculateDealAnalysis,
  DEFAULT_ORG_DEFAULTS,
  type DealAnalysisInputs,
  type DealAnalysisResults,
} from '@/lib/utils/deal-analyzer'
import {
  UPGRADE_PACKAGES,
  type FloorPlan,
  type Municipality,
  type OrgDefaults,
  type UpgradePackage,
  type DealAnalysis,
} from '@/lib/types/opportunities'
import {
  Save,
  History,
  FileDown,
  Loader2,
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react'
import { toast } from '@/lib/hooks/use-toast'

// ---------------------------------------------------------------------------
// Schema for the form inputs
// ---------------------------------------------------------------------------

const dealInputSchema = z.object({
  floor_plan_id: z.string().optional().default(''),
  upgrade_package: z.enum(['standard', 'classic', 'elegance', 'harmony']),
  municipality_id: z.string().optional().default(''),
  purchase_price: z.coerce.number().min(0).default(0),
  site_work_estimate: z.coerce.number().min(0).default(0),
  other_site_costs: z.coerce.number().min(0).default(0),
  site_specific_adjustments: z.coerce.number().min(0).default(0),
  asset_sales_price: z.coerce.number().min(0).default(0),
  selling_concessions: z.coerce.number().min(0).default(0),
  project_duration_days: z.coerce.number().optional(),
  interest_rate_override: z.coerce.number().optional(),
})

type DealInputForm = z.infer<typeof dealInputSchema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DealAnalyzerProps {
  opportunityId: string
  initialData?: {
    purchasePrice?: number
    salesPrice?: number
    floorPlanId?: string
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ResultRow({
  label,
  value,
  sublabel,
  bold,
  large,
  negative,
}: {
  label: string
  value: string
  sublabel?: string
  bold?: boolean
  large?: boolean
  negative?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-1.5',
        bold && 'font-semibold',
        large && 'py-2 text-lg font-bold'
      )}
    >
      <div>
        <span className={cn(large && 'text-base')}>{label}</span>
        {sublabel && (
          <span className="ml-2 text-xs text-muted-foreground">
            ({sublabel})
          </span>
        )}
      </div>
      <span
        className={cn(
          'tabular-nums',
          negative && 'text-destructive',
          large && 'text-lg'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-2">
      {icon}
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DealAnalyzer({ opportunityId, initialData }: DealAnalyzerProps) {
  // Reference data
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([])
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [orgDefaults, setOrgDefaults] = useState<OrgDefaults>(DEFAULT_ORG_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<DealAnalysis[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Form
  const form = useForm<DealInputForm>({
    resolver: zodResolver(dealInputSchema),
    defaultValues: {
      floor_plan_id: initialData?.floorPlanId || '',
      upgrade_package: 'standard',
      municipality_id: '',
      purchase_price: initialData?.purchasePrice || 0,
      site_work_estimate: 0,
      other_site_costs: 0,
      site_specific_adjustments: 0,
      asset_sales_price: initialData?.salesPrice || 0,
      selling_concessions: 0,
      project_duration_days: undefined,
      interest_rate_override: undefined,
    },
  })

  const watchedValues = form.watch()

  // Fetch reference data
  useEffect(() => {
    const supabase = createClient()

    async function fetchData() {
      setLoading(true)
      const [plansRes, muniRes, orgRes] = await Promise.all([
        supabase
          .from('floor_plans')
          .select('*')
          .order('name'),
        supabase
          .from('municipalities')
          .select('*')
          .order('name'),
        supabase
          .from('organizations')
          .select(
            'default_interest_rate, default_cost_of_capital, default_project_duration_days, default_ltc_ratio, default_selling_cost_rate, default_warranty_reserve, default_builders_risk, default_utility_charges'
          )
          .limit(1)
          .single(),
      ])

      if (plansRes.data) setFloorPlans(plansRes.data as FloorPlan[])
      if (muniRes.data) setMunicipalities(muniRes.data as Municipality[])
      if (orgRes.data) {
        setOrgDefaults({
          default_interest_rate: orgRes.data.default_interest_rate ?? DEFAULT_ORG_DEFAULTS.default_interest_rate,
          default_cost_of_capital: orgRes.data.default_cost_of_capital ?? DEFAULT_ORG_DEFAULTS.default_cost_of_capital,
          default_project_duration_days: orgRes.data.default_project_duration_days ?? DEFAULT_ORG_DEFAULTS.default_project_duration_days,
          default_ltc_ratio: orgRes.data.default_ltc_ratio ?? DEFAULT_ORG_DEFAULTS.default_ltc_ratio,
          default_selling_cost_rate: orgRes.data.default_selling_cost_rate ?? DEFAULT_ORG_DEFAULTS.default_selling_cost_rate,
          default_warranty_reserve: orgRes.data.default_warranty_reserve ?? DEFAULT_ORG_DEFAULTS.default_warranty_reserve,
          default_builders_risk: orgRes.data.default_builders_risk ?? DEFAULT_ORG_DEFAULTS.default_builders_risk,
          default_utility_charges: orgRes.data.default_utility_charges ?? DEFAULT_ORG_DEFAULTS.default_utility_charges,
        })
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  // Derive S&B cost from selected floor plan
  const selectedPlan = useMemo(
    () => floorPlans.find((fp) => fp.id === watchedValues.floor_plan_id),
    [floorPlans, watchedValues.floor_plan_id]
  )

  // Derive municipality soft costs
  const selectedMuni = useMemo(
    () =>
      municipalities.find((m) => m.id === watchedValues.municipality_id),
    [municipalities, watchedValues.municipality_id]
  )

  // Live calculation
  const results: DealAnalysisResults = useMemo(() => {
    const inputs: DealAnalysisInputs = {
      sticksAndBricks: selectedPlan?.base_cost ?? 0,
      upgradePackage: watchedValues.upgrade_package as UpgradePackage,
      municipalitySoftCosts: selectedMuni?.total_soft_costs ?? 0,
      purchasePrice: watchedValues.purchase_price || 0,
      siteWorkEstimate: watchedValues.site_work_estimate || 0,
      otherSiteCosts: watchedValues.other_site_costs || 0,
      siteSpecificAdjustments: watchedValues.site_specific_adjustments || 0,
      assetSalesPrice: watchedValues.asset_sales_price || 0,
      sellingConcessions: watchedValues.selling_concessions || 0,
      projectDurationDays: watchedValues.project_duration_days || null,
      interestRateOverride: watchedValues.interest_rate_override || null,
    }
    return calculateDealAnalysis(inputs, orgDefaults)
  }, [watchedValues, selectedPlan, selectedMuni, orgDefaults])

  // Save analysis
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('deal_analyses').insert({
        opportunity_id: opportunityId,
        floor_plan_id: watchedValues.floor_plan_id || null,
        upgrade_package: watchedValues.upgrade_package,
        municipality_id: watchedValues.municipality_id || null,
        purchase_price: watchedValues.purchase_price,
        site_work_estimate: watchedValues.site_work_estimate,
        other_site_costs: watchedValues.other_site_costs,
        site_specific_adjustments: watchedValues.site_specific_adjustments,
        asset_sales_price: watchedValues.asset_sales_price,
        selling_concessions: watchedValues.selling_concessions,
        project_duration_days: watchedValues.project_duration_days || null,
        interest_rate_override: watchedValues.interest_rate_override || null,
        sticks_and_bricks: results.sticksAndBricks,
        upgrade_cost: results.upgradeCost,
        lot_preparation: results.lotPreparation,
        municipality_soft_costs: results.municipalitySoftCosts,
        builder_fee: results.builderFee,
        contingency: results.contingency,
        total_contract_cost: results.totalContractCost,
        warranty_reserve: results.warrantyReserve,
        builders_risk_insurance: results.buildersRiskInsurance,
        closing_costs: results.closingCosts,
        utility_charges: results.utilityCharges,
        total_project_cost: results.totalProjectCost,
        loan_amount: results.loanAmount,
        equity_required: results.equityRequired,
        interest_on_loan: results.interestOnLoan,
        cost_of_capital: results.costOfCapitalOnEquity,
        total_carry_costs: results.totalCarryCosts,
        total_all_in_cost: results.totalAllInCost,
        total_revenue: results.totalRevenue,
        total_selling_costs: results.totalSellingCosts,
        net_sales_proceeds: results.netSalesProceeds,
        net_profit: results.netProfit,
        net_profit_margin: results.netProfitMargin,
        verdict: results.verdictLabel,
      })
      if (error) throw error
      toast({
        title: 'Analysis Saved',
        description: 'Deal analysis has been saved successfully.',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save the deal analysis.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }, [opportunityId, watchedValues, results])

  // Load history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    setHistoryOpen(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('deal_analyses')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setHistory((data as DealAnalysis[]) ?? [])
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load analysis history.',
        variant: 'destructive',
      })
    } finally {
      setLoadingHistory(false)
    }
  }, [opportunityId])

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ================================================================ */}
        {/* LEFT COLUMN — Inputs                                             */}
        {/* ================================================================ */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Deal Inputs
              </CardTitle>
              <CardDescription>
                Adjust values to see the live deal analysis on the right.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Floor Plan Selection */}
              <div className="space-y-1.5">
                <Label>Floor Plan</Label>
                <Controller
                  control={form.control}
                  name="floor_plan_id"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a floor plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {floorPlans.map((fp) => (
                          <SelectItem key={fp.id} value={fp.id}>
                            {fp.name} - {(fp.square_footage ?? 0).toLocaleString()} SF -{' '}
                            {formatCurrency(fp.base_cost)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {selectedPlan && (
                  <p className="text-xs text-muted-foreground">
                    S&B Cost: {formatCurrency(selectedPlan.base_cost)} |{' '}
                    {(selectedPlan.square_footage ?? 0).toLocaleString()} SF
                    {selectedPlan.bedrooms
                      ? ` | ${selectedPlan.bedrooms}BR`
                      : ''}
                    {selectedPlan.bathrooms
                      ? ` / ${selectedPlan.bathrooms}BA`
                      : ''}
                  </p>
                )}
              </div>

              {/* Upgrade Package */}
              <div className="space-y-2">
                <Label>Upgrade Package</Label>
                <Controller
                  control={form.control}
                  name="upgrade_package"
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                    >
                      {(
                        Object.entries(UPGRADE_PACKAGES) as [
                          UpgradePackage,
                          { label: string; cost: number },
                        ][]
                      ).map(([key, pkg]) => (
                        <div key={key}>
                          <RadioGroupItem
                            value={key}
                            id={`upgrade-${key}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`upgrade-${key}`}
                            className={cn(
                              'flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-border p-3 text-center transition-all hover:border-primary/50',
                              field.value === key &&
                                'border-primary bg-primary/5'
                            )}
                          >
                            <span className="text-sm font-medium">
                              {pkg.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {pkg.cost === 0
                                ? 'Included'
                                : `+${formatCurrency(pkg.cost)}`}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                />
              </div>

              {/* Municipality */}
              <div className="space-y-1.5">
                <Label>Municipality</Label>
                <Controller
                  control={form.control}
                  name="municipality_id"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select municipality" />
                      </SelectTrigger>
                      <SelectContent>
                        {municipalities.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}{' '}
                            {m.county ? `(${m.county})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {selectedMuni && (
                  <p className="text-xs text-muted-foreground">
                    Total Soft Costs:{' '}
                    {formatCurrency(selectedMuni.total_soft_costs)} (Permit:{' '}
                    {formatCurrency(selectedMuni.permit_fee)} | Impact:{' '}
                    {formatCurrency(selectedMuni.impact_fee)} | Water Tap:{' '}
                    {formatCurrency(selectedMuni.water_tap_fee)} | Sewer Tap:{' '}
                    {formatCurrency(selectedMuni.sewer_tap_fee)})
                  </p>
                )}
              </div>

              <Separator />

              {/* Currency Inputs */}
              <div className="space-y-1.5">
                <Label htmlFor="purchase_price">Purchase Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="purchase_price"
                    type="number"
                    className="pl-9"
                    {...form.register('purchase_price')}
                    placeholder="65,000"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="site_work_estimate">
                  Site Work / Grading Estimate
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="site_work_estimate"
                    type="number"
                    className="pl-9"
                    {...form.register('site_work_estimate')}
                    placeholder="15,000"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="other_site_costs">
                  Other Site-Specific Costs
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="other_site_costs"
                    type="number"
                    className="pl-9"
                    {...form.register('other_site_costs')}
                    placeholder="5,000"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="site_specific_adjustments">
                  Site-Specific Vertical Adjustments
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="site_specific_adjustments"
                    type="number"
                    className="pl-9"
                    {...form.register('site_specific_adjustments')}
                    placeholder="0"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="asset_sales_price">
                  Asset Sales Price / ARV
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="asset_sales_price"
                    type="number"
                    className="pl-9"
                    {...form.register('asset_sales_price')}
                    placeholder="350,000"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="selling_concessions">
                  Selling Concessions
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="selling_concessions"
                    type="number"
                    className="pl-9"
                    {...form.register('selling_concessions')}
                    placeholder="0"
                  />
                </div>
              </div>

              <Separator />

              {/* Overrides */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="project_duration_days">
                    Project Duration Override
                  </Label>
                  <Input
                    id="project_duration_days"
                    type="number"
                    {...form.register('project_duration_days')}
                    placeholder={`Default: ${orgDefaults.default_project_duration_days} days`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interest_rate_override">
                    Interest Rate Override (%)
                  </Label>
                  <Input
                    id="interest_rate_override"
                    type="number"
                    step="0.1"
                    {...form.register('interest_rate_override')}
                    placeholder={`Default: ${orgDefaults.default_interest_rate}%`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN — Live Results                                      */}
        {/* ================================================================ */}
        <div className="space-y-6">
          {/* Section 1: Cost Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cost Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <ResultRow
                label="Sticks & Bricks"
                value={formatCurrency(results.sticksAndBricks)}
              />
              <ResultRow
                label="Upgrades"
                value={formatCurrency(results.upgradeCost)}
                sublabel={
                  UPGRADE_PACKAGES[
                    watchedValues.upgrade_package as UpgradePackage
                  ]?.label
                }
              />
              <ResultRow
                label="Lot Preparation"
                value={formatCurrency(results.lotPreparation)}
              />
              <ResultRow
                label="Site-Specific Adjustments"
                value={formatCurrency(results.siteSpecificAdjustments)}
              />
              <ResultRow
                label="Municipality Soft Costs"
                value={formatCurrency(results.municipalitySoftCosts)}
              />
              <ResultRow
                label="Builder Fee"
                value={formatCurrency(results.builderFee)}
                sublabel={`MAX($25K, 10%) - ${results.builderFeeLabel}`}
              />
              <ResultRow
                label="Contingency"
                value={formatCurrency(results.contingency)}
                sublabel={`MAX($10K, 5%) - ${results.contingencyLabel}`}
              />
              <Separator className="my-2" />
              <ResultRow
                label="Total Contract Cost"
                value={formatCurrency(results.totalContractCost)}
                bold
              />
            </CardContent>
          </Card>

          {/* Section 2: Fixed Per-House Costs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Fixed Per-House Costs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <ResultRow
                label="Warranty Reserve"
                value={formatCurrency(results.warrantyReserve)}
              />
              <ResultRow
                label="Builder's Risk Insurance"
                value={formatCurrency(results.buildersRiskInsurance)}
              />
              <ResultRow
                label="Closing Costs"
                value={formatCurrency(results.closingCosts)}
                sublabel="5% of purchase price"
              />
              <ResultRow
                label="Utility Charges"
                value={formatCurrency(results.utilityCharges)}
              />
            </CardContent>
          </Card>

          {/* Section 3: Total Project Cost */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Total Project Cost
              </CardTitle>
              <CardDescription>
                Purchase price + contract cost + fixed costs (excludes carry)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResultRow
                label="Total Project Cost"
                value={formatCurrency(results.totalProjectCost)}
                bold
                large
              />
            </CardContent>
          </Card>

          {/* Section 4: Financing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Financing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <ResultRow
                label={`Loan Amount (${orgDefaults.default_ltc_ratio}% LTC)`}
                value={formatCurrency(results.loanAmount)}
              />
              <ResultRow
                label="Equity Required"
                value={formatCurrency(results.equityRequired)}
              />
              <ResultRow
                label="Interest on Loan"
                value={formatCurrency(results.interestOnLoan)}
              />
              <ResultRow
                label="Cost of Capital on Equity"
                value={formatCurrency(results.costOfCapitalOnEquity)}
              />
              <Separator className="my-2" />
              <ResultRow
                label="Total Carry Costs"
                value={formatCurrency(results.totalCarryCosts)}
                bold
              />
            </CardContent>
          </Card>

          {/* Section 5: Deal Results */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Deal Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <ResultRow
                label="Total All-In Cost"
                value={formatCurrency(results.totalAllInCost)}
              />
              <ResultRow
                label="Total Revenue (ASP)"
                value={formatCurrency(results.totalRevenue)}
              />
              <ResultRow
                label="Total Selling Costs"
                value={formatCurrency(results.totalSellingCosts)}
                sublabel={`${orgDefaults.default_selling_cost_rate}% + concessions`}
              />
              <ResultRow
                label="Net Sales Proceeds"
                value={formatCurrency(results.netSalesProceeds)}
              />
              <Separator className="my-3" />
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {results.netProfit >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-lg font-bold">Net Profit</span>
                </div>
                <span
                  className={cn(
                    'text-xl font-bold tabular-nums',
                    results.netProfit >= 0
                      ? 'text-emerald-600'
                      : 'text-destructive'
                  )}
                >
                  {formatCurrency(results.netProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-lg font-bold">Net Profit Margin</span>
                <span
                  className={cn(
                    'text-xl font-bold tabular-nums',
                    results.netProfitMargin >= 10
                      ? 'text-emerald-600'
                      : results.netProfitMargin >= 7
                      ? 'text-blue-600'
                      : results.netProfitMargin >= 5
                      ? 'text-amber-600'
                      : 'text-destructive'
                  )}
                >
                  {formatPercent(results.netProfitMargin)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Verdict */}
          <div
            className="rounded-xl p-6 text-center"
            style={{
              backgroundColor: `${results.verdictColor}15`,
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: `${results.verdictColor}40`,
            }}
          >
            <p
              className="text-3xl font-black tracking-wide"
              style={{ color: results.verdictColor }}
            >
              {results.verdictLabel}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Net Profit Margin: {formatPercent(results.netProfitMargin)} | Net
              Profit: {formatCurrency(results.netProfit)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Analysis
            </Button>
            <Button variant="outline" onClick={loadHistory}>
              <History className="mr-2 h-4 w-4" />
              Compare Previous
            </Button>
            <Button variant="outline" disabled>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* History Dialog                                                      */}
      {/* ================================================================== */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Analysis History</DialogTitle>
            <DialogDescription>
              Previously saved deal analyses for this opportunity.
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No previous analyses found.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">ASP</th>
                    <th className="pb-2 pr-4">All-In Cost</th>
                    <th className="pb-2 pr-4">Net Profit</th>
                    <th className="pb-2 pr-4">Margin</th>
                    <th className="pb-2">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-border transition-colors hover:bg-muted/50"
                    >
                      <td className="py-2.5 pr-4 text-xs">
                        {formatDate(h.created_at, { short: true })}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {formatCurrency(h.total_revenue)}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {formatCurrency(h.total_all_in_cost)}
                      </td>
                      <td
                        className={cn(
                          'py-2.5 pr-4 font-medium tabular-nums',
                          h.net_profit >= 0
                            ? 'text-emerald-600'
                            : 'text-destructive'
                        )}
                      >
                        {formatCurrency(h.net_profit)}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {formatPercent(h.net_profit_margin)}
                      </td>
                      <td className="py-2.5 text-xs font-semibold">
                        {h.verdict}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
