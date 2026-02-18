# ATLAS — Red Cedar Homes Operating Platform
## Complete Application Specification v4.0

**Platform Owner:** Red Cedar Homes (operated under Olive Brynn, LLC)
**Purpose:** End-to-end operating system for residential construction and development across scattered lot, lot development, community development, and lot purchase channels. Serves Red Cedar Homes' internal operations and its client relationships (including SPEs, funds, and third-party owners).
**Stack:** Next.js 16 / React 19 / TypeScript / Tailwind CSS / shadcn/ui / Supabase
**Deployment:** Vercel

---

# GLOBAL ARCHITECTURE

## Navigation

### Primary Navigation (always visible in top bar)
The global header displays five primary modules as persistent top-level tabs:

1. **Opportunities** — Deal pipeline from identification through closing
2. **Projects** — Owner/developer-level tracking from contract through disposition
3. **Construction** — Red Cedar GC operating system (Jobs and Units)
4. **Disposition** — Sale and disposition of completed assets
5. **Accounting** — Multi-entity financial management

### Secondary Navigation (dropdown "More" menu)
Additional modules housed under a single dropdown to keep the top bar clean:

6. **Tasks** — Cross-module task management with personal and team views
7. **Calendar** — Company calendar and personal calendar with key date events
8. **Reports** — Cross-module reporting and analytics
9. **Admin** — Configuration, permissions, integrations, templates

### Home Dashboard
The root route (`/`) is a customizable dashboard. Dashboard widgets and layout are configurable based on the user's **role and permissions**:

- **Owner/Principal:** Pipeline value, active project P&Ls, upcoming closings, capital deployed, portfolio performance
- **Construction Manager:** Active jobs by milestone, overdue tasks, pending inspections, open POs, warranty claims
- **Acquisitions Team:** Pipeline funnel, deals in DD, upcoming closings, new leads
- **Accounting:** Pending AP, cash positions by entity, upcoming loan draws, period close status
- **Read-Only / Investor:** Portfolio summary, distribution history, project status overview

Each user can rearrange, pin, and hide widgets. Default widget sets are configured in Admin per role.

## Global Entity Selector

A persistent entity context selector in the header allows users to filter the entire platform by entity. This determines which records are visible across all modules.

**Builder Entity:** Red Cedar Homes (the GC — always present as the builder, never filtered out)

**Sample Owner Entities:**
- **Scattered Lot Fund** — Single Purpose Entity (SPE) for scattered lot acquisitions
- **Olive Brynn LLC** — Holding company and parent entity
- **153 Oakwood LLC** — Syndication entity with investor capital

Entity types include: Operating Company, Holding Company, Single Purpose Entity (SPE), Fund/Syndication, Other. Each entity can own Opportunities, Projects, and Accounting records. The entity selector filters what the user sees without changing underlying data ownership.

## Record View Preferences

All module index pages (Opportunities, Projects, Construction Jobs, Disposition Listings, Contacts) support two view modes:

- **Card View** — Visual cards with key metrics, progress indicators, and status badges
- **List View** — Dense table with sortable columns, inline editing, and bulk actions

Users can toggle between views. Each user can set a **default view per module** in their preferences (stored in user profile). The system remembers the last-used view per module per session.

## SharePoint Integration (All Modules)

SharePoint is a first-class integration via Microsoft Graph API. Every record across the big 5 modules (Opportunities, Projects, Construction, Disposition, Accounting) gets a **default folder structure** created automatically in SharePoint when the record is created.

**Admin > Integration Settings > SharePoint:**
- SharePoint Tenant URL
- Client ID and Client Secret (Azure AD App Registration)
- Site/Library selection
- Test Connection button

**Admin > SharePoint Folder Templates:**
Templates are configured per module and per record type. When a new record is created, Atlas calls Microsoft Graph to create the folder tree. All document uploads from Atlas push to the corresponding SharePoint folder.

### Default Folder Templates

**Opportunity Folders:**
```
[Opp Number] - [Address or Name]/
├── 01. Site Analysis/
│   ├── GIS Data & Maps
│   ├── Photos
│   └── Environmental
├── 02. Market Data/
│   ├── Comparable Sales
│   └── Market Reports
├── 03. Deal Sheets & Underwriting/
│   ├── Deal Intake Sheet
│   ├── Deal Analyzer Exports
│   └── Land Committee Submissions
├── 04. Contracts & LOIs/
│   ├── LOI
│   ├── Purchase Contract
│   ├── Amendments
│   └── Addendums
├── 05. Due Diligence/
│   ├── Title & Survey
│   ├── Engineering
│   ├── Environmental Reports
│   └── Zoning & Permits
└── 06. Correspondence/
```

**Scattered Lot Project Folders:**
```
[Project Number] - [Address]/
├── 01. Acquisition/
│   ├── Purchase Contract & Amendments
│   ├── Title & Survey
│   ├── Due Diligence
│   ├── Comps & Market Data
│   └── Closing Documents
├── 02. Pre-Construction/
│   ├── Site Analysis
│   ├── Floor Plans & Specifications
│   ├── Permit Application
│   └── Engineering
├── 03. Vertical Construction/
│   ├── Handoff Documents
│   ├── Draw Requests
│   ├── Change Orders
│   ├── Inspections
│   ├── Photos
│   └── Lien Waivers
├── 04. Selections & Design/
│   ├── Interior Design Package
│   ├── Exterior Design Package
│   ├── Appliance Package
│   └── Brix Selection Sheets
├── 05. Financial/
│   ├── Budget & Cost Tracking
│   ├── Loan Documents
│   ├── Insurance
│   └── Invoices
├── 06. Disposition/
│   ├── Listing Agreement
│   ├── Sale Contract
│   ├── Closing Documents
│   └── Warranty Documentation
└── 07. Correspondence/
```

**Lot Development Project Folders:**
```
[Project Number] - [Project Name]/
├── 01. Acquisition/
│   ├── Purchase Contract & Amendments
│   ├── Title & Survey
│   ├── Due Diligence
│   └── Closing Documents
├── 02. Entitlement/
│   ├── Zoning Applications
│   ├── Preliminary Plat
│   ├── Final Plat
│   └── Municipal Approvals
├── 03. Engineering & Design/
│   ├── Civil Engineering
│   ├── Environmental
│   ├── Geotech
│   └── Stormwater
├── 04. Horizontal Construction/
│   ├── Contractor Agreements
│   ├── Permits & Bonds
│   ├── Pay Applications
│   ├── Inspections
│   └── Photos
├── 05. Lot Sales/
│   ├── Builder LOIs & LPAs
│   ├── Lot Contracts
│   └── Lot Closings
├── 06. Financial/
│   ├── Budget & Cost Tracking
│   ├── Loan Documents
│   └── Insurance
└── 07. Correspondence/
```

**Community Development Project Folders:** Combines Lot Development structure plus per-unit vertical construction sub-folders under a "Vertical Construction" parent.

**Construction Job Folders:**
```
[Job Number] - [Job Name]/
├── 01. Contract & Scope/
│   ├── Construction Agreement
│   ├── Exhibits & Schedules
│   └── Insurance Certificates
├── 02. Permitting/
│   ├── Permit Applications
│   ├── Submittals
│   ├── Approved Plans
│   └── Inspection Reports
├── 03. Purchase Orders/
│   ├── Issued POs
│   ├── Invoices
│   └── Lien Waivers
├── 04. Change Orders/
├── 05. Inspections/
├── 06. Photos/
│   ├── Progress Photos
│   └── Milestone Photos
├── 07. Draw Requests/
├── 08. Selections & Design/
├── 09. Warranty/
└── 10. Close-Out/
```

**Disposition Listing Folders:**
```
[Listing ID] - [Address]/
├── 01. Marketing/
│   ├── Listing Photos
│   ├── Flyers & Brochures
│   └── MLS Data
├── 02. Offers/
├── 03. Sale Contract/
│   ├── Contract & Amendments
│   ├── Disclosures
│   └── Addendums
├── 04. Closing/
│   ├── Settlement Statement
│   ├── Title Documents
│   └── Recording
├── 05. Warranty/
└── 06. Correspondence/
```

**Accounting Entity Folders:**
```
[Entity Name]/
├── 01. Formation Documents/
│   ├── Operating Agreement
│   ├── Articles of Organization
│   └── EIN Documentation
├── 02. Investor Documents/
│   ├── Subscription Agreements
│   ├── K-1s
│   └── Distribution Notices
├── 03. Banking/
│   ├── Bank Statements
│   └── Reconciliation Reports
├── 04. Tax/
│   ├── Tax Returns
│   └── 1099s
├── 05. Insurance/
└── 06. Financial Reports/
```

**Document Upload from Atlas:** Any document upload field in Atlas pushes the file to the corresponding SharePoint folder. Documents are accessible from Atlas record detail pages via embedded SharePoint links.

## Workflow Engine — Cross-Module Architecture

**CRITICAL TERMINOLOGY CHANGE (v4):** What was previously called "Schedule" is now **Workflow**. The terms are unified platform-wide. There is no separate "Schedule" concept — all sequenced work uses the Workflow system.

**Hierarchy:** Workflow → Milestones → Task Lists → Tasks

**Workflow:** Named process attached to a record. Every Opportunity, Project, Construction Job, and Disposition Listing can have one active Workflow. The workflow template is auto-applied when the record is created based on its type. Users can customize the instance without affecting the master template.

**Milestone:** Major phase within a workflow. Sequential (completed in order, with override capability). Fields: name, description, sequence, entry criteria, completion criteria (all task lists complete or manual override).

**Task List:** Group of related tasks within a milestone. Fields: name, description, linked milestone, completion criteria.

**Task:** Individual action item. Fields: title, description, assigned to (Role AND/OR specific User), relative due date (from milestone activation, e.g., "+5 business days"), priority (Low/Medium/High/Urgent), status (Not Started → In Progress → Complete → Skipped), completion date, notes, linked documents, linked record.

**Template Management:** Created in Admin per module per record type. Cloned and attached when new record created. Users customize instance without affecting master template.

**Role-Based Assignment:** Tasks assigned to Roles by default in templates. When instantiated, system maps roles to users based on team assignments. Specific user can override role assignment.

## Contacts Module (Global)

All contacts live in a single global directory. Each contact is assigned one or more **Contact Types** at creation:

**Contact Types:** Owner/Principal, Investor, Attorney/Legal, Lender, Surveyor, Engineer, Architect, Appraiser, Real Estate Agent/Broker, Title Company, Inspector, Municipality Contact, Subcontractor/Vendor, Construction Manager, Project Manager, Accountant, Insurance Agent, Utility Provider, Property Manager, Buyer, Seller, Other.

**Contact Record Fields:** First name, last name, company/organization, contact type(s), email, phone, secondary phone, mailing address, notes, linked entities, linked projects, linked jobs, tags, status (Active/Inactive), created date.

**Global Contact Views:**
- All Contacts list with search, filter by contact type, filter by status
- Companies view: aggregate contacts by organization
- Contact detail page showing all linked records across modules
- Quick-add contact from any module

**Record-Level Contact Assignment:** On any record detail page (Opportunity, Project, Job, Entity), a "Contacts" section allows users to search the global contacts list and assign contacts to **roles** specific to that record.

## Calendar Module

**Company Calendar:** Shared calendar visible to all team members showing:
- Milestone due dates (from active workflows across Opportunities, Projects, and Construction)
- Inspection dates
- Closing dates
- Land Committee meetings (recurring weekly, Wednesdays)
- Handoff meetings (recurring weekly, Mondays)
- Permit expiration dates
- Insurance certificate expiration dates
- Loan maturity dates

**Personal Calendar:** Per-user view showing:
- Tasks assigned to the user with due dates
- Key project dates where user is a team member
- Calendar sync to Microsoft Outlook

## Tasks Module (Cross-Module)

Standalone module accessible from the "More" dropdown and as sub-pages within every record.

**Views:**
- **My Tasks:** All tasks assigned to the current user across all modules, sorted by due date
- **All Tasks:** Team-wide task view (filtered by permissions)
- **Overdue:** Tasks past due date, highlighted by severity

Tasks originate from Workflows (milestone-based) or can be created ad-hoc on any record. Each task links back to its parent record (Opportunity, Project, Job, Listing, Entity).

## Reports Module

Centralized reporting accessible from the "More" dropdown. Reports pull data across all modules.

**Report Categories:**
- **Pipeline Reports:** Opportunity funnel, conversion rates, deal flow by type/source, days-to-close
- **Project Reports:** Active projects by status, budget vs. actual roll-ups, project P&L summaries
- **Construction Reports:** Job status overview, milestone velocity, cost variance analysis, vendor performance, 1099 tracking
- **Disposition Reports:** Active listings, days on market, sale price vs. list price, commission tracking
- **Financial Reports:** Entity P&L, balance sheet, cash flow, consolidated, investor statements, loan summaries
- **Custom Reports:** User-defined report builder with saved templates

---

# MODULE 1: OPPORTUNITIES

## 1.1 Pipeline View

**Card View:** Visual cards with key data, progress bars, and status badges. Grouped by stage (kanban) or flat grid.

**List View:** Filterable table with columns: Opportunity Name, Address, Type, Stage, Assigned To, Entity, Projected Value, Days in Stage, Created Date.

**Kanban View:** Cards grouped by stage. Stages are configurable in Admin per opportunity type.

**Analytics Dashboard:** Pipeline value by stage, conversion rate, average days to close by type, opportunities by type breakdown, monthly deal flow trend.

## 1.2 Opportunity Types and Default Stages

**Scattered Lot** — Individual infill lot acquisition for vertical construction.
Default Stages: Lead → Site Analysis → Offer/LOI → Under Contract → Due Diligence → Financing → Closing Prep → Closed/Won | Archived

**Lot Development** — Raw land acquisition and horizontal development to produce finished lots.
Default Stages: Lead → Feasibility → LOI/Contract → Entitlement DD → Financing → Closing Prep → Closed/Won | Archived

**Community Development** — Full cycle: land acquisition + lot development + vertical construction.
Default Stages: Lead → Feasibility → LOI/Contract → Entitlement DD → Financing → Closing Prep → Closed/Won | Archived

**Lot Purchase** — Buying finished lots from another developer for vertical construction.
Default Stages: Lead → Lot Evaluation → Offer/LOI → Under Contract → DD/Verification → Closing Prep → Closed/Won | Archived

**Other** — Minimal template for custom deal types.
Default Stages: Evaluation → Under Review → Closing → Closed/Won | Archived

## 1.3 Multi-Property Acquisitions

An Opportunity can represent a **multi-property deal** — similar to Qualia's multi-property order tracking. When acquiring multiple properties in a single transaction:

- The parent Opportunity tracks the deal as a whole (total price, contract terms, entity, seller)
- **Sub-Acquisitions** are child records, one per property/parcel in the deal
- Each sub-acquisition has its own address, parcel ID, property details, and floor plan assignment
- The parent Opportunity's financials aggregate across all sub-acquisitions
- When the Opportunity converts to Projects, each sub-acquisition becomes its own Project record (or multiple units within a single Project for adjacent lots)
- Sub-acquisitions share the parent's contract, contacts, and entity assignment but can have individual property-specific data

**Sub-Acquisition Fields:**
- Address, city, county, state, zip
- Parcel/TMS number
- Lot dimensions (width, depth, SF)
- Zoning
- Floor plan assignment
- Individual lot cost (if allocated from total price)
- Site-specific notes
- Property profile fields (same as main opportunity)

This supports scenarios like: purchasing 3 lots from a single seller in one contract, buying a multi-parcel assemblage for lot development, or acquiring scattered lots as a portfolio deal.

## 1.4 Opportunity Detail Page

**Pages (left sidebar navigation):**
- Overview
- Properties (sub-acquisitions for multi-property deals)
- Deal Analyzer
- Workflow
- Contacts
- Documents (SharePoint-integrated)
- Notes
- Activity

**Overview Fields:**
- Opportunity name (auto: Address + Type, or custom for multi-property)
- Address, city, county, state, zip (primary property, or "Multiple" for multi-property deals)
- Parcel/TMS number
- Opportunity type
- Current stage
- Source (MLS, Wholesaler, Direct, Broker, Off-Market, Referral, Other)
- Assigned to (user)
- Owner entity (e.g., "Scattered Lot Fund," "153 Oakwood LLC")
- Projected purchase price (total for multi-property)
- Projected sale price / ARV
- Key dates: created, offer date, contract date, DD expiration, closing date
- Linked contacts with roles (Seller, Listing Agent, Attorney, Surveyor, Lender)

**Scattered Lot Specific Fields:**
- Zoning (current)
- Build type (SF/TH/Duplex/Other)
- Road/Surrounding roads
- Construction buffers/setbacks
- Historic district overlay (Y/N)
- Utilities available (Water/Sewer/Power — individual toggles)
- House plan selection (from Admin Floor Plan Library)
- Best fit model
- Front or rear garage
- Survey complete (Y/N)
- Buildable footprint description
- Lot dimensions (width, depth, SF)

**Lot Development Specific Fields:**
- Total acreage
- Estimated total lots
- Zoning required vs. current
- Preliminary plat status
- Target builder(s) / LOI status
- Infrastructure scope estimate

## 1.5 Deal Analyzer (Dynamic)

The Deal Analyzer is a built-in calculation engine on the Opportunity detail page. It pulls from Admin-managed cost data (floor plans, base costs, upgrade packages, municipality soft costs, default fees) and allows the user to enter deal-specific variables to produce a GO/MARGINAL/NO-GO verdict.

**Data Sources (pulled from Admin):**
- Floor Plan Library: heated SF, bed/bath/garage, stories, type (SFH/TH), width/depth, base sticks-and-bricks cost, upgrade packages
- Municipality Soft Cost Table: water tap, sewer tap, gas tap, permitting fees, impact fees, architect, engineering, survey — per jurisdiction
- Default Fees: builder fee structure $15,000, contingency of $11,000, builder's risk insurance is $1,500, PO fee is $3,000, PM fee is $3,500, warranty reserve is $5,000
- Default Financing Assumptions: LTC ratio (85%), interest rate, construction period (default 160 days), cost of capital rate (16% annual)
- Default Selling Costs: commission + closing (8.5% of ASP default)

**User Inputs per Deal:**
- Select floor plan (dropdown from Floor Plan Library)
- Select upgrade package (Standard/Classic/Elegance — costs pulled from Admin)
- Select municipality (dropdown from Municipality table — soft costs auto-populate)
- Purchase price (lot cost)
- Site work / grading estimate
- Other site-specific costs
- Site-specific vertical construction adjustments
- Asset sales price (ARV) — user enters based on comps
- Selling concessions (optional)
- Project duration override (days)
- Interest rate override

**Auto-Calculated Outputs:**

Section 1 — Cost Summary:
- Sticks & Bricks (from floor plan selection)
- Upgrades (from upgrade package selection)
- Lot Preparation (user input)
- Site-Specific Vertical Adjustments (user input)
- Municipality Soft Costs (from municipality selection)
- Builder Fees: builder fee $15,000, PO fee is $3,000, PM fee is $3,500
- Contingency: contingency of $11,000
- Total Contract Cost (Red Cedar)

Section 2 — Fixed Per-House Costs:
- Builder warranty reserve $5,000
- Builder's risk insurance $1,500
- Closing costs (5% of purchase price)
- Utility charges $12 daily rate based on project timeline

Section 3 — Total Project Cost (excluding carry):
- Purchase price + Total Contract Cost + Fixed Per-House Costs

Section 4 — Financing:
- Lender LTC (85% of Total Project Cost)
- Loan Amount
- Equity Required (Total Project Cost minus Loan Amount)
- Interest on Loan (Loan Amount × Annual Rate × Duration/365)
- Cost of Capital on Equity (Equity × 16% × Duration/365)
- Total Carry Costs

Section 5 — Deal Results:
- Total All-In Cost (Project Cost + Carry Costs)
- Total Revenue (ASP)
- Total Selling Costs (8.5% of ASP + concessions)
- Net Sales Proceeds (Revenue minus Selling Costs)
- **Net Profit ($):** Net Sales Proceeds minus Total All-In Cost
- **Net Profit Margin (%):** Net Profit / Total Revenue

Section 6 — Verdict (per Admin-configurable thresholds):
- Above 10%: **STRONG DEAL** (green)
- 7%–10%: **GOOD DEAL** (blue)
- 5%–7%: **MARGINAL** (yellow)
- Below 5%: **NO GO / REWORK** (red)

**For Community Development / Lot Development:** Additional per-lot economics, total project IRR, peak capital requirement, lot-by-lot profitability table.

**Comps Section:** Table for up to 15 comparable sales: MLS link, beds, baths, SF, address, sale date, sale price. Auto-calculates avg SF, median price, avg $/SF.

## 1.6 Opportunity Workflows

See detailed workflow definitions in v3 spec sections 1.5 through 1.8. The workflows remain unchanged except for terminology:

- All references to "Superintendent" are now **"Construction Manager"**
- All references to "Schedule" are now **"Workflow"**
- Multi-property deals follow the same workflow, with sub-acquisition-specific tasks (e.g., individual property DD) running in parallel within shared milestones

---

# MODULE 2: PROJECTS

## 2.1 Project Index

**Card View:** Visual cards with budget progress bars (budget vs. actual spend), status badges, entity labels.
**List View:** Filterable table with columns: Project #, Name, Type, Status, Entity, Budget, Spend, Variance, Projected Close.

Filters: project type, status, entity, assigned team. Search by name, address, project number.

## 2.2 Project Detail Page

**Pages (left sidebar navigation):**
- Overview
- Property Details
- Contacts
- Budget & Actuals
- Workflow
- Draw Requests
- Loans
- Investors
- Disposition / Sales
- Documents (SharePoint-integrated)
- Notes
- Activity

**Core Fields:**
- Project number (auto-generated: YY-XXX)
- Project name
- Address / location
- Project type (Scattered Lot, Lot Development, Community Development, Lot Purchase)
- Owner entity (SPE or fund — e.g., "Scattered Lot Fund," "153 Oakwood LLC")
- Builder entity (Red Cedar Homes SC LLC, Red Cedar Homes NC LLC, or other GC)
- Status: Pre-Construction → Active → Construction → Punch/CO → Disposition → Complete → Closed
- Acquisition date
- Total budget
- Current spend (rolled up from Accounting entries tagged to this project)
- Projected final cost
- Linked contacts with project-specific roles

**Builder Contract Tracking:**
- Contract type: Cost-Plus Fixed Fee, Cost-Plus Percentage, Stipulated Sum
- Contract amount / fee structure
- Execution date
- Scope summary
- Payment terms (5-draw schedule: 20% deposit, 20% foundation, 25% framing/dry-in, 25% drywall/trim, 10% final)
- Change order procedures
- Warranty terms (1-year workmanship, 2-year systems, 5-year structural)
- Insurance requirements
- Signed contract document (linked to SharePoint)

## 2.3 Project Type-Specific Tracking

**Scattered Lot and Lot Purchase:**
- Lot dimensions, zoning, setbacks, buildable area
- Assigned floor plan, upgrade package
- Utility confirmation status
- Foundation type (Slab / Crawl Space / Basement)

**Lot Development and Community Development:**
- Total acreage and total lots
- Lot dimension table: lot #, width, depth, SF, status (Raw → Developing → Finished → Contracted → Sold)
- Phase breakdown
- Plat status and documents
- Civil engineer, municipality, jurisdiction
- Impact fees and bonds
- Builder LOI/LPA terms, infrastructure acceptance status

**Community Development Additional:**
- Floor plan mix table: lot #, assigned plan, upgrade package, projected sale price
- Sales/pricing matrix, model home designation, HOA setup status

## 2.4 Project Expense Entry

Users can enter expenses directly on the Project detail page under Budget & Actuals. Payment processing and reconciliation occurs in the Accounting module. The project-level expense entry creates a transaction record tagged to the project and entity, which flows to Accounting for approval, payment scheduling, and reconciliation.

## 2.5 Project Workflows

These workflows represent the **owner's perspective** of managing the project post-acquisition. They are distinct from the Construction module workflows which represent Red Cedar's GC operations. All workflow definitions from v3 spec sections 2.5 remain, with these terminology updates:

- All references to "Superintendent" → **"Construction Manager"**
- All references to "Schedule" → **"Workflow"**
- "Site walk with superintendent" → "Site walk with Construction Manager"

---

# MODULE 3: CONSTRUCTION MANAGEMENT (Red Cedar Operating System)

This is the **General Contractor operating environment** for Red Cedar Homes. It manages builds for internal entities (SPEs/funds under Olive Brynn) AND true third-party clients.

## 3.1 Naming Convention

**Jobs** = Overall engagement (replaces "Project" in the construction context to avoid confusion with Module 2 Projects)
**Units** = Individual homes within a Job

## 3.2 Construction Index

**Card View:** Job cards showing unit count, milestone progress ring, budget utilization bar, open items count.
**List View:** Dense table with sortable columns.

Additional index views:
- `/construction/vendors` — Vendor directory with insurance status, performance scores
- `/construction/warranty` — All warranty claims across jobs
- `/construction/invoices` — AP invoice queue
- `/construction/payments` — Payment run management
- `/construction/ar` — Accounts receivable
- `/construction/job-cost` — Cross-job cost reporting

## 3.3 Job Structure

**Job Fields:**
- Job number (auto: YY-XXX)
- Job name
- Client (owner entity for internal; third-party client record for external)
- Client type: Internal / Third-Party
- Contract type: Cost-Plus Fixed Fee, Cost-Plus Percentage, Stipulated Sum
- Contract amount and builder fee
- Job status: Pre-Construction → Active → Punch/CO → Warranty → Complete → Closed
- Number of units
- Linked Project (if internal — links to Module 2 record)
- Start date, projected completion
- **Construction Manager** assignment (not superintendent)
- PM assignment
- State: SC / NC

**Job Dashboard:** Total contract value, cost to date, budget remaining, units by milestone status, workflow overview, open POs, pending inspections, open change orders, next draw status.

## 3.4 Job Detail Pages

**Pages (left sidebar navigation):**
- Overview / Dashboard
- Units
- Budget
- **Workflow** (replaces "Schedule")
- Purchase Orders
- Change Orders
- **Permitting** (dedicated page — see 3.10)
- Inspections
- Selections
- Photos
- Daily Logs
- Punch List
- Warranty
- Vendors
- Draw Requests
- Documents (SharePoint-integrated)
- Notes / Activity

## 3.5 Unit Structure

**Unit Fields:**
- Unit number (auto: [Job]-01, [Job]-02, etc.)
- Lot/address
- Floor plan (from Admin library — pulls all specs)
- Upgrade package (Standard/Classic/Elegance/Harmony)
- Unit status / current milestone
- Budget breakdown (base S&B, upgrades, lot prep, adjustments, soft costs, builder fee, contingency)
- Total committed (POs issued) / Total actual (POs paid) / Variance
- Key dates: permit issued, construction start, projected completion, actual completion, CO date, warranty expiration (CO + 365 days)

## 3.6 Construction Milestones — Vertical (6 Milestones)

**CRITICAL CHANGE (v4):** Vertical construction uses **6 milestones** (simplified from v3's 16 phases). Each milestone contains **Task Lists with Tasks** that represent the granular work previously tracked as individual phases.

| # | Milestone | Contains | Key Inspections |
|---|-----------|----------|-----------------|
| 1 | **Permit** | Permit application, plan review, approval, utility setup, site prep, erosion control | — |
| 2 | **Foundation** | Sitework, grading, footer dig, footer pour, foundation walls, waterproofing, backfill, slab | Footer inspection, foundation inspection |
| 3 | **Frame** | Framing, dry-in (roof/sheathing/WRB), MEP rough-in (plumbing, electrical, HVAC), insulation | Framing inspection, plumbing rough, electrical rough, HVAC rough, insulation inspection |
| 4 | **Sheetrock** | Drywall hang, mud, tape, sand, prime; interior trim rough, paint prep | — |
| 5 | **CO** | Interior trim finish, paint, flooring, cabinets, countertops, fixtures, appliances, final MEP trim-out, exterior finish, landscaping, flatwork, punch list, final inspections | Final building inspection, Certificate of Occupancy |
| 6 | **Complete** | Close-out documentation, final lien waivers, as-built drawings, owner turnover, final draw processing | — |

**Task Lists inside each Milestone** break down the work. For example, the **Frame** milestone might contain:
- Task List: Framing — Lumber delivery, framing labor, truss set, sheathing, WRB
- Task List: Dry-In — Roofing material, roofing labor, window install, exterior door install
- Task List: MEP Rough-In — Plumbing rough, electrical rough, HVAC rough, low voltage
- Task List: Insulation — Insulation install, blower test

Each Task has: assigned vendor/trade, planned date, actual date, status, linked PO, inspection requirement flag.

**Milestone progression is gated:** Cannot advance to next milestone without completing required inspections and tasks (or override by Construction Manager/Principal with documented note).

**Post-CO Warranty Tracking:**
After the CO milestone, a **1-year warranty period** begins automatically (CO date + 365 days). The warranty period is tracked as a separate status on the Unit and has its own page (see 3.14). Key warranty dates:
- Warranty start: CO date
- 30-day walkthrough: CO + 30 days
- 6-month check: CO + 180 days
- 11-month walkthrough: CO + 330 days
- Warranty expiration: CO + 365 days (1-year workmanship)
- 2-year systems warranty expiration: CO + 730 days
- 5-year structural warranty expiration: CO + 1,825 days

**Workflow Templates** are configured in Admin per floor plan with default task durations. When a Unit is created with a floor plan assignment, the workflow template auto-applies. Durations are editable per Unit.

## 3.7 Construction Milestones — Horizontal (Lot Development)

Horizontal construction for lot development and community development projects uses a separate milestone structure. These are configured as **Workflow Templates** in Admin for horizontal project types.

**Entitlement Milestones:**

| # | Milestone | Task Lists |
|---|-----------|-----------|
| 1 | **Zoning & Regulatory** | Zoning confirmation, rezoning application (if needed), planning commission hearings, variance applications, special exceptions |
| 2 | **Preliminary Plat** | Preliminary plat submission, municipal review, comment response, conditional approval, final revisions |
| 3 | **Engineering & Environmental** | Boundary survey, topo survey, geotech, Phase I environmental, wetlands delineation, traffic study, utility letters, SWPPP, NPDES permit |

**Horizontal Construction Milestones:**

| # | Milestone | Task Lists |
|---|-----------|-----------|
| 4 | **Permitting & Bonds** | Land disturbance permit, utility permits, road permits, driveway permits, performance bonds / LOCs |
| 5 | **Earthwork & Grading** | Erosion control install, clear & grub, mass grading, grading inspection |
| 6 | **Underground Utilities** | Sanitary sewer, water mains, storm drainage, utility inspections, power/gas coordination |
| 7 | **Roads & Surface** | Road subbase, base course, curb & gutter, paving, sidewalks, signage, amenities, final lot grading |
| 8 | **Municipal Acceptance** | Municipal inspection, punch list, infrastructure dedication, final plat recording, bond release |
| 9 | **Lot Delivery** | Individual lot staking, lot acceptance, builder turnover, lot sales execution |

Each milestone contains Task Lists with individual Tasks, following the same Workflow hierarchy used for vertical construction. Task durations are configurable per project in Admin templates.

## 3.8 Job Workflow Page

**CRITICAL (v4):** The Job detail page "Workflow" replaces what was previously called "Schedule." It shows the same Workflow → Milestone → Task List → Task hierarchy used across all modules.

**Unit-Level View:** Each unit's milestones with progress (planned vs. actual dates), task completion %, inspection status, and overdue flags.

**Job-Level Gantt:** All Units stacked with milestone bars. Color coding: Green (on/ahead), Yellow (1–7 days behind), Red (8+ behind), Blue (complete), Gray (not started). Critical path identification.

**Velocity Metrics:** Average days per milestone (actual vs. planned), average total build time by plan, trend over time, completions per month, projected completion dates.

## 3.9 Purchase Orders

PO per Unit per trade category.

**Trade Categories:** Dumpster, Utilities, Portable Toilet, Permit Box, Termite Treatment, Lumber, Framing Labor, Floor Trusses, Roof Trusses, Stairs, I-Joist/EWP, Roofing (Shingle/Metal), Roofing Labor & Material, Siding Material, Siding Labor, Brick, Window Material, Window Labor, Exterior Door Material/Labor, Garage Door, Plumbing Turnkey, HVAC, Electrical, Blower Test, Low Voltage/AV, Insulation, Drywall Material, Drywall Labor, Exterior Paint, Interior Paint, Interior Trim, Door Hardware, Shelving, Mirrors, Bath Accessories, Shower Door, Countertops, Cabinets, Tile, Light Fixtures, Appliances, Carpet, LVP Flooring, Interior Clean, Gutters, Mailbox, Pressure Wash, Foundation, Landscaping, Flatwork/Driveway, Deck, Blinds, Waterproofing, Site Work/Grading, Miscellaneous.

**PO Fields:** PO number (auto), Unit, trade category, vendor (from contacts), description, amount, status (Draft → Issued → Work Complete → Invoiced → Approved → Scheduled for Payment → Paid), issue date, completion date, invoice date, payment date, lien waiver status, retainage (configurable 5–10% in Admin), linked change orders.

**Approval Workflow:** Under threshold (e.g., $5,000) auto-approve; above threshold requires Construction Manager or Principal; above second threshold (e.g., $25,000) requires Principal regardless.

## 3.10 Permitting (Dedicated Page)

**CRITICAL (v4):** Permitting is elevated to its own dedicated page on the Job detail, not just a data field. Permitting is critical to track thoroughly.

**Permit Tracking Table:**
Per Unit or per Job. Multiple permits per unit (building, electrical, plumbing, mechanical, etc.).

**Permit Fields:**
- Permit type (Building, Electrical, Plumbing, Mechanical, Land Disturbance, Driveway, Other)
- Jurisdiction / municipality
- Application date
- Permit number (assigned by jurisdiction)
- Issued date
- Expiration date
- Inspection requirements (linked to milestone inspections)
- Cost/fee paid
- Status: Applied → In Review → Revisions Requested → Resubmitted → Approved → Issued → Active → Expired → Closed

**Permitting Workflow:**
Each permit type has its own workflow with task lists:

*Example: Building Permit Workflow*
- Task List: Application Prep — Gather approved plans, plot plan, engineering, applications forms
- Task List: Submittals — Submit application, submit plans (2 sets), submit plot plan, pay application fee
- Task List: Review & Response — Track review status (weekly check), respond to reviewer comments, revise and resubmit if needed
- Task List: Approval & Issuance — Receive approved plans, receive permit card/placard, record permit number and dates

**Permitting Documents:**
Each permit has a linked document section (integrated with SharePoint `/02. Permitting/` folder):
- Application forms
- Submitted plans
- Reviewer comments / correction notices
- Resubmittal documents
- Approved stamped plans
- Permit card/placard scan

**Permitting Dashboard (on Job page):**
- Permits by status (applied, in review, approved, expired)
- Days in review
- Upcoming expirations (30/60/90 day alerts)
- Missing permits (required but not yet applied)

## 3.11 Change Orders

CO fields: CO number (auto), linked PO or standalone, Unit, description, reason category (Owner Request/Upgrade, Field Condition, Design Error, Code Requirement, Scope Clarification), cost impact, schedule impact (days), approval status, approved by, approval date.

**Markup Rules per Construction Agreement:**
- Owner-initiated changes: actual cost + 30% markup
- Site condition changes (after contingency exhausted): actual cost + 10% markup
- Contingency-funded changes: no markup

Auto-adjusts: Unit budget, related PO amount, Job-level budget roll-up.

## 3.12 Design Center / Selections

Selection categories: Cabinets, Countertops, Flooring (by room), Interior Paint Colors, Exterior Paint/Siding, Plumbing Fixtures, Lighting Fixtures, Appliances, Hardware, Shower Doors, Mirrors, Bath Accessories, Specialty Items.

**Upgrade Packages:**
- **Standard:** Base specifications included in sticks & bricks cost
- **Classic:** Per-plan upgrade cost
- **Elegance:** Per-plan upgrade cost
- **Harmony:** Available on select TH plans

Selection record: Unit, category, item, description, vendor, base cost, upgrade delta, status (Pending → Selected → Ordered → Received → Installed), linked PO. PDF Selection Sheet generation.

## 3.13 Inspections

Types mapped to milestones: Footer/Foundation, Framing, Plumbing Rough-In, Electrical Rough-In, HVAC Rough-In, Insulation, Final Building, specialty inspections as required.

Fields: Unit, type, municipality/jurisdiction, inspector name, scheduled date, actual date, result (Pass/Fail/Conditional), notes, re-inspection date/result, linked milestone.

**Gate Logic:** Cannot advance milestone without passing required inspection, or override by Construction Manager/Principal with documented note.

## 3.14 Warranty Management

One-year workmanship warranty period from CO date. Two-year systems warranty. Five-year structural warranty.

**Warranty Tracking per Unit:**
- Warranty start date (= CO date)
- 30-day walkthrough date and status
- 6-month check date and status
- 11-month walkthrough date and status
- Warranty expiration dates (1/2/5 year)
- Open claims count
- Total warranty cost

**Warranty Claims:**
Fields: Unit, claim date, category (trade categories), description, photos, urgency (Routine/Urgent/Emergency), responsible sub, notification date, scheduled repair, completion date, resolution notes, owner sign-off, cost (charged back to sub or absorbed).

Dashboard: open claims by Unit, claims by trade category, average resolution time, warranty reserve balance per Job.

## 3.15 Issue Tracking

During active construction. Fields: Unit, milestone, category (Safety Hazard, Quality Deficiency, Schedule Impact, Material Defect, Sub Performance, Weather Delay, Code Violation), description, photos, severity, assigned to, due date, resolution, cost impact, status.

## 3.16 Construction Accounting (Red Cedar's Books)

**Accounts Payable:**
- PO at "Invoiced" status creates AP entry
- Workflow: Bill Received → Coded to Job/Unit/Cost Code → Approved for Payment → Scheduled → Paid
- AP aging: Current, 30, 60, 90+ by vendor
- Payment runs: batch payments by vendor across Jobs
- Retainage tracking: held per vendor per Job, released at substantial completion + final lien waiver
- 1099 tracking: flag vendors over $600 annual, accumulate payments, generate 1099-NEC data

**Accounts Receivable:**
- Internal Jobs: AR generated when Red Cedar submits draw/invoice to SPE per 5-draw schedule
- Third-party clients: AR per contract payment schedule
- AR aging report

**Vendor Management:**
- Profile: company name, contact info, trades performed, license number/expiration, insurance certificates with 30-day expiration alerts, W-9 on file, bank info for ACH, performance score

**Job Costing:**
- Per-Unit cost report: budget vs. committed vs. actual vs. projected final by trade/cost code
- Per-Job cost report: all Units rolled up
- Variance analysis: flag cost codes where actual exceeds budget by configurable threshold

## 3.17 Dual Budget View

For **internal Jobs** (Olive Brynn SPEs), two budget perspectives exist:

**Owner's View** (accessible from Module 2 Projects): Shows the construction contract amount as a single line item within total project budget. Does NOT reveal Red Cedar's subcontractor pricing.

**Builder's View** (accessible from Module 3 Construction): Shows detailed cost breakdown by trade/cost code. POs, change orders, and actual costs live here. Does NOT show the owner's land cost, investor terms, or overall deal economics.

---

# MODULE 4: DISPOSITION

Disposition manages the sale and disposition of completed assets. It is a **first-class top-level module** (v4 change from being a sub-module of Projects).

## 4.1 Disposition Index

**Card View:** Listing cards with property photo, price, status badge, days on market.
**List View:** Filterable table with columns: Address, List Price, Status, Days on Market, Entity, Linked Project, Agent.

Views: All Listings, Active, Under Contract, Closed, Community View (grouped by project/community).

## 4.2 Listing Detail Page

**Pages (left sidebar navigation):**
- Overview
- Marketing
- Showings
- Offers
- Contract
- Settlement
- Costs
- Documents (SharePoint-integrated)
- Notes
- Activity

**Overview Fields:**
- Listing address
- Linked Project and Unit
- Owner entity
- Listing status: Pre-Market → Active → Under Contract → Closing → Sold → Withdrawn
- List price / sale price
- MLS number
- Listing agent, buyer agent
- Key dates: listed, under contract, closing, sold
- Days on market
- Price per SF

## 4.3 Community Disposition View

For community development projects, a dedicated view shows all units in the community with their disposition status: inventory, pre-market, active, under contract, closed. Includes community-level charts (absorption rate, average sale price trend, inventory remaining).

## 4.4 Disposition Workflow

Each listing has a Workflow: Pre-Market Prep → Active Marketing → Offer & Negotiation → Contract → Closing Prep → Settlement → Post-Close.

---

# MODULE 5: ACCOUNTING (Owner/Developer Side)

Manages Olive Brynn LLC, all SPEs, holding entities, and investment funds. NOT Red Cedar GC operations (that is Module 3.16). NOT payroll.

## 5.1 Entity Hierarchy

**Entity Use Types:** Operating Company (Red Cedar Homes SC, Red Cedar Homes NC), Holding Company (Olive Brynn LLC), Single Purpose Entity (project-specific LLCs like 153 Oakwood LLC), Fund/Syndication (Scattered Lot Fund), Other.

**Legal Types (IRS):** LLC, S-Corporation, Partnership, C-Corporation, Sole Proprietorship, Trust.

**Parent-Child Relationships:** Olive Brynn LLC → Red Cedar Homes SC → SPEs. Each entity has own chart of accounts, transactions, and reporting.

## 5.2 Chart of Accounts

Per-entity with templates based on entity use type (configured in Admin). Standard SPE template ranges:

- 1000–1999: Assets
- 2000–2999: Liabilities
- 3000–3999: Equity
- 4000–4999: Revenue
- 5000–5999: Cost of Sales
- 6000–6999: Operating Expenses

## 5.3 Capital Contributions and Investor Tracking

Investor records per entity: name, contact, ownership %, capital commitment, contributed to date, preferred return rate, promote/carry structure, accreditation status.

Capital call workflow: create call → issue notice → track responses → follow up on unfunded.

## 5.4 Waterfall Structures

Supported: (1) Simple Preferred Return + Promote, (2) Straight Split, (3) Multi-Tier IRR Waterfall.

Distribution calculator with auditable per-investor calculation output.

## 5.5 Transaction Entry and Ledger

Fields: date, description, entity, account (from entity COA), debit/credit, project (optional), Unit/house (optional), reference number, transaction type, supporting document.

Period management: monthly close process (review, trial balance, adjusting entries, lock period).

## 5.6 Entity Financial Reporting

Per-entity: Balance Sheet, Income Statement, Cash Flow, Trial Balance, Transaction Register.
Consolidated: parent entity view with intercompany eliminations.
Project-level P&L: revenue minus all costs = project profit.
Investor reporting: capital account statement, IRR, equity multiple.

## 5.7 Loan and Debt Tracking

Lender details, loan type, terms, drawn/available amounts, interest calculation, covenants. Draw tracking ties to Module 3. Interest accrual posts monthly journal entries. Maturity alerts at 90/60/30 days.

---

# MODULE 6: ADMIN

## 6.1 Organization Settings

Company name (Red Cedar Homes), logo, default entity (Olive Brynn LLC), timezone, fiscal year start, currency (USD), system-wide defaults.

## 6.2 Construction Management Admin

### Floor Plan Library
Complete library with per-plan data: heated SF, bed/bath/garage, stories, type, lot minimums, base S&B cost, upgrade costs per package, architectural plans (SharePoint links). Current active plans include ~16 SFH and ~16 TH models (see v3 spec section 5.2 for complete table).

### Budget Packages
Named templates defining base cost per floor plan, soft cost line items, builder fee formula, contingency formula.

### Upgrade Packages
Named tiers with per-category selections and costs. Availability varies by floor plan.

### Cost Code Library
Master list of all trade categories with codes, descriptions, default vendors, typical cost ranges.

### Workflow Templates (replaces "Schedule Templates")
Per floor plan, default milestone and task durations for the 6-milestone vertical construction workflow. Per project type, horizontal construction workflow templates. Durations adjustable per plan.

### Contract Assembly
Template library for construction agreements, POs, change orders, selection sheets. Merge fields, versioning, PDF output, DocuSeal e-signature integration.

## 6.3 Opportunity Management Admin

- **Deal Analyzer Configuration:** Margin thresholds, default financing assumptions, selling cost %, cost of capital rate
- **Workflow Templates:** Per opportunity type
- **Stage Definitions:** Kanban stages per opportunity type

## 6.4 Project Module Admin

- **Workflow Templates:** Per project type
- **Project Number Format:** Auto-numbering (YY-XXX)
- **Budget Category Templates:** Per project type
- **SharePoint Folder Templates:** Per project type

## 6.5 Disposition Admin

- **Workflow Templates:** Pre-market through post-close
- **Commission defaults and fee schedules**
- **Marketing template defaults**

## 6.6 Accounting Admin

- **Chart of Accounts Templates:** Per entity use type
- **Waterfall Structure Templates:** Pre-built distribution models
- **Fiscal Period Settings:** Year start, period close schedule, period lock rules
- **Integration Mapping:** Atlas COA ↔ external accounting system mapping

## 6.7 Permission Settings

**Roles:**
- Global Admin: full access to all modules and Admin configuration
- Module Admin: full access within specific module(s)
- Team Member: access to assigned modules/records per team membership
- Read-Only: view access to assigned modules/records

**Permission Levels:**
- Module-level: which roles/teams access which modules
- Record-level: users see only records assigned to them or their team (unless admin)
- Action-level: View, Create, Edit, Delete, Approve, Export

## 6.8 Teams

Named groups of users (e.g., "Acquisitions SC Team," "Red Cedar CM Team," "Accounting Team"). Users belong to multiple teams. Teams assigned to modules, projects, jobs, entities, opportunities.

## 6.9 User Preferences

Per-user settings:
- Default view mode per module (Card / List)
- Dashboard widget layout and configuration
- Notification preferences
- Default entity filter
- Calendar display preferences

## 6.10 SharePoint Folder Templates

Configurable folder structures per module per record type. See "SharePoint Integration" section above for default templates. Admin can add, remove, and reorder folders.

## 6.11 Integration Settings

### Microsoft 365 (Tier 1 — SharePoint, Outlook, Calendar, Teams)
- **SharePoint:** Credential entry, automatic folder creation, document upload sync
- **Outlook:** Email logging linked to records
- **Outlook Calendar:** Task and milestone date sync
- **Microsoft Teams:** Chat and video call linking

### DocuSeal (e-signature)
Send documents for signature from Atlas. Track status. Auto-file signed documents.

### Akaunting Sync
One-way sync of approved transactions. Account mapping in Admin.

### Plaid (Future)
Bank account connections for auto-importing transactions, reconciliation support.

---

# DATA FLOW SUMMARY

```
Opportunities (deal pipeline)
    → CONVERTS TO →
Projects (owner/developer tracking)
    → LAUNCHES →
Construction Jobs (Red Cedar GC operations)
    → CREATES →
Disposition Listings (sale of completed assets)
    → FEEDS →
Accounting (entity financials, investor reporting)

Reverse:
Construction (cost actuals, draw requests)
    → SYNCS TO →
Projects (budget vs. actual at owner level)
    → INFORMS →
Accounting (transaction entry, loan draws, distributions)
```

**Key Cross-Module Connections:**
1. Opportunity (with sub-acquisitions) converts to one or more Projects, carrying forward all underwriting data, contacts, documents, and entity assignment
2. Project launches one or more Jobs in Construction when contracts are executed
3. Red Cedar's draw requests (Construction) create corresponding lender draw records (Accounting) and update Project budget
4. Construction cost actuals (POs) roll up to Job and Unit totals, informing the Owner's View in Projects
5. Completed units create Disposition listings for sale tracking
6. All financial transactions across modules feed to Accounting for entity-level reporting
7. Contacts are global — assigned to specific roles on any record
8. Calendar events aggregate from all modules into Company and Personal views
9. SharePoint folder structures are created automatically for every record across all 5 primary modules
10. Workflows (not "Schedules") drive task management across all modules using the unified Workflow → Milestone → Task List → Task hierarchy

---

# APPENDIX A: CONSTRUCTION ROLES (v4 Update)

**CRITICAL:** The role "Superintendent" is **replaced by "Construction Manager"** throughout the platform. All workflow templates, task assignments, UI labels, and database fields use "Construction Manager" not "Superintendent."

Role mapping:
- Construction Manager — On-site construction leadership, quality oversight, schedule management, inspection coordination
- Project Manager (PM) — Administrative project management, document coordination, budget tracking
- Owner/Principal — Decision authority, financial approvals, contract execution

---

# APPENDIX B: INSURANCE CERTIFICATE TRACKING (Shared Service)

Insurance tracking appears in multiple contexts. Built as a shared service linkable to any Vendor, Entity, Project, or Job.

Fields: policy type, carrier, policy number, effective/expiration dates, coverage limits, additional insured requirements, certificate document, alert threshold (default 30 days before expiration).

---

# APPENDIX C: CLIENT MANAGEMENT (Third-Party)

Client record type for Red Cedar's third-party build clients, distinct from the Entity hierarchy in Accounting.

Fields: company/individual name, contact info, billing address, payment terms, insurance requirements, contract template preferences, all linked Jobs.

Third-party Jobs follow the same construction workflow as internal Jobs. Key differences: client is external, billing per contract terms, AR tracked in Construction Accounting.

---

# CHANGELOG: v3 → v4

| Change | Section | Impact |
|--------|---------|--------|
| **Navigation restructured** — Big 5 primary (Opportunities, Projects, Construction, Disposition, Accounting) + dropdown for Tasks, Calendar, Reports, Admin | Global Architecture | Navigation components, routing |
| **Disposition elevated** to first-class top-level module (was sub-module of Projects) | Module 4 (new) | New module, new routes, moved from Projects |
| **Reports module added** as cross-module reporting hub | Global Architecture | New module |
| **Home dashboard** made customizable per role/permissions | Global Architecture | Dashboard components |
| **Global Entity Selector** added to header | Global Architecture | New UI component, data filtering |
| **Card/List view toggle** added to all index pages with per-user default | Global Architecture | UI components, user preferences |
| **Multi-property acquisitions** added to Opportunities (sub-acquisitions) | Module 1 | New data model, new UI |
| **Construction milestones simplified** — Vertical: 6 milestones (Permit, Foundation, Frame, Sheetrock, CO, Complete) with tasks inside | Module 3 | Major schema + UI change |
| **Horizontal milestones added** — Entitlement + horizontal construction milestone workflow | Module 3 | New workflow templates |
| **Warranty tracking enhanced** — 1-year post-CO with milestone walkthroughs | Module 3 | New tracking fields |
| **"Schedule" → "Workflow"** everywhere. Workflow > Task List > Task hierarchy unified | All modules | Terminology, UI labels, routes |
| **"Superintendent" → "Construction Manager"** in all roles | All modules | Terminology, role assignments |
| **Permitting elevated** to dedicated Job detail page with workflow, documents, and submittals | Module 3 | New page, enhanced tracking |
| **SharePoint folders** for ALL 5 primary modules (was only Projects and Jobs) | Global Architecture | New folder templates, broader integration |
| **Default folder templates** defined for Opportunities, Disposition, Accounting entities | Global Architecture | New SharePoint templates |
| **Tasks module** added as standalone cross-module view | Global Architecture | New module route |
| **Accounting renumbered** to Module 5 (was Module 4) | Module 5 | Numbering only |
| **Admin renumbered** to Module 6 (was Module 5) | Module 6 | Numbering only |
