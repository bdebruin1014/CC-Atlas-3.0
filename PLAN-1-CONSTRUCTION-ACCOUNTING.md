# PLAN 1: Construction Management Accounting (Builder Side)
## AP/AR, Vendor Payments, Job Costing, PO Payment Flow

---

## OVERVIEW

This plan covers the **builder-side financial operations** — everything Red Cedar Homes manages as a General Contractor. This is Module 3.12 in the Atlas spec: Accounts Payable, Accounts Receivable, vendor payment processing, job costing, retainage, lien waivers, 1099 compliance, and the draw schedule billing cycle.

**Current State:** Database schema exists (migrations 004, 005). Mock data exists for POs, vendors, change orders. Basic PO form and vendor list page are built. No actual AP/AR transaction flow, no payment processing, no batch payments, no bank reconciliation, no 1099 generation.

**Target State:** A fully operational construction accounting subsystem where POs flow through invoicing → approval → payment, AR is generated from draw schedules, vendors are paid in batches, retainage is tracked and released, and job cost reports show budget vs. committed vs. actual vs. projected final.

---

## PHASE 1: Database Schema Enhancements
**Priority: CRITICAL | Estimated Complexity: Medium**

### 1.1 Create `ap_invoices` Table
New table to separate invoice tracking from PO status (a PO can have multiple invoices for progress billing).

```
ap_invoices
├── id (UUID PK)
├── organization_id (FK → organizations)
├── invoice_number (TEXT, unique per org)
├── vendor_contact_id (FK → contacts)
├── po_id (FK → purchase_orders, nullable — standalone invoices allowed)
├── job_id (FK → jobs)
├── unit_id (FK → units, nullable)
├── invoice_date (DATE)
├── due_date (DATE)
├── received_date (DATE)
├── gross_amount (NUMERIC 14,2)
├── retainage_held (NUMERIC 14,2, default 0)
├── net_amount (NUMERIC 14,2) — gross minus retainage
├── amount_paid (NUMERIC 14,2, default 0)
├── balance_due (NUMERIC 14,2) — computed: net_amount - amount_paid
├── description (TEXT)
├── cost_code (TEXT) — trade_category reference
├── status (TEXT CHECK: 'received', 'coded', 'approved', 'scheduled', 'partially_paid', 'paid', 'disputed', 'voided')
├── approved_by (FK → profiles)
├── approved_at (TIMESTAMPTZ)
├── accounting_period (TEXT) — YYYY-MM
├── supporting_document_id (FK → documents)
├── created_at, updated_at
```

**Indexes:** vendor_contact_id, po_id, job_id, unit_id, status, due_date, accounting_period

### 1.2 Create `ap_payments` Table
Tracks individual payment disbursements.

```
ap_payments
├── id (UUID PK)
├── organization_id (FK → organizations)
├── payment_number (TEXT, auto-generated)
├── payment_date (DATE)
├── payment_method (TEXT CHECK: 'check', 'ach', 'wire', 'credit_card')
├── payment_reference (TEXT) — check number, ACH ref, wire ref
├── vendor_contact_id (FK → contacts)
├── total_amount (NUMERIC 14,2)
├── bank_account (TEXT) — reference to bank account used
├── batch_id (UUID, nullable) — groups payments in a payment run
├── status (TEXT CHECK: 'pending', 'processed', 'cleared', 'voided', 'returned')
├── voided_date (DATE, nullable)
├── voided_reason (TEXT, nullable)
├── created_by (FK → profiles)
├── created_at, updated_at
```

### 1.3 Create `ap_payment_applications` Table
Links payments to invoices (one payment can cover multiple invoices).

```
ap_payment_applications
├── id (UUID PK)
├── payment_id (FK → ap_payments)
├── invoice_id (FK → ap_invoices)
├── amount_applied (NUMERIC 14,2)
├── is_retainage_release (BOOLEAN, default false)
├── created_at
```

### 1.4 Create `ar_invoices` Table
Tracks amounts owed TO Red Cedar (from SPE owners or third-party clients).

```
ar_invoices
├── id (UUID PK)
├── organization_id (FK → organizations)
├── invoice_number (TEXT)
├── job_id (FK → jobs)
├── client_type (TEXT CHECK: 'internal', 'third_party')
├── client_entity_id (FK → entities, nullable) — for internal
├── client_id (FK → clients, nullable) — for third-party
├── draw_number (INTEGER, nullable) — links to 5-draw schedule
├── invoice_date (DATE)
├── due_date (DATE)
├── amount (NUMERIC 14,2)
├── amount_received (NUMERIC 14,2, default 0)
├── balance_due (NUMERIC 14,2)
├── description (TEXT)
├── status (TEXT CHECK: 'draft', 'sent', 'partial', 'paid', 'overdue', 'disputed', 'written_off')
├── supporting_document_id (FK → documents)
├── accounting_transaction_id (FK → transactions, nullable)
├── created_at, updated_at
```

### 1.5 Create `retainage_ledger` Table
Dedicated retainage tracking per vendor per job.

```
retainage_ledger
├── id (UUID PK)
├── organization_id (FK → organizations)
├── job_id (FK → jobs)
├── unit_id (FK → units, nullable)
├── vendor_contact_id (FK → contacts)
├── po_id (FK → purchase_orders)
├── invoice_id (FK → ap_invoices)
├── amount_held (NUMERIC 14,2)
├── amount_released (NUMERIC 14,2, default 0)
├── release_date (DATE, nullable)
├── release_payment_id (FK → ap_payments, nullable)
├── lien_waiver_status (TEXT CHECK: 'not_received', 'conditional', 'unconditional')
├── status (TEXT CHECK: 'held', 'partially_released', 'released')
├── created_at
```

### 1.6 Create `vendor_1099_tracking` View or Table
Aggregates vendor payments for 1099-NEC reporting.

```sql
CREATE VIEW vendor_1099_summary AS
SELECT
  vp.contact_id,
  c.company_name,
  vp.w9_on_file,
  EXTRACT(YEAR FROM p.payment_date) AS tax_year,
  SUM(pa.amount_applied) AS total_payments,
  CASE WHEN SUM(pa.amount_applied) >= 600 THEN true ELSE false END AS is_1099_eligible
FROM vendor_profiles vp
JOIN contacts c ON c.id = vp.contact_id
JOIN ap_invoices ai ON ai.vendor_contact_id = vp.contact_id
JOIN ap_payment_applications pa ON pa.invoice_id = ai.id
JOIN ap_payments p ON p.id = pa.payment_id AND p.status IN ('processed', 'cleared')
GROUP BY vp.contact_id, c.company_name, vp.w9_on_file, EXTRACT(YEAR FROM p.payment_date);
```

### 1.7 Add Missing Columns to Existing Tables

**purchase_orders:** Add `units_completed` field (not needed — already has status).

**vendor_profiles:** Add:
- `default_payment_terms` (TEXT, e.g., 'net_30', 'net_15', 'due_on_receipt')
- `tax_id` (TEXT, encrypted — EIN or SSN for 1099)
- `is_active` (BOOLEAN, default true)

### 1.8 Create `draw_schedules` Table
Formalizes the 5-draw schedule per job (currently only in mock/hook).

```
draw_schedules
├── id (UUID PK)
├── job_id (FK → jobs)
├── draw_number (INTEGER, 1-5)
├── name (TEXT) — "Deposit", "Foundation", "Framing/Dry-In", "Drywall/Trim", "Final"
├── percentage (NUMERIC 5,2) — 20, 20, 25, 25, 10
├── amount (NUMERIC 14,2) — calculated from contract
├── milestone_phase (INTEGER, nullable) — linked construction phase trigger
├── status (TEXT CHECK: 'pending', 'eligible', 'requested', 'approved', 'invoiced', 'paid')
├── requested_date (DATE)
├── approved_date (DATE)
├── invoice_id (FK → ar_invoices, nullable)
├── paid_date (DATE)
├── notes (TEXT)
├── created_at, updated_at
```

---

## PHASE 2: AP Invoice Processing & Workflow
**Priority: CRITICAL | Estimated Complexity: High**

### 2.1 API: `/api/construction/invoices/route.ts`

**GET** — List invoices with filters:
- Query params: job_id, unit_id, vendor_contact_id, status, due_date_from, due_date_to, aging_bucket (current/30/60/90+), search, limit, offset
- Joins: vendor contact info, PO details, job/unit info
- Computed: aging_days (today - due_date), aging_bucket classification

**POST** — Create invoice:
- Validates PO exists and is in 'invoiced' or later status
- Auto-generates invoice_number (INV-YYYY-NNNN)
- Calculates retainage based on PO retainage_pct
- Creates retainage_ledger entry
- Creates activity_log entry
- If PO linked: updates PO status to 'invoiced'
- Creates pending accounting transaction (debit AP expense account, credit AP liability)

### 2.2 API: `/api/construction/invoices/[id]/approve/route.ts`

**POST** — Approve invoice:
- Validates user has approval authority (check threshold rules from admin config)
- PO approval thresholds: <$5K auto-approve, $5K-$25K requires CM, >$25K requires Principal
- Updates status to 'approved'
- Sets approved_by, approved_at
- Creates activity_log entry

### 2.3 Component: `components/construction/invoice-list.tsx`

- Tabbed view: All | Pending Approval | Scheduled | Paid | Disputed
- Table columns: Invoice #, Vendor, PO #, Job, Unit, Amount, Due Date, Aging, Status, Actions
- Aging color coding: Current (green), 1-30 (yellow), 31-60 (orange), 61-90 (red), 90+ (dark red)
- Row actions: View, Approve, Schedule Payment, Void
- Bulk select for batch approval
- Summary bar: Total Outstanding, Total Overdue, Count by aging bucket

### 2.4 Component: `components/construction/invoice-form.tsx`

- Create invoice from PO (pre-fills vendor, job, unit, amount, trade)
- Create standalone invoice (manual entry)
- Fields: vendor, PO link (searchable), invoice #, date, amount, retainage %, description, cost code, document upload
- Auto-calculate: retainage_held, net_amount
- Validation: amount cannot exceed PO remaining balance (PO amount - previously invoiced)

### 2.5 Page: `/construction/invoices/page.tsx`

- Full invoice management dashboard
- AP aging summary cards (Current, 30, 60, 90+)
- Invoice list with filters
- Quick actions: New Invoice, Payment Run, Export Aging Report

---

## PHASE 3: Payment Processing & Batch Payments
**Priority: CRITICAL | Estimated Complexity: High**

### 3.1 API: `/api/construction/payments/route.ts`

**GET** — List payments with filters (vendor, date range, method, status, batch_id)

**POST** — Create payment run (batch):
- Input: array of invoice_ids to pay, payment_method, payment_date
- Groups invoices by vendor
- For each vendor group:
  - Creates ap_payment record
  - Creates ap_payment_application for each invoice
  - Updates each invoice: amount_paid += applied, recalculates balance_due
  - Updates invoice status: 'paid' if fully paid, 'partially_paid' if partial
  - Updates PO status to 'paid' if all invoices for PO are paid
- Creates accounting transactions:
  - Debit: AP liability account (2000)
  - Credit: Cash account (1000)
- Returns payment summary with check/ACH references

### 3.2 API: `/api/construction/payments/[id]/void/route.ts`

**POST** — Void a payment:
- Reverses all payment applications
- Restores invoice balances
- Creates reversing accounting entry
- Updates payment status to 'voided'
- Updates affected invoices back to 'approved'

### 3.3 Component: `components/construction/payment-run.tsx`

- Step 1: Select invoices to pay (filterable table with checkboxes)
  - Filter by vendor, job, aging, due date
  - Show: Invoice #, Vendor, Amount, Due Date, Aging Days
  - Running total of selected invoices
- Step 2: Review payment summary
  - Grouped by vendor: vendor name, invoice count, total amount
  - Payment method selection per vendor (from vendor_profiles.payment_method)
  - Payment date picker
- Step 3: Confirm and process
  - Generate payment references (check numbers or ACH batch IDs)
  - Process button with confirmation dialog
- Step 4: Results
  - Success/failure per payment
  - Print check stubs / generate ACH file
  - Link to payment records

### 3.4 Component: `components/construction/payment-history.tsx`

- Payment list with search and filters
- Columns: Payment #, Date, Vendor, Method, Reference, Amount, Status
- Expandable rows showing applied invoices
- Void payment action (with confirmation)
- Export functionality

### 3.5 Page: `/construction/payments/page.tsx`

- Payment dashboard
- Summary cards: Payments This Month, Outstanding AP, Upcoming Due
- Recent payments list
- "Start Payment Run" button
- Payment history with filters

---

## PHASE 4: Accounts Receivable & Draw Schedule
**Priority: HIGH | Estimated Complexity: Medium**

### 4.1 API: `/api/construction/draws/route.ts`

**GET** — List draw schedules for a job
**POST** — Create/initialize draw schedule for a job:
- Auto-creates 5 draws based on contract amount and standard percentages (20/20/25/25/10)
- Links draws to milestone phases:
  - Draw 1: Contract execution (manual)
  - Draw 2: Phase 4 (Foundation) complete
  - Draw 3: Phase 5 (Framing) complete
  - Draw 4: Phase 9 (Drywall) + Phase 10 (Interior Trim) complete
  - Draw 5: Phase 16 (CO) — adjusted for unused contingency and COs

### 4.2 API: `/api/construction/draws/[id]/request/route.ts`

**POST** — Request a draw:
- Validates milestone is complete (checks unit_milestones)
- Calculates adjusted amount for final draw:
  - Final draw = contract_amount - (sum of prior draws) + approved change orders - unused contingency
- Creates ar_invoice for the draw
- Creates accounting transaction: Debit AR (1100), Credit Revenue (4000)
- If internal job: creates corresponding lender draw request in loans module
- Updates draw status to 'requested'

### 4.3 Enhance `components/projects/draw-schedule.tsx`

Current component uses mock data and a custom hook. Enhance to:
- Connect to real API
- Show draw eligibility based on milestone completion
- Display AR invoice status for each draw
- Show payment received tracking
- Add "Request Draw" button (disabled until milestone complete)
- Show adjustment calculations for final draw
- Display lien waiver collection status per draw

### 4.4 Component: `components/construction/ar-aging.tsx`

- AR aging summary: Current, 30, 60, 90+ days
- Grouped by client (internal entities and third-party)
- Columns: Client, Job, Invoice #, Amount, Due Date, Days Outstanding, Status
- Collection actions: Send Reminder, Mark Received, Write Off
- Total outstanding by client

### 4.5 Page: `/construction/ar/page.tsx`

- AR dashboard
- Summary cards: Total AR, Current, Overdue, Collections This Month
- AR aging report
- Draw schedule overview across all active jobs
- Quick filters: by job, by client, by status

---

## PHASE 5: Retainage Management
**Priority: HIGH | Estimated Complexity: Medium**

### 5.1 API: `/api/construction/retainage/route.ts`

**GET** — Retainage summary by job or vendor:
- Aggregate retainage held, released, and balance by vendor per job
- Filter: job_id, vendor_contact_id, status

**POST** — Release retainage:
- Validates: job at substantial completion, final unconditional lien waiver received
- Creates ap_payment for retainage release amount
- Updates retainage_ledger entries: status → 'released', release_date, release_payment_id
- Creates accounting transaction: Debit Retainage Payable, Credit Cash

### 5.2 Component: `components/construction/retainage-tracker.tsx`

- Per-job retainage summary
- Table: Vendor, Total Held, Released, Balance, Lien Waiver Status
- Release button (disabled until conditions met):
  - Job status >= 'substantial_completion'
  - Lien waiver = 'unconditional'
- Batch release option (release all eligible at once)
- Color coding: Red if lien waiver missing, Yellow if conditional, Green if unconditional

### 5.3 Integrate Retainage into PO and Invoice Workflows

- PO form: retainage % pre-fills from admin config (default 10%)
- Invoice creation: auto-calculates retainage held
- Invoice list: shows retainage amounts
- Payment processing: pays net (after retainage)
- Job completion: triggers retainage review workflow

---

## PHASE 6: Job Cost Reporting
**Priority: HIGH | Estimated Complexity: Medium**

### 6.1 API: `/api/construction/job-cost/route.ts`

**GET** — Job cost report:
- Per-unit breakdown:
  - Trade category (cost code)
  - Budget (from unit budget allocation)
  - Committed (sum of approved POs + approved COs)
  - Actual (sum of paid invoices)
  - Projected Final (actual + remaining committed)
  - Variance (budget - projected final)
  - % Complete (actual / budget)
- Per-job roll-up:
  - All units aggregated
  - Job-level overhead costs
  - Total contract vs. total cost
  - Builder fee earned vs. paid
- Variance flags: highlight trade codes where actual > budget by configurable threshold (default 5%)

### 6.2 Component: `components/construction/job-cost-report.tsx`

- Two views: Unit Detail | Job Summary
- **Unit Detail View:**
  - Select unit from dropdown
  - Table: Cost Code, Budget, Committed, Actual, Projected, Variance, % Used
  - Progress bars per cost code
  - Variance color coding: Green (<95%), Yellow (95-100%), Red (>100%)
  - Totals row with overall unit financials
- **Job Summary View:**
  - All units summarized
  - Stacked bar chart: Budget vs. Committed vs. Actual per unit
  - Job-level totals: Contract Amount, Total Budget, Total Committed, Total Actual, Variance
  - Builder fee tracking: earned (based on % complete) vs. billed vs. received
- Export: PDF, Excel

### 6.3 Component: `components/construction/cost-code-analysis.tsx`

- Cross-job cost code analysis
- Compare actual costs by trade category across multiple jobs
- Identify cost trends (are framing costs rising?)
- Average cost per sqft by trade
- Helps update future estimates

### 6.4 Page: `/construction/job-cost/page.tsx`

- Job cost dashboard
- Job selector
- Tab views: Unit Detail, Job Summary, Cost Code Analysis
- Export options
- Variance alert list (cost codes exceeding threshold)

---

## PHASE 7: 1099 Compliance & Vendor Tax Reporting
**Priority: MEDIUM | Estimated Complexity: Low-Medium**

### 7.1 API: `/api/construction/vendors/1099/route.ts`

**GET** — 1099 summary for tax year:
- Query params: tax_year (default current year)
- Returns: vendor list with YTD payments, W-9 status, 1099 eligibility
- Flags: missing W-9, over $600 threshold, under $600 but approaching

### 7.2 Component: `components/construction/vendor-1099-report.tsx`

- Tax year selector
- Table: Vendor, Tax ID (masked), W-9 Status, YTD Payments, 1099 Eligible
- Filters: Eligible only, Missing W-9, All
- Summary: Total vendors, Total eligible, Total amount, Missing W-9 count
- Export: CSV for 1099-NEC filing
- Alert badges: Missing W-9 (red), Approaching threshold (yellow)

### 7.3 Enhance Vendor Profile

Add to vendor detail sheet:
- Tax ID field (masked display, encrypted storage)
- W-9 document upload
- W-9 received date
- Payment history with running YTD total
- 1099 eligibility indicator

---

## PHASE 8: Lien Waiver Management
**Priority: MEDIUM | Estimated Complexity: Low**

### 8.1 Enhance PO and Invoice Workflows

- Add lien waiver status tracking at invoice level (not just PO level)
- Conditional waiver: required before payment
- Unconditional waiver: required after payment (before retainage release)
- Document upload for waiver PDFs

### 8.2 Component: `components/construction/lien-waiver-tracker.tsx`

- Per-job lien waiver status board
- Table: Vendor, PO #, Invoice #, Payment Date, Conditional Status, Unconditional Status
- Missing waiver alerts
- Bulk waiver request (email vendors for missing waivers)
- Status: Not Required, Pending, Conditional Received, Unconditional Received

### 8.3 Gate Logic Integration

- Payment run: warn if conditional lien waiver not received
- Retainage release: block if unconditional lien waiver not received
- Job close: warn if any outstanding lien waivers

---

## PHASE 9: Navigation & Integration
**Priority: MEDIUM | Estimated Complexity: Low**

### 9.1 Update Construction Sidebar Navigation

Add sub-navigation items under Construction:
- Jobs (existing)
- Vendors (existing)
- **Invoices** (new)
- **Payments** (new)
- **AR / Draws** (new)
- **Job Cost Reports** (new)
- **Retainage** (new)
- Warranty (existing)

### 9.2 Cross-Module Data Flow

- PO → Invoice creation: "Create Invoice" button on PO detail
- Invoice → Payment: "Schedule Payment" button on approved invoices
- Draw → AR: "Request Draw" creates AR invoice
- Draw → Loan: Internal job draw request triggers lender draw record
- Invoice → Accounting: Approved invoices create pending transactions in Module 4
- Payment → Accounting: Processed payments create cash disbursement transactions

### 9.3 Dashboard Enhancements

Update construction dashboard (job-dashboard.tsx) with:
- AP Outstanding card
- AR Outstanding card
- Upcoming payments due
- Overdue invoices alert
- Recent payment activity

---

## PHASE 10: PO Approval Workflow Enhancement
**Priority: MEDIUM | Estimated Complexity: Medium**

### 10.1 API: `/api/construction/pos/[id]/approve/route.ts`

**POST** — PO approval with threshold logic:
- Read thresholds from organization settings:
  - auto_approve_threshold (default $5,000)
  - cm_approve_threshold (default $25,000)
  - principal_required_above (default $25,000)
- Validate approver has sufficient role
- Update PO status and approved_by/approved_at
- Create activity log

### 10.2 Component: `components/construction/po-approval-queue.tsx`

- List of POs awaiting approval
- Grouped by: My Approvals | All Pending
- Quick approve/reject actions
- Threshold indicator showing required approval level
- Bulk approve for items within user's authority

---

## IMPLEMENTATION ORDER & DEPENDENCIES

```
Phase 1 (Schema) ──────────────────────┐
                                        │
Phase 2 (AP Invoices) ─────────────────├── Phase 3 (Payments) ──┐
                                        │                        │
Phase 4 (AR/Draws) ────────────────────┤                        ├── Phase 9 (Integration)
                                        │                        │
Phase 5 (Retainage) ──────────────────├────────────────────────┘
                                        │
Phase 6 (Job Cost Reports) ────────────┤
                                        │
Phase 7 (1099) ────────────────────────┤
                                        │
Phase 8 (Lien Waivers) ───────────────┘

Phase 10 (PO Approval) — independent, can be done anytime
```

**Critical Path:** Phase 1 → Phase 2 → Phase 3 → Phase 9
**Parallel Track A:** Phase 4 (after Phase 1)
**Parallel Track B:** Phase 6 (after Phase 1)
**Post-MVP:** Phases 7, 8, 10

---

## FILES TO CREATE (New)

| File | Purpose |
|------|---------|
| `supabase/migrations/016_create_construction_accounting.sql` | All new tables |
| `app/api/construction/invoices/route.ts` | AP invoice CRUD |
| `app/api/construction/invoices/[id]/approve/route.ts` | Invoice approval |
| `app/api/construction/payments/route.ts` | Payment processing |
| `app/api/construction/payments/[id]/void/route.ts` | Payment void |
| `app/api/construction/draws/route.ts` | Draw schedule CRUD |
| `app/api/construction/draws/[id]/request/route.ts` | Draw request |
| `app/api/construction/retainage/route.ts` | Retainage management |
| `app/api/construction/job-cost/route.ts` | Job cost reporting |
| `app/api/construction/vendors/1099/route.ts` | 1099 reporting |
| `app/api/construction/pos/[id]/approve/route.ts` | PO approval |
| `components/construction/invoice-list.tsx` | Invoice table |
| `components/construction/invoice-form.tsx` | Invoice creation |
| `components/construction/payment-run.tsx` | Batch payment wizard |
| `components/construction/payment-history.tsx` | Payment records |
| `components/construction/retainage-tracker.tsx` | Retainage board |
| `components/construction/job-cost-report.tsx` | Cost report views |
| `components/construction/cost-code-analysis.tsx` | Cross-job analysis |
| `components/construction/ar-aging.tsx` | AR aging report |
| `components/construction/lien-waiver-tracker.tsx` | Waiver status board |
| `components/construction/vendor-1099-report.tsx` | 1099 dashboard |
| `components/construction/po-approval-queue.tsx` | PO approval queue |
| `app/(dashboard)/construction/invoices/page.tsx` | Invoices page |
| `app/(dashboard)/construction/payments/page.tsx` | Payments page |
| `app/(dashboard)/construction/ar/page.tsx` | AR dashboard |
| `app/(dashboard)/construction/job-cost/page.tsx` | Job cost page |
| `lib/construction/accounting-types.ts` | AP/AR type definitions |
| `lib/hooks/use-ap-invoices.ts` | AP invoice data hook |
| `lib/hooks/use-payments.ts` | Payment data hook |
| `lib/hooks/use-draws.ts` | Draw schedule hook |
| `lib/hooks/use-retainage.ts` | Retainage data hook |
| `lib/hooks/use-job-cost.ts` | Job cost data hook |

## FILES TO MODIFY (Existing)

| File | Changes |
|------|---------|
| `components/construction/po-form.tsx` | Add "Create Invoice" action, approval threshold display |
| `components/construction/job-dashboard.tsx` | Add AP/AR summary cards |
| `components/projects/draw-schedule.tsx` | Connect to real API, add AR tracking |
| `app/(dashboard)/construction/page.tsx` | Add AP/AR stats, navigation links |
| `app/(dashboard)/construction/vendors/page.tsx` | Add 1099 indicators, payment history |
| `lib/construction/types.ts` | Add AP/AR types, invoice statuses |
| `lib/construction/mock-data.ts` | Add mock invoices, payments, draws |
