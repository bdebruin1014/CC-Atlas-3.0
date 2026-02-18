// ===========================================
// ATLAS Platform — Supabase Database Types
// Generated from schema migrations 001-008
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
export type OpportunitySource = 'mls' | 'direct_mail' | 'referral' | 'driving_for_dollars' | 'auction' | 'wholesaler' | 'builder_referral' | 'agent_relationship' | 'online_listing' | 'other'
export type OpportunityStatus = 'active' | 'archived' | 'converted'
export type BuildType = 'spec' | 'pre_sale' | 'custom' | 'model'
export type GaragePosition = 'front_entry' | 'side_entry' | 'rear_entry' | 'detached' | 'none'
export type UpgradePackage = 'standard' | 'classic' | 'elegance' | 'harmony'
export type DealVerdict = 'strong_deal' | 'good_deal' | 'marginal' | 'no_go'
export type ProjectType = 'scattered_lot' | 'lot_development' | 'community_development' | 'lot_purchase' | 'other'
export type ProjectStatus = 'pre_construction' | 'active' | 'under_contract' | 'complete' | 'warranty' | 'closed'
export type ContractType = 'cost_plus' | 'fixed_price' | 'time_and_materials' | 'guaranteed_maximum' | 'unit_price'
export type FoundationType = 'slab' | 'crawl_space' | 'basement' | 'pier_and_beam' | 'other'
export type LotStatus = 'raw' | 'graded' | 'improved' | 'permitted' | 'under_construction' | 'complete' | 'sold'
export type ExpenseStatus = 'pending' | 'approved' | 'paid' | 'rejected'
export type ClientType = 'internal' | 'third_party'
export type JobStatus = 'pre_construction' | 'active' | 'punch_list' | 'substantial_completion' | 'warranty' | 'closed'
export type StateCode = 'SC' | 'NC'
export type MilestoneStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked'
export type POStatus = 'draft' | 'submitted' | 'approved' | 'in_progress' | 'complete' | 'invoiced' | 'paid'
export type LienWaiverStatus = 'not_required' | 'pending' | 'conditional' | 'unconditional'
export type COReasonCategory = 'owner_request' | 'field_condition' | 'design_error' | 'code_requirement' | 'scope_clarification' | 'other'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revised'
export type SelectionStatus = 'pending' | 'selected' | 'ordered' | 'received' | 'installed'
export type InspectionResult = 'pass' | 'fail' | 'conditional'
export type PermitRecordType = 'unit' | 'job'
export type PermitType = 'building' | 'grading' | 'mechanical' | 'electrical' | 'plumbing' | 'demolition' | 'other'
export type PermitStatus = 'not_submitted' | 'submitted' | 'in_review' | 'approved' | 'expired' | 'revoked'
export type WarrantyUrgency = 'emergency' | 'urgent' | 'standard' | 'low'
export type WarrantyCostResponsibility = 'builder' | 'vendor' | 'owner' | 'shared' | 'warranty'
export type WarrantyStatus = 'reported' | 'scheduled' | 'in_progress' | 'resolved' | 'closed'
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low'
export type IssueCategory = 'quality' | 'safety' | 'schedule' | 'budget' | 'design' | 'material' | 'other'
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type PaymentMethod = 'check' | 'ach' | 'wire' | 'credit_card' | 'other'
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'contra'
export type NormalBalance = 'debit' | 'credit'
export type TransactionType = 'journal_entry' | 'invoice' | 'payment' | 'receipt' | 'transfer' | 'adjustment' | 'closing'
export type TransactionStatus = 'pending' | 'approved' | 'posted' | 'voided'
export type FiscalPeriodStatus = 'open' | 'review' | 'closed' | 'locked'
export type AccreditationStatus = 'accredited' | 'qualified_purchaser' | 'non_accredited' | 'pending_verification'
export type CapitalCallStatus = 'draft' | 'issued' | 'partially_funded' | 'fully_funded' | 'cancelled'
export type CapitalCallResponseStatus = 'pending' | 'partial' | 'received' | 'overdue' | 'waived'
export type WaterfallType = 'preferred_return' | 'catch_up' | 'residual_split'
export type DistributionType = 'return_of_capital' | 'preferred_return' | 'profit_distribution' | 'liquidating'
export type DistributionStatus = 'draft' | 'approved' | 'distributed' | 'cancelled'
export type LoanType = 'construction' | 'acquisition' | 'bridge' | 'permanent' | 'line_of_credit' | 'mezzanine'
export type InterestType = 'fixed' | 'variable' | 'prime_plus'
export type LoanStatus = 'pending' | 'active' | 'drawn_in_full' | 'paid_off' | 'defaulted' | 'refinanced'
export type LoanDrawStatus = 'requested' | 'approved' | 'funded' | 'rejected'
export type WorkflowType = 'opportunity' | 'project' | 'construction' | 'onboarding' | 'closing' | 'custom'
export type WorkflowInstanceStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
export type MilestoneInstanceStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'blocked'
export type FloorPlanType = 'sfh' | 'townhome'
export type FloorPlanStatus = 'active' | 'inactive' | 'draft'
export type IntegrationProvider = 'sharepoint' | 'outlook' | 'akaunting' | 'quickbooks' | 'zapier' | 'sendgrid'
export type CalendarEventType = 'inspection' | 'closing' | 'meeting' | 'deadline' | 'milestone' | 'permit' | 'walkthrough' | 'open_house' | 'draw_request' | 'other'

// Standalone tasks enums
export type StandaloneTaskStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled'
export type StandaloneTaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type StandaloneTaskModule = 'opportunity' | 'project' | 'construction' | 'disposition' | 'general'

// Disposition module enums
export type DispositionPropertyType = 'single_family' | 'townhome' | 'lot' | 'condo' | 'duplex' | 'land'
export type DispositionListingStatus = 'draft' | 'pre_listing' | 'active' | 'under_contract' | 'pending_closing' | 'closed' | 'withdrawn' | 'expired'
export type ShowingInterestLevel = 'not_interested' | 'somewhat' | 'very_interested' | 'making_offer'
export type OfferFinancingType = 'cash' | 'conventional' | 'fha' | 'va' | 'usda' | 'other'
export type OfferStatus = 'received' | 'reviewing' | 'countered' | 'accepted' | 'rejected' | 'expired' | 'withdrawn'
export type DispositionContractStatus = 'pending' | 'active' | 'contingent' | 'clear_to_close' | 'closed' | 'terminated' | 'cancelled'
export type ContractInspectionStatus = 'pending' | 'scheduled' | 'passed' | 'failed' | 'waived'
export type ContractAppraisalStatus = 'pending' | 'ordered' | 'received' | 'approved' | 'disputed' | 'waived'
export type ContractFinancingStatus = 'pending' | 'pre_approved' | 'underwriting' | 'clear_to_close' | 'denied'
export type SettlementStatus = 'pending' | 'scheduled' | 'closed'
export type DispositionCostCategory = 'commission' | 'staging' | 'photography' | 'marketing' | 'closing_costs' | 'title_insurance' | 'recording' | 'transfer_tax' | 'hoa' | 'loan_payoff' | 'taxes' | 'repairs' | 'other'
export type BulkSaleStatus = 'negotiating' | 'active' | 'complete' | 'terminated'
export type TakedownStatus = 'scheduled' | 'upcoming' | 'completed' | 'delayed'

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
  updated_at: string
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
  mailing_address_city: string | null
  mailing_address_state: string | null
  mailing_address_zip: string | null
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
  // Address — DB column is address_street, NOT address_line1
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  address_county: string | null
  parcel_tms_number: string | null
  // Classification
  type: OpportunityType
  current_stage: string
  source: OpportunitySource | null
  // Assignments
  assigned_to: string | null
  owner_entity_id: string | null
  // Projected values
  projected_purchase_price: number | null
  projected_sale_price: number | null
  projected_profit: number | null
  projected_margin_pct: number | null
  // Key dates
  date_identified: string | null
  date_under_contract: string | null
  due_diligence_deadline: string | null
  projected_close_date: string | null
  // Scattered lot specific
  zoning_current: string | null
  build_type: BuildType | null
  road_surrounding: string | null
  buffers: string | null
  historic_district: boolean
  water_available: boolean | null
  sewer_available: boolean | null
  electric_available: boolean | null
  gas_available: boolean | null
  floor_plan_id: string | null
  best_fit_model: string | null
  garage_position: GaragePosition | null
  survey_complete: boolean
  buildable_description: string | null
  lot_width: number | null
  lot_depth: number | null
  lot_sqft: number | null
  // Lot development / community
  total_acreage: number | null
  estimated_total_lots: number | null
  zoning_required: string | null
  preliminary_plat_status: string | null
  target_builders: string | null
  infrastructure_scope_estimate: number | null
  // Status
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
  // Inputs
  purchase_price: number | null
  site_work_estimate: number | null
  other_site_costs: number | null
  site_specific_vertical_adjustments: number | null
  asset_sales_price: number | null
  selling_concessions: number | null
  project_duration_days: number | null
  interest_rate_override: number | null
  // Section 1: Acquisition costs
  calc_total_acquisition_cost: number | null
  // Section 2: Site costs
  calc_total_site_costs: number | null
  // Section 3: Vertical construction
  calc_base_construction_cost: number | null
  calc_upgrade_cost: number | null
  calc_site_specific_adjustments: number | null
  calc_total_vertical_cost: number | null
  // Section 4: Soft costs
  calc_permit_fees: number | null
  calc_impact_fees: number | null
  calc_water_sewer_tap: number | null
  calc_architecture_engineering: number | null
  calc_survey_cost: number | null
  calc_insurance: number | null
  calc_legal_closing: number | null
  calc_contingency: number | null
  calc_total_soft_costs: number | null
  // Section 5: Total project cost
  calc_total_project_cost: number | null
  // Financing
  calc_loan_amount: number | null
  calc_equity_required: number | null
  calc_interest_expense: number | null
  // Revenue & Results
  calc_gross_revenue: number | null
  calc_selling_costs: number | null
  calc_net_revenue: number | null
  calc_gross_profit: number | null
  calc_gross_margin_pct: number | null
  calc_net_profit: number | null
  calc_net_margin_pct: number | null
  calc_roi: number | null
  calc_annualized_roi: number | null
  calc_cost_per_sf: number | null
  // Verdict
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
  // Address — DB column is address_street, NOT address_line1
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  address_county: string | null
  // Classification
  type: ProjectType
  owner_entity_id: string | null
  builder_entity_id: string | null
  status: ProjectStatus
  // Acquisition
  acquisition_date: string | null
  // Budget fields
  budget_land_acquisition: number | null
  budget_site_work: number | null
  budget_vertical_construction: number | null
  budget_soft_costs: number | null
  budget_contingency: number | null
  budget_total: number | null
  actual_total_cost: number | null
  budget_variance: number | null
  // Contract
  contract_amount: number | null
  contract_signed_date: string | null
  contract_document_id: string | null
  // Scattered lot / lot purchase specifics
  lot_width: number | null
  lot_depth: number | null
  lot_sqft: number | null
  zoning: string | null
  setback_front: number | null
  setback_rear: number | null
  setback_left: number | null
  setback_right: number | null
  floor_plan_id: string | null
  upgrade_package: UpgradePackage | null
  foundation_type: FoundationType | null
  water_status: string | null
  sewer_status: string | null
  electric_status: string | null
  gas_status: string | null
  // Lot development / community specifics
  total_acreage: number | null
  total_lots: number | null
  phase_breakdown: Json | null
  preliminary_plat_status: string | null
  final_plat_status: string | null
  municipality_id: string | null
  impact_fee_total: number | null
  bond_amount: number | null
  bond_release_status: string | null
  // Community development additional
  floor_plan_mix: Json | null
  sales_pricing_matrix: Json | null
  model_home_lot: string | null
  hoa_setup_status: string | null
  // Source opportunity
  source_opportunity_id: string | null
  // Key dates
  permit_submitted_date: string | null
  permit_approved_date: string | null
  construction_start_date: string | null
  projected_completion_date: string | null
  actual_completion_date: string | null
  co_date: string | null
  sale_date: string | null
  warranty_start_date: string | null
  warranty_end_date: string | null
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
  permit_date: string | null
  start_date: string | null
  projected_completion_date: string | null
  actual_completion_date: string | null
  co_date: string | null
  created_at: string
  updated_at: string
}

export interface UnitMilestone {
  id: string
  unit_id: string
  phase_number: number
  name: string
  standard_duration_days: number | null
  planned_start_date: string | null
  planned_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
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
  issued_date: string | null
  due_date: string | null
  completed_date: string | null
  invoice_number: string | null
  lien_waiver_status: LienWaiverStatus | null
  retainage_pct: number | null
  retainage_amount: number | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export type ApprovalThreshold = 'cm' | 'cm_principal' | 'principal'

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
  approval_threshold: ApprovalThreshold | null
  approval_notes: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
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
  lot_width_min: number | null
  lot_depth_min: number | null
  lot_sqft_min: number | null
  unit_width: number | null
  // Costs
  base_cost: number | null
  total_cost: number | null
  cost_per_sf: number | null
  // Upgrade costs by package
  upgrade_cost_classic: number | null
  upgrade_cost_elegance: number | null
  upgrade_cost_harmony: number | null
  // URLs
  plan_url: string | null
  brochure_url: string | null
  // Notes & status
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
  state: StateCode | null
  // Fee fields
  building_permit_fee: number | null
  grading_permit_fee: number | null
  mechanical_permit_fee: number | null
  electrical_permit_fee: number | null
  plumbing_permit_fee: number | null
  water_tap_fee: number | null
  sewer_tap_fee: number | null
  impact_fee_per_unit: number | null
  stormwater_fee: number | null
  tree_mitigation_fee: number | null
  road_impact_fee: number | null
  school_impact_fee: number | null
  park_impact_fee: number | null
  fire_impact_fee: number | null
  zoning_application_fee: number | null
  subdivision_application_fee: number | null
  plan_review_fee: number | null
  inspection_fee: number | null
  certificate_of_occupancy_fee: number | null
  permit_fee_schedule: Json | null
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
  period: string | null
  is_adjusting_entry: boolean
  batch_id: string | null
  akaunting_synced: boolean
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
  subscription_document_id: string | null
  operating_agreement_document_id: string | null
  created_at: string
}

export interface Loan {
  id: string
  entity_id: string | null
  project_id: string | null
  lender_contact_id: string | null
  loan_type: LoanType | null
  original_amount: number | null
  amount_drawn: number
  amount_available: number | null
  interest_rate: number | null
  interest_type: InterestType | null
  maturity_date: string | null
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
  name: string
  description: string | null
  workflow_type: WorkflowType | null
  trigger_event: string | null
  is_active: boolean
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TaskInstance {
  id: string
  milestone_instance_id: string
  task_template_id: string | null
  task_list_name: string | null
  name: string
  description: string | null
  sequence: number
  assigned_to: string | null
  status: TaskStatus
  due_date: string | null
  completed_at: string | null
  completed_by: string | null
  depends_on_task_instance_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  organization_id: string | null
  user_id: string | null
  record_type: string | null
  record_id: string | null
  action: string
  description: string | null
  metadata: Json | null
  created_at: string
}

export interface Note {
  id: string
  record_type: string | null
  record_id: string | null
  user_id: string | null
  content: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  record_type: string | null
  record_id: string | null
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
  license_state: string | null
  license_expiration: string | null
  w9_on_file: boolean
  bank_name: string | null
  bank_routing_number: string | null
  bank_account_number: string | null
  payment_method: PaymentMethod | null
  performance_score: number | null
  on_time_rate: number | null
  punch_items_avg: number | null
  pm_rating: number | null
  ytd_payments: number
  is_1099_eligible: boolean
  created_at: string
  updated_at: string
}

// Punch item enums
export type PunchItemRoom = 'exterior' | 'garage' | 'kitchen' | 'living_room' | 'dining_room' | 'master_bedroom' | 'master_bath' | 'bedroom_2' | 'bedroom_3' | 'bathroom_2' | 'bathroom_3' | 'laundry' | 'hallway' | 'closet' | 'porch_patio' | 'other'
export type PunchItemCategory = 'paint' | 'drywall' | 'trim' | 'flooring' | 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'door_window' | 'hardware' | 'cleaning' | 'landscaping' | 'concrete' | 'other'
export type PunchItemPriority = 'low' | 'medium' | 'high' | 'critical'
export type PunchItemStatus = 'open' | 'in_progress' | 'complete' | 'verified' | 'disputed'

export type PhotoCategory = 'progress' | 'inspection' | 'issue' | 'completion' | 'before' | 'after' | 'aerial' | 'other'

export interface ConstructionPhoto {
  id: string
  organization_id: string | null
  job_id: string | null
  unit_id: string | null
  milestone_id: string | null
  file_url: string
  thumbnail_url: string | null
  file_name: string | null
  file_size: number | null
  caption: string | null
  category: PhotoCategory | null
  taken_date: string | null
  taken_by: string | null
  latitude: number | null
  longitude: number | null
  tags: string[] | null
  created_at: string
}

export interface MilestonePhotoRequirement {
  id: string
  milestone_sequence: number
  required_count: number
  required_angles: string[] | null
  description: string | null
}

export interface DailyLog {
  id: string
  organization_id: string | null
  job_id: string
  log_date: string
  weather: string | null
  temperature_high: number | null
  temperature_low: number | null
  wind: string | null
  crew_count: number | null
  subcontractors_on_site: string[] | null
  work_performed: string
  materials_delivered: string | null
  equipment_on_site: string | null
  safety_incidents: string | null
  visitor_log: string | null
  delays: string | null
  delay_reason: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PunchItem {
  id: string
  organization_id: string | null
  job_id: string
  unit_id: string
  item_number: number
  room: PunchItemRoom
  category: PunchItemCategory
  description: string
  assigned_vendor_contact_id: string | null
  priority: PunchItemPriority
  status: PunchItemStatus
  round: number
  photos: string[] | null
  back_charge_vendor_contact_id: string | null
  back_charge_amount: number | null
  completed_at: string | null
  completed_by: string | null
  verified_at: string | null
  verified_by: string | null
  notes: string | null
  created_by: string | null
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
  re_inspection_required: boolean
  re_inspection_date: string | null
  re_inspection_result: InspectionResult | null
  created_at: string
}

export interface Permit {
  id: string
  record_type: PermitRecordType | null
  record_id: string | null
  permit_type: PermitType | null
  jurisdiction: string | null
  application_date: string | null
  approval_date: string | null
  expiration_date: string | null
  permit_number: string | null
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
  scheduled_repair_date: string | null
  completed_date: string | null
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
  cost_range_low: number | null
  cost_range_high: number | null
  is_active: boolean
}

// ---- Disposition Module ----

export interface DispositionListing {
  id: string
  organization_id: string
  project_id: string | null
  job_id: string | null
  unit_id: string | null
  entity_id: string | null
  listing_number: string | null
  property_address: string | null
  property_city: string | null
  property_state: string | null
  property_zip: string | null
  property_county: string | null
  property_type: DispositionPropertyType | null
  status: DispositionListingStatus
  list_price: number | null
  original_list_price: number | null
  listing_date: string | null
  expiration_date: string | null
  dom: number | null
  listing_agent_contact_id: string | null
  listing_agent_commission: number | null
  buyer_agent_commission: number | null
  mls_number: string | null
  mls_status: string | null
  lockbox_code: string | null
  showing_instructions: string | null
  marketing_description: string | null
  virtual_tour_url: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lot_sqft: number | null
  year_built: number | null
  garage_spaces: number | null
  created_at: string
  updated_at: string
}

export interface DispositionShowing {
  id: string
  listing_id: string
  showing_date: string | null
  showing_agent_name: string | null
  showing_agent_company: string | null
  showing_agent_phone: string | null
  showing_agent_email: string | null
  feedback: string | null
  interest_level: ShowingInterestLevel | null
  follow_up_needed: boolean
  follow_up_notes: string | null
  follow_up_date: string | null
  created_at: string
}

export interface DispositionOffer {
  id: string
  listing_id: string
  offer_number: string | null
  buyer_name: string | null
  buyer_agent_name: string | null
  buyer_agent_company: string | null
  buyer_agent_email: string | null
  buyer_agent_phone: string | null
  offer_price: number | null
  earnest_money: number | null
  em_due_date: string | null
  em_received: boolean
  financing_type: OfferFinancingType | null
  loan_amount: number | null
  down_payment: number | null
  closing_cost_assistance: number | null
  other_concessions: number | null
  concession_notes: string | null
  contingency_financing: boolean
  contingency_inspection: boolean
  contingency_appraisal: boolean
  contingency_sale: boolean
  proposed_closing_date: string | null
  proposed_possession_date: string | null
  expiration_date: string | null
  status: OfferStatus
  net_to_seller: number | null
  projected_profit: number | null
  counter_price: number | null
  counter_notes: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DispositionContract {
  id: string
  listing_id: string
  offer_id: string | null
  contract_number: string | null
  status: DispositionContractStatus
  effective_date: string | null
  dd_deadline: string | null
  financing_deadline: string | null
  appraisal_deadline: string | null
  closing_date: string | null
  possession_date: string | null
  purchase_price: number | null
  earnest_money: number | null
  seller_entity: string | null
  seller_contact_id: string | null
  buyer_entity: string | null
  buyer_contact_id: string | null
  title_company: string | null
  escrow_officer: string | null
  escrow_number: string | null
  closing_attorney: string | null
  inspection_status: ContractInspectionStatus | null
  inspection_date: string | null
  inspection_notes: string | null
  appraisal_status: ContractAppraisalStatus | null
  appraisal_value: number | null
  appraisal_date: string | null
  financing_status: ContractFinancingStatus | null
  loan_commitment_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DispositionSettlement {
  id: string
  contract_id: string
  listing_id: string
  settlement_number: string | null
  status: SettlementStatus
  closing_date: string | null
  title_company: string | null
  closing_attorney: string | null
  escrow_officer: string | null
  escrow_number: string | null
  units_conveyed: number | null
  lot_numbers: string | null
  gross_sale_price: number | null
  credit_contract_price: number | null
  credit_earnest_money: number | null
  credit_other: number | null
  charge_commission: number | null
  charge_title_insurance: number | null
  charge_settlement_fee: number | null
  charge_recording_fees: number | null
  charge_transfer_tax: number | null
  charge_hoa_transfer: number | null
  charge_loan_payoff: number | null
  charge_prorated_taxes: number | null
  charge_other: number | null
  total_credits: number | null
  total_charges: number | null
  net_to_seller: number | null
  funds_received: boolean
  date_received: string | null
  amount_received: number | null
  wire_confirmation: string | null
  created_at: string
  updated_at: string
}

export interface DispositionCost {
  id: string
  listing_id: string
  category: DispositionCostCategory | null
  description: string | null
  amount: number | null
  paid_date: string | null
  vendor_contact_id: string | null
  created_at: string
}

export interface DispositionPriceChange {
  id: string
  listing_id: string
  change_date: string | null
  old_price: number | null
  new_price: number | null
  reason: string | null
  created_by: string | null
  created_at: string
}

export interface DispositionBulkSaleAgreement {
  id: string
  project_id: string
  organization_id: string
  buyer_entity_name: string | null
  buyer_contact_id: string | null
  total_lots: number | null
  price_per_lot: number | null
  total_price: number | null
  contract_date: string | null
  status: BulkSaleStatus
  escalation_rate: number | null
  escalation_period: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DispositionTakedownSchedule {
  id: string
  bulk_sale_agreement_id: string
  takedown_number: number | null
  scheduled_date: string | null
  lots_count: number | null
  lot_numbers: string[] | null
  scheduled_amount: number | null
  status: TakedownStatus
  actual_date: string | null
  actual_amount: number | null
  variance: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ---- Standalone Tasks Module ----

export interface StandaloneTask {
  id: string
  organization_id: string
  title: string
  description: string | null
  status: StandaloneTaskStatus
  priority: StandaloneTaskPriority
  assigned_to: string | null
  created_by: string
  due_date: string | null
  completed_at: string | null
  completed_by: string | null
  module: StandaloneTaskModule | null
  linked_record_id: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

// ---- Database Interface (Supabase compatible) ----
// Note: When connecting to a real Supabase instance, regenerate types with:
//   npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      projects: { Row: Project; Insert: Partial<Project> & { name: string }; Update: Partial<Project>; Relationships: [] }
      project_lots: AnyTable
      project_expenses: AnyTable
      clients: AnyTable
      jobs: { Row: Job; Insert: Partial<Job> & { name: string; client_type: ClientType }; Update: Partial<Job>; Relationships: [] }
      units: { Row: Unit; Insert: Partial<Unit> & { job_id: string }; Update: Partial<Unit>; Relationships: [] }
      unit_milestones: { Row: UnitMilestone; Insert: Partial<UnitMilestone> & { unit_id: string; phase_number: number; name: string }; Update: Partial<UnitMilestone>; Relationships: [] }
      purchase_orders: { Row: PurchaseOrder; Insert: Partial<PurchaseOrder> & { unit_id: string; trade_category: string; amount: number }; Update: Partial<PurchaseOrder>; Relationships: [] }
      change_orders: { Row: ChangeOrder; Insert: Partial<ChangeOrder> & { unit_id: string; description: string }; Update: Partial<ChangeOrder>; Relationships: [] }
      selections: { Row: Selection; Insert: Partial<Selection> & { unit_id: string; category: string }; Update: Partial<Selection>; Relationships: [] }
      inspections: { Row: Inspection; Insert: Partial<Inspection> & { unit_id: string; type: string }; Update: Partial<Inspection>; Relationships: [] }
      permits: { Row: Permit; Insert: Partial<Permit>; Update: Partial<Permit>; Relationships: [] }
      warranty_claims: { Row: WarrantyClaim; Insert: Partial<WarrantyClaim> & { unit_id: string; claim_date: string; description: string }; Update: Partial<WarrantyClaim>; Relationships: [] }
      floor_plans: { Row: FloorPlan; Insert: Partial<FloorPlan> & { name: string }; Update: Partial<FloorPlan>; Relationships: [] }
      municipalities: { Row: Municipality; Insert: Partial<Municipality> & { name: string }; Update: Partial<Municipality>; Relationships: [] }
      trade_categories: { Row: TradeCategory; Insert: Partial<TradeCategory> & { code: string; name: string }; Update: Partial<TradeCategory>; Relationships: [] }
      schedule_templates: AnyTable
      chart_of_accounts: { Row: ChartOfAccounts; Insert: Partial<ChartOfAccounts> & { entity_id: string; account_number: string; account_name: string }; Update: Partial<ChartOfAccounts>; Relationships: [] }
      transactions: { Row: Transaction; Insert: Partial<Transaction> & { entity_id: string; date: string; account_id: string }; Update: Partial<Transaction>; Relationships: [] }
      fiscal_periods: AnyTable
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
      activity_log: { Row: ActivityLog; Insert: Partial<ActivityLog> & { action: string }; Update: Partial<ActivityLog>; Relationships: [] }
      notes: { Row: Note; Insert: Partial<Note> & { content: string }; Update: Partial<Note>; Relationships: [] }
      documents: { Row: Document; Insert: Partial<Document> & { name: string }; Update: Partial<Document>; Relationships: [] }
      insurance_certificates: AnyTable
      construction_issues: AnyTable
      workflow_templates: { Row: WorkflowTemplate; Insert: Partial<WorkflowTemplate> & { name: string }; Update: Partial<WorkflowTemplate>; Relationships: [] }
      milestone_templates: AnyTable
      task_list_templates: AnyTable
      task_templates: AnyTable
      workflow_instances: AnyTable
      milestone_instances: AnyTable
      task_instances: { Row: TaskInstance; Insert: Partial<TaskInstance> & { milestone_instance_id: string; name: string }; Update: Partial<TaskInstance>; Relationships: [] }
      integration_settings: AnyTable
      contract_templates: AnyTable
      sharepoint_folder_templates: AnyTable
      // Disposition module
      disposition_listings: { Row: DispositionListing; Insert: Partial<DispositionListing> & { organization_id: string }; Update: Partial<DispositionListing>; Relationships: [] }
      disposition_showings: { Row: DispositionShowing; Insert: Partial<DispositionShowing> & { listing_id: string }; Update: Partial<DispositionShowing>; Relationships: [] }
      disposition_offers: { Row: DispositionOffer; Insert: Partial<DispositionOffer> & { listing_id: string }; Update: Partial<DispositionOffer>; Relationships: [] }
      disposition_contracts: { Row: DispositionContract; Insert: Partial<DispositionContract> & { listing_id: string }; Update: Partial<DispositionContract>; Relationships: [] }
      disposition_settlements: { Row: DispositionSettlement; Insert: Partial<DispositionSettlement> & { contract_id: string; listing_id: string }; Update: Partial<DispositionSettlement>; Relationships: [] }
      disposition_costs: { Row: DispositionCost; Insert: Partial<DispositionCost> & { listing_id: string }; Update: Partial<DispositionCost>; Relationships: [] }
      disposition_price_changes: { Row: DispositionPriceChange; Insert: Partial<DispositionPriceChange> & { listing_id: string }; Update: Partial<DispositionPriceChange>; Relationships: [] }
      disposition_bulk_sale_agreements: { Row: DispositionBulkSaleAgreement; Insert: Partial<DispositionBulkSaleAgreement> & { project_id: string; organization_id: string }; Update: Partial<DispositionBulkSaleAgreement>; Relationships: [] }
      disposition_takedown_schedule: { Row: DispositionTakedownSchedule; Insert: Partial<DispositionTakedownSchedule> & { bulk_sale_agreement_id: string }; Update: Partial<DispositionTakedownSchedule>; Relationships: [] }
      // Punch items
      punch_items: { Row: PunchItem; Insert: Partial<PunchItem> & { job_id: string; unit_id: string; room: PunchItemRoom; category: PunchItemCategory; description: string }; Update: Partial<PunchItem>; Relationships: [] }
      // Construction photos & daily logs
      construction_photos: { Row: ConstructionPhoto; Insert: Partial<ConstructionPhoto> & { file_url: string }; Update: Partial<ConstructionPhoto>; Relationships: [] }
      milestone_photo_requirements: { Row: MilestonePhotoRequirement; Insert: Partial<MilestonePhotoRequirement> & { milestone_sequence: number }; Update: Partial<MilestonePhotoRequirement>; Relationships: [] }
      daily_logs: { Row: DailyLog; Insert: Partial<DailyLog> & { job_id: string; log_date: string; work_performed: string }; Update: Partial<DailyLog>; Relationships: [] }
      // Standalone tasks module
      standalone_tasks: { Row: StandaloneTask; Insert: Partial<StandaloneTask> & { organization_id: string; title: string; created_by: string }; Update: Partial<StandaloneTask>; Relationships: [] }
      [key: string]: AnyTable | { Row: any; Insert: any; Update: any; Relationships: any }
    }
    Views: {
      [key: string]: { Row: Record<string, any>; Relationships: [] }
    }
    Functions: {
      get_user_organization_id: { Args: Record<string, never>; Returns: string }
      is_global_admin: { Args: Record<string, never>; Returns: boolean }
      is_module_admin: { Args: Record<string, never>; Returns: boolean }
      user_has_module_access: { Args: { module_name: string }; Returns: boolean }
      has_module_permission: { Args: { module_name: string; permission_name: string }; Returns: boolean }
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
