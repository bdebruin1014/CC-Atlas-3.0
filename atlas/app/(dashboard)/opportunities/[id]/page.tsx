"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { CompsTable } from "@/components/opportunities/comps-table"
import { useOpportunityContext } from "./layout"
import { useParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MapPin,
  Calendar,
  DollarSign,
  Building2,
  FileText,
  Ruler,
  Droplets,
  Trees,
  Zap,
  Home,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && (
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm">{value || "\u2014"}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page — Basic Info (default sub-route)
// ---------------------------------------------------------------------------

export default function OpportunityBasicInfoPage() {
  const { id } = useParams()
  const { opportunity, loading } = useOpportunityContext()

  if (loading || !opportunity) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Core Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Core Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow
              label="Address"
              icon={<MapPin className="h-4 w-4" />}
              value={
                [
                  (opportunity as any).address_line1 ??
                    opportunity.address_street,
                  opportunity.address_city,
                  opportunity.address_state,
                  opportunity.address_zip,
                ]
                  .filter(Boolean)
                  .join(", ") || "\u2014"
              }
            />
            <InfoRow label="County" value={opportunity.address_county} />
            <InfoRow
              label="Parcel / TMS"
              icon={<FileText className="h-4 w-4" />}
              value={
                (opportunity as any).parcel_tms ??
                opportunity.parcel_tms_number
              }
            />
            <InfoRow label="Type" value={opportunity.type} />
            <InfoRow label="Source" value={opportunity.source} />
            <InfoRow
              label="Created"
              icon={<Calendar className="h-4 w-4" />}
              value={formatDate(opportunity.created_at)}
            />
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow
              label="Projected Purchase Price"
              icon={<DollarSign className="h-4 w-4" />}
              value={
                opportunity.projected_purchase_price
                  ? formatCurrency(opportunity.projected_purchase_price)
                  : "\u2014"
              }
            />
            <InfoRow
              label="Projected Sale Price"
              icon={<DollarSign className="h-4 w-4" />}
              value={
                opportunity.projected_sale_price
                  ? formatCurrency(opportunity.projected_sale_price)
                  : "\u2014"
              }
            />
            <InfoRow
              label="Projected ARV"
              icon={<DollarSign className="h-4 w-4" />}
              value={
                (opportunity as any).projected_arv
                  ? formatCurrency((opportunity as any).projected_arv)
                  : "\u2014"
              }
            />
            {opportunity.projected_purchase_price &&
              opportunity.projected_sale_price && (
                <div className="mt-3 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Estimated Gross Margin
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrency(
                      opportunity.projected_sale_price -
                        opportunity.projected_purchase_price
                    )}
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Key Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            {[
              {
                label: "Offer Date",
                value:
                  (opportunity as any).date_offer ??
                  opportunity.date_identified,
              },
              {
                label: "Contract Date",
                value:
                  (opportunity as any).date_contract ??
                  opportunity.date_under_contract,
              },
              {
                label: "DD Expiration",
                value:
                  (opportunity as any).date_dd_expiration ??
                  opportunity.due_diligence_deadline,
              },
              {
                label: "Closing Date",
                value:
                  (opportunity as any).date_closing ??
                  opportunity.projected_close_date,
              },
            ].map((d) => (
              <div
                key={d.label}
                className={cn(
                  "rounded-lg border border-border p-3 text-center min-w-[140px]",
                  d.value ? "border-border" : "border-dashed"
                )}
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {d.label}
                </p>
                <p className="mt-1 text-sm font-medium">
                  {d.value ? formatDate(d.value) : "\u2014"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
