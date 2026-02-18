"use client"

import { useRouter } from "next/navigation"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Hammer,
  ExternalLink,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getProjectTypeLabel } from "@/lib/hooks/use-projects"
import { useProjectContext } from "./layout"

// ---------------------------------------------------------------------------
// Overview / Basic Info (default sub-route)
// ---------------------------------------------------------------------------

export default function ProjectOverviewPage() {
  const router = useRouter()
  const { project, linkedJobs, projectId } = useProjectContext()

  if (!project) return null

  const variance = (project.budget_total ?? 0) - (project.actual_total_cost ?? 0)
  const varianceIsPositive = variance >= 0

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Total Budget
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(project.budget_total)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Current Spend
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(project.actual_total_cost)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Projected Final
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(project.actual_total_cost)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {varianceIsPositive ? (
                <TrendingDown className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingUp className="h-4 w-4 text-red-600" />
              )}
              Variance
            </div>
            <div
              className={cn(
                "text-2xl font-bold",
                varianceIsPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {varianceIsPositive ? "+" : ""}
              {formatCurrency(variance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Address</dt>
                <dd className="font-medium">
                  {project.address_street
                    ? `${project.address_street}${project.address_city ? `, ${project.address_city}` : ""}${project.address_state ? `, ${project.address_state}` : ""} ${project.address_zip ?? ""}`
                    : "\u2014"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium">{getProjectTypeLabel(project.type)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Owner Entity</dt>
                <dd className="font-medium">{project.owner_entity_name ?? "\u2014"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Builder Entity</dt>
                <dd className="font-medium">{project.builder_entity_name ?? "\u2014"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contract Signed</dt>
                <dd className="font-medium">
                  {project.contract_signed_date
                    ? formatDate(project.contract_signed_date)
                    : "\u2014"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contract Amount</dt>
                <dd className="font-medium">
                  {project.contract_amount != null
                    ? formatCurrency(project.contract_amount)
                    : "\u2014"}
                </dd>
              </div>
              {project.lot_width != null && (
                <div>
                  <dt className="text-muted-foreground">Lot Dimensions</dt>
                  <dd className="font-medium">
                    {project.lot_width}&apos; x {project.lot_depth}&apos;
                  </dd>
                </div>
              )}
              {project.total_acreage != null && (
                <div>
                  <dt className="text-muted-foreground">Acreage</dt>
                  <dd className="font-medium">{project.total_acreage} acres</dd>
                </div>
              )}
              {project.total_lots != null && (
                <div>
                  <dt className="text-muted-foreground">Total Lots</dt>
                  <dd className="font-medium">{project.total_lots}</dd>
                </div>
              )}
              {project.source_opportunity_id && (
                <div>
                  <dt className="text-muted-foreground">Source Opportunity</dt>
                  <dd>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-sm font-medium"
                      onClick={() =>
                        router.push(`/opportunities/${project.source_opportunity_id}`)
                      }
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      View Opportunity
                    </Button>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Acquisition</dt>
                <dd className="font-medium">{formatDate(project.acquisition_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Permit Issued</dt>
                <dd className="font-medium">{formatDate(project.permit_approved_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Construction Start</dt>
                <dd className="font-medium">{formatDate(project.construction_start_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Projected Completion</dt>
                <dd className="font-medium">{formatDate(project.projected_completion_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">CO Date</dt>
                <dd className="font-medium">{formatDate(project.co_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sale Date</dt>
                <dd className="font-medium">{formatDate(project.sale_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Warranty Expiration</dt>
                <dd className="font-medium">{formatDate(project.warranty_end_date)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Linked jobs */}
      {linkedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {linkedJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/construction/jobs/${job.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Hammer className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{job.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {job.job_number}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {job.status}
                    </Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
