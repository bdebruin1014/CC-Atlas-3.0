// ===========================================
// ATLAS Platform — Supabase Database Types
// Generated from schema migrations 001-007
// ===========================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ---- Enums / Union Types ----
export type UserRole = 'global_admin' | 'module_admin' | 'team_member' | 'read_only'
export type ModuleName = 'opportunities' | 'projects' | 'construction' | 'accounting' | 'contacts' | 'calendar' | 'admin'
export type ContactStatus = 'active' | 'inactive'
export type ContactTypeName = 'owner_principal' | 'investor' | 'attorney_legal' | 'lender' | 'surveyor' | 'engineer' | 'architect' | 'appraiser' | 'real_estate_agent_broker' | 'title_company' | 'inspector' | 'municipality_contact' | 'subcontractor_vendor' | 'superintendent' | 'project_manager' | 'accountant' | 'insurance_agent' | 'utility_provider' | 'property_manager' | 'buyer' | 'seller' | 'other'
export type RecordType = 'opportunity' | 'project' | 'job' | 'entity'
export type InsuranceLinkType = 'vendor' | 'entity' | 'project' | 'job'
export type PolicyType = 'gl' | 'workers_comp' | 'auto' | 'builders_risk' | 'umbrella' | 'eo' | 'do'
export type EntityUseType = 'operating_company' | 'holding_company' | 'spe' | 'fund_syndication' | 'other'
export type EntityLegalType = 'llc' | 's_corp' | 'partnership' | 'c_corp' | 'sole_proprietorship' | 'trust'
export type OpportunityType = 'scattered_lot' | 'lot_development' | 'community_development' | 'lot_purchase' | 'other'
export type OpportunitySource = 'mls' | 'wholesaler' | 'direct' | 'broker' | 'off_market' | 'referral' | 'other'
export type OpportunityStatus = 'active' | 'archived' | 'converted'
export type BuildType = 'sfh' | 'townhome' | 'duplex' | 'other'
export type GaragePosition = 'front' | 'rear' | 'none'
export type UpgradePackage = 'standard' | 'classic' | 'elegance' | 'harmony'
export type DealVerdict = 'strong_deal' | 'good_deal' | 'marginal' | 'no_go'
export type ProjectType = 'scattered_lot' | 'lot_development' | 'community_development' | 'lot_purchase'
export type ProjectStatus = 'pre_construction' | 'active' | 'construction' | 'punch_co' | 'disposition' | 'complete' | 'closed'
export type ContractType = 'cost_plus_fixed_fee' | 'cost_plus_percentage' | 'stipulated_sum'
export type FoundationType = 'slab' | 'crawl_space' | 'basement'
export type LotStatus = 'raw' | 'developing' | 'finished' | 'contracted' | 'sold'
export type ExpenseStatus = 'pending' | 'approved' | 'paid' | 'rejected'
export type ClientType = 'internal' | 'third_party'
export type JobStatus = 'pre_construction' | 'active' | 'punch_co' | 'warranty' | 'complete' | 'closed'
export type StateCode = 'SC' | 'NC'
export type MilestoneStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked'
export type POStatus = 'draft' | 'issued' | 'work_complete' | 'invoiced' | 'approved' | 'scheduled_for_payment' | 'paid'
export type LienWaiverStatus = 'none' | 'conditional_received' | 'unconditional_received'
export type COReasonCategory = 'owner_request_upgrade' | 'field_condition' | 'design_error' | 'code_requirement' | 'scope_clarification'
export type ApprovalStatus = 'submitted' | 'under_review' | 'approved' | 'denied'
export type SelectionStatus = 'pending' | 'selected' | 'ordered' | 'received' | 'installed'
export type InspectionResult = 'pass' | 'fail' | 'conditional'
export type PermitRecordType = 'unit' | 'job'
export type PermitType = 'building' | 'electrical' | 'plumbing' | 'mechanical' | 'land_disturbance' | 'driveway' | 'other'
export type PermitStatus = 'applied' | 'in_review' | 'issued' | 'active' | 'expired' | 'closed'
export type WarrantyUrgency = 'routine' | 'urgent' | 'emergency'
export type WarrantyCostResponsibility = 'vendor_chargeback' | 'absorbed'
export type WarrantyStatus = 'open' | 'scheduled' | 'in_progress' | 'resolved' | 'closed'
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IssueCategory = 'safety_hazard' | 'quality_deficiency' | 'schedule_impact' | 'material_defect' | 'sub_performance' | 'weather_delay' | 'code_violation'
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'verified'
export type PaymentMethod = 'ach' | 'check' | 'wire'
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'cost_of_sales' | 'operating_expense'
export type NormalBalance = 'debit' | 'credit'
export type TransactionType = 'journal_entry' | 'bill_payment' | 'deposit' | 'transfer' | 'draw' | 'distribution' | 'capital_contribution'
export type TransactionStatus = 'pending' | 'approved' | 'posted' | 'voided'
export type FiscalPeriodStatus = 'open' | 'review' | 'closed' | 'locked'
export type AccreditationStatus = 'verified' | 'pending' | 'not_required'
export type CapitalCallStatus = 'created' | 'issued' | 'partially_funded' | 'fully_funded' | 'closed'
export type CapitalCallResponseStatus = 'pending' | 'partial' | 'funded' | 'defaulted'
export type WaterfallType = 'simple_preferred_promote' | 'straight_split' | 'multi_tier_irr'
export type DistributionStatus = 'draft' | 'approved' | 'distributed'
export type LoanType = 'construction' | 'development' | 'acquisition' | 'bridge' | 'permanent' | 'line_of_credit'
export type RateType = 'fixed' | 'variable'
export type LoanStatus = 'pending' | 'active' | 'paid_off' | 'defaulted' | 'matured'
export type LoanDrawStatus = 'requested' | 'approved' | 'funded' | 'denied'
export type WorkflowModule = 'opportunities' | 'projects' | 'construction'
export type WorkflowInstanceStatus = 'active' | 'complete' | 'cancelled'
export type MilestoneInstanceStatus = 'pending' | 'active' | 'complete' | 'skipped'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'not_started' | 'in_progress' | 'complete' | 'skipped'
export type FloorPlanType = 'sfh' | 'townhome'
export type FloorPlanStatus = 'active' | 'archived'
export type IntegrationProvider = 'sharepoint' | 'outlook' | 'teams' | 'docuseal' | 'akaunting' | 'plaid'
export type CalendarEventType = 'milestone_due' | 'inspection' | 'closing' | 'land_committee' | 'handoff_meeting' | 'permit_expiration' | 'insurance_expiration' | 'loan_maturity' | 'task_due' | 'custom'

// ---- Table Row Types ----

export interface Organization {
  id: string
  name: string
  logo_url: string | null
  default_entity_id: string | null
  timezone: string
  fiscal_year_start_month: number
  currency: string
  default_contingency_pct: number
  default_retainage_pct: number
  margin_strong_threshold: number
  margin_good_threshold: number
  margin_marginal_threshold: number
  default_ltc_ratio: number
  default_interest_rate: number | null
  default_construction_period_days: number
  default_selling_cost_pct: number
  default_cost_of_capital_rate: number
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  organization_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: UserRole | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  organization_id: string | null
  name: string
  description: string | null
  created_at: string
}

export interface Contact {
  id: string
  organization_id: string | null
  first_name: string
  last_name: string
  company: string | null
  email: string | null
  phone: string | null
  secondary_phone: string | null
  mailing_address_line1: string | null
  mailing_address_line2: string | null
  mailing_city: string | null
  mailing_state: string | null
  mailing_zip: string | null
  notes: string | null
  status: ContactStatus
  tags: string[] | null
  created_at: string
  updated_at: string
}

export interface Entity {
  id: string
  organization_id: string | null
  name: string
  use_type: EntityUseType | null
  legal_type: EntityLegalType | null
  parent_entity_id: string | null
  ein: string | null
  state_of_formation: string | null
  formation_date: string | null
  registered_agent: string | null
  operating_agreement_document_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: string
  organization_id: string | null
  name: string | null
  address_line1: string | null
  address_city: string | null
  address_county: string | null
  address_state: string
  address_zip: string | null
  parcel_tms_number: string | null
  type: OpportunityType
  current_stage: string
  source: OpportunitySource | null
  assigned_to: string | null
  owner_entity_id: string | null
  projected_purchase_price: number | null
  projected_sale_price: number | null
  offer_date: string | null
  contract_date: string | null
  dd_expiration_date: string | null
  closing_date: string | null
  zoning_current: string | null
  build_type: BuildType | null
  road_surrounding: string | null
  construction_buffers_setbacks: string | null
  historic_district_overlay: boolean
  has_public_water: boolean | null
  has_public_sewer: boolean | null
  has_power: boolean | null
  floor_plan_id: string | null
  best_fit_model: string | null
  garage_position: GaragePosition | null
  survey_complete: boolean
  buildable_footprint_description: string | null
  lot_width: number | null
  lot_depth: number | null
  lot_sf: number | null
  total_acreage: number | null
  estimated_total_lots: number | null
  zoning_required: string | null
  preliminary_plat_status: string | null
  target_builders: string | null
  infrastructure_scope_estimate: number | null
  status: OpportunityStatus
  converted_to_project_id: string | null
  archived_reason: string | null
  created_at: string
  updated_at: string
}

export interface DealAnalysis {
  id: string
  opportunity_id: string
  floor_plan_id: string | null
  upgrade_package: UpgradePackage | null
  municipality_id: string | null
  purchase_price: number | null
  site_work_estimate: number | null
  other_site_costs: number | null
  site_specific_vertical_adjustments: number | null
  asset_sales_price: number | null
  selling_concessions: number | null
  project_duration_days: number | null
  interest_rate_override: number | null
  sticks_and_bricks: number | null
  upgrades: number | null
  lot_preparation: number | null
  municipality_soft_costs: number | null
  builder_fee: number | null
  contingency: number | null
  total_contract_cost: number | null
  warranty_reserve: number | null
  builders_risk_insurance: number | null
  closing_costs: number | null
  utility_charges: number | null
  total_project_cost: number | null
  loan_amount: number | null
  equity_required: number | null
  interest_on_loan: number | null
  cost_of_capital_on_equity: number | null
  total_carry_costs: number | null
  total_all_in_cost: number | null
  total_revenue: number | null
  total_selling_costs: number | null
  net_sales_proceeds: number | null
  net_profit: number | null
  net_profit_margin: number | null
  verdict: DealVerdict | null
  created_by: string | null
  is_current: boolean
  created_at: string
}

export interface Project {
  id: string
  organization_id: string | null
  project_number: string | null
  name: string
  address_line1: string | null
  address_city: string | null
  address_county: string | null
  address_state: string | null
  address_zip: string | null
  type: ProjectType
  owner_entity_id: string | null
  builder_entity_id: string | null
  status: ProjectStatus
  acquisition_date: string | null
  purchase_price: number | null
  total_budget: number | null
  current_spend: number
  projected_final_cost: number | null
  contract_type: ContractType | null
  contract_amount: number | null
  contract_execution_date: string | null
  contract_scope_summary: string | null
  builder_fee_amount: number | null
  lot_width: number | null
  lot_depth: number | null
  lot_sf: number | null
  zoning: string | null
  setbacks: string | null
  buildable_area: string | null
  floor_plan_id: string | null
  upgrade_package: string | null
  foundation_type: FoundationType | null
  utility_confirmation_status: string | null
  total_acreage: number | null
  total_lots: number | null
  phase_breakdown: Json | null
  preliminary_plat_status: string | null
  final_plat_status: string | null
  civil_engineer_contact_id: string | null
  municipality_id: string | null
  impact_fees: number | null
  bonds: number | null
  infrastructure_acceptance_status: string | null
  floor_plan_mix: Json | null
  sales_pricing_matrix: Json | null
  model_home_lot: string | null
  hoa_setup_status: string | null
  source_opportunity_id: string | null
  permit_issued_date: string | null
  construction_start_date: string | null
  projected_completion_date: string | null
  actual_completion_date: string | null
  co_date: string | null
  sale_date: string | null
  warranty_expiration: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  organization_id: string | null
  job_number: string | null
  name: string
  client_type: ClientType
  client_entity_id: string | null
  client_id: string | null
  contract_type: ContractType | null
  contract_amount: number | null
  builder_fee: number | null
  status: JobStatus
  unit_count: number
  linked_project_id: string | null
  start_date: string | null
  projected_completion: string | null
  superintendent_id: string | null
  pm_id: string | null
  state: StateCode | null
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  job_id: string
  unit_number: string | null
  lot_address: string | null
  floor_plan_id: string | null
  upgrade_package: UpgradePackage | null
  current_milestone: number
  base_sticks_bricks: number | null
  upgrade_cost: number | null
  lot_preparation_cost: number | null
  site_specific_adjustments: number | null
  soft_costs: number | null
  builder_fee: number | null
  contingency: number | null
  total_budget: number | null
  total_committed: number
  total_actual: number
  variance: number
  permit_issued_date: string | null
  construction_start: string | null
  projected_completion: string | null
  actual_completion: string | null
  co_date: string | null
  warranty_expiration: string | null
  created_at: string
  updated_at: string
}

export interface UnitMilestone {
  id: string
  unit_id: string
  phase_number: number
  name: string
  standard_duration_days: number | null
  planned_start: string | null
  planned_end: string | null
  actual_start: string | null
  actual_end: string | null
  status: MilestoneStatus
  days_in_milestone: number
  is_overdue: boolean
  override_by: string | null
  override_note: string | null
}

export interface PurchaseOrder {
  id: string
  po_number: string | null
  unit_id: string
  job_id: string | null
  trade_category: string
  vendor_contact_id: string | null
  description: string | null
  amount: number
  status: POStatus
  issue_date: string | null
  completion_date: string | null
  invoice_date: string | null
  invoice_number: string | null
  payment_date: string | null
  lien_waiver_status: LienWaiverStatus
  retainage_pct: number
  retainage_amount: number | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface ChangeOrder {
  id: string
  co_number: string | null
  linked_po_id: string | null
  unit_id: string
  job_id: string | null
  description: string
  reason_category: COReasonCategory | null
  cost_impact: number | null
  markup_pct: number | null
  total_with_markup: number | null
  schedule_impact_days: number
  approval_status: ApprovalStatus
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export interface FloorPlan {
  id: string
  organization_id: string | null
  name: string
  type: FloorPlanType | null
  heated_sf: number | null
  bedrooms: number | null
  bathrooms: number | null
  garage: string | null
  unheated_sf: number | null
  stories: number | null
  min_lot_width: number | null
  min_lot_depth: number | null
  unit_width: number | null
  base_sticks_bricks_cost: number | null
  total_cost_incl_soft: number | null
  cost_per_heated_sf_sb: number | null
  cost_per_heated_sf_total: number | null
  classic_upgrade_cost: number | null
  elegance_upgrade_cost: number | null
  harmony_upgrade_cost: number | null
  architectural_plan_url: string | null
  reference_image_url: string | null
  notes: string | null
  status: FloorPlanStatus
  cost_breakdown: Json | null
  created_at: string
  updated_at: string
}

export interface Municipality {
  id: string
  organization_id: string | null
  name: string
  state: StateCode
  water_tap_fee: number | null
  sewer_tap_fee: number | null
  system_development_fees: number | null
  total_ws_fees: number | null
  meter_charges: number | null
  impact_fees: number | null
  permit_fee_schedule: Json | null
  gas_tap_fee: number | null
  architect_fee: number | null
  engineering_fee: number | null
  survey_fee: number | null
  miscellaneous_fees: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ChartOfAccounts {
  id: string
  entity_id: string
  account_number: string
  account_name: string
  account_type: AccountType | null
  parent_account_id: string | null
  is_active: boolean
  description: string | null
  normal_balance: NormalBalance | null
}

export interface Transaction {
  id: string
  entity_id: string
  date: string
  description: string | null
  account_id: string
  debit: number
  credit: number
  project_id: string | null
  unit_id: string | null
  reference_number: string | null
  transaction_type: TransactionType | null
  supporting_document_id: string | null
  status: TransactionStatus
  approved_by: string | null
  approved_at: string | null
  period: string | null
  is_adjusting_entry: boolean
  batch_id: string | null
  akaunting_synced: boolean
  akaunting_sync_at: string | null
  created_at: string
  updated_at: string
}

export interface Investor {
  id: string
  entity_id: string
  contact_id: string | null
  ownership_pct: number | null
  capital_commitment: number | null
  contributed_to_date: number
  preferred_return_rate: number | null
  promote_carry_structure: string | null
  accreditation_status: AccreditationStatus | null
  accreditation_verification_date: string | null
  subscription_agreement_document_id: string | null
  w9_document_id: string | null
  created_at: string
}

export interface Loan {
  id: string
  entity_id: string | null
  project_id: string | null
  lender_contact_id: string | null
  loan_type: LoanType | null
  original_amount: number | null
  drawn_amount: number
  available_amount: number | null
  interest_rate: number | null
  rate_type: RateType | null
  maturity_date: string | null
  origination_date: string | null
  ltc_ratio: number | null
  ltv_ratio: number | null
  covenants: string | null
  accrued_interest: number
  status: LoanStatus
  created_at: string
  updated_at: string
}

export interface WaterfallStructure {
  id: string
  entity_id: string | null
  name: string
  type: WaterfallType | null
  tiers: Json
  is_active: boolean
  created_at: string
}

export interface CalendarEvent {
  id: string
  organization_id: string | null
  title: string
  description: string | null
  event_type: CalendarEventType | null
  start_date: string
  end_date: string | null
  all_day: boolean
  is_recurring: boolean
  recurrence_rule: string | null
  linked_record_type: string | null
  linked_record_id: string | null
  assigned_to: string | null
  team_id: string | null
  outlook_event_id: string | null
  created_at: string
}

export interface WorkflowTemplate {
  id: string
  organization_id: string | null
  module: WorkflowModule
  record_type: string
  name: string
  goal_statement: string | null
  is_active: boolean
  created_at: string
}

export interface TaskInstance {
  id: string
  milestone_instance_id: string
  task_list_name: string | null
  template_id: string | null
  title: string
  description: string | null
  assigned_role: string | null
  assigned_to: string | null
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  linked_record_type: string | null
  linked_record_id: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  organization_id: string | null
  user_id: string | null
  record_type: string
  record_id: string
  action: string
  description: string | null
  metadata: Json | null
  created_at: string
}

export interface Note {
  id: string
  record_type: string
  record_id: string
  user_id: string | null
  content: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  record_type: string
  record_id: string
  name: string
  file_type: string | null
  file_size_bytes: number | null
  storage_path: string | null
  sharepoint_url: string | null
  sharepoint_folder: string | null
  uploaded_by: string | null
  created_at: string
}

export interface VendorProfile {
  id: string
  contact_id: string
  trades_performed: string[] | null
  license_number: string | null
  license_expiration: string | null
  w9_on_file: boolean
  bank_name: string | null
  bank_routing: string | null
  bank_account: string | null
  payment_method: PaymentMethod | null
  performance_score: number | null
  on_time_completion_rate: number | null
  average_punch_items: number | null
  pm_rating: number | null
  ytd_payments: number
  is_1099_eligible: boolean
  created_at: string
  updated_at: string
}

export interface Selection {
  id: string
  unit_id: string
  category: string
  item_name: string | null
  description: string | null
  vendor_contact_id: string | null
  base_cost: number | null
  upgrade_delta: number
  status: SelectionStatus
  linked_po_id: string | null
  created_at: string
  updated_at: string
}

export interface Inspection {
  id: string
  unit_id: string
  type: string
  linked_milestone_phase: number | null
  municipality_id: string | null
  inspector_name: string | null
  scheduled_date: string | null
  actual_date: string | null
  result: InspectionResult | null
  notes: string | null
  re_inspection_date: string | null
  re_inspection_result: string | null
  created_at: string
}

export interface Permit {
  id: string
  record_type: PermitRecordType | null
  record_id: string
  permit_type: PermitType | null
  jurisdiction: string | null
  application_date: string | null
  permit_number: string | null
  issued_date: string | null
  expiration_date: string | null
  inspection_requirements: string | null
  fee: number | null
  status: PermitStatus
  created_at: string
}

export interface WarrantyClaim {
  id: string
  unit_id: string
  claim_date: string
  category: string | null
  description: string
  photos: string[] | null
  urgency: WarrantyUrgency | null
  responsible_vendor_id: string | null
  notification_date: string | null
  scheduled_repair_date: string | null
  completion_date: string | null
  resolution_notes: string | null
  owner_signoff: boolean
  cost: number | null
  cost_responsibility: WarrantyCostResponsibility | null
  status: WarrantyStatus
  created_at: string
}

export interface TradeCategory {
  id: string
  organization_id: string | null
  code: string
  name: string
  description: string | null
  default_vendor_id: string | null
  typical_cost_low: number | null
  typical_cost_high: number | null
  is_active: boolean
}

// ---- Database Interface (Supabase compatible) ----
// Note: When connecting to a real Supabase instance, regenerate types with:
//   npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts

type AnyTable = { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }

export interface Database {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: Partial<Organization>; Update: Partial<Organization>; Relationships: [] }
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] }
      teams: { Row: Team; Insert: Partial<Team>; Update: Partial<Team>; Relationships: [] }
      team_members: AnyTable
      module_access: AnyTable
      contacts: { Row: Contact; Insert: Partial<Contact> & { first_name: string; last_name: string }; Update: Partial<Contact>; Relationships: [] }
      contact_types: AnyTable
      contact_assignments: AnyTable
      entities: { Row: Entity; Insert: Partial<Entity> & { name: string }; Update: Partial<Entity>; Relationships: [] }
      opportunities: { Row: Opportunity; Insert: Partial<Opportunity> & { type: OpportunityType; current_stage: string }; Update: Partial<Opportunity>; Relationships: [] }
      opportunity_stages: AnyTable
      deal_analyses: { Row: DealAnalysis; Insert: Partial<DealAnalysis> & { opportunity_id: string }; Update: Partial<DealAnalysis>; Relationships: [] }
      comparable_sales: AnyTable
      projects: { Row: Project; Insert: Partial<Project> & { name: string; type: ProjectType }; Update: Partial<Project>; Relationships: [] }
      project_lots: AnyTable
      project_expenses: AnyTable
      project_draws: AnyTable
      project_milestones: AnyTable
      project_tasks: AnyTable
      project_budget_categories: AnyTable
      jobs: { Row: Job; Insert: Partial<Job> & { name: string; client_type: ClientType }; Update: Partial<Job>; Relationships: [] }
      units: { Row: Unit; Insert: Partial<Unit> & { job_id: string }; Update: Partial<Unit>; Relationships: [] }
      unit_milestones: { Row: UnitMilestone; Insert: Partial<UnitMilestone> & { unit_id: string; phase_number: number; name: string }; Update: Partial<UnitMilestone>; Relationships: [] }
      purchase_orders: { Row: PurchaseOrder; Insert: Partial<PurchaseOrder> & { unit_id: string; trade_category: string; amount: number }; Update: Partial<PurchaseOrder>; Relationships: [] }
      change_orders: { Row: ChangeOrder; Insert: Partial<ChangeOrder> & { unit_id: string; description: string }; Update: Partial<ChangeOrder>; Relationships: [] }
      selections: { Row: Selection; Insert: Partial<Selection> & { unit_id: string; category: string }; Update: Partial<Selection>; Relationships: [] }
      inspections: { Row: Inspection; Insert: Partial<Inspection> & { unit_id: string; type: string }; Update: Partial<Inspection>; Relationships: [] }
      permits: { Row: Permit; Insert: Partial<Permit> & { record_id: string }; Update: Partial<Permit>; Relationships: [] }
      warranty_claims: { Row: WarrantyClaim; Insert: Partial<WarrantyClaim> & { unit_id: string; claim_date: string; description: string }; Update: Partial<WarrantyClaim>; Relationships: [] }
      floor_plans: { Row: FloorPlan; Insert: Partial<FloorPlan> & { name: string }; Update: Partial<FloorPlan>; Relationships: [] }
      municipalities: { Row: Municipality; Insert: Partial<Municipality> & { name: string; state: StateCode }; Update: Partial<Municipality>; Relationships: [] }
      trade_categories: { Row: TradeCategory; Insert: Partial<TradeCategory> & { code: string; name: string }; Update: Partial<TradeCategory>; Relationships: [] }
      schedule_templates: AnyTable
      chart_of_accounts: { Row: ChartOfAccounts; Insert: Partial<ChartOfAccounts> & { entity_id: string; account_number: string; account_name: string }; Update: Partial<ChartOfAccounts>; Relationships: [] }
      accounts: AnyTable
      transactions: { Row: Transaction; Insert: Partial<Transaction> & { entity_id: string; date: string; account_id: string }; Update: Partial<Transaction>; Relationships: [] }
      transaction_line_items: AnyTable
      transaction_reconciliations: AnyTable
      fiscal_periods: AnyTable
      accounting_periods: AnyTable
      investors: { Row: Investor; Insert: Partial<Investor> & { entity_id: string }; Update: Partial<Investor>; Relationships: [] }
      capital_calls: AnyTable
      capital_call_responses: AnyTable
      distributions: AnyTable
      distribution_allocations: AnyTable
      loans: { Row: Loan; Insert: Partial<Loan>; Update: Partial<Loan>; Relationships: [] }
      loan_draws: AnyTable
      waterfall_structures: { Row: WaterfallStructure; Insert: Partial<WaterfallStructure> & { name: string; tiers: Json }; Update: Partial<WaterfallStructure>; Relationships: [] }
      calendar_events: { Row: CalendarEvent; Insert: Partial<CalendarEvent> & { title: string; start_date: string }; Update: Partial<CalendarEvent>; Relationships: [] }
      vendor_profiles: { Row: VendorProfile; Insert: Partial<VendorProfile> & { contact_id: string }; Update: Partial<VendorProfile>; Relationships: [] }
      activity_log: { Row: ActivityLog; Insert: Partial<ActivityLog> & { record_type: string; record_id: string; action: string }; Update: Partial<ActivityLog>; Relationships: [] }
      notes: { Row: Note; Insert: Partial<Note> & { record_type: string; record_id: string; content: string }; Update: Partial<Note>; Relationships: [] }
      documents: { Row: Document; Insert: Partial<Document> & { record_type: string; record_id: string; name: string }; Update: Partial<Document>; Relationships: [] }
      document_signatures: AnyTable
      insurance_certificates: AnyTable
      construction_issues: AnyTable
      workflow_templates: { Row: WorkflowTemplate; Insert: Partial<WorkflowTemplate> & { module: WorkflowModule; record_type: string; name: string }; Update: Partial<WorkflowTemplate>; Relationships: [] }
      milestone_templates: AnyTable
      task_list_templates: AnyTable
      task_templates: AnyTable
      workflow_instances: AnyTable
      milestone_instances: AnyTable
      task_instances: { Row: TaskInstance; Insert: Partial<TaskInstance> & { milestone_instance_id: string; title: string }; Update: Partial<TaskInstance>; Relationships: [] }
      integration_settings: AnyTable
      integration_sync_log: AnyTable
      contract_templates: AnyTable
      plaid_items: AnyTable
      [key: string]: AnyTable | { Row: any; Insert: any; Update: any; Relationships: any }
    }
    Views: {
      [key: string]: { Row: Record<string, any>; Relationships: [] }
    }
    Functions: {
      calculate_deal_analysis: { Args: Record<string, unknown>; Returns: string }
      convert_opportunity_to_project: { Args: { p_opportunity_id: string }; Returns: string }
      generate_project_number: { Args: Record<string, never>; Returns: string }
      [key: string]: { Args: Record<string, any>; Returns: any }
    }
    Enums: {
      [key: string]: string
    }
    CompositeTypes: {
      [key: string]: Record<string, any>
    }
  }
}
