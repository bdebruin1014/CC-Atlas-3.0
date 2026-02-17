"use client"

import { useState, useMemo } from "react"
import { Calculator, ChevronRight, DollarSign, Users, TrendingUp } from "lucide-react"
import { cn, formatCurrency, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  Investor,
  WaterfallStructure,
  DistributionResult,
} from "@/lib/types/accounting"
import {
  calculateWaterfall,
  type WaterfallCalculationResult,
  type WaterfallStep,
} from "@/lib/utils/waterfall-calculator"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WaterfallCalculatorProps {
  entityId: string
  investors: Investor[]
  waterfallStructures: WaterfallStructure[]
  onApproveDistribution?: (result: WaterfallCalculationResult, structureId: string, amount: number) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WaterfallCalculatorUI({
  entityId,
  investors,
  waterfallStructures,
  onApproveDistribution,
  className,
}: WaterfallCalculatorProps) {
  const [selectedStructureId, setSelectedStructureId] = useState<string>(
    waterfallStructures.length > 0 ? waterfallStructures[0].id : ""
  )
  const [distributableAmount, setDistributableAmount] = useState<string>("")
  const [calculationResult, setCalculationResult] = useState<WaterfallCalculationResult | null>(null)
  const [hasCalculated, setHasCalculated] = useState(false)

  const selectedStructure = useMemo(
    () => waterfallStructures.find((ws) => ws.id === selectedStructureId),
    [waterfallStructures, selectedStructureId]
  )

  const handleCalculate = () => {
    const amount = parseFloat(distributableAmount)
    if (isNaN(amount) || amount <= 0 || !selectedStructure) return

    const result = calculateWaterfall(amount, investors, selectedStructure)
    setCalculationResult(result)
    setHasCalculated(true)
  }

  const handleApprove = () => {
    if (calculationResult && onApproveDistribution && selectedStructureId) {
      onApproveDistribution(
        calculationResult,
        selectedStructureId,
        parseFloat(distributableAmount)
      )
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5" />
            Waterfall Distribution Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {waterfallStructures.length > 1 && (
            <div className="space-y-2">
              <Label>Waterfall Structure</Label>
              <Select value={selectedStructureId} onValueChange={setSelectedStructureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select structure..." />
                </SelectTrigger>
                <SelectContent>
                  {waterfallStructures.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedStructure && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Structure Type</p>
              <Badge variant="outline">
                {selectedStructure.waterfall_type === "simple_preferred_promote"
                  ? "Simple Preferred + Promote"
                  : "Multi-Tier IRR"}
              </Badge>
              <div className="mt-2 space-y-1">
                {selectedStructure.tiers
                  .sort((a, b) => a.tier_order - b.tier_order)
                  .map((tier) => (
                    <p key={tier.id} className="text-xs text-muted-foreground">
                      {tier.tier_order}. {tier.name}
                      {tier.preferred_return_rate
                        ? ` - ${formatPercent(tier.preferred_return_rate)} Preferred`
                        : ` - ${tier.investor_split_percent}/${tier.manager_split_percent} Split`}
                    </p>
                  ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dist-amount">Total Distributable Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="dist-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={distributableAmount}
                onChange={(e) => {
                  setDistributableAmount(e.target.value)
                  setHasCalculated(false)
                }}
                className="pl-9"
              />
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={
              !distributableAmount ||
              parseFloat(distributableAmount) <= 0 ||
              !selectedStructure ||
              investors.length === 0
            }
            className="w-full"
          >
            <Calculator className="h-4 w-4" />
            Calculate Distribution
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {hasCalculated && calculationResult && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Total Distributed
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(calculationResult.total_distributed, { decimals: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  To Investors
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculationResult.total_to_investors, { decimals: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  To Manager (Promote)
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculationResult.total_to_manager, { decimals: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Step-by-Step Waterfall */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Waterfall Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {calculationResult.steps.map((step, idx) => (
                <WaterfallStepRow
                  key={idx}
                  step={step}
                  stepNumber={idx + 1}
                  isLast={idx === calculationResult.steps.length - 1}
                  totalAmount={parseFloat(distributableAmount)}
                />
              ))}
            </CardContent>
          </Card>

          {/* Per-Investor Allocation Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Per-Investor Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Investor
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Ownership %
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Preferred
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Promote Share
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Total Distribution
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculationResult.results.map((result) => (
                      <tr key={result.investor_id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-medium">
                          {result.investor_name}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatPercent(result.ownership_percent)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(result.preferred_amount, { decimals: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(result.promote_share, { decimals: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(result.total_distribution, { decimals: 2 })}
                        </td>
                      </tr>
                    ))}
                    {/* Totals */}
                    <tr className="border-t-2 bg-muted/30 font-semibold">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">
                        {formatPercent(
                          calculationResult.results.reduce((s, r) => s + r.ownership_percent, 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(
                          calculationResult.results.reduce((s, r) => s + r.preferred_amount, 0),
                          { decimals: 2 }
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(
                          calculationResult.results.reduce((s, r) => s + r.promote_share, 0),
                          { decimals: 2 }
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(calculationResult.total_to_investors, { decimals: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Approve Distribution */}
          {onApproveDistribution && (
            <div className="flex justify-end">
              <Button onClick={handleApprove} size="lg">
                Approve Distribution
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: Waterfall Step Row
// ---------------------------------------------------------------------------

function WaterfallStepRow({
  step,
  stepNumber,
  isLast,
  totalAmount,
}: {
  step: WaterfallStep
  stepNumber: number
  isLast: boolean
  totalAmount: number
}) {
  const percentage = totalAmount > 0 ? (step.amount / totalAmount) * 100 : 0

  return (
    <div className={cn("py-4", !isLast && "border-b border-border")}>
      <div className="flex items-start gap-4">
        {/* Step number circle */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {stepNumber}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm">{step.name}</h4>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{step.description}</span>
          </div>

          {/* Amount bar */}
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Amount: {formatCurrency(step.amount, { decimals: 2 })}
              </span>
              <span className="text-muted-foreground">
                {formatPercent(percentage)} of total
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-6 text-xs">
              <span className="text-green-600">
                Investors: {formatCurrency(step.investor_total, { decimals: 2 })}
              </span>
              {step.manager_total > 0 && (
                <span className="text-blue-600">
                  Manager: {formatCurrency(step.manager_total, { decimals: 2 })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
