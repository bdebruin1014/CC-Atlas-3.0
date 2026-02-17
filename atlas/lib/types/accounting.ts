// ---------------------------------------------------------------------------
// Accounting Module Types - ATLAS Platform
// ---------------------------------------------------------------------------

// ---- Entity Types ----

export type EntityUseType =
  | 'holding_company'
  | 'operating_company'
  | 'single_purpose_entity'
  | 'fund_syndication'

export type EntityLegalType =
  | 'llc'
  | 'lp'
  | 'corp'
  | 's_corp'
  | 'trust'
  | 'sole_proprietorship'

export type EntityStatus = 'active' | 'inactive' | 'dissolved'

export interface Entity {
  id: string
  organization_id: string
  name: string
  legal_name: string | null
  use_type: EntityUseType
  legal_type: EntityLegalType
  ein: string | null
  state_of_formation: string | null
  formation_date: string | null
  registered_agent: string | null
  parent_entity_id: string | null
  status: EntityStatus
  notes: string | null
  created_at: string
  updated_at: string
  // computed / joined
  children?: Entity[]
  parent?: Entity | null
}

// ---- Chart of Accounts Types ----

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'cost_of_sales'
  | 'operating_expense'

export type NormalBalance = 'debit' | 'credit'

export interface Account {
  id: string
  entity_id: string
  account_number: string
  name: string
  account_type: AccountType
  normal_balance: NormalBalance
  parent_account_id: string | null
  description: string | null
  is_active: boolean
  current_balance: number
  created_at: string
  updated_at: string
  // computed
  children?: Account[]
}

// ---- Transaction Types ----

export type TransactionType =
  | 'journal_entry'
  | 'bill_payment'
  | 'deposit'
  | 'transfer'
  | 'draw'
  | 'distribution'
  | 'capital_contribution'

export type TransactionStatus = 'pending' | 'approved' | 'posted' | 'voided'

export interface TransactionLineItem {
  id: string
  transaction_id: string
  account_id: string
  account_name?: string
  account_number?: string
  debit_amount: number
  credit_amount: number
  project_id: string | null
  project_name?: string | null
  unit_id: string | null
  memo: string | null
}

export interface Transaction {
  id: string
  entity_id: string
  date: string
  description: string
  transaction_type: TransactionType
  status: TransactionStatus
  reference_number: string | null
  period: string // YYYY-MM
  supporting_document_url: string | null
  approved_by: string | null
  approved_at: string | null
  posted_by: string | null
  posted_at: string | null
  voided_by: string | null
  voided_at: string | null
  void_reason: string | null
  created_by: string
  created_at: string
  updated_at: string
  line_items: TransactionLineItem[]
  total_debits: number
  total_credits: number
}

// ---- Investor Types ----

export type AccreditationStatus = 'accredited' | 'non_accredited' | 'qualified_purchaser' | 'pending'

export interface Investor {
  id: string
  entity_id: string
  contact_id: string
  contact_name: string
  contact_email: string | null
  ownership_percent: number
  capital_commitment: number
  capital_contributed: number
  capital_remaining: number
  preferred_return_rate: number
  promote_structure: string | null
  accreditation_status: AccreditationStatus
  accreditation_verified_date: string | null
  subscription_agreement_url: string | null
  w9_url: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export type CapitalCallStatus = 'draft' | 'issued' | 'partially_funded' | 'fully_funded' | 'cancelled'

export interface CapitalCall {
  id: string
  entity_id: string
  call_number: number
  total_amount: number
  purpose: string
  due_date: string
  status: CapitalCallStatus
  issued_date: string | null
  created_at: string
  updated_at: string
  responses: CapitalCallResponse[]
}

export interface CapitalCallResponse {
  id: string
  capital_call_id: string
  investor_id: string
  investor_name: string
  amount_due: number
  amount_funded: number
  funded_date: string | null
  status: 'pending' | 'funded' | 'partial' | 'unfunded'
}

// ---- Distribution / Waterfall Types ----

export type WaterfallType = 'simple_preferred_promote' | 'multi_tier_irr'

export interface WaterfallStructure {
  id: string
  entity_id: string
  name: string
  waterfall_type: WaterfallType
  tiers: WaterfallTier[]
  created_at: string
  updated_at: string
}

export interface WaterfallTier {
  id: string
  waterfall_structure_id: string
  tier_order: number
  name: string
  // For simple_preferred_promote
  preferred_return_rate?: number
  // For promote splits
  investor_split_percent: number
  manager_split_percent: number
  // For multi_tier_irr
  irr_hurdle_low?: number
  irr_hurdle_high?: number | null
}

export interface DistributionResult {
  investor_id: string
  investor_name: string
  ownership_percent: number
  preferred_amount: number
  promote_share: number
  total_distribution: number
  tier_details: TierDistributionDetail[]
}

export interface TierDistributionDetail {
  tier_name: string
  tier_order: number
  investor_amount: number
  manager_amount: number
}

export interface Distribution {
  id: string
  entity_id: string
  waterfall_structure_id: string
  total_amount: number
  distribution_date: string
  status: 'draft' | 'approved' | 'distributed'
  approved_by: string | null
  approved_at: string | null
  results: DistributionResult[]
  created_at: string
  updated_at: string
}

// ---- Loan Types ----

export type LoanType =
  | 'construction_loan'
  | 'acquisition_loan'
  | 'bridge_loan'
  | 'permanent_loan'
  | 'line_of_credit'
  | 'mezzanine'
  | 'seller_financing'

export type LoanStatus = 'active' | 'paid_off' | 'defaulted' | 'pending'

export type RateType = 'fixed' | 'variable'

export interface Loan {
  id: string
  entity_id: string
  project_id: string | null
  project_name?: string | null
  lender_contact_id: string
  lender_name: string
  loan_type: LoanType
  original_amount: number
  current_balance: number
  amount_drawn: number
  available_amount: number
  interest_rate: number
  rate_type: RateType
  rate_index: string | null // e.g., SOFR, Prime
  rate_spread: number | null
  origination_date: string
  maturity_date: string
  monthly_payment: number | null
  interest_only: boolean
  covenants: string | null
  status: LoanStatus
  created_at: string
  updated_at: string
  draws: LoanDraw[]
}

export interface LoanDraw {
  id: string
  loan_id: string
  draw_number: number
  amount: number
  date: string
  description: string
  construction_draw_id: string | null
  status: 'requested' | 'approved' | 'funded' | 'rejected'
  created_at: string
}

// ---- Period Close Types ----

export type PeriodStatus = 'open' | 'in_review' | 'closed' | 'locked'

export interface AccountingPeriod {
  id: string
  entity_id: string
  entity_name?: string
  period: string // YYYY-MM
  status: PeriodStatus
  reviewed_by: string | null
  reviewed_at: string | null
  closed_by: string | null
  closed_at: string | null
  locked_by: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
}

// ---- Report Types ----

export type ReportType = 'balance_sheet' | 'income_statement' | 'cash_flow' | 'trial_balance'

export interface ReportPeriod {
  type: 'month' | 'quarter' | 'year' | 'custom'
  start_date: string
  end_date: string
}

export interface BalanceSheetData {
  assets: ReportSection[]
  liabilities: ReportSection[]
  equity: ReportSection[]
  total_assets: number
  total_liabilities: number
  total_equity: number
  is_balanced: boolean
}

export interface IncomeStatementData {
  revenue: ReportSection[]
  cost_of_sales: ReportSection[]
  operating_expenses: ReportSection[]
  total_revenue: number
  total_cost_of_sales: number
  gross_profit: number
  total_operating_expenses: number
  net_income: number
}

export interface TrialBalanceData {
  accounts: TrialBalanceRow[]
  total_debits: number
  total_credits: number
  is_balanced: boolean
}

export interface TrialBalanceRow {
  account_number: string
  account_name: string
  account_type: AccountType
  debit_balance: number
  credit_balance: number
}

export interface CashFlowData {
  operating: ReportSection[]
  investing: ReportSection[]
  financing: ReportSection[]
  total_operating: number
  total_investing: number
  total_financing: number
  net_change: number
  beginning_cash: number
  ending_cash: number
}

export interface ReportSection {
  account_number: string
  account_name: string
  balance: number
  children?: ReportSection[]
}

// ---- Utility labels ----

export const ENTITY_USE_TYPE_LABELS: Record<EntityUseType, string> = {
  holding_company: 'Holding Company',
  operating_company: 'Operating Company',
  single_purpose_entity: 'SPE',
  fund_syndication: 'Fund/Syndication',
}

export const ENTITY_LEGAL_TYPE_LABELS: Record<EntityLegalType, string> = {
  llc: 'LLC',
  lp: 'LP',
  corp: 'Corporation',
  s_corp: 'S Corporation',
  trust: 'Trust',
  sole_proprietorship: 'Sole Proprietorship',
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  cost_of_sales: 'Cost of Sales',
  operating_expense: 'Operating Expense',
}

export const ACCOUNT_TYPE_RANGES: Record<AccountType, { min: number; max: number }> = {
  asset: { min: 1000, max: 1999 },
  liability: { min: 2000, max: 2999 },
  equity: { min: 3000, max: 3999 },
  revenue: { min: 4000, max: 4999 },
  cost_of_sales: { min: 5000, max: 5999 },
  operating_expense: { min: 6000, max: 6999 },
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  journal_entry: 'Journal Entry',
  bill_payment: 'Bill Payment',
  deposit: 'Deposit',
  transfer: 'Transfer',
  draw: 'Draw',
  distribution: 'Distribution',
  capital_contribution: 'Capital Contribution',
}

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  construction_loan: 'Construction Loan',
  acquisition_loan: 'Acquisition Loan',
  bridge_loan: 'Bridge Loan',
  permanent_loan: 'Permanent Loan',
  line_of_credit: 'Line of Credit',
  mezzanine: 'Mezzanine',
  seller_financing: 'Seller Financing',
}

// Default SPE Chart of Accounts template
export const DEFAULT_SPE_COA: Array<{
  account_number: string
  name: string
  account_type: AccountType
  normal_balance: NormalBalance
  description: string
}> = [
  // Assets
  { account_number: '1000', name: 'Cash - Operating', account_type: 'asset', normal_balance: 'debit', description: 'Primary operating bank account' },
  { account_number: '1010', name: 'Cash - Escrow', account_type: 'asset', normal_balance: 'debit', description: 'Escrow deposits held' },
  { account_number: '1050', name: 'Accounts Receivable', account_type: 'asset', normal_balance: 'debit', description: 'Amounts owed to entity' },
  { account_number: '1100', name: 'Construction in Progress', account_type: 'asset', normal_balance: 'debit', description: 'Costs capitalized during construction' },
  { account_number: '1200', name: 'Land', account_type: 'asset', normal_balance: 'debit', description: 'Land cost basis' },
  { account_number: '1300', name: 'Building & Improvements', account_type: 'asset', normal_balance: 'debit', description: 'Completed building value' },
  { account_number: '1310', name: 'Accumulated Depreciation', account_type: 'asset', normal_balance: 'credit', description: 'Accumulated depreciation on buildings' },
  { account_number: '1400', name: 'Prepaid Expenses', account_type: 'asset', normal_balance: 'debit', description: 'Prepaid insurance, taxes, etc.' },
  { account_number: '1500', name: 'Loan Origination Costs', account_type: 'asset', normal_balance: 'debit', description: 'Capitalized loan fees' },
  { account_number: '1510', name: 'Accumulated Amortization - Loan Costs', account_type: 'asset', normal_balance: 'credit', description: 'Amortization of loan origination costs' },
  // Liabilities
  { account_number: '2000', name: 'Accounts Payable', account_type: 'liability', normal_balance: 'credit', description: 'Amounts owed to vendors' },
  { account_number: '2100', name: 'Accrued Expenses', account_type: 'liability', normal_balance: 'credit', description: 'Accrued but unpaid expenses' },
  { account_number: '2200', name: 'Construction Loan Payable', account_type: 'liability', normal_balance: 'credit', description: 'Outstanding construction loan balance' },
  { account_number: '2300', name: 'Permanent Loan Payable', account_type: 'liability', normal_balance: 'credit', description: 'Outstanding permanent loan balance' },
  { account_number: '2400', name: 'Accrued Interest Payable', account_type: 'liability', normal_balance: 'credit', description: 'Interest accrued but not yet paid' },
  { account_number: '2500', name: 'Deposits Held', account_type: 'liability', normal_balance: 'credit', description: 'Earnest money and security deposits' },
  { account_number: '2600', name: 'Due to Related Parties', account_type: 'liability', normal_balance: 'credit', description: 'Intercompany payables' },
  // Equity
  { account_number: '3000', name: 'Member Capital', account_type: 'equity', normal_balance: 'credit', description: 'Total member capital contributions' },
  { account_number: '3100', name: 'Member Distributions', account_type: 'equity', normal_balance: 'debit', description: 'Distributions to members' },
  { account_number: '3200', name: 'Retained Earnings', account_type: 'equity', normal_balance: 'credit', description: 'Accumulated profits/losses' },
  // Revenue
  { account_number: '4000', name: 'Home Sale Revenue', account_type: 'revenue', normal_balance: 'credit', description: 'Revenue from home sales' },
  { account_number: '4100', name: 'Lot Sale Revenue', account_type: 'revenue', normal_balance: 'credit', description: 'Revenue from lot sales' },
  { account_number: '4200', name: 'Rental Income', account_type: 'revenue', normal_balance: 'credit', description: 'Rental income received' },
  { account_number: '4300', name: 'Interest Income', account_type: 'revenue', normal_balance: 'credit', description: 'Interest earned on deposits' },
  { account_number: '4900', name: 'Other Income', account_type: 'revenue', normal_balance: 'credit', description: 'Miscellaneous income' },
  // Cost of Sales
  { account_number: '5000', name: 'Land Cost', account_type: 'cost_of_sales', normal_balance: 'debit', description: 'Cost of land sold' },
  { account_number: '5100', name: 'Direct Construction Costs', account_type: 'cost_of_sales', normal_balance: 'debit', description: 'Hard costs of construction' },
  { account_number: '5200', name: 'Architecture & Engineering', account_type: 'cost_of_sales', normal_balance: 'debit', description: 'A&E fees allocated to units' },
  { account_number: '5300', name: 'Permits & Impact Fees', account_type: 'cost_of_sales', normal_balance: 'debit', description: 'Government permits and fees' },
  { account_number: '5400', name: 'Site Development', account_type: 'cost_of_sales', normal_balance: 'debit', description: 'Site work and infrastructure' },
  { account_number: '5500', name: 'Closing Costs - Sales', account_type: 'cost_of_sales', normal_balance: 'debit', description: 'Closing costs on sale transactions' },
  { account_number: '5600', name: 'Real Estate Commissions', account_type: 'cost_of_sales', normal_balance: 'debit', description: 'Broker commissions on sales' },
  { account_number: '5700', name: 'Warranty Expense', account_type: 'cost_of_sales', normal_balance: 'debit', description: 'Home warranty costs' },
  // Operating Expenses
  { account_number: '6000', name: 'Interest Expense', account_type: 'operating_expense', normal_balance: 'debit', description: 'Loan interest expense' },
  { account_number: '6100', name: 'Property Taxes', account_type: 'operating_expense', normal_balance: 'debit', description: 'Real estate taxes' },
  { account_number: '6200', name: 'Insurance', account_type: 'operating_expense', normal_balance: 'debit', description: 'Property and liability insurance' },
  { account_number: '6300', name: 'Utilities', account_type: 'operating_expense', normal_balance: 'debit', description: 'Water, electric, gas during construction' },
  { account_number: '6400', name: 'Management Fees', account_type: 'operating_expense', normal_balance: 'debit', description: 'Property/asset management fees' },
  { account_number: '6500', name: 'Legal & Professional Fees', account_type: 'operating_expense', normal_balance: 'debit', description: 'Attorney, CPA, consultant fees' },
  { account_number: '6600', name: 'Accounting & Tax Preparation', account_type: 'operating_expense', normal_balance: 'debit', description: 'Bookkeeping and tax prep' },
  { account_number: '6700', name: 'Marketing & Advertising', account_type: 'operating_expense', normal_balance: 'debit', description: 'Marketing costs' },
  { account_number: '6800', name: 'Depreciation Expense', account_type: 'operating_expense', normal_balance: 'debit', description: 'Depreciation of fixed assets' },
  { account_number: '6900', name: 'Miscellaneous Expense', account_type: 'operating_expense', normal_balance: 'debit', description: 'Other operating expenses' },
]
