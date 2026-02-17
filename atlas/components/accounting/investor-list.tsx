"use client"

import { useState, useMemo } from "react"
import {
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  Mail,
  Shield,
  FileText,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Investor, AccreditationStatus } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InvestorListProps {
  investors: Investor[]
  onAdd: () => void
  onEdit: (investor: Investor) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAccreditationBadgeClass(status: AccreditationStatus): string {
  switch (status) {
    case "accredited":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "qualified_purchaser":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100"
    case "non_accredited":
      return "bg-gray-100 text-gray-600 hover:bg-gray-100"
    case "pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

function getAccreditationLabel(status: AccreditationStatus): string {
  switch (status) {
    case "accredited":
      return "Accredited"
    case "qualified_purchaser":
      return "QP"
    case "non_accredited":
      return "Non-Accredited"
    case "pending":
      return "Pending"
    default:
      return status
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvestorList({
  investors,
  onAdd,
  onEdit,
  className,
}: InvestorListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<"name" | "ownership" | "committed">("ownership")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const sortedInvestors = useMemo(() => {
    return [...investors].sort((a, b) => {
      let cmp = 0
      if (sortField === "name") {
        cmp = a.contact_name.localeCompare(b.contact_name)
      } else if (sortField === "ownership") {
        cmp = a.ownership_percent - b.ownership_percent
      } else if (sortField === "committed") {
        cmp = a.capital_commitment - b.capital_commitment
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [investors, sortField, sortDir])

  const totals = useMemo(() => {
    return investors.reduce(
      (acc, inv) => ({
        ownership: acc.ownership + inv.ownership_percent,
        committed: acc.committed + inv.capital_commitment,
        contributed: acc.contributed + inv.capital_contributed,
        remaining: acc.remaining + inv.capital_remaining,
      }),
      { ownership: 0, committed: 0, contributed: 0, remaining: 0 }
    )
  }, [investors])

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 inline" />
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            Investors ({investors.length})
          </h3>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Investor
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-md bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Ownership</p>
          <p className="text-lg font-semibold">
            {formatPercent(totals.ownership)}
          </p>
        </div>
        <div className="rounded-md bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Committed</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatCurrency(totals.committed, { decimals: 0 })}
          </p>
        </div>
        <div className="rounded-md bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Contributed</p>
          <p className="text-lg font-semibold tabular-nums text-green-600">
            {formatCurrency(totals.contributed, { decimals: 0 })}
          </p>
        </div>
        <div className="rounded-md bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="text-lg font-semibold tabular-nums text-orange-600">
            {formatCurrency(totals.remaining, { decimals: 0 })}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        {investors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No investors found</p>
            <p className="text-xs mt-1">Add your first investor to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  Name <SortIcon field="name" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => handleSort("ownership")}
                >
                  Ownership % <SortIcon field="ownership" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => handleSort("committed")}
                >
                  Capital Committed <SortIcon field="committed" />
                </TableHead>
                <TableHead className="text-right">Contributed</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Pref Return</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px]">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvestors.map((investor) => {
                const isExpanded = expandedId === investor.id
                const contributionPercent =
                  investor.capital_commitment > 0
                    ? (investor.capital_contributed /
                        investor.capital_commitment) *
                      100
                    : 0

                return (
                  <>
                    <TableRow
                      key={investor.id}
                      className={cn(
                        "cursor-pointer",
                        isExpanded && "bg-muted/20",
                        investor.status === "inactive" && "opacity-50"
                      )}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : investor.id)
                      }
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {investor.contact_name}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatPercent(investor.ownership_percent)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(investor.capital_commitment, {
                          decimals: 0,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-green-600">
                        {formatCurrency(investor.capital_contributed, {
                          decimals: 0,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-orange-600">
                        {formatCurrency(investor.capital_remaining, {
                          decimals: 0,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatPercent(investor.preferred_return_rate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            investor.status === "active"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                          )}
                        >
                          {investor.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={contributionPercent}
                            className="h-2 flex-1"
                          />
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatPercent(contributionPercent, 0)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <TableRow key={`${investor.id}-detail`}>
                        <TableCell colSpan={9} className="bg-muted/10 p-0">
                          <div className="px-8 py-4 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-3">
                                {/* Contact info */}
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Contact Information
                                  </p>
                                  <div className="flex items-center gap-4 text-sm">
                                    {investor.contact_email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                        {investor.contact_email}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                      <Badge
                                        variant="secondary"
                                        className={cn(
                                          "text-[10px]",
                                          getAccreditationBadgeClass(
                                            investor.accreditation_status
                                          )
                                        )}
                                      >
                                        {getAccreditationLabel(
                                          investor.accreditation_status
                                        )}
                                      </Badge>
                                    </span>
                                    {investor.accreditation_verified_date && (
                                      <span className="text-xs text-muted-foreground">
                                        Verified:{" "}
                                        {formatDate(
                                          investor.accreditation_verified_date
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Documents */}
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Documents
                                  </p>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1">
                                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                      Subscription Agreement:{" "}
                                      {investor.subscription_agreement_url ? (
                                        <Badge
                                          variant="secondary"
                                          className="bg-green-100 text-green-800 text-[10px]"
                                        >
                                          On File
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="secondary"
                                          className="bg-red-100 text-red-800 text-[10px]"
                                        >
                                          Missing
                                        </Badge>
                                      )}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                      W-9:{" "}
                                      {investor.w9_url ? (
                                        <Badge
                                          variant="secondary"
                                          className="bg-green-100 text-green-800 text-[10px]"
                                        >
                                          On File
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="secondary"
                                          className="bg-red-100 text-red-800 text-[10px]"
                                        >
                                          Missing
                                        </Badge>
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {/* Promote structure */}
                                {investor.promote_structure && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      Promote Structure
                                    </p>
                                    <p className="text-sm">
                                      {investor.promote_structure}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEdit(investor)
                                }}
                              >
                                Edit Investor
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}

              {/* Totals row */}
              <TableRow className="border-t-2 bg-muted/30 font-semibold">
                <TableCell />
                <TableCell>Totals</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatPercent(totals.ownership)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(totals.committed, { decimals: 0 })}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-green-600">
                  {formatCurrency(totals.contributed, { decimals: 0 })}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-orange-600">
                  {formatCurrency(totals.remaining, { decimals: 0 })}
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
