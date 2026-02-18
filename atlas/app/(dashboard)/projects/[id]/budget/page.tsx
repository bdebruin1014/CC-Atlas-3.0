"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useProject } from "@/lib/hooks/use-projects"
import { BudgetTracker } from "@/components/projects/budget-tracker"
import { DrawSchedule } from "@/components/projects/draw-schedule"
import { LotTable } from "@/components/projects/lot-table"

export default function ProjectBudgetPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const { data: project, isLoading, error } = useProject(projectId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold">Project not found</h2>
        <p className="text-sm text-muted-foreground">
          {error?.message ?? "The project could not be loaded."}
        </p>
        <Button variant="outline" onClick={() => router.push("/projects")}>
          Back to Projects
        </Button>
      </div>
    )
  }

  const showDrawSchedule =
    project.type === "scattered_lot" ||
    project.type === "lot_purchase" ||
    project.type === "other"

  const showLotTable =
    project.type === "lot_development" || project.type === "community_development"

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
          <h1 className="text-xl font-bold tracking-tight">Budget & Actuals</h1>
          <p className="text-sm text-muted-foreground">
            {project.project_number} &mdash; {project.name}
          </p>
        </div>
      </div>

      {/* Budget Tracker */}
      <BudgetTracker
        projectId={projectId}
        totalBudget={project.budget_total ?? 0}
        currentSpend={project.actual_total_cost ?? 0}
        committedAmount={project.contract_amount ?? 0}
        projectedFinal={project.actual_total_cost ?? 0}
      />

      {/* Draw Schedule */}
      {showDrawSchedule && project.contract_amount != null && (
        <>
          <Separator />
          <DrawSchedule
            projectId={projectId}
            contractAmount={project.contract_amount}
          />
        </>
      )}

      {/* Lot Table for development projects */}
      {showLotTable && (
        <>
          <Separator />
          <LotTable projectId={projectId} />
        </>
      )}
    </div>
  )
}
