"use client"

import { useParams } from "next/navigation"
import { RecordTasksPanel } from "@/components/shared/record-tasks-panel"
import { useProjectContext } from "../layout"

// ---------------------------------------------------------------------------
// Tasks Page
// ---------------------------------------------------------------------------

export default function ProjectTasksPage() {
  const params = useParams()
  const projectId = params.id as string
  const { project } = useProjectContext()

  return (
    <RecordTasksPanel
      recordType="project"
      recordId={projectId}
      recordName={project?.name ?? "Project"}
      recordUrl={`/projects/${projectId}`}
    />
  )
}
