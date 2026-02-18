"use client"

import { useParams } from "next/navigation"
import { ProjectDispositionTab } from "@/components/projects/project-disposition-tab"
import { useProjectContext } from "../layout"

// ---------------------------------------------------------------------------
// Sales / Disposition Page
// ---------------------------------------------------------------------------

export default function ProjectSalesPage() {
  const params = useParams()
  const projectId = params.id as string
  const { project } = useProjectContext()

  if (!project) return null

  return (
    <ProjectDispositionTab
      projectId={projectId}
      projectType={project.type}
      budgetTotal={project.budget_total}
    />
  )
}
