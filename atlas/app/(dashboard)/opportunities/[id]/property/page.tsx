"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils/format"
import { useOpportunityContext } from "../layout"
import {
  Building2,
  Home,
  Ruler,
  Droplets,
  Trees,
  Zap,
} from "lucide-react"

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
      {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm">{value || "\u2014"}</p>
      </div>
    </div>
  )
}

export default function OpportunityPropertyPage() {
  const { opportunity, loading } = useOpportunityContext()

  if (loading || !opportunity) {
    return <Skeleton className="h-64" />
  }

  return (
    <div className="space-y-6">
      {/* Scattered Lot Details */}
      {opportunity.type === "scattered_lot" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scattered Lot Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow
                label="Zoning"
                icon={<Building2 className="h-4 w-4" />}
                value={(opportunity as any).zoning ?? opportunity.zoning_current}
              />
              <InfoRow
                label="Build Type"
                icon={<Home className="h-4 w-4" />}
                value={opportunity.build_type}
              />
              <InfoRow
                label="Road Type"
                value={(opportunity as any).road_type ?? opportunity.road_surrounding}
              />
              <InfoRow
                label="Survey Status"
                value={
                  (opportunity as any).survey_status ??
                  (opportunity.survey_complete ? "Complete" : "Pending")
                }
              />
              <InfoRow label="Garage Position" value={opportunity.garage_position} />
              <InfoRow
                label="Setbacks"
                icon={<Ruler className="h-4 w-4" />}
                value={
                  [
                    (opportunity as any).setback_front != null
                      ? `F: ${(opportunity as any).setback_front}\u2032`
                      : null,
                    (opportunity as any).setback_rear != null
                      ? `R: ${(opportunity as any).setback_rear}\u2032`
                      : null,
                    (opportunity as any).setback_left != null
                      ? `L: ${(opportunity as any).setback_left}\u2032`
                      : null,
                    (opportunity as any).setback_right != null
                      ? `R: ${(opportunity as any).setback_right}\u2032`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" | ") || null
                }
              />
              <InfoRow
                label="Lot Dimensions"
                value={
                  [
                    opportunity.lot_width ? `${opportunity.lot_width}\u2032 W` : null,
                    opportunity.lot_depth ? `${opportunity.lot_depth}\u2032 D` : null,
                    opportunity.lot_sqft
                      ? `${opportunity.lot_sqft.toLocaleString()} SF`
                      : null,
                    (opportunity as any).lot_acreage ?? opportunity.total_acreage
                      ? `${(opportunity as any).lot_acreage ?? opportunity.total_acreage} AC`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" | ") || null
                }
              />
              <InfoRow
                label="Floor Plan"
                value={
                  opportunity.floor_plan
                    ? `${opportunity.floor_plan.name} (${(
                        (opportunity.floor_plan as any).sqft ??
                        opportunity.floor_plan.square_footage
                      ).toLocaleString()} SF)`
                    : null
                }
              />
            </div>

            <Separator className="my-4" />
            <div className="flex flex-wrap gap-3">
              {[
                {
                  icon: Droplets,
                  label: "Water",
                  active: (opportunity as any).has_water ?? opportunity.water_available,
                  color: "text-blue-500",
                },
                {
                  icon: Trees,
                  label: "Sewer",
                  active: (opportunity as any).has_sewer ?? opportunity.sewer_available,
                  color: "text-green-500",
                },
                {
                  icon: Zap,
                  label: "Electric",
                  active: (opportunity as any).has_electric ?? opportunity.electric_available,
                  color: "text-yellow-500",
                },
              ].map((u) => (
                <div key={u.label} className="flex items-center gap-1.5">
                  <u.icon
                    className={cn("h-4 w-4", u.active ? u.color : "text-muted-foreground/30")}
                  />
                  <span
                    className={cn(
                      "text-sm",
                      u.active ? "text-foreground" : "text-muted-foreground/50 line-through"
                    )}
                  >
                    {u.label}
                  </span>
                </div>
              ))}
              {((opportunity as any).historic_overlay ?? opportunity.historic_district) && (
                <Badge variant="outline" className="text-xs">
                  Historic Overlay
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lot Development Details */}
      {opportunity.type === "lot_development" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lot Development Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow
                label="Total Acreage"
                value={
                  opportunity.total_acreage
                    ? `${opportunity.total_acreage} AC`
                    : null
                }
              />
              <InfoRow
                label="Estimated Lots"
                value={(opportunity as any).estimated_lots ?? opportunity.estimated_total_lots}
              />
              <InfoRow
                label="Rezoning Required"
                value={opportunity.zoning_required ? "Yes" : "No"}
              />
              <InfoRow
                label="Preliminary Plat Status"
                value={opportunity.preliminary_plat_status}
              />
              <InfoRow
                label="Infrastructure Estimate"
                value={
                  ((opportunity as any).infrastructure_estimate ?? opportunity.infrastructure_scope_estimate)
                    ? formatCurrency(
                        (opportunity as any).infrastructure_estimate ??
                          opportunity.infrastructure_scope_estimate
                      )
                    : null
                }
              />
              <InfoRow label="Target Builders" value={opportunity.target_builders} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Community Development Details */}
      {opportunity.type === "community_development" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Community Development Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow
                label="Total Acreage"
                value={opportunity.total_acreage ? `${opportunity.total_acreage} AC` : null}
              />
              <InfoRow
                label="Estimated Lots"
                value={(opportunity as any).estimated_lots ?? opportunity.estimated_total_lots}
              />
              <InfoRow label="Target Builders" value={opportunity.target_builders} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show message if no type-specific details */}
      {!["scattered_lot", "lot_development", "community_development"].includes(
        opportunity.type
      ) && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No additional property details for this opportunity type.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
