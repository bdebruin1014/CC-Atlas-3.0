// ============================================================================
// Construction Management Module - Types & Constants
// Red Cedar Homes ATLAS Platform
// ============================================================================

// ---- 6 Vertical Construction Milestones (per v4 spec §3.6) ----
export const CONSTRUCTION_PHASES = [
  { number: 1, name: "Permit", shortName: "Permit" },
  { number: 2, name: "Foundation", shortName: "Found." },
  { number: 3, name: "Frame", shortName: "Frame" },
  { number: 4, name: "Sheetrock", shortName: "Shtrock" },
  { number: 5, name: "CO", shortName: "CO" },
  { number: 6, name: "Complete", shortName: "Done" },
] as const

// ---- Milestone Required Inspections ----
export const PHASE_INSPECTIONS: Record<number, string[]> = {
  2: ["Footer", "Foundation"],
  3: ["Framing", "Plumbing Rough", "Electrical Rough", "HVAC Rough", "Insulation"],
  5: ["Final Building", "Certificate of Occupancy"],
}

// ---- Post-CO Warranty Timeline (days after CO date) ----
export const WARRANTY_TIMELINE = [
  { name: "30-Day Walkthrough", offsetDays: 30 },
  { name: "6-Month Check", offsetDays: 180 },
  { name: "11-Month Walkthrough", offsetDays: 330 },
  { name: "1-Year Workmanship Expiration", offsetDays: 365 },
  { name: "2-Year Systems Warranty", offsetDays: 730 },
  { name: "5-Year Structural Warranty", offsetDays: 1825 },
] as const

// ---- Milestone Status ----
export type MilestoneStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "overdue"
  | "blocked"

// ---- Job Status ----
export type JobStatus =
  | "preconstruction"
  | "active"
  | "on_hold"
  | "completed"
  | "closed"
  | "cancelled"

export const JOB_STATUS_CONFIG: Record<
  JobStatus,
  { label: string; color: string; bgColor: string }
> = {
  preconstruction: {
    label: "Pre-Construction",
    color: "text-blue-700",
    bgColor: "bg-blue-100 dark:bg-blue-900 dark:text-blue-200",
  },
  active: {
    label: "Active",
    color: "text-green-700",
    bgColor: "bg-green-100 dark:bg-green-900 dark:text-green-200",
  },
  on_hold: {
    label: "On Hold",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200",
  },
  completed: {
    label: "Completed",
    color: "text-purple-700",
    bgColor: "bg-purple-100 dark:bg-purple-900 dark:text-purple-200",
  },
  closed: {
    label: "Closed",
    color: "text-gray-700",
    bgColor: "bg-gray-100 dark:bg-gray-800 dark:text-gray-200",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-700",
    bgColor: "bg-red-100 dark:bg-red-900 dark:text-red-200",
  },
}

// ---- Client Type ----
export type ClientType = "internal" | "third_party"

// ---- Contract Type ----
export type ContractType = "cost_plus" | "fixed_price" | "time_materials"

// ---- PO Status ----
export type POStatus =
  | "draft"
  | "issued"
  | "work_complete"
  | "invoiced"
  | "approved"
  | "scheduled"
  | "paid"

export const PO_STATUS_CONFIG: Record<
  POStatus,
  { label: string; color: string; bgColor: string; order: number }
> = {
  draft: {
    label: "Draft",
    color: "text-gray-700",
    bgColor: "bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
    order: 0,
  },
  issued: {
    label: "Issued",
    color: "text-blue-700",
    bgColor: "bg-blue-100 dark:bg-blue-900 dark:text-blue-200",
    order: 1,
  },
  work_complete: {
    label: "Work Complete",
    color: "text-purple-700",
    bgColor: "bg-purple-100 dark:bg-purple-900 dark:text-purple-200",
    order: 2,
  },
  invoiced: {
    label: "Invoiced",
    color: "text-orange-700",
    bgColor: "bg-orange-100 dark:bg-orange-900 dark:text-orange-200",
    order: 3,
  },
  approved: {
    label: "Approved",
    color: "text-green-700",
    bgColor: "bg-green-100 dark:bg-green-900 dark:text-green-200",
    order: 4,
  },
  scheduled: {
    label: "Scheduled",
    color: "text-teal-700",
    bgColor: "bg-teal-100 dark:bg-teal-900 dark:text-teal-200",
    order: 5,
  },
  paid: {
    label: "Paid",
    color: "text-emerald-800",
    bgColor: "bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-200",
    order: 6,
  },
}

export const PO_STATUS_FLOW: Record<POStatus, POStatus | null> = {
  draft: "issued",
  issued: "work_complete",
  work_complete: "invoiced",
  invoiced: "approved",
  approved: "scheduled",
  scheduled: "paid",
  paid: null,
}

// ---- Change Order Status (matches DB approval_status) ----
export type ChangeOrderStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "revised"

export const CO_STATUS_CONFIG: Record<
  ChangeOrderStatus,
  { label: string; bgColor: string }
> = {
  pending: {
    label: "Pending Approval",
    bgColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  approved: {
    label: "Approved",
    bgColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  rejected: {
    label: "Rejected",
    bgColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  revised: {
    label: "Revised",
    bgColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
}

// ---- Change Order Reason & Markup ----
export type ChangeOrderReason =
  | "owner_request"
  | "field_condition"
  | "design_error"
  | "code_requirement"
  | "scope_clarification"

export const CO_REASON_CONFIG: Record<
  ChangeOrderReason,
  { label: string; markupPercent: number }
> = {
  owner_request: { label: "Owner Request / Upgrade", markupPercent: 30 },
  field_condition: { label: "Field Condition", markupPercent: 10 },
  design_error: { label: "Design Error", markupPercent: 0 },
  code_requirement: { label: "Code Requirement", markupPercent: 0 },
  scope_clarification: { label: "Scope Clarification", markupPercent: 0 },
}

// ---- Inspection Result ----
export type InspectionResult = "pass" | "fail" | "conditional"

export const INSPECTION_RESULT_CONFIG: Record<
  InspectionResult,
  { label: string; bgColor: string }
> = {
  pass: {
    label: "Pass",
    bgColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  fail: {
    label: "Fail",
    bgColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  conditional: {
    label: "Conditional",
    bgColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
}

// ---- Selection Status ----
export type SelectionStatus =
  | "pending"
  | "selected"
  | "ordered"
  | "received"
  | "installed"

export const SELECTION_STATUS_CONFIG: Record<
  SelectionStatus,
  { label: string; bgColor: string }
> = {
  pending: {
    label: "Pending",
    bgColor: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
  selected: {
    label: "Selected",
    bgColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  ordered: {
    label: "Ordered",
    bgColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  received: {
    label: "Received",
    bgColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  installed: {
    label: "Installed",
    bgColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
}

// ---- Selection Categories ----
export const SELECTION_CATEGORIES = [
  "Cabinets",
  "Countertops",
  "Flooring",
  "Paint Interior",
  "Paint Exterior",
  "Plumbing Fixtures",
  "Lighting",
  "Appliances",
  "Hardware",
  "Shower Doors",
  "Mirrors",
  "Bath Accessories",
] as const

// ---- Warranty ----
export type WarrantyUrgency = "routine" | "urgent" | "emergency"
export type WarrantyStatus =
  | "open"
  | "scheduled"
  | "in_progress"
  | "resolved"
  | "closed"

export const WARRANTY_URGENCY_CONFIG: Record<
  WarrantyUrgency,
  { label: string; bgColor: string }
> = {
  routine: {
    label: "Routine",
    bgColor: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
  urgent: {
    label: "Urgent",
    bgColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  emergency: {
    label: "Emergency",
    bgColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
}

export const WARRANTY_STATUS_CONFIG: Record<
  WarrantyStatus,
  { label: string; bgColor: string }
> = {
  open: {
    label: "Open",
    bgColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  scheduled: {
    label: "Scheduled",
    bgColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  in_progress: {
    label: "In Progress",
    bgColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  resolved: {
    label: "Resolved",
    bgColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  closed: {
    label: "Closed",
    bgColor: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
}

// ---- Trade Categories (~55) ----
export const TRADE_CATEGORIES = [
  "Surveying",
  "Site Clearing",
  "Grading & Earthwork",
  "Erosion Control",
  "Utilities - Water",
  "Utilities - Sewer",
  "Utilities - Electric",
  "Utilities - Gas",
  "Paving & Asphalt",
  "Concrete - Flatwork",
  "Concrete - Foundation",
  "Concrete - Porch/Steps",
  "Masonry/Block",
  "Structural Steel",
  "Framing - Lumber Material",
  "Framing - Labor",
  "Trusses",
  "Sheathing",
  "Windows & Exterior Doors",
  "Roofing",
  "Siding/Exterior Cladding",
  "Gutters & Downspouts",
  "Exterior Paint/Stain",
  "Garage Doors",
  "Plumbing - Rough",
  "Plumbing - Finish",
  "Electrical - Rough",
  "Electrical - Finish",
  "HVAC - Rough",
  "HVAC - Finish",
  "Insulation",
  "Drywall - Hang",
  "Drywall - Finish",
  "Interior Trim - Material",
  "Interior Trim - Labor",
  "Interior Doors",
  "Cabinets",
  "Countertops",
  "Tile/Stone",
  "Hardwood Flooring",
  "Carpet",
  "LVP/LVT Flooring",
  "Interior Paint",
  "Appliances",
  "Plumbing Fixtures",
  "Lighting Fixtures",
  "Hardware",
  "Mirrors & Shower Doors",
  "Fireplace",
  "Low Voltage/Smart Home",
  "Landscaping",
  "Irrigation",
  "Fencing",
  "Cleaning",
  "Final Grade & Seed/Sod",
] as const

// ---- Data Interfaces ----
export interface Job {
  id: string
  job_number: string
  name: string
  client_type: ClientType
  client_entity?: string
  client_name?: string
  contract_type: ContractType
  contract_amount: number
  builder_fee: number
  unit_count: number
  units_completed: number
  linked_project_id?: string
  state: "SC" | "NC"
  superintendent: string
  project_manager: string
  start_date: string
  projected_completion: string
  status: JobStatus
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  job_id: string
  unit_number: string
  address: string
  floor_plan_name: string
  floor_plan_specs?: string
  upgrade_package?: string
  current_phase: number
  permit_date?: string
  construction_start?: string
  projected_completion?: string
  co_date?: string
  total_budget: number
  committed: number
  actual: number
  status: "not_started" | "in_progress" | "complete"
  schedule_status: "on_schedule" | "behind_1_7" | "behind_8_plus" | "complete" | "not_started"
  created_at: string
}

export interface Milestone {
  id: string
  unit_id: string
  phase_number: number
  phase_name: string
  status: MilestoneStatus
  planned_start: string
  planned_end: string
  actual_start?: string
  actual_end?: string
  planned_duration: number
  actual_duration?: number
  inspections: Inspection[]
  notes?: string
}

export interface PurchaseOrder {
  id: string
  po_number: string
  unit_id: string
  job_id: string
  trade_category: string
  vendor_id?: string
  vendor_name: string
  description: string
  amount: number
  retainage_percent: number
  retainage_amount: number
  net_amount: number
  status: POStatus
  lien_waiver_status: "not_received" | "partial" | "final"
  linked_change_order_id?: string
  invoice_number?: string
  invoice_date?: string
  payment_date?: string
  created_at: string
}

export interface ChangeOrder {
  id: string
  co_number: string
  job_id: string
  unit_id: string
  unit_number?: string
  linked_po_id?: string
  description: string
  reason: ChangeOrderReason
  cost_impact: number
  markup_percent: number
  total_amount: number
  schedule_impact_days: number
  status: ChangeOrderStatus
  submitted_by: string
  submitted_date: string
  reviewed_by?: string
  reviewed_date?: string
  notes?: string
}

export interface Inspection {
  id: string
  unit_id: string
  milestone_id?: string
  phase_number?: number
  type: string
  scheduled_date: string
  actual_date?: string
  result?: InspectionResult
  inspector?: string
  municipality?: string
  notes?: string
  is_required: boolean
  is_reinspection: boolean
  original_inspection_id?: string
}

export interface Selection {
  id: string
  unit_id: string
  category: string
  item_name: string
  description?: string
  vendor?: string
  base_cost: number
  upgrade_delta: number
  status: SelectionStatus
  linked_po_id?: string
  notes?: string
}

export interface Vendor {
  id: string
  company_name: string
  contact_name: string
  email?: string
  phone?: string
  trades: string[]
  license_number?: string
  license_expiration?: string
  insurance_certificates: InsuranceCert[]
  w9_status: "received" | "pending" | "expired"
  performance_score: number
  ytd_payments: number
  payment_info_masked?: string
  notes?: string
  status: "active" | "inactive"
}

export interface InsuranceCert {
  id: string
  type: string
  carrier: string
  policy_number: string
  expiration_date: string
  coverage_amount: number
}

export interface WarrantyClaim {
  id: string
  claim_number: string
  unit_id: string
  unit_address: string
  reported_date: string
  category: string
  description: string
  urgency: WarrantyUrgency
  status: WarrantyStatus
  vendor_id?: string
  vendor_name?: string
  cost: number
  resolution_notes?: string
  resolved_date?: string
  owner_signoff: boolean
  photos?: string[]
}

export interface ActivityFeedItem {
  id: string
  timestamp: string
  type: "milestone" | "po" | "inspection" | "change_order" | "general"
  message: string
  user: string
  unit_number?: string
}
