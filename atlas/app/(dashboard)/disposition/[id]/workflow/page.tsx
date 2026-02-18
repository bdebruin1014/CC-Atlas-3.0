"use client"

import { useParams } from "next/navigation"
import { WorkflowViewer } from "@/components/workflow/workflow-viewer"

export default function DispositionWorkflowPage() {
  const params = useParams()
  const listingId = params.id as string

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Workflow</h2>
        <p className="text-sm text-muted-foreground">
          Track milestones and tasks for this listing through the disposition
          lifecycle.
        </p>
      </div>
      <WorkflowViewer recordType="disposition" recordId={listingId} />
    </div>
  )
}
