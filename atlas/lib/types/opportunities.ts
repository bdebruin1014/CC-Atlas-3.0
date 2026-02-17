// ---------------------------------------------------------------------------
// Opportunity Types & Stage Definitions for ATLAS
// ---------------------------------------------------------------------------

export type OpportunityType =
  | 'scattered_lot'
  | 'lot_development'
  | 'community_development'
  | 'lot_purchase'
  | 'other'

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  scattered_lot: 'Scattered Lot',
  lot_development: 'Lot Development',
  community_development: 'Community Development',
  lot_purchase: 'Lot Purchase',
  other: 'Other',
}

export const OPPORTUNITY_TYPE_COLORS: Record<OpportunityType, string> = {
  scattered_lot: '#3b82f6',
  lot_development: '#8b5cf6',
  community_development: '#f59e0b',
  lot_purchase: '#10b981',
  other: '#6b7280',
}

// ---------------------------------------------------------------------------
// Stage definitions per type
// ---------------------------------------------------------------------------

export interface StageDefinition {
  id: string
  label: string
  color: string
  order: number
}

export const SCATTERED_LOT_STAGES: StageDefinition[] = [
  { id: 'lead', label: 'Lead', color: '#94a3b8', order: 0 },
  { id: 'research', label: 'Research', color: '#60a5fa', order: 1 },
  { id: 'offer_submitted', label: 'Offer Submitted', color: '#a78bfa', order: 2 },
  { id: 'under_contract', label: 'Under Contract', color: '#f59e0b', order: 3 },
  { id: 'due_diligence', label: 'Due Diligence', color: '#fb923c', order: 4 },
  { id: 'clear_to_close', label: 'Clear to Close', color: '#34d399', order: 5 },
  { id: 'closed_won', label: 'Closed / Won', color: '#22c55e', order: 6 },
  { id: 'closed_lost', label: 'Closed / Lost', color: '#ef4444', order: 7 },
]

export const LOT_DEVELOPMENT_STAGES: StageDefinition[] = [
  { id: 'lead', label: 'Lead', color: '#94a3b8', order: 0 },
  { id: 'feasibility', label: 'Feasibility', color: '#60a5fa', order: 1 },
  { id: 'offer_submitted', label: 'Offer Submitted', color: '#a78bfa', order: 2 },
  { id: 'under_contract', label: 'Under Contract', color: '#f59e0b', order: 3 },
  { id: 'entitlements', label: 'Entitlements', color: '#fb923c', order: 4 },
  { id: 'infrastructure', label: 'Infrastructure', color: '#f97316', order: 5 },
  { id: 'lot_sales', label: 'Lot Sales', color: '#34d399', order: 6 },
  { id: 'closed_won', label: 'Closed / Won', color: '#22c55e', order: 7 },
  { id: 'closed_lost', label: 'Closed / Lost', color: '#ef4444', order: 8 },
]

export const COMMUNITY_DEVELOPMENT_STAGES: StageDefinition[] = [
  { id: 'lead', label: 'Lead', color: '#94a3b8', order: 0 },
  { id: 'feasibility', label: 'Feasibility', color: '#60a5fa', order: 1 },
  { id: 'offer_submitted', label: 'Offer Submitted', color: '#a78bfa', order: 2 },
  { id: 'under_contract', label: 'Under Contract', color: '#f59e0b', order: 3 },
  { id: 'planning', label: 'Planning', color: '#fb923c', order: 4 },
  { id: 'development', label: 'Development', color: '#f97316', order: 5 },
  { id: 'sales', label: 'Sales', color: '#34d399', order: 6 },
  { id: 'closed_won', label: 'Closed / Won', color: '#22c55e', order: 7 },
  { id: 'closed_lost', label: 'Closed / Lost', color: '#ef4444', order: 8 },
]

export const LOT_PURCHASE_STAGES: StageDefinition[] = [
  { id: 'lead', label: 'Lead', color: '#94a3b8', order: 0 },
  { id: 'research', label: 'Research', color: '#60a5fa', order: 1 },
  { id: 'offer_submitted', label: 'Offer Submitted', color: '#a78bfa', order: 2 },
  { id: 'under_contract', label: 'Under Contract', color: '#f59e0b', order: 3 },
  { id: 'due_diligence', label: 'Due Diligence', color: '#fb923c', order: 4 },
  { id: 'closed_won', label: 'Closed / Won', color: '#22c55e', order: 5 },
  { id: 'closed_lost', label: 'Closed / Lost', color: '#ef4444', order: 6 },
]

export const OTHER_STAGES: StageDefinition[] = [
  { id: 'lead', label: 'Lead', color: '#94a3b8', order: 0 },
  { id: 'evaluation', label: 'Evaluation', color: '#60a5fa', order: 1 },
  { id: 'negotiation', label: 'Negotiation', color: '#f59e0b', order: 2 },
  { id: 'closed_won', label: 'Closed / Won', color: '#22c55e', order: 3 },
  { id: 'closed_lost', label: 'Closed / Lost', color: '#ef4444', order: 4 },
]

export function getStagesForType(type: OpportunityType): StageDefinition[] {
  switch (type) {
    case 'scattered_lot':
      return SCATTERED_LOT_STAGES
    case 'lot_development':
      return LOT_DEVELOPMENT_STAGES
    case 'community_development':
      return COMMUNITY_DEVELOPMENT_STAGES
    case 'lot_purchase':
      return LOT_PURCHASE_STAGES
    case 'other':
      return OTHER_STAGES
    default:
      return SCATTERED_LOT_STAGES
  }
}

export function getStageDefinition(type: OpportunityType, stageId: string): StageDefinition | undefined {
  return getStagesForType(type).find((s) => s.id === stageId)
}

// ---------------------------------------------------------------------------
// Source options
// ---------------------------------------------------------------------------

export const OPPORTUNITY_SOURCES = [
  { value: 'mls', label: 'MLS Listing' },
  { value: 'direct_mail', label: 'Direct Mail' },
  { value: 'referral', label: 'Referral' },
  { value: 'driving_for_dollars', label: 'Driving for Dollars' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'auction', label: 'Auction' },
  { value: 'tax_sale', label: 'Tax Sale' },
  { value: 'agent_submitted', label: 'Agent Submitted' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'online_lead', label: 'Online Lead' },
  { value: 'networking', label: 'Networking' },
  { value: 'other', label: 'Other' },
] as const

// ---------------------------------------------------------------------------
// Opportunity data shape from DB
// ---------------------------------------------------------------------------

export interface Opportunity {
  id: string
  organization_id: string
  name: string
  type: OpportunityType
  stage: string
  source: string | null
  assigned_to: string | null
  entity_id: string | null

  // Address
  address_line1: string | null
  address_city: string | null
  address_county: string | null
  address_state: string | null
  address_zip: string | null
  parcel_tms: string | null

  // Financial
  projected_purchase_price: number | null
  projected_sale_price: number | null
  projected_arv: number | null

  // Key dates
  date_offer: string | null
  date_contract: string | null
  date_dd_expiration: string | null
  date_closing: string | null

  // Scattered lot fields
  zoning: string | null
  build_type: string | null
  road_type: string | null
  road_frontage: string | null
  setback_front: number | null
  setback_rear: number | null
  setback_left: number | null
  setback_right: number | null
  historic_overlay: boolean | null
  has_water: boolean | null
  has_sewer: boolean | null
  has_electric: boolean | null
  floor_plan_id: string | null
  garage_position: string | null
  survey_status: string | null
  lot_width: number | null
  lot_depth: number | null
  lot_sqft: number | null
  lot_acreage: number | null

  // Lot development fields
  total_acreage: number | null
  estimated_lots: number | null
  zoning_required: boolean | null
  preliminary_plat_status: string | null
  target_builders: string | null
  infrastructure_estimate: number | null

  // Meta
  notes: string | null
  archived: boolean
  created_at: string
  updated_at: string

  // Joined data (optional)
  assigned_user?: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
  entity?: {
    id: string
    name: string
  } | null
  floor_plan?: {
    id: string
    name: string
    sqft: number
    base_cost: number
  } | null
}

// ---------------------------------------------------------------------------
// Deal Analysis
// ---------------------------------------------------------------------------

export interface DealAnalysis {
  id: string
  opportunity_id: string
  organization_id: string
  name: string | null

  // Inputs
  floor_plan_id: string | null
  upgrade_package: 'standard' | 'classic' | 'elegance' | 'harmony'
  municipality_id: string | null
  purchase_price: number
  site_work_estimate: number
  other_site_costs: number
  site_specific_adjustments: number
  asset_sales_price: number
  selling_concessions: number
  project_duration_days: number | null
  interest_rate_override: number | null

  // Computed snapshots (saved at analysis time)
  sticks_and_bricks: number
  upgrade_cost: number
  lot_preparation: number
  municipality_soft_costs: number
  builder_fee: number
  contingency: number
  total_contract_cost: number
  warranty_reserve: number
  builders_risk_insurance: number
  closing_costs: number
  utility_charges: number
  total_project_cost: number
  loan_amount: number
  equity_required: number
  interest_on_loan: number
  cost_of_capital: number
  total_carry_costs: number
  total_all_in_cost: number
  total_revenue: number
  total_selling_costs: number
  net_sales_proceeds: number
  net_profit: number
  net_profit_margin: number
  verdict: string

  created_at: string
  created_by: string | null
}

// ---------------------------------------------------------------------------
// Floor Plan & Municipality (for deal analyzer lookups)
// ---------------------------------------------------------------------------

export interface FloorPlan {
  id: string
  organization_id: string
  name: string
  sqft: number
  base_cost: number
  bedrooms: number | null
  bathrooms: number | null
  stories: number | null
  garage_bays: number | null
  description: string | null
}

export interface Municipality {
  id: string
  organization_id: string
  name: string
  county: string | null
  state: string | null
  permit_fee: number
  impact_fee: number
  water_tap_fee: number
  sewer_tap_fee: number
  other_fees: number
  total_soft_costs: number
}

// ---------------------------------------------------------------------------
// Comparable Sales
// ---------------------------------------------------------------------------

export interface ComparableSale {
  id: string
  opportunity_id: string
  mls_link: string | null
  address: string | null
  beds: number | null
  baths: number | null
  sqft: number | null
  sale_date: string | null
  sale_price: number | null
  price_per_sqft: number | null
  notes: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export interface WorkflowMilestone {
  id: string
  opportunity_id: string
  name: string
  order: number
  status: 'not_started' | 'in_progress' | 'completed'
  completed_at: string | null
  task_lists: WorkflowTaskList[]
}

export interface WorkflowTaskList {
  id: string
  milestone_id: string
  name: string
  order: number
  tasks: WorkflowTask[]
}

export interface WorkflowTask {
  id: string
  task_list_id: string
  title: string
  description: string | null
  assigned_role: string | null
  assigned_user_id: string | null
  assigned_user?: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
  due_date: string | null
  status: 'not_started' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  order: number
  completed_at: string | null
}

// ---------------------------------------------------------------------------
// Organization defaults (for deal analyzer)
// ---------------------------------------------------------------------------

export interface OrgDefaults {
  default_interest_rate: number        // e.g. 10
  default_cost_of_capital: number      // e.g. 12
  default_project_duration_days: number // e.g. 120
  default_ltc_ratio: number            // e.g. 85
  default_selling_cost_rate: number    // e.g. 8.5
  default_warranty_reserve: number     // e.g. 1500
  default_builders_risk: number        // e.g. 1200
  default_utility_charges: number      // e.g. 2500
}

// ---------------------------------------------------------------------------
// Upgrade package costs
// ---------------------------------------------------------------------------

export const UPGRADE_PACKAGES = {
  standard: { label: 'Standard', cost: 0 },
  classic: { label: 'Classic', cost: 3500 },
  elegance: { label: 'Elegance', cost: 7500 },
  harmony: { label: 'Harmony', cost: 12000 },
} as const

export type UpgradePackage = keyof typeof UPGRADE_PACKAGES
