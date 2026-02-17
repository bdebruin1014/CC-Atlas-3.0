"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProjectType =
  | "scattered_lot"
  | "lot_purchase"
  | "lot_development"
  | "community_development"
  | "land_banking"
  | "spec_build"

export type ProjectStatus =
  | "pre_construction"
  | "active"
  | "construction"
  | "punch_co"
  | "disposition"
  | "complete"
  | "closed"
  | "on_hold"
  | "cancelled"

export type ContractType = "fixed_price" | "cost_plus" | "cost_plus_fee" | "time_and_materials"

export type ExpenseStatus = "pending" | "approved" | "paid" | "rejected"

export type DrawStatus = "pending" | "requested" | "approved" | "paid"

export type LotStatus = "raw" | "developing" | "finished" | "contracted" | "sold"

export interface Project {
  id: string
  organization_id: string
  project_number: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  type: ProjectType
  status: ProjectStatus
  owner_entity_id: string | null
  owner_entity_name?: string | null
  builder_entity_id: string | null
  builder_entity_name?: string | null
  total_budget: number
  current_spend: number
  committed_amount: number
  projected_final: number
  purchase_price: number | null
  acquisition_date: string | null
  contract_type: ContractType | null
  contract_amount: number | null
  contract_fee: number | null
  lot_width: number | null
  lot_depth: number | null
  acreage: number | null
  total_lots: number | null
  floor_plan_id: string | null
  floor_plan_name: string | null
  permit_date: string | null
  construction_start_date: string | null
  projected_completion_date: string | null
  co_date: string | null
  sale_date: string | null
  warranty_expiration_date: string | null
  source_opportunity_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ProjectExpense {
  id: string
  project_id: string
  date: string
  description: string
  amount: number
  cost_category: string
  vendor_name: string | null
  vendor_contact_id: string | null
  reference_number: string | null
  document_url: string | null
  status: ExpenseStatus
  created_at: string
}

export interface ProjectDraw {
  id: string
  project_id: string
  draw_number: number
  name: string
  percentage: number
  amount: number
  status: DrawStatus
  requested_date: string | null
  paid_date: string | null
  created_at: string
}

export interface BudgetCategory {
  id: string
  project_id: string
  category: string
  budget_amount: number
  committed_amount: number
  actual_amount: number
  display_order: number
}

export interface ProjectLot {
  id: string
  project_id: string
  lot_number: string
  width: number | null
  depth: number | null
  square_feet: number | null
  status: LotStatus
  floor_plan: string | null
  upgrade_package: string | null
  projected_price: number | null
  actual_price: number | null
  buyer_name: string | null
  buyer_contact_id: string | null
  phase: string | null
  created_at: string
}

export interface ProjectContact {
  id: string
  contact_id: string
  project_id: string
  role: string
  first_name: string
  last_name: string
  company: string | null
  email: string | null
  phone: string | null
}

export interface ProjectMilestone {
  id: string
  project_id: string
  name: string
  description: string | null
  due_date: string | null
  completed_date: string | null
  status: "pending" | "in_progress" | "completed" | "skipped"
  display_order: number
  tasks: ProjectTask[]
}

export interface ProjectTask {
  id: string
  milestone_id: string
  title: string
  description: string | null
  assigned_to: string | null
  due_date: string | null
  completed_date: string | null
  status: "pending" | "in_progress" | "completed" | "skipped"
  display_order: number
}

export interface LinkedJob {
  id: string
  job_number: string
  name: string
  status: string
  type: string
}

export interface FloorPlan {
  id: string
  name: string
  square_footage: number | null
  bedrooms: number | null
  bathrooms: number | null
  base_price: number | null
}

export interface Entity {
  id: string
  name: string
  type: string
}

export interface ProjectFilters {
  search?: string
  type?: ProjectType | "all"
  status?: ProjectStatus | "all"
  entity?: string | "all"
}

export interface ConvertOpportunityData {
  opportunityId: string
  projectType: ProjectType
  projectName?: string
  startDate?: string
  estimatedCompletion?: string
  projectManagerId?: string
  totalBudget?: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "scattered_lot", label: "Scattered Lot" },
  { value: "lot_purchase", label: "Lot Purchase" },
  { value: "lot_development", label: "Lot Development" },
  { value: "community_development", label: "Community Development" },
  { value: "land_banking", label: "Land Banking" },
  { value: "spec_build", label: "Spec Build" },
]

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "pre_construction", label: "Pre-Construction" },
  { value: "active", label: "Active" },
  { value: "construction", label: "Construction" },
  { value: "punch_co", label: "Punch/CO" },
  { value: "disposition", label: "Disposition" },
  { value: "complete", label: "Complete" },
  { value: "closed", label: "Closed" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
]

export const PROJECT_STATUS_PIPELINE: ProjectStatus[] = [
  "pre_construction",
  "active",
  "construction",
  "punch_co",
  "disposition",
  "complete",
  "closed",
]

export const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: "fixed_price", label: "Fixed Price" },
  { value: "cost_plus", label: "Cost Plus" },
  { value: "cost_plus_fee", label: "Cost Plus Fee" },
  { value: "time_and_materials", label: "Time & Materials" },
]

export const COST_CATEGORIES = [
  "Land Acquisition",
  "Site Work",
  "Foundation",
  "Framing",
  "Roofing",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Insulation",
  "Drywall",
  "Interior Trim",
  "Painting",
  "Flooring",
  "Cabinets & Countertops",
  "Fixtures & Appliances",
  "Exterior Finish",
  "Landscaping",
  "Permits & Fees",
  "Architecture & Engineering",
  "Insurance",
  "Financing Costs",
  "Utilities",
  "Contingency",
  "Other",
]

export const DEFAULT_DRAWS = [
  { draw_number: 1, name: "Deposit", percentage: 20 },
  { draw_number: 2, name: "Foundation", percentage: 20 },
  { draw_number: 3, name: "Framing/Dry-In", percentage: 25 },
  { draw_number: 4, name: "Drywall/Trim", percentage: 25 },
  { draw_number: 5, name: "Final", percentage: 10 },
]

export const LOT_STATUSES: { value: LotStatus; label: string }[] = [
  { value: "raw", label: "Raw" },
  { value: "developing", label: "Developing" },
  { value: "finished", label: "Finished" },
  { value: "contracted", label: "Contracted" },
  { value: "sold", label: "Sold" },
]

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function getProjectTypeLabel(type: ProjectType): string {
  return PROJECT_TYPES.find((t) => t.value === type)?.label ?? type
}

export function getProjectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status
}

export function getStatusColor(status: ProjectStatus): string {
  const colors: Record<ProjectStatus, string> = {
    pre_construction: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    construction: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    punch_co: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    disposition: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    complete: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }
  return colors[status] ?? ""
}

export function getTypeColor(type: ProjectType): string {
  const colors: Record<ProjectType, string> = {
    scattered_lot: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
    lot_purchase: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    lot_development: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    community_development: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
    land_banking: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
    spec_build: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  }
  return colors[type] ?? ""
}

export function getBudgetHealthColor(spent: number, budget: number): string {
  if (budget <= 0) return "bg-gray-400"
  const pct = (spent / budget) * 100
  if (pct > 100) return "bg-red-500"
  if (pct >= 90) return "bg-yellow-500"
  return "bg-green-500"
}

export function getLotStatusColor(status: LotStatus): string {
  const colors: Record<LotStatus, string> = {
    raw: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    developing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    finished: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    contracted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    sold: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  }
  return colors[status] ?? ""
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  all: ['projects'] as const,
  lists: () => [...keys.all, 'list'] as const,
  list: (filters?: ProjectFilters) => [...keys.lists(), filters] as const,
  details: () => [...keys.all, 'detail'] as const,
  detail: (id: string) => [...keys.details(), id] as const,
  budget: (projectId: string) => [...keys.all, 'budget', projectId] as const,
  draws: (projectId: string) => [...keys.all, 'draws', projectId] as const,
  lots: (projectId: string) => [...keys.all, 'lots', projectId] as const,
  contacts: (projectId: string) => [...keys.all, 'contacts', projectId] as const,
  workflow: (projectId: string) => [...keys.all, 'workflow', projectId] as const,
  entities: ['entities'] as const,
  floorPlans: ['floor-plans'] as const,
}

// ---------------------------------------------------------------------------
// Hooks (TanStack Query)
// ---------------------------------------------------------------------------

export function useProjects(filters: ProjectFilters = {}) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select(`
          *,
          owner_entity:entities!projects_owner_entity_id_fkey(id, name),
          builder_entity:entities!projects_builder_entity_id_fkey(id, name)
        `)
        .order("created_at", { ascending: false })

      if (filters.type && filters.type !== "all") {
        query = query.eq("type", filters.type)
      }
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status)
      }
      if (filters.entity && filters.entity !== "all") {
        query = query.eq("owner_entity_id", filters.entity)
      }
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,project_number.ilike.%${filters.search}%,address.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query

      if (error) throw error

      return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        ...row,
        owner_entity_name: (row.owner_entity as { name?: string } | null)?.name ?? null,
        builder_entity_name: (row.builder_entity as { name?: string } | null)?.name ?? null,
      })) as Project[]
    },
  })
}

export function useProject(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          owner_entity:entities!projects_owner_entity_id_fkey(id, name),
          builder_entity:entities!projects_builder_entity_id_fkey(id, name)
        `)
        .eq("id", id)
        .single()

      if (error) throw error

      const mapped = {
        ...data,
        owner_entity_name: (data.owner_entity as { name?: string } | null)?.name ?? null,
        builder_entity_name: (data.builder_entity as { name?: string } | null)?.name ?? null,
      } as Project

      return mapped
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      projectData: Omit<Project, "id" | "created_at" | "updated_at" | "owner_entity_name" | "builder_entity_name" | "current_spend" | "committed_amount" | "projected_final">
    ) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          ...projectData,
          current_spend: 0,
          committed_amount: 0,
          projected_final: projectData.total_budget,
        })
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
    },
    onError: (error) => {
      console.error('Failed to create project:', error)
    },
  })
}

export function useUpdateProject() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Project>) => {
      const { data, error } = await supabase
        .from("projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
      queryClient.invalidateQueries({ queryKey: keys.detail(data.id) })
    },
    onError: (error) => {
      console.error('Failed to update project:', error)
    },
  })
}

export function useConvertOpportunityToProject() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ConvertOpportunityData) => {
      // 1. Fetch the opportunity
      const { data: opportunity, error: fetchError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', input.opportunityId)
        .single()

      if (fetchError) throw fetchError
      if (!opportunity) throw new Error('Opportunity not found')

      // 2. Generate project number
      const year = new Date().getFullYear().toString().slice(-2)
      const { count } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .ilike("project_number", `${year}-%`)

      const nextNum = ((count ?? 0) + 1).toString().padStart(3, "0")
      const projectNumber = `${year}-${nextNum}`

      // 3. Create the project
      const { data: project, error: createError } = await supabase
        .from('projects')
        .insert({
          project_number: projectNumber,
          organization_id: opportunity.organization_id,
          name: input.projectName ?? opportunity.name,
          type: input.projectType,
          status: 'pre_construction' as ProjectStatus,
          address: opportunity.address_line1 ?? opportunity.address ?? null,
          city: opportunity.city ?? null,
          state: opportunity.state ?? null,
          zip: opportunity.zip ?? null,
          source_opportunity_id: input.opportunityId,
          total_budget: input.totalBudget ?? opportunity.estimated_value ?? 0,
          current_spend: 0,
          committed_amount: 0,
          projected_final: input.totalBudget ?? opportunity.estimated_value ?? 0,
          construction_start_date: input.startDate ?? null,
          projected_completion_date: input.estimatedCompletion ?? null,
          notes: opportunity.description ?? null,
        })
        .select()
        .single()

      if (createError) throw createError

      // 4. Update opportunity status to converted
      await supabase
        .from('opportunities')
        .update({
          status: 'converted',
          stage: 'won',
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.opportunityId)

      // 5. Copy contact assignments
      const { data: contactAssignments } = await supabase
        .from('contact_assignments')
        .select('contact_id, role_on_record')
        .eq('record_type', 'opportunity')
        .eq('record_id', input.opportunityId)

      if (contactAssignments && contactAssignments.length > 0) {
        await supabase.from('contact_assignments').insert(
          contactAssignments.map((ca) => ({
            contact_id: ca.contact_id,
            record_type: 'project' as const,
            record_id: project.id,
            role_on_record: ca.role_on_record,
          }))
        )
      }

      // 6. Log activity
      await supabase.from('activity_log').insert([
        {
          record_type: 'opportunity',
          record_id: input.opportunityId,
          action: 'status_changed',
          description: `Converted to project ${projectNumber}`,
        },
        {
          record_type: 'project',
          record_id: project.id,
          action: 'created',
          description: `Created from opportunity ${opportunity.opportunity_number ?? opportunity.name}`,
        },
      ])

      return project as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    },
    onError: (error) => {
      console.error('Failed to convert opportunity to project:', error)
    },
  })
}

export function useProjectBudget(projectId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const categoriesQuery = useQuery({
    queryKey: [...keys.budget(projectId), 'categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_budget_categories")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order", { ascending: true })

      if (error) throw error
      return (data ?? []) as BudgetCategory[]
    },
    enabled: !!projectId,
  })

  const expensesQuery = useQuery({
    queryKey: [...keys.budget(projectId), 'expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_expenses")
        .select("*")
        .eq("project_id", projectId)
        .order("date", { ascending: false })

      if (error) throw error
      return (data ?? []) as ProjectExpense[]
    },
    enabled: !!projectId,
  })

  const addExpenseMutation = useMutation({
    mutationFn: async (expense: Omit<ProjectExpense, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("project_expenses")
        .insert(expense)
        .select()
        .single()

      if (error) throw error
      return data as ProjectExpense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.budget(projectId) })
      queryClient.invalidateQueries({ queryKey: keys.detail(projectId) })
    },
  })

  return {
    categories: categoriesQuery.data ?? [],
    expenses: expensesQuery.data ?? [],
    loading: categoriesQuery.isLoading || expensesQuery.isLoading,
    error: categoriesQuery.error?.message ?? expensesQuery.error?.message ?? null,
    refetch: () => {
      categoriesQuery.refetch()
      expensesQuery.refetch()
    },
    addExpense: addExpenseMutation.mutateAsync,
  }
}

export function useProjectDraws(projectId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const drawsQuery = useQuery({
    queryKey: keys.draws(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_draws")
        .select("*")
        .eq("project_id", projectId)
        .order("draw_number", { ascending: true })

      if (error) throw error
      return (data ?? []) as ProjectDraw[]
    },
    enabled: !!projectId,
  })

  const updateDrawStatusMutation = useMutation({
    mutationFn: async ({ drawId, status, date }: { drawId: string; status: DrawStatus; date?: string }) => {
      const updates: Record<string, unknown> = { status }
      if (status === "requested") updates.requested_date = date ?? new Date().toISOString()
      if (status === "paid") updates.paid_date = date ?? new Date().toISOString()

      const { data, error } = await supabase
        .from("project_draws")
        .update(updates)
        .eq("id", drawId)
        .select()
        .single()

      if (error) throw error
      return data as ProjectDraw
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.draws(projectId) })
    },
  })

  return {
    draws: drawsQuery.data ?? [],
    loading: drawsQuery.isLoading,
    error: drawsQuery.error?.message ?? null,
    refetch: drawsQuery.refetch,
    updateDrawStatus: (drawId: string, status: DrawStatus, date?: string) =>
      updateDrawStatusMutation.mutateAsync({ drawId, status, date }),
  }
}

export function useProjectLots(projectId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const lotsQuery = useQuery({
    queryKey: keys.lots(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_lots")
        .select("*")
        .eq("project_id", projectId)
        .order("lot_number", { ascending: true })

      if (error) throw error
      return (data ?? []) as ProjectLot[]
    },
    enabled: !!projectId,
  })

  const addLotMutation = useMutation({
    mutationFn: async (lot: Omit<ProjectLot, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("project_lots")
        .insert(lot)
        .select()
        .single()

      if (error) throw error
      return data as ProjectLot
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.lots(projectId) })
    },
  })

  const updateLotMutation = useMutation({
    mutationFn: async ({ lotId, updates }: { lotId: string; updates: Partial<ProjectLot> }) => {
      const { data, error } = await supabase
        .from("project_lots")
        .update(updates)
        .eq("id", lotId)
        .select()
        .single()

      if (error) throw error
      return data as ProjectLot
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.lots(projectId) })
    },
  })

  return {
    lots: lotsQuery.data ?? [],
    loading: lotsQuery.isLoading,
    error: lotsQuery.error?.message ?? null,
    refetch: lotsQuery.refetch,
    addLot: addLotMutation.mutateAsync,
    updateLot: (lotId: string, updates: Partial<ProjectLot>) =>
      updateLotMutation.mutateAsync({ lotId, updates }),
  }
}

export function useProjectContacts(projectId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const contactsQuery = useQuery({
    queryKey: keys.contacts(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_assignments")
        .select(`
          id,
          contact_id,
          record_id,
          role_on_record,
          contact:contacts(first_name, last_name, company, email, phone)
        `)
        .eq("record_type", "project")
        .eq("record_id", projectId)

      if (error) throw error

      return ((data ?? []) as Record<string, unknown>[]).map((row) => {
        const c = row.contact as { first_name: string; last_name: string; company: string | null; email: string | null; phone: string | null } | null
        return {
          id: row.id as string,
          contact_id: row.contact_id as string,
          project_id: projectId,
          role: (row.role_on_record as string) ?? "",
          first_name: c?.first_name ?? "",
          last_name: c?.last_name ?? "",
          company: c?.company ?? null,
          email: c?.email ?? null,
          phone: c?.phone ?? null,
        }
      }) as ProjectContact[]
    },
    enabled: !!projectId,
  })

  const assignContactMutation = useMutation({
    mutationFn: async ({ contactId, role }: { contactId: string; role: string }) => {
      const { error } = await supabase
        .from("contact_assignments")
        .insert({
          contact_id: contactId,
          record_type: "project",
          record_id: projectId,
          role_on_record: role,
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.contacts(projectId) })
    },
  })

  const removeContactMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("contact_assignments")
        .delete()
        .eq("id", assignmentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.contacts(projectId) })
    },
  })

  return {
    contacts: contactsQuery.data ?? [],
    loading: contactsQuery.isLoading,
    error: contactsQuery.error?.message ?? null,
    refetch: contactsQuery.refetch,
    assignContact: (contactId: string, role: string) =>
      assignContactMutation.mutateAsync({ contactId, role }),
    removeContact: removeContactMutation.mutateAsync,
  }
}

export function useProjectWorkflow(projectId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const workflowQuery = useQuery({
    queryKey: keys.workflow(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_milestones")
        .select(`
          *,
          tasks:project_tasks(*)
        `)
        .eq("project_id", projectId)
        .order("display_order", { ascending: true })

      if (error) throw error
      return (data ?? []) as ProjectMilestone[]
    },
    enabled: !!projectId,
  })

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: ProjectTask["status"] }) => {
      const updates: Record<string, unknown> = { status }
      if (status === "completed") updates.completed_date = new Date().toISOString()
      else updates.completed_date = null

      const { data, error } = await supabase
        .from("project_tasks")
        .update(updates)
        .eq("id", taskId)
        .select()
        .single()

      if (error) throw error
      return data as ProjectTask
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.workflow(projectId) })
    },
  })

  const updateMilestoneStatusMutation = useMutation({
    mutationFn: async ({ milestoneId, status }: { milestoneId: string; status: ProjectMilestone["status"] }) => {
      const updates: Record<string, unknown> = { status }
      if (status === "completed") updates.completed_date = new Date().toISOString()
      else updates.completed_date = null

      const { data, error } = await supabase
        .from("project_milestones")
        .update(updates)
        .eq("id", milestoneId)
        .select()
        .single()

      if (error) throw error
      return data as ProjectMilestone
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.workflow(projectId) })
    },
  })

  return {
    milestones: workflowQuery.data ?? [],
    loading: workflowQuery.isLoading,
    error: workflowQuery.error?.message ?? null,
    refetch: workflowQuery.refetch,
    updateTaskStatus: (taskId: string, status: ProjectTask["status"]) =>
      updateTaskStatusMutation.mutateAsync({ taskId, status }),
    updateMilestoneStatus: (milestoneId: string, status: ProjectMilestone["status"]) =>
      updateMilestoneStatusMutation.mutateAsync({ milestoneId, status }),
  }
}

export function useEntities() {
  const supabase = createClient()

  const query = useQuery({
    queryKey: keys.entities,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, type")
        .order("name", { ascending: true })

      if (error) throw error
      return (data ?? []) as Entity[]
    },
  })

  return { entities: query.data ?? [], loading: query.isLoading }
}

export function useFloorPlans() {
  const supabase = createClient()

  const query = useQuery({
    queryKey: keys.floorPlans,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floor_plans")
        .select("*")
        .order("name", { ascending: true })

      if (error) throw error
      return (data ?? []) as FloorPlan[]
    },
  })

  return { floorPlans: query.data ?? [], loading: query.isLoading }
}

export async function generateProjectNumber(): Promise<string> {
  const supabase = createClient()
  const year = new Date().getFullYear().toString().slice(-2)

  const { count } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .ilike("project_number", `${year}-%`)

  const nextNum = ((count ?? 0) + 1).toString().padStart(3, "0")
  return `${year}-${nextNum}`
}
