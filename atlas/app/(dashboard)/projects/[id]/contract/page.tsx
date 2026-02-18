"use client"

import { useRouter } from "next/navigation"
import { FileText, ExternalLink } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useProjectContext } from "../layout"

// ---------------------------------------------------------------------------
// Acquisition / Contract Details
// ---------------------------------------------------------------------------

export default function ProjectContractPage() {
  const router = useRouter()
  const { project } = useProjectContext()

  if (!project) return null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acquisition Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Purchase Price</dt>
              <dd className="text-lg font-bold">
                {project.budget_land_acquisition != null
                  ? formatCurrency(project.budget_land_acquisition)
                  : "\u2014"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Acquisition Date</dt>
              <dd className="text-lg font-bold">
                {formatDate(project.acquisition_date)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {project.source_opportunity_id ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Opportunity</CardTitle>
            <CardDescription>
              This project was converted from an opportunity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/opportunities/${project.source_opportunity_id}`)
              }
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View Opportunity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 text-sm font-semibold">
              No linked opportunity
            </h3>
            <p className="text-xs text-muted-foreground">
              This project was not converted from an opportunity.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
