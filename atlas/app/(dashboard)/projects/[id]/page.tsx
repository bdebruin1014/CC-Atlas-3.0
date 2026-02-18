"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Pencil,
  Hammer,
  RefreshCw,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Users,
  Activity,
  CheckSquare,
  ClipboardList,
  ExternalLink,
  Search,
  Plus,
  X,
  AlertTriangle,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useProject,
  useUpdateProject,
  useProjectContacts,
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
import { useContacts } from "@/lib/hooks/use-contacts"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { ProjectForm } from "@/components/projects/project-form"
import { RecordTasksPanel, useRecordTaskCount } from "@/components/shared/record-tasks-panel"
import { ProjectDispositionTab } from "@/components/projects/project-disposition-tab"
import { LaunchJobDialog } from "@/components/projects/launch-job-dialog"

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
// Contact Assignment Component
// ---------------------------------------------------------------------------

function ContactsTab({ projectId }: { projectId: string }) {
  const {
    contacts: projectContacts,
    loading,
    error,
    assignContact,
    removeContact,
    refetch,
  } = useProjectContacts(projectId)

  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [selectedContactId, setSelectedContactId] = useState("")
  const [role, setRole] = useState("")
  const [assigning, setAssigning] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 300)
  const { data: searchResults = [], isLoading: searching } = useContacts({
    search: debouncedSearch || undefined,
    status: "active",
  })

  const handleAssign = async () => {
    if (!selectedContactId || !role) return
    setAssigning(true)
    try {
      await assignContact(selectedContactId, role)
      setShowAssignDialog(false)
      setSearchInput("")
      setSelectedContactId("")
      setRole("")
    } catch {
      // error handled by mutation
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {projectContacts.length} contact{projectContacts.length !== 1 ? "s" : ""} assigned
        </h3>
        <Button size="sm" onClick={() => setShowAssignDialog(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Assign Contact
        </Button>
      </div>

      {projectContacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 text-sm font-semibold">No contacts assigned</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Assign contacts from the global directory to this project.
            </p>
            <Button size="sm" onClick={() => setShowAssignDialog(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Assign Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectContacts.map((pc) => (
                <TableRow key={pc.id}>
                  <TableCell className="font-medium">
                    {pc.first_name} {pc.last_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {pc.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pc.company ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pc.email ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pc.phone ?? "\u2014"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeContact(pc.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Assign Contact Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Contact</DialogTitle>
            <DialogDescription>
              Search the contact directory and assign a role on this project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Search Contact</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              {debouncedSearch && searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded border border-border">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                        selectedContactId === c.id && "bg-primary/10"
                      )}
                      onClick={() => setSelectedContactId(c.id)}
                    >
                      <span className="font-medium">
                        {c.first_name} {c.last_name}
                      </span>
                      {c.company && (
                        <span className="ml-2 text-muted-foreground">
                          {c.company}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {debouncedSearch && !searching && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground">No contacts found.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role on Project *</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. General Contractor, Architect, Lender"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedContactId || !role || assigning}
            >
              {assigning ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notes Tab
// ---------------------------------------------------------------------------

function NotesTab({ notes, onSave }: { notes: string | null; onSave: (notes: string) => void }) {
  const [value, setValue] = useState(notes ?? "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    onSave(value)
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <textarea
          className="w-full min-h-[200px] rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add notes about this project..."
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Notes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const { data: project, isLoading, error, refetch } = useProject(projectId)
  const updateMutation = useUpdateProject()
  const taskCount = useRecordTaskCount("project", projectId)

  // Fetch linked jobs inline
  const [linkedJobs, setLinkedJobs] = useState<LinkedJob[]>([])
  useEffect(() => {
    // fetch linked jobs on mount
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

  const variance = (project.budget_total ?? 0) - (project.actual_total_cost ?? 0)
  const varianceIsPositive = variance >= 0

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

  const handleNoteSave = async (notes: string) => {
    try {
      await updateMutation.mutateAsync({ id: projectId, ...({ notes } as Record<string, unknown>) } as { id: string } & Partial<Project>)
    } catch {
      // handled by mutation
    }
  }

  return (
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

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
          <TabsTrigger value="budget">Budget & Actuals</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="jobs">Linked Jobs</TabsTrigger>
          <TabsTrigger value="disposition">Disposition</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks{taskCount > 0 ? ` (${taskCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ---- Overview Tab ---- */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Total Budget
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(project.budget_total)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Current Spend
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(project.actual_total_cost)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Projected Final
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(project.actual_total_cost)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  {varianceIsPositive ? (
                    <TrendingDown className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  )}
                  Variance
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    varianceIsPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {varianceIsPositive ? "+" : ""}
                  {formatCurrency(variance)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Address</dt>
                    <dd className="font-medium">
                      {project.address_street
                        ? `${project.address_street}${project.address_city ? `, ${project.address_city}` : ""}${project.address_state ? `, ${project.address_state}` : ""} ${project.address_zip ?? ""}`
                        : "\u2014"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="font-medium">{getProjectTypeLabel(project.type)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Owner Entity</dt>
                    <dd className="font-medium">{project.owner_entity_name ?? "\u2014"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Builder Entity</dt>
                    <dd className="font-medium">{project.builder_entity_name ?? "\u2014"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Contract Signed</dt>
                    <dd className="font-medium">
                      {project.contract_signed_date
                        ? formatDate(project.contract_signed_date)
                        : "\u2014"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Contract Amount</dt>
                    <dd className="font-medium">
                      {project.contract_amount != null
                        ? formatCurrency(project.contract_amount)
                        : "\u2014"}
                    </dd>
                  </div>
                  {project.lot_width != null && (
                    <div>
                      <dt className="text-muted-foreground">Lot Dimensions</dt>
                      <dd className="font-medium">
                        {project.lot_width}&apos; x {project.lot_depth}&apos;
                      </dd>
                    </div>
                  )}
                  {project.total_acreage != null && (
                    <div>
                      <dt className="text-muted-foreground">Acreage</dt>
                      <dd className="font-medium">{project.total_acreage} acres</dd>
                    </div>
                  )}
                  {project.total_lots != null && (
                    <div>
                      <dt className="text-muted-foreground">Total Lots</dt>
                      <dd className="font-medium">{project.total_lots}</dd>
                    </div>
                  )}
                  {project.source_opportunity_id && (
                    <div>
                      <dt className="text-muted-foreground">Source Opportunity</dt>
                      <dd>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-sm font-medium"
                          onClick={() =>
                            router.push(`/opportunities/${project.source_opportunity_id}`)
                          }
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          View Opportunity
                        </Button>
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Dates</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Acquisition</dt>
                    <dd className="font-medium">{formatDate(project.acquisition_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Permit Issued</dt>
                    <dd className="font-medium">{formatDate(project.permit_approved_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Construction Start</dt>
                    <dd className="font-medium">{formatDate(project.construction_start_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Projected Completion</dt>
                    <dd className="font-medium">{formatDate(project.projected_completion_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">CO Date</dt>
                    <dd className="font-medium">{formatDate(project.co_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Sale Date</dt>
                    <dd className="font-medium">{formatDate(project.sale_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Warranty Expiration</dt>
                    <dd className="font-medium">{formatDate(project.warranty_end_date)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Linked jobs */}
          {linkedJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {linkedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/construction/jobs/${job.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Hammer className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{job.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {job.job_number}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {job.status}
                        </Badge>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---- Acquisition Tab ---- */}
        <TabsContent value="acquisition" className="space-y-6 mt-6">
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
        </TabsContent>

        {/* ---- Budget Tab ---- */}
        <TabsContent value="budget" className="mt-6">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <DollarSign className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              View the full budget breakdown, expenses, and draw schedule.
            </p>
            <Button onClick={() => router.push(`/projects/${projectId}/budget`)}>
              Open Budget & Actuals
            </Button>
          </div>
        </TabsContent>

        {/* ---- Timeline Tab ---- */}
        <TabsContent value="timeline" className="mt-6">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Calendar className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              View the project timeline with key milestones and dates.
            </p>
            <Button onClick={() => router.push(`/projects/${projectId}/timeline`)}>
              Open Timeline
            </Button>
          </div>
        </TabsContent>

        {/* ---- Linked Jobs Tab ---- */}
        <TabsContent value="jobs" className="space-y-4 mt-6">
          {linkedJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Hammer className="mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-1 text-sm font-semibold">No linked jobs</h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  Construction jobs linked to this project will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Linked Construction Jobs ({linkedJobs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedJobs.map((job) => (
                      <TableRow
                        key={job.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/construction/jobs/${job.id}`)}
                      >
                        <TableCell className="font-mono text-xs">
                          {job.job_number}
                        </TableCell>
                        <TableCell className="font-medium">{job.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {job.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---- Disposition Tab ---- */}
        <TabsContent value="disposition" className="mt-6">
          <ProjectDispositionTab projectId={project.id} projectType={project.type} budgetTotal={project.budget_total} />
        </TabsContent>

        {/* ---- Documents Tab ---- */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-1 text-sm font-semibold">Documents</h3>
              <p className="text-xs text-muted-foreground">
                Project documents will be managed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Workflow Tab ---- */}
        <TabsContent value="workflow" className="mt-6">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              View and manage project milestones and workflow tasks.
            </p>
            <Button onClick={() => router.push(`/projects/${projectId}/workflow`)}>
              Open Workflow
            </Button>
          </div>
        </TabsContent>

        {/* ---- Tasks Tab ---- */}
        <TabsContent value="tasks" className="mt-6">
          <RecordTasksPanel
            recordType="project"
            recordId={projectId}
            recordName={project.name}
            recordUrl={`/projects/${projectId}`}
          />
        </TabsContent>

        {/* ---- Contacts Tab ---- */}
        <TabsContent value="contacts" className="mt-6">
          <ContactsTab projectId={projectId} />
        </TabsContent>

        {/* ---- Notes Tab ---- */}
        <TabsContent value="notes" className="mt-6">
          <NotesTab notes={(project as unknown as { notes?: string | null }).notes ?? null} onSave={handleNoteSave} />
        </TabsContent>

        {/* ---- Activity Tab ---- */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-1 text-sm font-semibold">Activity Log</h3>
              <p className="text-xs text-muted-foreground">
                A full activity log for this project will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
  )
}
