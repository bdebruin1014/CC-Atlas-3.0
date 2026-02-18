"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  GitBranch,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  CheckCircle,
  Circle,
  ListTree,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

interface WorkflowTemplate {
  id: string
  organization_id: string
  name: string
  description: string | null
  workflow_type: string | null
  trigger_event: string | null
  is_active: boolean
  version: number
  created_at: string
}

interface MilestoneTemplate {
  id: string
  workflow_template_id: string
  name: string
  description: string | null
  sequence: number
  duration_days: number | null
  is_required: boolean
  entry_criteria: string | null
  exit_criteria: string | null
}

interface TaskListTemplate {
  id: string
  milestone_template_id: string
  name: string
  description: string | null
  sequence: number
}

interface TaskTemplate {
  id: string
  task_list_template_id: string
  name: string
  description: string | null
  sequence: number
  default_assignee_role: string | null
  duration_days: number | null
  is_required: boolean
}

const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  opportunity: "Opportunities",
  project: "Projects",
  construction: "Construction",
  onboarding: "Onboarding",
  closing: "Closing",
  custom: "Custom",
}

export default function WorkflowTemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null)
  const [expandedTaskListId, setExpandedTaskListId] = useState<string | null>(null)

  const [milestones, setMilestones] = useState<Record<string, MilestoneTemplate[]>>({})
  const [taskLists, setTaskLists] = useState<Record<string, TaskListTemplate[]>>({})
  const [tasks, setTasks] = useState<Record<string, TaskTemplate[]>>({})
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null)

  const [showEditTask, setShowEditTask] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from("workflow_templates")
        .select("*")
        .order("workflow_type", { ascending: true })
        .order("name", { ascending: true })

      if (fetchError) throw fetchError
      setTemplates((data as unknown as WorkflowTemplate[]) || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch workflow templates"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const toggleTemplate = async (templateId: string) => {
    if (expandedTemplateId === templateId) {
      setExpandedTemplateId(null)
      return
    }

    setExpandedTemplateId(templateId)

    if (!milestones[templateId]) {
      setLoadingDetails(templateId)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("milestone_templates")
          .select("*")
          .eq("workflow_template_id", templateId)
          .order("sequence", { ascending: true })

        setMilestones((prev) => ({
          ...prev,
          [templateId]: (data as MilestoneTemplate[]) || [],
        }))
      } catch {
        setMilestones((prev) => ({ ...prev, [templateId]: [] }))
      } finally {
        setLoadingDetails(null)
      }
    }
  }

  const toggleMilestone = async (milestoneId: string) => {
    if (expandedMilestoneId === milestoneId) {
      setExpandedMilestoneId(null)
      return
    }

    setExpandedMilestoneId(milestoneId)

    if (!taskLists[milestoneId]) {
      setLoadingDetails(milestoneId)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("task_list_templates")
          .select("*")
          .eq("milestone_template_id", milestoneId)
          .order("sequence", { ascending: true })

        setTaskLists((prev) => ({
          ...prev,
          [milestoneId]: (data as TaskListTemplate[]) || [],
        }))
      } catch {
        setTaskLists((prev) => ({ ...prev, [milestoneId]: [] }))
      } finally {
        setLoadingDetails(null)
      }
    }
  }

  const toggleTaskList = async (taskListId: string) => {
    if (expandedTaskListId === taskListId) {
      setExpandedTaskListId(null)
      return
    }

    setExpandedTaskListId(taskListId)

    if (!tasks[taskListId]) {
      setLoadingDetails(taskListId)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("task_templates")
          .select("*")
          .eq("task_list_template_id", taskListId)
          .order("sequence", { ascending: true })

        setTasks((prev) => ({
          ...prev,
          [taskListId]: (data as TaskTemplate[]) || [],
        }))
      } catch {
        setTasks((prev) => ({ ...prev, [taskListId]: [] }))
      } finally {
        setLoadingDetails(null)
      }
    }
  }

  const handleSaveTask = async (taskData: Partial<TaskTemplate>) => {
    if (!editingTask) return
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("task_templates")
        .update({
          name: taskData.name,
          description: taskData.description,
          default_assignee_role: taskData.default_assignee_role,
          duration_days: taskData.duration_days,
          is_required: taskData.is_required,
        })
        .eq("id", editingTask.id)

      if (updateError) throw updateError

      setTasks((prev) => {
        const updated = { ...prev }
        for (const [listId, taskArr] of Object.entries(updated)) {
          updated[listId] = taskArr.map((t) =>
            t.id === editingTask.id ? { ...t, ...taskData } : t
          )
        }
        return updated
      })

      toast({ title: "Task updated" })
      setShowEditTask(false)
      setEditingTask(null)
    } catch {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      })
    }
  }

  const groupedTemplates = templates.reduce(
    (acc, template) => {
      const type = template.workflow_type || "custom"
      if (!acc[type]) acc[type] = []
      acc[type].push(template)
      return acc
    },
    {} as Record<string, WorkflowTemplate[]>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Workflow Templates</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} workflow template
            {templates.length !== 1 ? "s" : ""} configured
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchTemplates}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranch className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No workflow templates</h3>
            <p className="text-sm text-muted-foreground">
              Workflow templates will define milestones and tasks for your processes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Templates by Module */}
      {!loading &&
        !error &&
        Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
          <div key={type} className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              {WORKFLOW_TYPE_LABELS[type] || type}
              <Badge variant="secondary" className="text-xs">
                {typeTemplates.length}
              </Badge>
            </h2>

            <div className="space-y-2">
              {typeTemplates.map((template) => (
                <Card key={template.id}>
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleTemplate(template.id)}
                  >
                    {expandedTemplateId === template.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            template.is_active
                              ? "border-green-300 text-green-700"
                              : "border-gray-300 text-gray-500"
                          )}
                        >
                          {template.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          v{template.version}
                        </Badge>
                      </div>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {milestones[template.id]
                        ? `${milestones[template.id].length} milestones`
                        : ""}
                    </span>
                  </div>

                  {/* Expanded: Milestones */}
                  {expandedTemplateId === template.id && (
                    <div className="border-t pl-8 pr-4 py-3 space-y-2">
                      {loadingDetails === template.id ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading milestones...
                        </div>
                      ) : !milestones[template.id] ||
                        milestones[template.id].length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No milestones defined for this workflow.
                        </p>
                      ) : (
                        milestones[template.id].map((milestone) => (
                          <div key={milestone.id} className="rounded-lg border">
                            <div
                              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleMilestone(milestone.id)
                              }}
                            >
                              {expandedMilestoneId === milestone.id ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <ListTree className="h-4 w-4 text-primary" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="text-xs font-mono"
                                  >
                                    {milestone.sequence}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {milestone.name}
                                  </span>
                                  {milestone.duration_days && (
                                    <span className="text-xs text-muted-foreground">
                                      ({milestone.duration_days} days)
                                    </span>
                                  )}
                                  {milestone.is_required && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Expanded: Task Lists */}
                            {expandedMilestoneId === milestone.id && (
                              <div className="border-t pl-10 pr-3 py-2 space-y-2">
                                {loadingDetails === milestone.id ? (
                                  <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading tasks...
                                  </div>
                                ) : !taskLists[milestone.id] ||
                                  taskLists[milestone.id].length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-2">
                                    No task lists in this milestone.
                                  </p>
                                ) : (
                                  taskLists[milestone.id].map((taskList) => (
                                    <div key={taskList.id}>
                                      <div
                                        className="flex items-center gap-2 py-1.5 cursor-pointer hover:text-primary transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleTaskList(taskList.id)
                                        }}
                                      >
                                        {expandedTaskListId === taskList.id ? (
                                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        )}
                                        <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-xs font-medium">
                                          {taskList.name}
                                        </span>
                                      </div>

                                      {/* Expanded: Tasks */}
                                      {expandedTaskListId === taskList.id && (
                                        <div className="pl-8 py-1 space-y-1">
                                          {loadingDetails === taskList.id ? (
                                            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                              Loading...
                                            </div>
                                          ) : !tasks[taskList.id] ||
                                            tasks[taskList.id].length === 0 ? (
                                            <p className="text-xs text-muted-foreground">
                                              No tasks defined.
                                            </p>
                                          ) : (
                                            tasks[taskList.id].map((task) => (
                                              <div
                                                key={task.id}
                                                className="flex items-center gap-2 py-1 group"
                                              >
                                                <Circle className="h-3 w-3 text-muted-foreground/50" />
                                                <span className="text-xs flex-1">
                                                  {task.name}
                                                </span>
                                                {task.duration_days && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {task.duration_days}d
                                                  </span>
                                                )}
                                                {task.default_assignee_role && (
                                                  <Badge
                                                    variant="outline"
                                                    className="text-xs h-4 px-1"
                                                  >
                                                    {task.default_assignee_role}
                                                  </Badge>
                                                )}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditingTask(task)
                                                    setShowEditTask(true)
                                                  }}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={showEditTask}
          onOpenChange={(val) => {
            setShowEditTask(val)
            if (!val) setEditingTask(null)
          }}
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}

function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onSave,
}: {
  task: TaskTemplate
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<TaskTemplate>) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: task.name,
    description: task.description || "",
    default_assignee_role: task.default_assignee_role || "",
    duration_days: task.duration_days?.toString() || "",
    is_required: task.is_required,
  })

  useEffect(() => {
    setFormData({
      name: task.name,
      description: task.description || "",
      default_assignee_role: task.default_assignee_role || "",
      duration_days: task.duration_days?.toString() || "",
      is_required: task.is_required,
    })
  }, [task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      name: formData.name,
      description: formData.description || null,
      default_assignee_role: formData.default_assignee_role || null,
      duration_days: formData.duration_days
        ? parseInt(formData.duration_days)
        : null,
      is_required: formData.is_required,
    })
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Modify the task template details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Task Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Assignee Role</Label>
              <Input
                value={formData.default_assignee_role}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    default_assignee_role: e.target.value,
                  }))
                }
                placeholder="e.g., project_manager"
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Input
                type="number"
                value={formData.duration_days}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    duration_days: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label>Required</Label>
            <Button
              type="button"
              size="sm"
              variant={formData.is_required ? "default" : "outline"}
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  is_required: !prev.is_required,
                }))
              }
            >
              {formData.is_required ? "Required" : "Optional"}
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
