"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Pencil,
  Hammer,
  RefreshCw,
  Building2,
  CheckSquare,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  useProject,
  useUpdateProject,
  PROJECT_STATUS_PIPELINE,
  PROJECT_STATUSES,
  getProjectTypeLabel,
  getProjectStatusLabel,
  getStatusColor,
  getTypeColor,
  type ProjectStatus,
  type Project,
  type LinkedJob,
} from "@/lib/hooks/use-projects"
import { ProjectForm } from "@/components/projects/project-form"
import { LaunchJobDialog } from "@/components/projects/launch-job-dialog"

// ---------------------------------------------------------------------------
// Context for sharing project data across sub-routes
// ---------------------------------------------------------------------------

export const ProjectContext = React.createContext<{
  project: Project | null
  loading: boolean
  error: Error | null
  refetch: () => void
  linkedJobs: LinkedJob[]
  projectId: string
}>({
  project: null,
  loading: true,
  error: null,
  refetch: () => {},
  linkedJobs: [],
  projectId: "",
})

export function useProjectContext() {
  return React.useContext(ProjectContext)
}

// ---------------------------------------------------------------------------
// Detail Skeleton
// ---------------------------------------------------------------------------

function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-16" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status Pipeline
// ---------------------------------------------------------------------------

function StatusPipeline({ currentStatus }: { currentStatus: ProjectStatus }) {
  const currentIdx = PROJECT_STATUS_PIPELINE.indexOf(currentStatus)

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {PROJECT_STATUS_PIPELINE.map((status, idx) => {
        const isPast = idx < currentIdx
        const isCurrent = idx === currentIdx
        const label = getProjectStatusLabel(status)

        return (
          <div key={status} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isPast
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {isPast && <CheckSquare className="mr-1 h-3 w-3" />}
              {label}
            </div>
            {idx < PROJECT_STATUS_PIPELINE.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-4 rounded",
                  idx < currentIdx ? "bg-green-500" : "bg-muted"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function ProjectDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const { data: project, isLoading, error, refetch } = useProject(projectId)
  const updateMutation = useUpdateProject()

  // Fetch linked jobs inline
  const [linkedJobs, setLinkedJobs] = useState<LinkedJob[]>([])
  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient()
      supabase
        .from("jobs")
        .select("id, job_number, name, status, client_type")
        .eq("linked_project_id", projectId)
        .then(({ data }) => {
          setLinkedJobs(
            ((data ?? []) as unknown as { id: string; job_number: string; name: string; status: string; client_type: string }[]).map(
              (j) => ({ id: j.id, job_number: j.job_number, name: j.name, status: j.status, type: j.client_type })
            )
          )
        })
    })
  }, [projectId])

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showLaunchJobDialog, setShowLaunchJobDialog] = useState(false)
  const [newStatus, setNewStatus] = useState<ProjectStatus | "">("")

  if (isLoading) return <ProjectDetailSkeleton />

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

  const handleStatusChange = async () => {
    if (!newStatus) return
    try {
      await updateMutation.mutateAsync({ id: projectId, status: newStatus })
      setShowStatusDialog(false)
      setNewStatus("")
    } catch {
      // handled by mutation
    }
  }

  const handleEditSubmit = async (data: Record<string, unknown>) => {
    try {
      await updateMutation.mutateAsync({ id: projectId, ...data } as { id: string } & Partial<Project>)
      setShowEditDialog(false)
    } catch {
      // handled by mutation
    }
  }

  return (
    <ProjectContext.Provider
      value={{
        project,
        loading: isLoading,
        error: error ?? null,
        refetch,
        linkedJobs,
        projectId,
      }}
    >
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/projects")}
              className="mt-1"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm text-muted-foreground">
                  {project.project_number}
                </span>
                <Badge
                  variant="secondary"
                  className={cn("text-xs", getTypeColor(project.type))}
                >
                  {getProjectTypeLabel(project.type)}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn("text-xs", getStatusColor(project.status))}
                >
                  {getProjectStatusLabel(project.status)}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              {project.owner_entity_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {project.owner_entity_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            {(project.status === "pre_construction" || project.status === "active") && (
              <Button
                size="sm"
                className="bg-[#1a5632] hover:bg-[#1a5632]/90 text-white"
                onClick={() => setShowLaunchJobDialog(true)}
              >
                <Hammer className="mr-1.5 h-3.5 w-3.5" />
                Launch Construction Job
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewStatus(project.status)
                setShowStatusDialog(true)
              }}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Change Status
            </Button>
          </div>
        </div>

        {/* Status pipeline */}
        <StatusPipeline currentStatus={project.status} />

        {/* Sub-route content */}
        {children}

        {/* Change Status Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Change Project Status</DialogTitle>
              <DialogDescription>
                Update the current status of this project.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select
                value={newStatus}
                onValueChange={(val) => setNewStatus(val as ProjectStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStatusChange}
                disabled={!newStatus || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update project details.
              </DialogDescription>
            </DialogHeader>
            <ProjectForm
              mode="edit"
              defaultValues={project}
              onSubmit={handleEditSubmit as never}
              onCancel={() => setShowEditDialog(false)}
              submitting={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Launch Job Dialog */}
        <LaunchJobDialog
          project={project}
          open={showLaunchJobDialog}
          onOpenChange={setShowLaunchJobDialog}
        />
      </div>
    </ProjectContext.Provider>
  )
}
