"use client"

import { useState, useMemo } from "react"
import {
  ChevronDown,
  ChevronRight,
  Building2,
  Printer,
  Download,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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

interface EntityReportData {
  entityId: string
  entityName: string
  lineItems: ReportLineItem[]
  subtotals: Record<string, number>
}

interface ReportLineItem {
  accountNumber: string
  accountName: string
  section: string // e.g. "Assets", "Liabilities"
  balance: number
  isSubtotal?: boolean
}

interface EliminationEntry {
  description: string
  debitEntity: string
  creditEntity: string
  amount: number
}

interface ConsolidatedReportProps {
  entities: Entity[]
  reportData: {
    entityData: EntityReportData[]
    eliminations: EliminationEntry[]
    consolidatedTotals: Record<string, number>
  }
  reportType: string
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConsolidatedReport({
  entities,
  reportData,
  reportType,
  className,
}: ConsolidatedReportProps) {
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(
    () => new Set(entities.map((e) => e.id))
  )
  const [selectedReportType, setSelectedReportType] = useState(reportType)
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(
    () => new Set(entities.map((e) => e.id))
  )

  const reportTypeLabels: Record<string, string> = {
    balance_sheet: "Consolidated Balance Sheet",
    income_statement: "Consolidated Income Statement",
    trial_balance: "Consolidated Trial Balance",
    cash_flow: "Consolidated Cash Flow Statement",
  }

  // Filter data to selected entities
  const filteredEntityData = useMemo(
    () =>
      reportData.entityData.filter((ed) =>
        selectedEntityIds.has(ed.entityId)
      ),
    [reportData.entityData, selectedEntityIds]
  )

  // Get unique sections from data
  const sections = useMemo(() => {
    const sectionSet = new Set<string>()
    filteredEntityData.forEach((ed) => {
      ed.lineItems.forEach((li) => sectionSet.add(li.section))
    })
    return Array.from(sectionSet)
  }, [filteredEntityData])

  // Toggle entity selection
  const toggleEntity = (id: string) => {
    setSelectedEntityIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Toggle entity expansion
  const toggleExpand = (id: string) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className={cn("space-y-6 print:space-y-4", className)}>
      {/* Controls (hidden on print) */}
      <div className="flex flex-wrap items-start gap-6 print:hidden">
        {/* Entity Selector */}
        <Card className="flex-1 min-w-[250px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Entity Hierarchy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {entities.map((entity) => (
              <div key={entity.id} className="flex items-center gap-2">
                <Checkbox
                  id={`entity-${entity.id}`}
                  checked={selectedEntityIds.has(entity.id)}
                  onCheckedChange={() => toggleEntity(entity.id)}
                />
                <Label
                  htmlFor={`entity-${entity.id}`}
                  className="text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {entity.name}
                  {entity.parent_entity_id && (
                    <span className="text-xs text-muted-foreground">(sub)</span>
                  )}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Report Type + Actions */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">Report Type</Label>
            <Select
              value={selectedReportType}
              onValueChange={setSelectedReportType}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                <SelectItem value="income_statement">
                  Income Statement
                </SelectItem>
                <SelectItem value="trial_balance">Trial Balance</SelectItem>
                <SelectItem value="cash_flow">
                  Cash Flow Statement
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Report Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold">
          {reportTypeLabels[selectedReportType] || "Consolidated Report"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {filteredEntityData.length} entit
          {filteredEntityData.length !== 1 ? "ies" : "y"} included
        </p>
      </div>

      <Separator />

      {/* Per-entity sections */}
      {filteredEntityData.map((entityData) => {
        const isExpanded = expandedEntities.has(entityData.entityId)

        return (
          <Card key={entityData.entityId}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleExpand(entityData.entityId)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {entityData.entityName}
                </CardTitle>
                <div className="flex items-center gap-4">
                  {Object.entries(entityData.subtotals).map(([key, val]) => (
                    <div key={key} className="text-right">
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm font-mono tabular-nums font-medium">
                        {formatCurrency(val, { decimals: 0 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                {sections.map((section) => {
                  const sectionItems = entityData.lineItems.filter(
                    (li) => li.section === section
                  )
                  if (sectionItems.length === 0) return null

                  return (
                    <div key={section} className="mb-4">
                      <h4 className="text-sm font-semibold border-b border-border pb-1 mb-2">
                        {section}
                      </h4>
                      {sectionItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center justify-between text-sm py-0.5",
                            item.isSubtotal
                              ? "font-semibold border-t mt-1 pt-1"
                              : "pl-4"
                          )}
                        >
                          <span
                            className={cn(
                              !item.isSubtotal && "text-muted-foreground"
                            )}
                          >
                            {item.accountNumber
                              ? `${item.accountNumber} - `
                              : ""}
                            {item.accountName}
                          </span>
                          <span
                            className={cn(
                              "font-mono tabular-nums",
                              item.balance < 0 && "text-red-600"
                            )}
                          >
                            {formatCurrency(item.balance, { decimals: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Elimination Entries */}
      {reportData.eliminations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Elimination Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Debit Entity</TableHead>
                    <TableHead>Credit Entity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.eliminations.map((elim, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{elim.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {elim.debitEntity}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {elim.creditEntity}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(elim.amount, { decimals: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consolidated Totals */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-base">Consolidated Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(reportData.consolidatedTotals).map(
              ([key, value]) => (
                <div key={key} className="rounded-md bg-muted/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p
                    className={cn(
                      "text-xl font-bold tabular-nums mt-1",
                      value < 0 && "text-red-600"
                    )}
                  >
                    {formatCurrency(value, { decimals: 0 })}
                  </p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
