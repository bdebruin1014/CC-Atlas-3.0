"use client"

import { useParams, useRouter } from "next/navigation"
import { ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// ---------------------------------------------------------------------------
// Workflows Page — Links to the full workflow sub-module
// ---------------------------------------------------------------------------

export default function ProjectWorkflowsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <ClipboardList className="h-10 w-10 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Workflow</h3>
        <p className="text-sm text-muted-foreground">
          View and manage project milestones and workflow tasks.
        </p>
        <Button onClick={() => router.push(`/projects/${projectId}/workflow`)}>
          Open Workflow
        </Button>
      </CardContent>
    </Card>
  )
}
