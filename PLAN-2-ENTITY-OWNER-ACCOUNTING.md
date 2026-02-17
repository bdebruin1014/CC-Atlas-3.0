# PLAN 2: Entity/Owner Accounting Module
## General Ledger, Investor Management, Distributions, Capital Calls, Loan Management, Financial Reporting

---

## OVERVIEW

This plan covers **Module 4 — Accounting** from the Atlas spec: the entity-level financial management system that manages Olive Brynn LLC, all SPEs, holding entities, and investment funds. This is the owner/investor side — NOT the Red Cedar GC operations (that's Plan 1).

**Current State:** Database schema exists (migration 005) with tables for chart_of_accounts, transactions, fiscal_periods, investors, capital_calls, capital_call_responses, waterfall_structures, distributions, distribution_allocations, loans, loan_draws. COA seed template (migration 015) with 35 accounts. UI components exist for entity-hierarchy, financial-reports, loan-tracker, transaction-form, waterfall-calculator. Accounting dashboard page exists with mock entities and loan alerts. The accounting API route handles transaction listing and double-entry creation.

**Target State:** A fully operational multi-entity accounting system where each entity has its own ledger, transactions flow from construction operations (Plan 1) into entity books, investors receive capital call notices and distribution calculations, loans track draws and interest accrual, period close enforces data integrity, and consolidated financial reports aggregate across the entity hierarchy.

---

## PHASE 1: Entity Management & COA Administration
**Priority: CRITICAL | Estimated Complexity: Medium**

### 1.1 API: `/api/accounting/entities/route.ts`

**GET** — List entities with hierarchy:
- Returns flat list with parent_entity_id for tree construction
- Includes: entity details, COA account count, open period, last transaction date
- Filter: use_type, status, parent_entity_id, search

**POST** — Create entity:
- Input: name, legal_name, use_type, legal_type, ein, state_of_formation, formation_date, parent_entity_id, registered_agent
- On creation:
  - Auto-clones COA template based on use_type (SPE template, Operating template, Fund template)
  - Creates initial fiscal period (current month, status: 'open')
  - Creates activity log entry
  - Creates SharePoint folder structure (if integration active)

### 1.2 API: `/api/accounting/entities/[id]/route.ts`

**GET** — Entity detail with summary:
- Entity info + parent/children
- COA summary: account count by type, total balances
- Financial snapshot: total assets, liabilities, equity, revenue, expenses
- Open periods
- Investor count, total capital committed
- Active loans

**PATCH** — Update entity details
**DELETE** — Soft delete (set status = 'dissolved', prevent if open transactions)

### 1.3 API: `/api/accounting/coa/route.ts`

**GET** — Chart of accounts for entity:
- Query: entity_id (required), account_type, is_active, search
- Returns accounts with: current balance (computed from transactions), parent account info
- Hierarchical ordering: parent accounts first, children indented

**POST** — Create account:
- Validates: account_number unique within entity, valid type, valid parent
- If parent specified: inherits account_type

**PATCH** — Update account (name, description, is_active, parent)
- Cannot change account_type or number if transactions exist
- Cannot deactivate if balance != 0

### 1.4 Component: `components/accounting/coa-editor.tsx`

- Full chart of accounts management
- Tree view with indentation (parent-child hierarchy)
- Columns: Account #, Name, Type, Normal Balance, Balance, Status
- Inline editing for name, description
- Add account button (with parent selection)
- Deactivate/reactivate toggle
- Import from template button
- Balance drill-down: click balance to see transaction list
- Type badges with color coding (asset=blue, liability=red, equity=purple, revenue=green, expense=orange)

### 1.5 Component: `components/accounting/entity-detail.tsx`

- Entity overview card: name, legal info, EIN (masked), status
- Tabbed interface:
  - **Overview**: Financial snapshot, key metrics, recent activity
  - **Chart of Accounts**: COA editor component
  - **Transactions**: Transaction list with filters
  - **Investors**: Investor management (Phase 4)
  - **Distributions**: Waterfall calculator (Phase 5)
  - **Loans**: Loan tracking (Phase 6)
  - **Reports**: Financial reports (Phase 7)
  - **Settings**: Entity-specific configuration

### 1.6 Page: `/accounting/entities/[id]/page.tsx`

- Entity detail page using tabbed component
- Breadcrumb: Accounting > Entities > {Entity Name}
- Header: Entity name, use_type badge, status badge
- Quick actions: New Transaction, Run Report, Close Period

### 1.7 Enhance `components/accounting/entity-hierarchy.tsx`

Current component renders tree but lacks:
- Add new entity button per node (add child)
- Entity status indicator (active/inactive/dissolved)
- Quick financial summary tooltip on hover (total assets, net equity)
- Drag-and-drop reparenting (future)
- Context menu: View Detail, Add Child, Edit, Dissolve

---

## PHASE 2: Transaction Management & General Ledger
**Priority: CRITICAL | Estimated Complexity: High**

### 2.1 Enhance API: `/api/accounting/route.ts`

Current API handles basic transaction CRUD. Enhance with:

**GET Enhancements:**
- Add account balance computation (running balance per account)
- Add trial balance endpoint variant
- Support batch_id grouping (show related entries together)
- Add approval workflow filtering (my pending approvals)

**POST Enhancements:**
- Transaction type expansion:
  - `journal_entry`: Manual double-entry (existing)
  - `bill_payment`: AP payment from Plan 1 (auto-generated)
  - `deposit`: AR receipt from draw payments (auto-generated)
  - `transfer`: Inter-account transfer
  - `draw`: Loan draw posting
  - `distribution`: Investor distribution posting
  - `capital_contribution`: Investor capital receipt
  - `interest_accrual`: Monthly interest posting (automated)
  - `closing`: Period-end closing entries
- Intercompany transaction support:
  - When posting to entity A that involves entity B, create offsetting entries
  - Track intercompany_entity_id on transaction for elimination in consolidation

**New: PATCH** — Approve transaction:
- Changes status from 'pending' → 'approved' → 'posted'
- Only 'posted' transactions appear in financial reports
- Requires appropriate role

**New: POST /void** — Void transaction:
- Creates reversing entry (same accounts, opposite debit/credit)
- Original transaction status → 'voided'
- Reversing entry references original batch_id

### 2.2 API: `/api/accounting/transactions/approve/route.ts`

**POST** — Bulk approve transactions:
- Input: array of transaction batch_ids
- Validates all entries in each batch
- Updates status to 'posted'
- Creates activity log

### 2.3 Component: `components/accounting/transaction-list.tsx`

- Entity-scoped transaction register
- Columns: Date, Description, Account, Debit, Credit, Reference, Type, Status, Project, Unit
- Filters: date range, account, type, status, project, search
- Grouping options: by date, by batch, by account, by project
- Batch display: related entries shown together with expand/collapse
- Running balance per account when filtered to single account
- Bulk actions: approve, void (for authorized users)
- Status badges: pending (yellow), approved (blue), posted (green), voided (red)

### 2.4 Enhance `components/accounting/transaction-form.tsx`

Current form handles basic journal entries. Enhance with:
- Transaction type selector changes form layout:
  - **Journal Entry**: Standard debit/credit (existing)
  - **Transfer**: From Account → To Account → Amount (simplified)
  - **Capital Contribution**: Investor selector → amount → credit Member Capital
  - **Distribution**: Distribution record reference → auto-populate entries
  - **Draw**: Loan selector → amount → debit Cash, credit Loan Payable
  - **Interest Accrual**: Loan selector → auto-calculate → debit Interest Expense, credit Accrued Interest
- Project/Unit selectors populated from entity's linked projects
- Supporting document upload
- "Save as Template" for recurring entries
- Recurring transaction scheduling (monthly interest, etc.)

### 2.5 Component: `components/accounting/account-detail.tsx`

- Account-level transaction register
- Header: Account #, Name, Type, Current Balance
- Transaction list filtered to this account
- Running balance column
- Date range selector
- Reconciliation markers (future)
- Export: CSV, PDF

### 2.6 Page: `/accounting/entities/[id]/transactions/page.tsx`

- Full transaction register for entity
- Link from COA balance drill-down
- Pending approval queue at top
- New transaction button

### 2.7 Page: `/accounting/entities/[id]/coa/page.tsx`

- COA editor page
- Import template action
- Export COA
- Account balance summary

---

## PHASE 3: Period Management & Close Process
**Priority: HIGH | Estimated Complexity: Medium**

### 3.1 API: `/api/accounting/periods/route.ts`

**GET** — List fiscal periods for entity:
- Returns: period, status, transaction count, debit/credit totals, closed_by, closed_at
- Filter: entity_id, status, year

**POST** — Open new period:
- Validates: previous period is 'closed' or 'locked'
- Creates period record with status 'open'

### 3.2 API: `/api/accounting/periods/[id]/close/route.ts`

**POST** — Close period:
- Step 1: Validate no pending/approved (unposted) transactions in period
- Step 2: Generate trial balance — verify debits = credits
- Step 3: Flag any adjusting entries needed
- Step 4: Update status: 'open' → 'review' → 'closed'
- Step 5: Set closed_by, closed_at
- Prevents new transactions in closed period (enforced at transaction creation)

**POST /lock** — Lock period:
- Status: 'closed' → 'locked'
- Prevents any modifications including adjusting entries
- Requires admin role

**POST /reopen** — Reopen period (admin only):
- Status: 'closed' → 'open' (not 'locked' → never reopen locked)
- Audit log entry with reason

### 3.3 Component: `components/accounting/period-close-wizard.tsx`

- Multi-step wizard:
  1. **Review**: Show period summary (transaction count, totals, unposted items)
  2. **Trial Balance**: Auto-generated trial balance showing all accounts
     - Highlight out-of-balance condition
     - Show adjusting entry suggestions
  3. **Adjusting Entries**: Create adjusting entries if needed
     - Flag as is_adjusting_entry = true
  4. **Confirm Close**: Final review and close button
  5. **Complete**: Success confirmation with period summary
- Status indicators: green checkmarks for completed steps

### 3.4 Page: `/accounting/period-close/page.tsx`

- Period management dashboard
- Entity selector (or global view across entities)
- Period list with status badges
- Current open period highlighted
- Close period button → wizard
- Lock period button (admin)
- Calendar view of fiscal year with period status colors

---

## PHASE 4: Investor Management & Capital Calls
**Priority: HIGH | Estimated Complexity: Medium**

### 4.1 API: `/api/accounting/investors/route.ts`

**GET** — List investors for entity:
- Returns: investor details, ownership %, capital committed, contributed, remaining, preferred return rate, accreditation status
- Computed: capital_remaining (commitment - contributed), pct_funded

**POST** — Create investor:
- Links to contact record
- Sets ownership %, capital commitment, preferred return
- Validates: total ownership across all investors ≤ 100%
- Creates activity log

**PATCH** — Update investor details
**DELETE** — Remove investor (only if no capital contributed)

### 4.2 API: `/api/accounting/capital-calls/route.ts`

**GET** — List capital calls for entity:
- Returns: call details, per-investor responses, funding status
- Computed: total_called, total_received, pct_funded

**POST** — Create capital call:
- Input: total_amount, purpose, due_date
- Auto-generates call_number
- Auto-creates capital_call_responses for each investor:
  - amount_called = total_amount × investor.ownership_pct
- Status: 'draft'

### 4.3 API: `/api/accounting/capital-calls/[id]/issue/route.ts`

**POST** — Issue capital call:
- Updates status: 'draft' → 'issued'
- Triggers notification to investors (email via SendGrid/Outlook)
- Creates activity log

### 4.4 API: `/api/accounting/capital-calls/[id]/responses/[responseId]/route.ts`

**PATCH** — Record capital call response:
- Input: amount_received, received_date
- Updates response status: 'pending' → 'partial' or 'received'
- If all responses fully funded: call status → 'fully_funded'
- Creates accounting transaction:
  - Debit: Cash (1000)
  - Credit: Member Capital - Investors (3100)
- Updates investor.contributed_to_date

### 4.5 Component: `components/accounting/investor-list.tsx`

- Entity-scoped investor table
- Columns: Name, Ownership %, Capital Committed, Contributed, Remaining, Pref Return, Accreditation, Status
- Progress bar: contributed / committed
- Add investor button
- Investor detail expansion:
  - Contact info
  - Capital call history
  - Distribution history
  - Documents (subscription agreement, operating agreement, W-9)
  - K-1 generation (future)

### 4.6 Component: `components/accounting/capital-call-form.tsx`

- Create capital call:
  - Total amount input
  - Purpose/description
  - Due date
  - Auto-calculated per-investor amounts
  - Preview table: Investor, Ownership %, Amount Called
- Issue call button with confirmation
- Attach supporting documents

### 4.7 Component: `components/accounting/capital-call-tracker.tsx`

- List of all capital calls for entity
- Status badges: draft, issued, partially_funded, fully_funded
- Expandable rows showing per-investor responses:
  - Investor name, amount called, amount received, date, status
- Record receipt button per investor
- Overdue indicator (past due_date with pending responses)
- Summary: total called, total received, outstanding

### 4.8 Pages

- `/accounting/entities/[id]/investors/page.tsx` — Investor management
- `/accounting/entities/[id]/capital-calls/page.tsx` — Capital call management (could be sub-tab)

---

## PHASE 5: Waterfall Distributions
**Priority: HIGH | Estimated Complexity: High**

### 5.1 API: `/api/accounting/distributions/route.ts`

**GET** — List distributions for entity
**POST** — Create distribution:
- Input: total_amount, distribution_type, waterfall_structure_id, source_project_id
- Runs waterfall calculation
- Creates distribution record with status 'draft'
- Creates per-investor allocation records

### 5.2 API: `/api/accounting/distributions/[id]/approve/route.ts`

**POST** — Approve distribution:
- Validates: entity has sufficient cash
- Updates status: 'draft' → 'approved'
- Creates accounting transactions per investor:
  - Debit: Distributions (3300, contra-equity)
  - Credit: Cash (1000)
- Updates investor records (for ROC: reduces contributed_to_date)

### 5.3 API: `/api/accounting/distributions/[id]/process/route.ts`

**POST** — Process/execute distribution:
- Updates status: 'approved' → 'distributed'
- Records payment details per allocation (method, reference, date)
- Creates activity log

### 5.4 Enhance `components/accounting/waterfall-calculator.tsx`

Current component handles calculation and display. Enhance with:
- **Waterfall Type: Simple Preferred + Promote:**
  1. Return of Capital: 100% to investors until capital returned
  2. Preferred Return: 100% to investors until preferred return achieved
  3. Catch-Up: 100% to manager until promote catch-up
  4. Residual Split: configurable % to investors / % to manager
- **Waterfall Type: Multi-Tier IRR:**
  1. Below Tier 1 IRR: 100% to investors
  2. Tier 1 to Tier 2 IRR: Split (e.g., 80/20)
  3. Above Tier 2 IRR: Split (e.g., 60/40)
  - Requires: investment date, cash flow history for IRR computation
- **Waterfall Type: Straight Split:**
  - Simple percentage split (no preferred return)
- Add: "What-if" mode — model distributions without creating records
- Add: Historical distribution view — all past distributions with cumulative tracking
- Add: IRR calculation for each investor based on cash flow history
- Add: Equity multiple calculation (total distributions / total contributions)

### 5.5 API: `/api/accounting/waterfall/calculate/route.ts`

**POST** — Calculate waterfall (no persistence, preview only):
- Input: entity_id, waterfall_structure_id, amount
- Returns: full calculation breakdown per tier, per investor
- Used for "what-if" analysis without creating distribution records

### 5.6 Component: `components/accounting/distribution-history.tsx`

- Chronological list of all distributions
- Per distribution: date, amount, type, source project, status
- Expandable: per-investor allocations
- Cumulative tracking: total distributed, total preferred paid, total promote paid
- Per-investor cumulative: total received, ROI, equity multiple

### 5.7 Pages

- `/accounting/entities/[id]/distributions/page.tsx` — Distribution management
  - Waterfall structure display
  - Distribution history
  - New distribution button → wizard

---

## PHASE 6: Loan Management & Interest Accrual
**Priority: HIGH | Estimated Complexity: Medium**

### 6.1 API: `/api/accounting/loans/route.ts`

**GET** — List loans with optional entity filter:
- Returns: loan details, draw summary, interest summary, maturity info
- Computed: available_amount, utilization %, days_to_maturity, monthly_interest_estimate

**POST** — Create loan:
- Input: entity_id, project_id, lender details, loan terms
- Validates: entity exists
- Creates activity log
- Sets amount_available = original_amount - amount_drawn

### 6.2 API: `/api/accounting/loans/[id]/draws/route.ts`

**GET** — List draws for loan
**POST** — Request draw:
- Input: amount, description, linked_construction_draw
- Validates: amount ≤ amount_available
- Creates loan_draw with status 'requested'
- Updates loan.amount_drawn and amount_available

### 6.3 API: `/api/accounting/loans/[id]/draws/[drawId]/approve/route.ts`

**POST** — Approve/fund draw:
- Updates draw status: 'requested' → 'approved' → 'funded'
- On 'funded':
  - Creates accounting transactions:
    - Debit: Cash (1000)
    - Credit: Construction Loan (2200) or Development Loan (2300)
  - Updates loan amounts
  - If construction loan: links to corresponding Red Cedar draw request

### 6.4 API: `/api/accounting/loans/interest-accrual/route.ts`

**POST** — Run monthly interest accrual:
- Input: period (YYYY-MM)
- For each active loan in entity:
  - Calculate: (amount_drawn × interest_rate / 365) × days_in_period
  - Create accounting transaction:
    - Debit: Interest Expense (part of 5300 Financing Costs)
    - Credit: Accrued Interest (2500)
  - Update loan.accrued_interest
- Returns: summary of all accruals posted

### 6.5 Enhance `components/accounting/loan-tracker.tsx`

Current component shows single loan detail. Enhance with:
- Multi-loan list view (for loan dashboard)
- Loan comparison across entities
- Interest accrual schedule display
- Draw request form inline
- Link to construction draw requests (cross-module)
- Covenant tracking with alert thresholds
- LTC/LTV ratio monitoring with warning zones
- Maturity timeline visualization

### 6.6 Component: `components/accounting/loan-list.tsx`

- All loans across entities (global view) or per-entity
- Table: Lender, Type, Original, Drawn, Available, Rate, Maturity, Status
- Quick filters: entity, loan_type, status, maturity range
- Color-coded maturity warnings (same as existing logic)
- Utilization progress bars
- Aggregate: total facilities, total drawn, total available

### 6.7 Pages

- `/accounting/loans/page.tsx` — Enhance existing loan dashboard
  - Loan list with filters
  - Maturity calendar
  - Interest accrual run button
  - Global loan summary

---

## PHASE 7: Financial Reporting & Consolidation
**Priority: HIGH | Estimated Complexity: High**

### 7.1 API: `/api/accounting/reports/route.ts`

**GET** — Generate financial report:
- Query: entity_id, report_type, period_start, period_end, comparative (boolean)
- Report types:
  - `balance_sheet`: Assets, Liabilities, Equity as of period_end
  - `income_statement`: Revenue, COGS, OpEx for date range
  - `trial_balance`: All accounts with debit/credit balances
  - `cash_flow`: Operating, Investing, Financing cash flows
  - `transaction_register`: All transactions for period
  - `project_pl`: Project-level P&L (revenue - all costs)
  - `investor_statement`: Per-investor capital account activity
- Comparative: adds prior period columns for period-over-period analysis
- Only includes 'posted' transactions

### 7.2 API: `/api/accounting/reports/consolidated/route.ts`

**GET** — Consolidated report across entity hierarchy:
- Input: parent_entity_id, report_type, period
- Aggregates all child entity reports
- Intercompany elimination:
  - Identifies transactions between related entities (via intercompany_entity_id)
  - Eliminates offsetting entries
  - Shows: entity subtotals, eliminations, consolidated total
- Useful for Olive Brynn LLC consolidated view

### 7.3 API: `/api/accounting/reports/project-pl/route.ts`

**GET** — Project-level P&L:
- Input: project_id or entity_id
- Revenue: home sales, lot sales, other (from 4000-4999 tagged to project)
- Cost of Sales: land, hard costs, soft costs, financing, selling (from 5000-5999)
- Gross Profit
- Operating Expenses (from 6000-6999)
- Net Income
- Per-house breakdown for community projects

### 7.4 API: `/api/accounting/reports/investor-statement/route.ts`

**GET** — Investor capital account statement:
- Input: entity_id, investor_id, period
- Shows: beginning balance, contributions, preferred return accrued, distributions received, ending balance
- IRR calculation (XIRR) based on actual cash flow dates
- Equity multiple: total distributions / total contributions
- Preferred return status: current or in arrears

### 7.5 Enhance `components/accounting/financial-reports.tsx`

Current component renders reports from pre-computed data. Enhance with:
- API integration (fetch real data)
- Period selector: monthly, quarterly, annual, custom range
- Comparative toggle: show prior period side-by-side
- Drill-down: click any line item to see underlying transactions
- Export: PDF generation, Excel download
- Print-optimized layout (already has print button)
- Report scheduling (auto-generate monthly)

### 7.6 Component: `components/accounting/consolidated-report.tsx`

- Entity hierarchy selector (parent entity)
- Report type selector
- Shows: entity-level subtotals, elimination entries, consolidated totals
- Expandable sections per entity
- Elimination detail view
- Export: consolidated PDF

### 7.7 Component: `components/accounting/project-pl.tsx`

- Project selector
- Revenue vs. cost breakdown
- Per-house profitability table (for community projects)
- Charts: cost category pie chart, margin trend line
- Comparison across projects
- Export

### 7.8 Component: `components/accounting/investor-statement.tsx`

- Investor selector
- Capital account waterfall display
- Cash flow timeline
- IRR and equity multiple prominently displayed
- Distribution history
- K-1 preparation data (future)
- Print/export for investor communication

### 7.9 Pages

- `/accounting/entities/[id]/reports/page.tsx` — Entity-level reporting
- `/accounting/reports/consolidated/page.tsx` — Consolidated view
- `/accounting/reports/project-pl/page.tsx` — Project P&L
- `/accounting/reports/investor/page.tsx` — Investor statements

---

## PHASE 8: Cross-Module Integration (Construction → Accounting)
**Priority: HIGH | Estimated Complexity: High**

### 8.1 Automatic Transaction Creation

When events occur in Construction module (Plan 1), create corresponding accounting transactions:

**PO Invoiced (AP):**
- Trigger: Invoice created in construction module
- Entity: Determined from job → linked_project → owner_entity_id
- Entries:
  - Debit: Construction in Progress (1400) or appropriate cost account
  - Credit: Accounts Payable (2000)
- Tagged: project_id, unit_id, reference = invoice number

**Payment Processed (Cash Disbursement):**
- Trigger: Payment processed in construction module
- Entries:
  - Debit: Accounts Payable (2000)
  - Credit: Cash - Operating (1000)
- Tagged: vendor, reference = payment number

**Draw Requested (AR):**
- Trigger: Draw request submitted from construction
- If internal job:
  - In Red Cedar operating entity:
    - Debit: Accounts Receivable (1100)
    - Credit: Revenue (4000 or 4100)
  - In SPE entity:
    - Debit: Construction in Progress (1400)
    - Credit: Accounts Payable (2000) — payable to Red Cedar
- If third-party: only Red Cedar side entry

**Draw Paid (Cash Receipt):**
- Trigger: Draw payment received
- In Red Cedar:
  - Debit: Cash (1000)
  - Credit: Accounts Receivable (1100)

**Change Order Approved:**
- Trigger: CO approved in construction
- Adjusts: unit budget, may create additional CIP entries

**Loan Draw Funded:**
- Trigger: Loan draw funded
- In SPE:
  - Debit: Cash (1000)
  - Credit: Construction Loan (2200)

### 8.2 API: `/api/accounting/sync/construction/route.ts`

**POST** — Sync construction event to accounting:
- Input: event_type, event_data (invoice, payment, draw, etc.)
- Determines target entity from job → project → entity chain
- Creates appropriate double-entry transactions
- Returns: created transaction batch_id
- Idempotent: checks for existing sync (prevents duplicate entries)

### 8.3 Transaction Auto-Posting Rules

Configuration per entity:
- Auto-post construction-generated transactions: yes/no
- Require review for transactions above threshold: configurable amount
- Auto-post interest accrual: yes/no
- Default: require review (status = 'pending')

---

## PHASE 9: Akaunting Integration
**Priority: MEDIUM | Estimated Complexity: Medium**

### 9.1 API: `/api/accounting/integrations/akaunting/route.ts`

**GET** — Sync status and mapping:
- Returns: last sync date, pending transactions, mapping configuration

**POST** — Trigger sync:
- Finds all posted transactions since last sync where akaunting_synced = false
- Maps Atlas accounts to Akaunting accounts (from integration_settings config)
- Pushes transactions to Akaunting API
- Updates akaunting_synced = true on success
- Returns: sync summary (synced count, failed count, errors)

### 9.2 API: `/api/accounting/integrations/akaunting/mapping/route.ts`

**GET** — Account mapping table
**PUT** — Update mapping:
- Input: array of { atlas_account_id, akaunting_account_id }
- Validates: all accounts exist
- Stores in integration_settings.config JSONB

### 9.3 Component: `components/accounting/akaunting-sync.tsx`

- Sync status display: last sync date, pending count
- Sync now button with progress indicator
- Account mapping editor:
  - Table: Atlas Account # | Atlas Name | ↔ | Akaunting Account | Akaunting Name
  - Dropdown selectors for Akaunting accounts
  - Auto-match by account number suggestion
- Sync history: recent syncs with success/failure counts
- Error log: failed transactions with retry option

### 9.4 Page: Integrate into `/admin/integrations/page.tsx`

- Akaunting configuration section
- API endpoint, credentials (masked)
- Test connection button
- Account mapping editor
- Sync controls

---

## PHASE 10: Dashboard & Navigation Enhancements
**Priority: MEDIUM | Estimated Complexity: Low-Medium**

### 10.1 Enhance `/accounting/page.tsx`

Current dashboard has mock data. Replace with real data:

**Summary Cards (dynamic):**
- Total Entities (from DB)
- Total Assets (computed from posted transactions across all entities)
- Total Liabilities (computed)
- Net Equity (computed)
- Trend indicators (compare to prior month)

**Entity Hierarchy (existing, connect to real data)**

**Quick Links (existing, add more):**
- Period Close (link to open periods needing close)
- Pending Approvals (count of pending transactions)
- Distribution Calculator
- Loan Dashboard

**Recent Activity Feed:**
- Last 10 transactions across all entities
- Recent capital calls
- Recent distributions
- Loan draw activity

**Alerts Section:**
- Maturity alerts (existing, connect to real data)
- Overdue capital calls
- Periods needing close
- Insurance expirations
- Low cash warnings

### 10.2 Update Sidebar Navigation

Accounting module navigation:
- **Dashboard** (existing)
- **Entities** (existing)
  - Entity detail with tabs
- **Transactions** (new — global view across entities)
- **Period Close** (existing)
- **Loans** (existing)
- **Investors** (new — global view)
- **Distributions** (new — global view)
- **Reports** (new)
  - Financial Statements
  - Consolidated Reports
  - Project P&L
  - Investor Statements
- **Integrations** (link to admin)

### 10.3 Global Transaction Search

- Search bar in accounting module header
- Searches across: description, reference_number, account_name, amount
- Results show entity, date, description, amount, status
- Quick navigate to transaction detail

---

## IMPLEMENTATION ORDER & DEPENDENCIES

```
Phase 1 (Entities/COA) ────────────────┐
                                        │
Phase 2 (Transactions/GL) ────────────├── Phase 3 (Period Close) ──┐
                                        │                           │
Phase 4 (Investors/Capital Calls) ─────┤                           ├── Phase 7 (Reports)
                                        │                           │
Phase 5 (Distributions/Waterfall) ─────┤                           │
                                        │                           │
Phase 6 (Loans/Interest) ─────────────┤                           │
                                        │                           │
                                        └── Phase 8 (Construction   │
                                            Integration)            │
                                                                    │
Phase 9 (Akaunting) ──────────────────── independent ──────────────┘
                                                                    │
Phase 10 (Dashboard) ────────────────── runs in parallel ──────────┘
```

**Critical Path:** Phase 1 → Phase 2 → Phase 3 → Phase 7
**Parallel Track A:** Phase 4 → Phase 5 (after Phase 2)
**Parallel Track B:** Phase 6 (after Phase 2)
**Integration:** Phase 8 (after Plan 1 Phase 2 + this plan Phase 2)
**Independent:** Phase 9 (anytime after Phase 2)
**Continuous:** Phase 10 (update as each phase completes)

---

## CROSS-PLAN DEPENDENCIES

| This Plan (Entity/Owner) | Depends On (Construction/Builder — Plan 1) |
|--------------------------|---------------------------------------------|
| Phase 8.1 (AP auto-entries) | Plan 1 Phase 2 (AP Invoice Processing) |
| Phase 8.1 (Payment entries) | Plan 1 Phase 3 (Payment Processing) |
| Phase 8.1 (AR auto-entries) | Plan 1 Phase 4 (Draw Schedule) |
| Phase 6.3 (Loan draw ↔ construction draw) | Plan 1 Phase 4 (Draw Request) |
| Phase 7.3 (Project P&L) | Plan 1 Phase 6 (Job Cost Reports) for cost data |

---

## FILES TO CREATE (New)

| File | Purpose |
|------|---------|
| `supabase/migrations/017_enhance_accounting.sql` | Schema additions (intercompany fields, auto-sync tracking) |
| `app/api/accounting/entities/route.ts` | Entity CRUD |
| `app/api/accounting/entities/[id]/route.ts` | Entity detail/update |
| `app/api/accounting/coa/route.ts` | Chart of accounts CRUD |
| `app/api/accounting/transactions/approve/route.ts` | Bulk approve |
| `app/api/accounting/periods/route.ts` | Period management |
| `app/api/accounting/periods/[id]/close/route.ts` | Period close workflow |
| `app/api/accounting/investors/route.ts` | Investor CRUD |
| `app/api/accounting/capital-calls/route.ts` | Capital call management |
| `app/api/accounting/capital-calls/[id]/issue/route.ts` | Issue capital call |
| `app/api/accounting/capital-calls/[id]/responses/[responseId]/route.ts` | Record response |
| `app/api/accounting/distributions/route.ts` | Distribution CRUD |
| `app/api/accounting/distributions/[id]/approve/route.ts` | Approve distribution |
| `app/api/accounting/distributions/[id]/process/route.ts` | Process distribution |
| `app/api/accounting/waterfall/calculate/route.ts` | Preview waterfall calc |
| `app/api/accounting/loans/route.ts` | Loan CRUD |
| `app/api/accounting/loans/[id]/draws/route.ts` | Draw management |
| `app/api/accounting/loans/[id]/draws/[drawId]/approve/route.ts` | Draw approval |
| `app/api/accounting/loans/interest-accrual/route.ts` | Interest accrual |
| `app/api/accounting/reports/route.ts` | Report generation |
| `app/api/accounting/reports/consolidated/route.ts` | Consolidated reports |
| `app/api/accounting/reports/project-pl/route.ts` | Project P&L |
| `app/api/accounting/reports/investor-statement/route.ts` | Investor statements |
| `app/api/accounting/sync/construction/route.ts` | Construction → Accounting sync |
| `app/api/accounting/integrations/akaunting/route.ts` | Akaunting sync |
| `app/api/accounting/integrations/akaunting/mapping/route.ts` | Account mapping |
| `components/accounting/coa-editor.tsx` | Chart of accounts editor |
| `components/accounting/entity-detail.tsx` | Entity detail tabs |
| `components/accounting/transaction-list.tsx` | Transaction register |
| `components/accounting/account-detail.tsx` | Account-level register |
| `components/accounting/period-close-wizard.tsx` | Period close workflow |
| `components/accounting/investor-list.tsx` | Investor management |
| `components/accounting/capital-call-form.tsx` | Capital call creation |
| `components/accounting/capital-call-tracker.tsx` | Capital call tracking |
| `components/accounting/distribution-history.tsx` | Distribution history |
| `components/accounting/loan-list.tsx` | Multi-loan dashboard |
| `components/accounting/consolidated-report.tsx` | Consolidated financials |
| `components/accounting/project-pl.tsx` | Project P&L |
| `components/accounting/investor-statement.tsx` | Investor capital account |
| `components/accounting/akaunting-sync.tsx` | Akaunting integration |
| `app/(dashboard)/accounting/entities/[id]/page.tsx` | Entity detail page |
| `app/(dashboard)/accounting/entities/[id]/transactions/page.tsx` | Transaction register |
| `app/(dashboard)/accounting/entities/[id]/coa/page.tsx` | COA editor page |
| `app/(dashboard)/accounting/entities/[id]/investors/page.tsx` | Investor page |
| `app/(dashboard)/accounting/entities/[id]/distributions/page.tsx` | Distribution page |
| `app/(dashboard)/accounting/entities/[id]/reports/page.tsx` | Entity reports |
| `app/(dashboard)/accounting/reports/consolidated/page.tsx` | Consolidated view |
| `app/(dashboard)/accounting/reports/project-pl/page.tsx` | Project P&L page |
| `app/(dashboard)/accounting/reports/investor/page.tsx` | Investor statements |
| `lib/accounting/types.ts` | Accounting type definitions |
| `lib/accounting/waterfall-engine.ts` | Waterfall calculation logic |
| `lib/accounting/report-generators.ts` | Report computation functions |
| `lib/hooks/use-entity.ts` | Entity data hook |
| `lib/hooks/use-transactions.ts` | Transaction data hook |
| `lib/hooks/use-investors.ts` | Investor data hook |
| `lib/hooks/use-loans.ts` | Loan data hook |
| `lib/hooks/use-reports.ts` | Report data hook |

## FILES TO MODIFY (Existing)

| File | Changes |
|------|---------|
| `components/accounting/entity-hierarchy.tsx` | Add context menu, hover tooltips, entity creation |
| `components/accounting/financial-reports.tsx` | API integration, drill-down, comparative periods, export |
| `components/accounting/loan-tracker.tsx` | Multi-loan support, interest schedule, draw form |
| `components/accounting/transaction-form.tsx` | Type-specific forms, recurring entries, templates |
| `components/accounting/waterfall-calculator.tsx` | Multi-tier IRR, what-if mode, distribution history |
| `app/(dashboard)/accounting/page.tsx` | Real data, activity feed, alerts, enhanced navigation |
| `app/api/accounting/route.ts` | Approval workflow, void, intercompany, enhanced filters |
| `supabase/migrations/005_create_accounting.sql` | Reference only — new migration for additions |
