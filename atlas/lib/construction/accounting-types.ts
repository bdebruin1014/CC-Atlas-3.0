// ============================================================================
// Construction Accounting Module - Types
// AP/AR, Vendor Payments, Job Costing, Draw Schedules
// ============================================================================

// ---- AP Invoice ----
export type APInvoiceStatus =
  | 'received'
  | 'coded'
  | 'approved'
  | 'scheduled'
  | 'partially_paid'
  | 'paid'
  | 'disputed'
  | 'voided'

export const AP_INVOICE_STATUS_CONFIG: Record<
  APInvoiceStatus,
  { label: string; color: string; bgColor: string }
> = {
  received: { label: 'Received', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  coded: { label: 'Coded', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100' },
  scheduled: { label: 'Scheduled', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  partially_paid: { label: 'Partial', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  paid: { label: 'Paid', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  disputed: { label: 'Disputed', color: 'text-red-700', bgColor: 'bg-red-100' },
  voided: { label: 'Voided', color: 'text-gray-500', bgColor: 'bg-gray-100' },
}

export interface APInvoice {
  id: string
  organization_id: string
  invoice_number: string
  vendor_contact_id: string
  po_id: string | null
  job_id: string
  unit_id: string | null
  invoice_date: string
  due_date: string
  received_date: string | null
  gross_amount: number
  retainage_held: number
  net_amount: number
  amount_paid: number
  balance_due: number
  description: string | null
  cost_code: string | null
  status: APInvoiceStatus
  approved_by: string | null
  approved_at: string | null
  accounting_period: string | null
  supporting_document_id: string | null
  created_at: string
  updated_at: string
  // joined
  vendor?: { id: string; company_name: string }
  po?: { id: string; po_number: string; amount: number }
  job?: { id: string; name: string }
  unit?: { id: string; unit_number: string }
  aging_days?: number
  aging_bucket?: string
}

// ---- AP Payment ----
export type PaymentMethod = 'check' | 'ach' | 'wire' | 'credit_card'

export type PaymentStatus = 'pending' | 'processed' | 'cleared' | 'voided' | 'returned'

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  processed: { label: 'Processed', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  cleared: { label: 'Cleared', color: 'text-green-700', bgColor: 'bg-green-100' },
  voided: { label: 'Voided', color: 'text-red-700', bgColor: 'bg-red-100' },
  returned: { label: 'Returned', color: 'text-orange-700', bgColor: 'bg-orange-100' },
}

export interface APPayment {
  id: string
  organization_id: string
  payment_number: string
  payment_date: string
  payment_method: PaymentMethod
  payment_reference: string | null
  vendor_contact_id: string
  total_amount: number
  bank_account: string | null
  batch_id: string | null
  status: PaymentStatus
  voided_date: string | null
  voided_reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // joined
  vendor?: { id: string; company_name: string }
  applications?: PaymentApplication[]
}

export interface PaymentApplication {
  id: string
  payment_id: string
  invoice_id: string
  amount_applied: number
  is_retainage_release: boolean
  created_at: string
  // joined
  invoice?: APInvoice
}

// ---- AR Invoice ----
export type ARInvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'disputed'
  | 'written_off'

export const AR_INVOICE_STATUS_CONFIG: Record<
  ARInvoiceStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  sent: { label: 'Sent', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  partial: { label: 'Partial', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  paid: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
  overdue: { label: 'Overdue', color: 'text-red-700', bgColor: 'bg-red-100' },
  disputed: { label: 'Disputed', color: 'text-red-700', bgColor: 'bg-red-100' },
  written_off: { label: 'Written Off', color: 'text-gray-500', bgColor: 'bg-gray-100' },
}

export interface ARInvoice {
  id: string
  organization_id: string
  invoice_number: string
  job_id: string
  client_type: 'internal' | 'third_party'
  client_entity_id: string | null
  client_id: string | null
  draw_number: number | null
  invoice_date: string
  due_date: string
  amount: number
  amount_received: number
  balance_due: number
  description: string | null
  status: ARInvoiceStatus
  supporting_document_id: string | null
  accounting_transaction_id: string | null
  created_at: string
  updated_at: string
  // joined
  job?: { id: string; name: string }
  client_entity?: { id: string; name: string }
}

// ---- Retainage ----
export type LienWaiverStatus = 'not_received' | 'conditional' | 'unconditional'
export type RetainageStatus = 'held' | 'partially_released' | 'released'

export interface RetainageEntry {
  id: string
  organization_id: string
  job_id: string
  unit_id: string | null
  vendor_contact_id: string
  po_id: string
  invoice_id: string
  amount_held: number
  amount_released: number
  release_date: string | null
  release_payment_id: string | null
  lien_waiver_status: LienWaiverStatus
  status: RetainageStatus
  created_at: string
  // joined
  vendor?: { id: string; company_name: string }
  po?: { id: string; po_number: string }
}

// ---- Draw Schedule ----
export type DrawStatus = 'pending' | 'eligible' | 'requested' | 'approved' | 'invoiced' | 'paid'

export const DRAW_STATUS_CONFIG: Record<
  DrawStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: 'Pending', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  eligible: { label: 'Eligible', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  requested: { label: 'Requested', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  approved: { label: 'Approved', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  invoiced: { label: 'Invoiced', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  paid: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
}

export const DEFAULT_DRAW_SCHEDULE = [
  { draw_number: 1, name: 'Deposit', percentage: 20, milestone_phase: null },
  { draw_number: 2, name: 'Foundation', percentage: 20, milestone_phase: 4 },
  { draw_number: 3, name: 'Framing / Dry-In', percentage: 25, milestone_phase: 5 },
  { draw_number: 4, name: 'Drywall / Trim', percentage: 25, milestone_phase: 10 },
  { draw_number: 5, name: 'Final / CO', percentage: 10, milestone_phase: 16 },
] as const

export interface DrawScheduleItem {
  id: string
  job_id: string
  draw_number: number
  name: string
  percentage: number
  amount: number
  milestone_phase: number | null
  status: DrawStatus
  requested_date: string | null
  approved_date: string | null
  invoice_id: string | null
  paid_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ---- Job Cost Report ----
export interface JobCostLine {
  cost_code: string
  cost_code_name: string
  budget: number
  committed: number
  actual: number
  projected_final: number
  variance: number
  pct_complete: number
}

export interface UnitCostReport {
  unit_id: string
  unit_number: string
  lines: JobCostLine[]
  total_budget: number
  total_committed: number
  total_actual: number
  total_projected: number
  total_variance: number
}

export interface JobCostReport {
  job_id: string
  job_name: string
  units: UnitCostReport[]
  job_total_budget: number
  job_total_committed: number
  job_total_actual: number
  job_total_projected: number
  job_total_variance: number
  contract_amount: number
  builder_fee: number
}

// ---- Aging Bucket ----
export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+'

export const AGING_BUCKET_CONFIG: Record<
  AgingBucket,
  { label: string; color: string; bgColor: string }
> = {
  current: { label: 'Current', color: 'text-green-700', bgColor: 'bg-green-100' },
  '1-30': { label: '1-30 Days', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  '31-60': { label: '31-60 Days', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  '61-90': { label: '61-90 Days', color: 'text-red-600', bgColor: 'bg-red-100' },
  '90+': { label: '90+ Days', color: 'text-red-800', bgColor: 'bg-red-200' },
}

export function getAgingBucket(daysPastDue: number): AgingBucket {
  if (daysPastDue <= 0) return 'current'
  if (daysPastDue <= 30) return '1-30'
  if (daysPastDue <= 60) return '31-60'
  if (daysPastDue <= 90) return '61-90'
  return '90+'
}

// ---- 1099 Summary ----
export interface Vendor1099Summary {
  contact_id: string
  company_name: string
  w9_on_file: boolean
  tax_year: number
  total_payments: number
  is_1099_eligible: boolean
}
