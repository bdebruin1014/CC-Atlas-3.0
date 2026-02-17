// ============================================================================
// Accounting Module - Extended Types
// Entity/Owner-side accounting types and interfaces
// ============================================================================

// Re-export base types from the main accounting types file
export type {
  Entity,
  EntityUseType,
  EntityLegalType,
  EntityStatus,
  Account,
  AccountType,
  NormalBalance,
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionLineItem,
  Investor,
  CapitalCall,
  CapitalCallResponse,
  WaterfallStructure,
  WaterfallTier,
  Distribution,
  DistributionResult,
  Loan,
  LoanDraw,
  AccountingPeriod,
} from "@/lib/types/accounting"

// ---- Extended Transaction Types ----
export type ExtendedTransactionType =
  | "journal_entry"
  | "bill_payment"
  | "deposit"
  | "transfer"
  | "draw"
  | "distribution"
  | "capital_contribution"
  | "interest_accrual"
  | "closing"

// ---- Report Types ----
export interface BalanceSheetReport {
  as_of_date: string
  entity_id: string
  entity_name: string
  assets: ReportSection
  liabilities: ReportSection
  equity: ReportSection
  total_assets: number
  total_liabilities: number
  total_equity: number
}

export interface IncomeStatementReport {
  period_start: string
  period_end: string
  entity_id: string
  entity_name: string
  revenue: ReportSection
  cost_of_sales: ReportSection
  operating_expenses: ReportSection
  gross_profit: number
  operating_income: number
  net_income: number
}

export interface TrialBalanceReport {
  as_of_date: string
  entity_id: string
  entity_name: string
  accounts: TrialBalanceLine[]
  total_debits: number
  total_credits: number
  is_balanced: boolean
}

export interface CashFlowReport {
  period_start: string
  period_end: string
  entity_id: string
  entity_name: string
  operating: ReportSection
  investing: ReportSection
  financing: ReportSection
  net_cash_flow: number
  beginning_cash: number
  ending_cash: number
}

export interface ReportSection {
  label: string
  items: ReportLineItem[]
  total: number
}

export interface ReportLineItem {
  account_number: string
  account_name: string
  amount: number
  prior_amount?: number
  variance?: number
}

export interface TrialBalanceLine {
  account_number: string
  account_name: string
  account_type: string
  debit_balance: number
  credit_balance: number
}

// ---- Consolidated Report ----
export interface ConsolidatedReportData {
  parent_entity: string
  report_type: string
  period: string
  entity_subtotals: EntitySubtotal[]
  eliminations: EliminationEntry[]
  consolidated_total: Record<string, number>
}

export interface EntitySubtotal {
  entity_id: string
  entity_name: string
  totals: Record<string, number>
}

export interface EliminationEntry {
  description: string
  from_entity: string
  to_entity: string
  amount: number
  accounts: string[]
}

// ---- Project P&L ----
export interface ProjectPLReport {
  project_id: string
  project_name: string
  revenue: {
    home_sales: number
    lot_sales: number
    other: number
    total: number
  }
  cost_of_sales: {
    land: number
    hard_costs: number
    soft_costs: number
    financing: number
    selling: number
    total: number
  }
  gross_profit: number
  operating_expenses: number
  net_income: number
  per_unit?: {
    unit_id: string
    unit_number: string
    revenue: number
    costs: number
    profit: number
    margin: number
  }[]
}

// ---- Investor Statement ----
export interface InvestorStatementData {
  investor_id: string
  investor_name: string
  entity_id: string
  entity_name: string
  period: string
  beginning_balance: number
  contributions: number
  preferred_return_accrued: number
  distributions_received: number
  ending_balance: number
  total_contributed: number
  total_distributed: number
  irr: number | null
  equity_multiple: number
  preferred_return_status: "current" | "in_arrears"
  cash_flows: {
    date: string
    amount: number
    type: string
    description: string
  }[]
}

// ---- Intercompany ----
export interface IntercompanyTransaction {
  id: string
  source_entity_id: string
  target_entity_id: string
  amount: number
  description: string
  date: string
  source_batch_id: string
  target_batch_id: string
}

// ---- Sync Events ----
export type ConstructionSyncEventType =
  | "invoice_created"
  | "payment_processed"
  | "draw_requested"
  | "draw_paid"
  | "change_order_approved"
  | "loan_draw_funded"

export interface ConstructionSyncEvent {
  event_type: ConstructionSyncEventType
  event_data: Record<string, unknown>
  source_record_id: string
}
