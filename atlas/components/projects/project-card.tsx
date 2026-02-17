"use client"

import { useRouter } from "next/navigation"
import {
  Calendar,
  MapPin,
  Building2,
  Hash,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  type Project,
  getProjectTypeLabel,
  getProjectStatusLabel,
  getStatusColor,
  getTypeColor,
  getBudgetHealthColor,
} from "@/lib/hooks/use-projects"

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter()

  const budgetPct =
    project.total_budget > 0
      ? Math.min((project.current_spend / project.total_budget) * 100, 100)
      : 0

  const overBudget = project.current_spend > project.total_budget
  const budgetBarColor = getBudgetHealthColor(project.current_spend, project.total_budget)

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <CardContent className="p-5">
        {/* Top row: number + badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hash className="h-3 w-3" />
            <span className="font-mono">{project.project_number}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1.5 py-0", getTypeColor(project.type))}
            >
              {getProjectTypeLabel(project.type)}
            </Badge>
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1.5 py-0", getStatusColor(project.status))}
            >
              {getProjectStatusLabel(project.status)}
            </Badge>
          </div>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-1">
          {project.name}
        </h3>

        {/* Address */}
        {project.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {project.address}
              {project.city ? `, ${project.city}` : ""}
              {project.state ? `, ${project.state}` : ""}
            </span>
          </div>
        )}

        {/* Entity */}
        {project.owner_entity_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{project.owner_entity_name}</span>
          </div>
        )}

        {/* Budget progress */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Budget</span>
            <span className={cn("font-medium", overBudget && "text-red-600 dark:text-red-400")}>
              {formatCurrency(project.current_spend, { compact: true })} / {formatCurrency(project.total_budget, { compact: true })}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", budgetBarColor)}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{formatPercent(budgetPct, 0)} used</span>
            {overBudget && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {formatCurrency(project.current_spend - project.total_budget, { compact: true })} over
              </span>
            )}
          </div>
        </div>

        {/* Key dates */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground border-t border-border pt-3">
          {project.acquisition_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Acquired {formatDate(project.acquisition_date, { short: true })}</span>
            </div>
          )}
          {project.projected_completion_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Due {formatDate(project.projected_completion_date, { short: true })}</span>
            </div>
          )}
          {!project.acquisition_date && !project.projected_completion_date && (
            <span className="italic">No dates set</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
