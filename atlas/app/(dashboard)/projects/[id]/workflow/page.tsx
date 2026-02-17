"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProject } from "@/lib/hooks/use-projects"
import { WorkflowViewer } from "@/components/workflow/workflow-viewer"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function WorkflowSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-4 w-full max-w-md rounded-full" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProjectWorkflowPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const { data: project, isLoading: projectLoading } = useProject(projectId)

  if (projectLoading) return <WorkflowSkeleton />

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}`)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Project
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Workflow</h1>
          {project && (
            <p className="text-sm text-muted-foreground">
              {project.project_number} &mdash; {project.name}
            </p>
          )}
        </div>
      </div>

      {/* Workflow viewer using the workflow engine */}
      <WorkflowViewer recordType="project" recordId={projectId} />
    </div>
  )
}
