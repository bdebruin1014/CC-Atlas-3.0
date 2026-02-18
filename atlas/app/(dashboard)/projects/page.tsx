"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  FolderKanban,
  LayoutGrid,
  List,
  X,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDebounce } from "@/lib/hooks/use-debounce"
import {
  useProjects,
  useEntities,
  PROJECT_TYPES,
  PROJECT_STATUSES,
  getProjectTypeLabel,
  getProjectStatusLabel,
  getStatusColor,
  getTypeColor,
  getBudgetHealthColor,
  type ProjectFilters,
  type ProjectType,
  type ProjectStatus,
} from "@/lib/hooks/use-projects"
import { ProjectCard } from "@/components/projects/project-card"

// ---------------------------------------------------------------------------
// Loading skeletons
// ---------------------------------------------------------------------------

function ProjectCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <Skeleton className="h-3 w-1/2 mt-3" />
      </CardContent>
    </Card>
  )
}

function ProjectGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  )
}

function ProjectTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-32 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState("")
  const [typeFilter, setTypeFilter] = useState<ProjectType | "all">("all")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  const debouncedSearch = useDebounce(searchInput, 300)
  const { entities } = useEntities()

  const filters: ProjectFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      entity: entityFilter !== "all" ? entityFilter : undefined,
    }),
    [debouncedSearch, typeFilter, statusFilter, entityFilter]
  )

  const { data: projects = [], isLoading, error, refetch } = useProjects(filters)

  const hasActiveFilters =
    searchInput !== "" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    entityFilter !== "all"

  const handleClearFilters = () => {
    setSearchInput("")
    setTypeFilter("all")
    setStatusFilter("all")
    setEntityFilter("all")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage construction projects across all entities
          </p>
        </div>
        <Button onClick={() => router.push("/projects/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects by name, number, or address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={(val) => setTypeFilter(val as ProjectType | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PROJECT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val as ProjectStatus | "all")}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={entityFilter}
          onValueChange={(val) => setEntityFilter(val)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entities.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear filters
          </Button>
        )}

        {/* View toggle */}
        <div className="ml-auto flex items-center border border-border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-none h-8"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-none h-8"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="text-sm text-destructive">{error.message}</div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (viewMode === "grid" ? <ProjectGridSkeleton /> : <ProjectTableSkeleton />)}

      {/* Empty State */}
      {!isLoading && !error && projects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">No projects found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Try adjusting your filters or search terms."
                : "Get started by creating your first project."}
            </p>
            {!hasActiveFilters && (
              <Button onClick={() => router.push("/projects/new")}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid View */}
      {!isLoading && !error && projects.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Table View */}
      {!isLoading && !error && projects.length > 0 && viewMode === "table" && (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project #</TableHead>
                <TableHead>Name / Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="w-[140px]">Spent</TableHead>
                <TableHead>Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                const budgetPct =
                  (project.budget_total ?? 0) > 0
                    ? ((project.actual_total_cost ?? 0) / (project.budget_total ?? 1)) * 100
                    : 0
                const barColor = getBudgetHealthColor(
                  project.actual_total_cost ?? 0,
                  project.budget_total ?? 0
                )

                return (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <TableCell className="font-mono text-xs">
                      {project.project_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{project.name}</div>
                        {project.address_street && (
                          <div className="text-xs text-muted-foreground">
                            {project.address_street}
                            {project.address_city ? `, ${project.address_city}` : ""}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px]", getTypeColor(project.type))}
                      >
                        {getProjectTypeLabel(project.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px]", getStatusColor(project.status))}
                      >
                        {getProjectStatusLabel(project.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {project.owner_entity_name ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatCurrency(project.budget_total, { compact: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", barColor)}
                            style={{
                              width: `${Math.min(budgetPct, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">
                          {formatPercent(budgetPct, 0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {project.projected_completion_date
                        ? formatDate(project.projected_completion_date, { short: true })
                        : "\u2014"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
