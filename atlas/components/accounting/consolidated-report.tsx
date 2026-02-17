"use client"

import { useState, useMemo } from "react"
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Building2,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Entity } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ConsolidatedReportProps {
  entities: Entity[]
  reportData: any
  reportType: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const REPORT_TYPE_LABELS: Record<string, string> = {
  balance_sheet: "Balance Sheet",
  income_statement: "Income Statement",
  cash_flow: "Cash Flow Statement",
  trial_balance: "Trial Balance",
}

const PERIOD_OPTIONS = [
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "year", label: "Annual" },
]

function getReportSections(
  reportType: string,
  entityData: any
): { label: string; items: any[]; total: number }[] {
  if (!entityData) return []

  switch (reportType) {
    case "balance_sheet":
      return [
        {
          label: "Assets",
          items: entityData.assets ?? [],
          total: entityData.total_assets ?? 0,
        },
        {
          label: "Liabilities",
          items: entityData.liabilities ?? [],
          total: entityData.total_liabilities ?? 0,
        },
        {
          label: "Equity",
          items: entityData.equity ?? [],
          total: entityData.total_equity ?? 0,
        },
      ]
    case "income_statement":
      return [
        {
          label: "Revenue",
          items: entityData.revenue ?? [],
          total: entityData.total_revenue ?? 0,
        },
        {
          label: "Cost of Sales",
          items: entityData.cost_of_sales ?? [],
          total: entityData.total_cost_of_sales ?? 0,
        },
        {
          label: "Operating Expenses",
          items: entityData.operating_expenses ?? [],
          total: entityData.total_operating_expenses ?? 0,
        },
      ]
    case "cash_flow":
      return [
        {
          label: "Operating Activities",
          items: entityData.operating ?? [],
          total: entityData.total_operating ?? 0,
        },
        {
          label: "Investing Activities",
          items: entityData.investing ?? [],
          total: entityData.total_investing ?? 0,
        },
        {
          label: "Financing Activities",
          items: entityData.financing ?? [],
          total: entityData.total_financing ?? 0,
        },
      ]
    default:
      return []
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SectionTable({
  sections,
}: {
  sections: { label: string; items: any[]; total: number }[]
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sections.map((section) => (
          <SectionRows key={section.label} section={section} />
        ))}
      </TableBody>
    </Table>
  )
}

function SectionRows({
  section,
}: {
  section: { label: string; items: any[]; total: number }
}) {
  return (
    <>
      {/* Section header */}
      <TableRow className="bg-muted/30">
        <TableCell colSpan={2} className="font-semibold text-sm">
          {section.label}
        </TableCell>
      </TableRow>

      {/* Section items */}
      {section.items.map((item: any, idx: number) => (
        <TableRow key={`${section.label}-${item.account_number ?? idx}`}>
          <TableCell className="pl-6">
            <div className="flex items-center gap-2">
              {item.account_number && (
                <span className="text-xs text-muted-foreground font-mono">
                  {item.account_number}
                </span>
              )}
              <span className="text-sm">
                {item.account_name ?? item.name ?? "—"}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums">
            {formatCurrency(item.balance ?? 0, { decimals: 2 })}
          </TableCell>
        </TableRow>
      ))}

      {/* Section total */}
      <TableRow className="border-t">
        <TableCell className="pl-6 font-semibold text-sm">
          Total {section.label}
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums font-semibold">
          {formatCurrency(section.total, { decimals: 2 })}
        </TableCell>
      </TableRow>
    </>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ConsolidatedReport({
  entities,
  reportData,
  reportType,
}: ConsolidatedReportProps) {
  const [expandedEntityIds, setExpandedEntityIds] = useState<Set<string>>(
    new Set()
  )
  const [selectedPeriod, setSelectedPeriod] = useState("month")

  const toggleEntity = (entityId: string) => {
    setExpandedEntityIds((prev) => {
      const next = new Set(prev)
      if (next.has(entityId)) {
        next.delete(entityId)
      } else {
        next.add(entityId)
      }
      return next
    })
  }

  // Get entity-level data from reportData
  const entityReports = useMemo(() => {
    if (!reportData?.entities) return []
    return entities.map((entity) => ({
      entity,
      data: reportData.entities?.[entity.id] ?? null,
    }))
  }, [entities, reportData])

  // Eliminations
  const eliminationsSections = useMemo(() => {
    return getReportSections(reportType, reportData?.eliminations)
  }, [reportType, reportData])

  // Grand totals for different report types
  const grandTotal = useMemo(() => {
    if (!reportData?.consolidated) return null
    const c = reportData.consolidated
    switch (reportType) {
      case "balance_sheet":
        return {
          label: "Total Assets / Liabilities + Equity",
          value: c.total_assets ?? 0,
          balanced: c.is_balanced ?? true,
        }
      case "income_statement":
        return {
          label: "Net Income",
          value: c.net_income ?? 0,
          balanced: null,
        }
      case "cash_flow":
        return {
          label: "Net Change in Cash",
          value: c.net_change ?? 0,
          balanced: null,
        }
      default:
        return null
    }
  }, [reportType, reportData])

  return (
    <div className="space-y-6">
      {/* Header with selectors */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            Consolidated{" "}
            {REPORT_TYPE_LABELS[reportType] ?? reportType}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Entity sections */}
      {entityReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Building2 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No entities to display</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entityReports.map(({ entity, data }) => {
            const expanded = expandedEntityIds.has(entity.id)
            const sections = getReportSections(reportType, data)

            // Compute entity subtotal
            let entitySubtotal = 0
            if (data) {
              switch (reportType) {
                case "balance_sheet":
                  entitySubtotal = data.total_assets ?? 0
                  break
                case "income_statement":
                  entitySubtotal = data.net_income ?? 0
                  break
                case "cash_flow":
                  entitySubtotal = data.net_change ?? 0
                  break
              }
            }

            return (
              <Card key={entity.id}>
                <CardHeader
                  className="cursor-pointer py-3"
                  onClick={() => toggleEntity(entity.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-base flex items-center gap-2">
                        {entity.name}
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          {entity.use_type.replace(/_/g, " ")}
                        </Badge>
                      </CardTitle>
                    </div>
                    <span className="font-bold tabular-nums font-mono">
                      {formatCurrency(entitySubtotal, { decimals: 2 })}
                    </span>
                  </div>
                </CardHeader>

                {expanded && (
                  <CardContent className="pt-0">
                    {sections.length > 0 ? (
                      <div className="overflow-x-auto rounded-md border border-border">
                        <SectionTable sections={sections} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No report data available for this entity.
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Eliminations section */}
      {eliminationsSections.length > 0 &&
        eliminationsSections.some((s) => s.items.length > 0) && (
          <Card className="border-dashed">
            <CardHeader className="py-3">
              <CardTitle className="text-base text-muted-foreground">
                Intercompany Eliminations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-border">
                <SectionTable sections={eliminationsSections} />
              </div>
            </CardContent>
          </Card>
        )}

      {/* Consolidated Total Row */}
      {grandTotal && (
        <>
          <Separator />
          <Card className="bg-muted/30 border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold">
                    {grandTotal.label}
                  </span>
                  {grandTotal.balanced === false && (
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-red-800 text-[10px]"
                    >
                      Out of Balance
                    </Badge>
                  )}
                  {grandTotal.balanced === true && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 text-[10px]"
                    >
                      Balanced
                    </Badge>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xl font-bold tabular-nums font-mono",
                    reportType === "income_statement" &&
                      grandTotal.value >= 0 &&
                      "text-green-600",
                    reportType === "income_statement" &&
                      grandTotal.value < 0 &&
                      "text-red-600"
                  )}
                >
                  {formatCurrency(grandTotal.value, { decimals: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
