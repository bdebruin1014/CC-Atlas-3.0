# ATLAS — Red Cedar Homes Operating Platform
## Complete Application Specification v3.0

**Platform Owner:** Red Cedar Homes (operated under Olive Brynn, LLC)
**Purpose:** End-to-end operating system for residential construction and development across scattered lot, lot development, community development, and lot purchase channels. Serves Red Cedar Homes' internal operations and its client relationships (including SPEs, funds, and third-party owners).

---

# GLOBAL ARCHITECTURE

## Navigation & Header

The global header contains the following modules, accessible at all times:

1. **Opportunities** — Deal pipeline from identification through closing
2. **Projects** — Owner/developer-level tracking from contract through disposition
3. **Construction Management** — Red Cedar GC operating system (Jobs and Units)
4. **Accounting** — Multi-entity financial management
5. **Contacts** — Global contacts directory segregated by contact type
6. **Calendar** — Company calendar and personal calendar with key date events
7. **Admin** — Configuration, permissions, integrations, templates

## Contacts Module (Global)

All contacts live in a single global directory. Each contact is assigned one or more **Contact Types** at creation:

**Contact Types:** Owner/Principal, Investor, Attorney/Legal, Lender, Surveyor, Engineer, Architect, Appraiser, Real Estate Agent/Broker, Title Company, Inspector, Municipality Contact, Subcontractor/Vendor, Superintendent, Project Manager, Accountant, Insurance Agent, Utility Provider, Property Manager, Buyer, Seller, Other.

**Contact Record Fields:** First name, last name, company/organization, contact type(s), email, phone, secondary phone, mailing address, notes, linked entities, linked projects, linked jobs, tags, status (Active/Inactive), created date.

**Global Contact Views:**
- All Contacts list with search, filter by contact type, filter by status
- Contact detail page showing all linked records across modules (which opportunities, projects, jobs, entities this contact is associated with)
- Quick-add contact from any module

**Project/Opportunity/Job Contact Assignment:** On any record detail page, a "Contacts" section allows users to search the global contacts list and assign contacts to **roles** specific to that record. For example, on a Project, you assign a contact as "Closing Attorney" or "Lender" or "Surveyor" for that specific project. The same contact can serve different roles on different projects.

## Calendar Module (Global)

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
- Key project dates where user is a team member: purchase date, closing date, permit issued, construction start, CO date, sale date, warranty expiration
- Calendar sync to Microsoft Outlook (see Admin Integration Settings)

## SharePoint Integration (Tier 1)

SharePoint is a first-class integration, not optional. The Admin module includes a SharePoint configuration section where credentials are entered once and the system connects.

**Admin > Integration Settings > SharePoint:**
- SharePoint Tenant URL
- Client ID and Client Secret (Azure AD App Registration)
- Site/Library selection
- Test Connection button

**Automatic Folder Structure:** When a new Project or Job is created, Atlas automatically creates a SharePoint folder using a configurable template structure. Templates are defined in Admin per project type.

**Default Folder Templates (configurable per project type in Admin):**

**Scattered Lot Project:**
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

**Lot Development Project:**
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

**Community Development Project:** Combines Lot Development structure plus per-unit vertical construction sub-folders under a "Vertical Construction" parent.

**Lot Purchase Project:** Same as Scattered Lot.

**Document Upload from Atlas:** Any document upload field in Atlas pushes the file to the corresponding SharePoint folder. Documents are accessible from Atlas record detail pages via embedded SharePoint links.

---

# MODULE 1: OPPORTUNITIES

## 1.1 Pipeline View

**List View:** Filterable table with columns: Opportunity Name, Address, Type, Stage, Assigned To, Entity, Projected Value, Days in Stage, Created Date.

**Kanban View:** Cards grouped by stage. Stages are configurable in Admin per opportunity type.

**Analytics Dashboard:** Pipeline value by stage, conversion rate (opportunities to projects), average days to close by type, opportunities by type breakdown, monthly deal flow trend.

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

## 1.3 Opportunity Detail Page

**Tabs:** Overview, Deal Analyzer, Workflow, Contacts, Documents, Notes, Activity

**Overview Tab Fields:**
- Opportunity name (auto: Address + Type)
- Address, city, county, state, zip
- Parcel/TMS number
- Opportunity type (Scattered Lot, Lot Development, Community Development, Lot Purchase, Other)
- Current stage
- Source (MLS, Wholesaler, Direct, Broker, Off-Market, Referral, Other)
- Assigned to (user)
- Owner entity (which entity or fund will acquire: e.g., "Red Cedar Scattered Lot Fund I," "Red Cedar Scattered Lot Fund II," specific SPE)
- Projected purchase price
- Projected sale price / ARV
- Key dates: created, offer date, contract date, DD expiration, closing date
- Linked contacts with roles (Seller, Listing Agent, Attorney, Surveyor, Lender)

**Scattered Lot Specific Fields** (per Red Cedar Intake Process):
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

## 1.4 Deal Analyzer (Dynamic)

The Deal Analyzer is a built-in calculation engine on the Opportunity detail page. It pulls from Admin-managed cost data (floor plans, base costs, upgrade packages, municipality soft costs, default fees) and allows the user to enter deal-specific variables to produce a GO/MARGINAL/NO-GO verdict.

**Data Sources (pulled from Admin):**
- Floor Plan Library: heated SF, bed/bath/garage, stories, type (SFH/TH), width/depth, base sticks-and-bricks cost, upgrade packages
- Municipality Soft Cost Table: water tap, sewer tap, gas tap, permitting fees, impact fees, architect, engineering, survey — per jurisdiction
- Default Fees: builder fee structure (greater of $25,000 or 10% of construction costs), contingency (greater of $10,000 or 5%), builder's risk insurance, PO fee, PM fee, warranty reserve
- Default Financing Assumptions: LTC ratio (85%), interest rate, construction period (default 120 days), cost of capital rate (16% annual)
- Default Selling Costs: commission + closing (8.5% of ASP default)

**User Inputs per Deal:**
- Select floor plan (dropdown from Floor Plan Library)
- Select upgrade package (Standard/Classic/Elegance — costs pulled from Admin)
- Select municipality (dropdown from Municipality table — soft costs auto-populate)
- Purchase price (lot cost)
- Site work / grading estimate
- Other site-specific costs
- Site-specific vertical construction adjustments (e.g., crawl space requiring floor trusses)
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
- Builder Fee: greater of $25,000 or 10% × (S&B + Upgrades + Lot Prep + Site Adjustments + Soft Costs)
- Contingency: greater of $10,000 or 5% × (S&B + Upgrades + Lot Prep + Site Adjustments + Soft Costs)
- Total Contract Cost (Red Cedar)

Section 2 — Fixed Per-House Costs:
- Builder warranty reserve
- Builder's risk insurance
- Closing costs (5% of purchase price)
- Utility charges

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

## 1.5 Scattered Lot Workflow (Detailed — from Red Cedar Intake Process)

**WORKFLOW: Scattered Lot Acquisition**
Goal: Take a scattered lot opportunity from initial identification through closing and handoff to construction.

---

### MILESTONE 1: PRE-OFFER — Site Identification and Analysis
*Entry: Opportunity created with type "Scattered Lot"*

**Task List 1.1: Deal Sourcing and Initial Screening**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Identify qualified lot using Red Cedar Buy-Box criteria (apply 20% rule: lot price + $17,500 make-ready must not exceed 20% of estimated future sale price) | Acquisition Manager | +1 business day |
| 2 | Verify lot is in pre-qualified zip code/neighborhood (Berea, Taylors, Travelers Rest, West Greenville, Nicholtown, or approved areas) | Acquisition Manager | +1 business day |
| 3 | Create preliminary SC Deal Sheet using Deal Intake template | Operations Director | +2 business days |
| 4 | Pull comparable sales from MLS | Sales/Market Analyst | +3 business days |
| 5 | Determine best fit floor plan model and send to estimating | Acquisition Manager | +3 business days |
| 6 | Input opportunity into tracking system (Atlas) | Operations Coordinator | +2 business days |

**Task List 1.2: Site Analysis and Feasibility**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Research property using GIS, Google Street View, and additional resources — document: property address, parcel/TMS, county/jurisdiction, current zoning | Site Analyst | +5 business days |
| 2 | Determine road access and surrounding roads, construction buffers/setbacks, historic district overlay status | Site Analyst | +5 business days |
| 3 | Confirm build type (SF/TH/Duplex), front or rear garage, utility availability (public water/sewer/power) | Site Analyst | +5 business days |
| 4 | Confirm house plan selection and best fit model, determine buildable footprint, confirm survey status | Site Analyst | +5 business days |
| 5 | Compile preliminary pricing: sticks & bricks cost, sitework estimate, soft costs (permit fees, tap fees, survey fees, engineering fees), builder fee, total estimated cost | Site Analyst | +7 business days |
| 6 | Complete Job Estimate Calculation for Site Analysis Packet | Site Analyst | +7 business days |
| 7 | Review Job Estimate Calculation and Site Analysis Packet | Acquisition Manager / Operations Director | +8 business days |
| 8 | Send Site Analysis Packet to client/owner entity | Site Analyst | +9 business days |

**Task List 1.3: Viability Decision**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Run Deal Analyzer with site analysis data — document GO/MARGINAL/NO-GO result | Owner/Principal | +10 business days |
| 2 | Submit to Red Cedar Land Committee (meets weekly Wednesdays) with parcel map, comps, site risk analysis, construction assumptions | Operations Director | +10 business days |
| 3 | Land Committee renders decision — if declined, notify seller and archive; if approved, advance to Milestone 2 | Land Committee | +12 business days |
| 4 | Assign approved lot to fund (Fund I or Fund II) based on location, fund strategy, and available capital | Owner/Principal | +12 business days |

*Completion Criteria: Land Committee approval received, fund assignment confirmed*

---

### MILESTONE 2: OFFER AND NEGOTIATION
*Entry: Land Committee approval*

**Task List 2.1: Contract Preparation and Execution**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Determine appropriate purchase contract (Red Cedar standard Lot Purchase Agreement — SC or NC) | Operations Coordinator | +1 business day |
| 2 | Draft purchase contract, LOI, addendums, and exhibits with key terms: $500 earnest money, 14 business days DD, 30-day closing after DD, seller to provide marketable title | Operations Coordinator | +2 business days |
| 3 | Negotiate terms with seller | Acquisition Manager | +5 business days |
| 4 | Send for signatures via DocuSeal (contracts, addendums, disclosures) | Operations Coordinator | +1 business day after negotiation |
| 5 | Receive fully executed contract | Operations Coordinator | +3 business days after send |

**Task List 2.2: Post-Execution Setup**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Create SharePoint project folder (Atlas auto-creates on conversion to Project) | Operations Coordinator | +1 business day |
| 2 | Save MLS data sheet and executed contract to SharePoint | Sales/Market Analyst | +1 business day |
| 3 | Add preliminary DD materials and MLS attachments to SharePoint | Operations Coordinator | +1 business day |
| 4 | Request as-builts (within 24 hours of contract execution) | Acquisition Manager | +1 business day |
| 5 | Add basic information to tracking database | Operations Coordinator | +1 business day |

*Completion Criteria: Fully executed purchase contract received and filed*

---

### MILESTONE 3: UNDER CONTRACT — Due Diligence
*Entry: Executed contract received*

**Task List 3.1: Contract Distribution and Notification**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Send "We Are Under Contract" email to team and begin title process with attorney (within 24 hours) — include: contract, addendums, seller info, DD files, wiring instructions | Operations Coordinator | +1 business day |
| 2 | Set calendar events for DD expiration date, closing date, additional EMD dates, additional DD payment dates — include acquisitions team | Site Analyst | +1 business day |
| 3 | Set calendar reminders for key deadlines | Site Analyst | +1 business day |

**Task List 3.2: Due Diligence Execution**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Verify comparable sales and update Deal Sheet if needed | Sales/Market Analyst | +3 business days |
| 2 | Obtain sales team sign-off on sales price (ARV) | Sales/Market Analyst | +5 business days |
| 3 | Send survey request (within 48 hours — prioritize survey before plot plans) | Site Analyst | +2 business days |
| 4 | Order plot plans from surveyor | Site Analyst | +3 business days |
| 5 | Order flood study and topo if needed (confirm with Acquisition Manager) | Site Analyst | +3 business days |
| 6 | Order demolition/abatement assessment if needed | Site Analyst | +3 business days |
| 7 | Order tree clearing quote if needed | Site Analyst | +3 business days |
| 8 | Set weekly calendar reminder to check survey status | Site Analyst | +3 business days |
| 9 | Review title commitment — verify marketable and insurable title | Attorney/Legal | +10 business days |
| 10 | Environmental/physical site review complete | Site Analyst | +12 business days |

*Completion Criteria: All DD items complete or waived, DD period has not expired without extension*

---

### MILESTONE 4: FINANCING
*Entry: DD complete, decision to proceed*

**Task List 4.1: Lender Package**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Create lender package: lender template, deal sheet, budget, home plan, contracts | Operations Coordinator | +3 business days |
| 2 | Send lender package to finance team | Operations Coordinator | +3 business days |
| 3 | Lender review and approval | Lender (external) | +10 business days |
| 4 | Receive and review term sheet | Owner/Principal | +12 business days |
| 5 | Send contract amendments to attorney and lender as they occur | Operations Coordinator | Ongoing |
| 6 | Coordinate closing date with finance and lenders | Operations Coordinator | +14 business days |

*Completion Criteria: Loan commitment received*

---

### MILESTONE 5: CLOSING PREPARATION
*Entry: Financing secured*

**Task List 5.1: Pre-Closing Activities**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Complete JIO (Job Information Overview) | Site Analyst | +3 business days |
| 2 | Coordinate and confirm closing date, time, and location; request HUD from attorney | Site Analyst | +3 business days |
| 3 | Request cash-to-close estimate from lender and attorney | Operations Coordinator | +3 business days |
| 4 | Compare preliminary HUD vs. lender terms sheet — flag discrepancies | Operations Coordinator | +5 business days |
| 5 | Send wire request for cash-to-close to accounting | Operations Coordinator | +5 business days |
| 6 | Send permit application request to permitting team with plot plan approval (follow permitting checklist) | Site Analyst | +5 business days |
| 7 | Create horizontal and vertical construction contracts (within 3 days of close) using Red Cedar Scattered Lot Construction Agreement template (SC or NC) | Operations Coordinator | +5 business days |
| 8 | Create and send wire request for any additional deposits | Operations Coordinator | As needed |
| 9 | Gather signed deposit acknowledgements | Operations Coordinator | As needed |

*Completion Criteria: All closing documents prepared, wire sent, construction contracts drafted*

---

### MILESTONE 6: CLOSING AND POST-CLOSE
*Entry: Closing date reached*

**Task List 6.1: Closing Execution**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Attend closing / confirm closing complete | Owner/Principal | Closing date |
| 2 | Receive and file closing documents in SharePoint | Operations Coordinator | +1 business day |
| 3 | Send "We Are Closed" email (within 24 hours) to acquisitions team — include: AQ#, deal scope, build type & plan, door count, entity owner, lender, link to closing documents, estimated vertical start date, permit application status, attach plot plan | Operations Coordinator | +1 business day |

**Task List 6.2: Post-Close Setup**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Update records with new addresses and PID if changed | Operations Coordinator | +2 business days |
| 2 | Back up closing files to SharePoint | Operations Coordinator | +2 business days |
| 3 | Review SharePoint files for broker compliance | Sales/Market Analyst | +3 business days |
| 4 | Once permits approved, create Handoff Package (plot plan, JIO, interior design sheet, exterior design sheet, appliance package, Brix selection sheet, permit/placard, 2 copies of county-approved plans in 11x17) | Operations Coordinator / Site Analyst | Upon permit approval |
| 5 | Set up handoff meeting (Mondays — send email and physical package by prior Friday) | Operations Coordinator | Next Monday after permits |
| 6 | Conduct site walk with construction team | Acquisition Manager / Superintendent | At handoff meeting |
| 7 | Set up utilities (power work order, temp pole, sewer/water tap) | Site Analyst | +5 business days after close |

*Completion Criteria: Closed, post-close notifications sent, handoff package prepared (or queued for permit approval). OPPORTUNITY CONVERTS TO PROJECT.*

---

## 1.6 Lot Development Workflow

**WORKFLOW: Lot Development Acquisition**
Goal: Acquire raw land and position for horizontal development to produce finished lots for builder clients.

---

### MILESTONE 1: SITE IDENTIFICATION AND FEASIBILITY

**Task List 1.1: Market Research and Site Discovery**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Identify target site through broker network, off-market sourcing, or direct outreach | Acquisition Manager | +3 business days |
| 2 | Confirm site is within target market areas and aligns with current land strategy | Owner/Principal | +3 business days |
| 3 | Pull preliminary GIS data: acreage, current zoning, flood zone, parcel boundaries, surrounding land use | Site Analyst | +5 business days |

**Task List 1.2: Preliminary Feasibility Analysis**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Estimate achievable lot count based on acreage, zoning density, and setback requirements | Engineer (external) or Site Analyst | +7 business days |
| 2 | Research municipal development requirements: stormwater, road standards, utility capacity, impact fees | Site Analyst | +7 business days |
| 3 | Develop preliminary site plan / concept sketch | Engineer (external) | +10 business days |
| 4 | Estimate horizontal development costs: earthwork, roads, utilities, stormwater, amenities | Site Analyst | +12 business days |
| 5 | Run Deal Analyzer for lot development economics: total development cost, per-lot cost, projected lot sale price, project IRR | Owner/Principal | +14 business days |
| 6 | Identify potential builder clients and gauge demand / pre-commitment interest | Sales/Market Analyst | +14 business days |

*Completion Criteria: Feasibility analysis supports proceeding, preliminary lot count and cost estimates documented*

---

### MILESTONE 2: LOI AND CONTRACT

**Task List 2.1: Builder Pre-Commitment**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Engage target builders with site concept and preliminary lot pricing | Acquisition Manager | +5 business days |
| 2 | Negotiate LOI or lot purchase agreement (LPA) terms with builder clients | Acquisition Manager | +10 business days |
| 3 | Document builder commitments (lot counts, pricing, timing, deposit structure) | Operations Coordinator | +12 business days |

**Task List 2.2: Land Contract Negotiation and Execution**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Draft or review land purchase contract with appropriate contingencies (zoning, entitlement, financing, builder commitment minimums) | Attorney/Legal | +5 business days |
| 2 | Negotiate contract terms with land seller | Acquisition Manager | +10 business days |
| 3 | Execute purchase contract | Owner/Principal | +15 business days |
| 4 | Establish SharePoint project folder | Operations Coordinator | +1 business day after execution |

*Completion Criteria: Executed land purchase contract with adequate contingency periods*

---

### MILESTONE 3: ENTITLEMENT DUE DILIGENCE

**Task List 3.1: Zoning and Regulatory Approvals**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Confirm current zoning and identify required rezoning, variances, or special exceptions | Attorney/Legal | +5 business days |
| 2 | Submit zoning application if required | Attorney/Legal | +10 business days |
| 3 | Attend planning commission / zoning board hearings | Owner/Principal | Per municipal schedule |
| 4 | Submit preliminary plat application | Engineer (external) | +15 business days |
| 5 | Address municipal comments and conditions of approval | Engineer (external) | +30 business days |

**Task List 3.2: Engineering and Environmental Studies**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Commission boundary survey | Surveyor | +5 business days |
| 2 | Commission topographic survey | Surveyor | +5 business days |
| 3 | Commission geotechnical investigation (soil borings, bearing capacity) | Engineer (external) | +10 business days |
| 4 | Commission Environmental Phase I (and Phase II if triggered) | Environmental Consultant | +10 business days |
| 5 | Commission wetlands delineation if applicable | Environmental Consultant | +15 business days |
| 6 | Traffic impact study if required by municipality | Engineer (external) | +15 business days |
| 7 | Utility availability letters (water, sewer, power, gas) | Site Analyst | +10 business days |

**Task List 3.3: Financial Due Diligence**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Refine development budget with engineering estimates | Owner/Principal | +20 business days |
| 2 | Update Deal Analyzer with actual cost data | Owner/Principal | +20 business days |
| 3 | Title search and commitment review | Attorney/Legal | +15 business days |

*Completion Criteria: All entitlement approvals received or conditionally approved, engineering studies complete, financial feasibility reconfirmed*

---

### MILESTONE 4: CLOSING

**Task List 4.1: Financing and Close Preparation**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Prepare and submit development loan package to lender | Operations Coordinator | +5 business days |
| 2 | Negotiate loan terms and execute commitment letter | Owner/Principal | +15 business days |
| 3 | Finalize construction contracts for horizontal work | Operations Coordinator | +10 business days |
| 4 | Coordinate closing date, prepare settlement documents | Attorney/Legal | +5 business days before close |
| 5 | Wire funds for closing | Accounting | Day of close |
| 6 | Execute closing, file deed, record plat | Attorney/Legal | Closing date |
| 7 | Send post-close notifications and update all tracking records | Operations Coordinator | +1 business day |

*Completion Criteria: Land acquired, loan funded, horizontal development ready to commence. CONVERTS TO PROJECT.*

---

## 1.7 Community Development Workflow

Follows the Lot Development workflow (Milestones 1–4 above) with an additional milestone:

### MILESTONE 5: PRE-CONSTRUCTION PLANNING (post-close, pre-build)

**Task List 5.1: Product Planning**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Finalize floor plan mix and lot assignments (which plans on which lots based on lot dimensions and orientation) | Owner/Principal | +10 business days |
| 2 | Finalize upgrade package assignments per phase/lot (Standard, Classic, Elegance) | Owner/Principal | +10 business days |
| 3 | Develop sales pricing matrix (price per plan per lot, phase pricing) | Sales/Market Analyst | +12 business days |
| 4 | Designate model home location(s) and plan | Owner/Principal | +12 business days |

**Task List 5.2: Builder Contract and Construction Financing**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Execute master construction agreement with Red Cedar (or other GC) defining scope, fee structure, schedule, change order procedures | Attorney/Legal | +15 business days |
| 2 | Submit construction loan application for vertical (if separate from development loan) | Operations Coordinator | +15 business days |
| 3 | Obtain construction loan commitment | Owner/Principal | +25 business days |

**Task List 5.3: HOA and Community Setup**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Draft HOA covenants, conditions, and restrictions (CC&Rs) | Attorney/Legal | +20 business days |
| 2 | Establish HOA entity and initial board | Attorney/Legal | +25 business days |
| 3 | Develop community marketing plan | Sales/Market Analyst | +20 business days |

*Completion Criteria: Product mix finalized, construction agreement executed, financing secured, HOA established. CONVERTS TO PROJECT with linked Jobs.*

---

## 1.8 Lot Purchase Workflow

**WORKFLOW: Lot Purchase Acquisition**
Goal: Acquire a finished lot from another developer and position for vertical construction.

---

### MILESTONE 1: LOT IDENTIFICATION AND UNDERWRITING

**Task List 1.1: Lot Sourcing**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Identify available finished lots through developer relationships, broker network, or direct outreach | Acquisition Manager | +3 business days |
| 2 | Confirm lot dimensions meet minimum requirements for target floor plans (reference Admin Floor Plan Library for width/depth minimums) | Site Analyst | +3 business days |
| 3 | Verify all horizontal improvements are complete (roads, utilities, grading, stormwater) | Site Analyst | +5 business days |

**Task List 1.2: Financial Underwriting**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Pull comparable sales for target home product | Sales/Market Analyst | +3 business days |
| 2 | Determine best-fit floor plan(s) for the lot | Acquisition Manager | +5 business days |
| 3 | Run Deal Analyzer with lot price and construction costs | Owner/Principal | +5 business days |
| 4 | Submit to Land Committee for approval | Operations Director | +7 business days |

*Completion Criteria: Land Committee approval, fund/entity assignment confirmed*

---

### MILESTONE 2: CONTRACT AND DUE DILIGENCE

**Task List 2.1: Contract Execution**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Draft lot purchase contract | Operations Coordinator | +2 business days |
| 2 | Negotiate and execute contract | Acquisition Manager | +5 business days |
| 3 | Set up project tracking and SharePoint folders | Operations Coordinator | +1 business day after execution |

**Task List 2.2: Lot Verification**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Confirm lot improvements match developer representations (infrastructure acceptance, utility connections, grading complete) | Site Analyst | +5 business days |
| 2 | Review subdivision plat, CC&Rs, and any building restrictions | Attorney/Legal | +5 business days |
| 3 | Title search and commitment | Attorney/Legal | +10 business days |
| 4 | Survey review (or order if not provided by developer) | Surveyor | +10 business days |

*Completion Criteria: Lot conditions verified, title clear, no issues identified*

---

### MILESTONE 3: CLOSING

**Task List 3.1: Close and Transition**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Coordinate closing with seller, lender, and attorney | Operations Coordinator | +5 business days |
| 2 | Prepare and review HUD/settlement statement | Operations Coordinator | +3 business days before close |
| 3 | Wire closing funds | Accounting | Day of close |
| 4 | Execute closing | Owner/Principal | Closing date |
| 5 | Post-close notification emails, file documents, update records | Operations Coordinator | +1 business day |
| 6 | Begin permit application process | Site Analyst | +2 business days |

*Completion Criteria: Lot acquired, closing documents filed. CONVERTS TO PROJECT.*

---

# MODULE 2: PROJECTS

## 2.1 Project List View

Card grid with visual budget progress bars (budget vs. actual spend). Filters: project type, status, entity, assigned team. Search by name, address, project number.

## 2.2 Project Detail Page

**Tabs:** Overview, Acquisition, Budget & Actuals, Timeline, Linked Jobs/Units, Documents (SharePoint), Workflow, Contacts, Notes, Activity

**Core Fields:**
- Project number (auto-generated: YY-XXX)
- Project name
- Address / location
- Project type (Scattered Lot, Lot Development, Community Development, Lot Purchase)
- Owner entity (SPE or fund — e.g., "Driftwood LLC," "Red Cedar Scattered Lot Fund I")
- Builder entity (Red Cedar Homes SC LLC, Red Cedar Homes NC LLC, or other GC)
- Status: Pre-Construction → Active → Construction → Punch/CO → Disposition → Complete → Closed
- Acquisition date
- Total budget
- Current spend (rolled up from Accounting entries tagged to this project)
- Projected final cost
- Linked contacts with project-specific roles

**Builder Contract Tracking:**
- Contract type: Cost-Plus Fixed Fee, Cost-Plus Percentage, Stipulated Sum
- Contract amount / fee structure (per Red Cedar Construction Agreement: builder fee = greater of $25,000 or 10% of Sections 1-5)
- Execution date
- Scope summary
- Payment terms (5-draw schedule per Exhibit C: 20% deposit, 20% foundation, 25% framing/dry-in, 25% drywall/trim, 10% final)
- Change order procedures (owner-initiated: actual cost + 30% markup; site condition: actual cost + 10% markup per Article 4)
- Warranty terms (1-year workmanship, 2-year systems, 5-year structural per Article 7)
- Insurance requirements (GL $1M, workers' comp, builder's risk)
- Signed contract document (linked to SharePoint)

## 2.3 Project Type-Specific Tracking

**Scattered Lot and Lot Purchase:**
- Lot dimensions (width, depth, SF)
- Zoning and setbacks
- Buildable area
- Assigned floor plan (from Admin library)
- Upgrade package selected
- Utility confirmation status
- Foundation type (Slab / Crawl Space / Basement)

**Lot Development and Community Development:**
- Total acreage and total lots
- Lot dimension table: lot #, width, depth, SF, status (Raw → Developing → Finished → Contracted → Sold)
- Phase breakdown
- Preliminary/final plat status and documents
- Civil engineer contact
- Municipality and jurisdiction
- Impact fees and bonds
- Builder LOI/LPA terms
- Infrastructure acceptance status

**Community Development Additional:**
- Floor plan mix table: lot #, assigned plan, upgrade package, projected sale price
- Sales/pricing matrix
- Model home designation
- HOA setup status

## 2.4 Project Expense Entry

Users can enter expenses directly on the Project detail page under Budget & Actuals. However, **payment processing and reconciliation occurs exclusively in the Accounting module (Module 4)**. The project-level expense entry creates a transaction record tagged to the project and entity, which then flows to the Accounting module for approval, payment scheduling, and reconciliation.

Expense entry fields: date, description, amount, cost category (from budget categories), vendor (from contacts), reference/invoice number, supporting document upload (to SharePoint), entity (auto-filled from project), project (auto-filled).

## 2.5 Project Workflows — Owner/Developer Side

These workflows represent the **owner's perspective** of managing the project post-acquisition. They are distinct from the Construction Management (Module 3) workflows which represent Red Cedar's GC operations.

### SCATTERED LOT PROJECT WORKFLOW

**MILESTONE 1: PRE-CONSTRUCTION (Design, Planning, Permitting)**

**Task List 1.1: Design and Planning**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Confirm floor plan selection and finalize specifications | Owner/Principal | +3 business days |
| 2 | Select upgrade package (Standard/Classic/Elegance) and finalize selections | Owner/Principal | +5 business days |
| 3 | Review and approve plot plan from surveyor | Owner/Principal | +7 business days |
| 4 | Finalize construction budget using Deal Analyzer outputs and actual site data | Owner/Principal | +7 business days |

**Task List 1.2: Permitting**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Submit building permit application with plot plan and approved plans | Site Analyst | +3 business days |
| 2 | Submit water and sewer tap applications (if applicable) | Site Analyst | +3 business days |
| 3 | Track permit review status (weekly check) | Site Analyst | Weekly until approved |
| 4 | Receive approved permits — document permit number, issue date, expiration | Site Analyst | Variable |

**Task List 1.3: Construction Contract and Handoff**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Execute construction agreement (SC or NC template) with Red Cedar | Owner/Principal | +5 business days |
| 2 | Submit Draw 1 (Deposit — 20% of contract price) per construction agreement | Accounting | Upon contract execution |
| 3 | Prepare handoff package: plot plan, JIO, interior/exterior design sheets, appliance package, Brix selection sheet, permit/placard, 2 copies county-approved plans (11x17) | Operations Coordinator | Upon permit approval |
| 4 | Conduct handoff meeting (Mondays) with construction team | Acquisition Manager | Next Monday after package ready |
| 5 | Conduct site walk with superintendent | Acquisition Manager / Superintendent | At handoff meeting |
| 6 | Set up utilities: power work order, temp pole, sewer/water tap coordination | Site Analyst | +5 business days after handoff |

*Completion: Permits issued, construction contract executed, deposit paid, handoff complete. Job created in Module 3.*

---

**MILESTONE 2: CONSTRUCTION MONITORING (Owner Oversight)**

**Task List 2.1: Financial Tracking**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Review and approve Draw 2 request (Foundation Complete — 20%) | Owner/Principal | Upon milestone achievement |
| 2 | Review and approve Draw 3 request (Framing & Dry-In — 25%) | Owner/Principal | Upon milestone achievement |
| 3 | Review and approve Draw 4 request (Drywall & Interior Trim — 25%) | Owner/Principal | Upon milestone achievement |
| 4 | Process draw payments through Accounting module | Accounting | Within 10 days of approval |
| 5 | Track and approve any change orders (review cost impact and reason) | Owner/Principal | As submitted |
| 6 | Submit lender draw requests aligned with builder draw requests | Operations Coordinator | Per lender schedule |

**Task List 2.2: Schedule and Quality Oversight**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Monitor construction milestone progress (review Module 3 status weekly) | Owner/Principal | Weekly |
| 2 | Review inspection results (passed/failed/conditional) | Owner/Principal | As completed |
| 3 | Address any owner-decision items flagged by builder (selections, change requests, site conditions) | Owner/Principal | Within 3 business days of request |

*Completion: All draws through Draw 4 processed, construction substantially complete.*

---

**MILESTONE 3: COMPLETION AND DISPOSITION**

**Task List 3.1: Project Close-Out**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Attend final walkthrough / punch list review with builder | Owner/Principal | Upon substantial completion |
| 2 | Confirm all punch list items resolved or scheduled | Owner/Principal | +10 business days after walkthrough |
| 3 | Receive Certificate of Occupancy | Builder (via Module 3) | Upon final inspection |
| 4 | Review and approve Draw 5 (Final — 10%), adjusted for unused contingency and change orders | Owner/Principal | Upon CO issuance |
| 5 | Collect all lien waivers (conditional and unconditional) | Owner/Principal | With final draw |
| 6 | Receive warranty documentation (1-year workmanship, 2-year systems, 5-year structural) | Owner/Principal | With final draw |

**Task List 3.2: Sale / Disposition**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | List property for sale (execute listing agreement, set price per Deal Analyzer projections) | Sales/Market Analyst | Per disposition strategy |
| 2 | Manage showings and offers | Sales/Market Analyst | Ongoing |
| 3 | Execute sale contract | Owner/Principal | Upon acceptable offer |
| 4 | Coordinate buyer closing | Operations Coordinator | Per contract timeline |
| 5 | Record sale revenue in Accounting module | Accounting | At closing |
| 6 | Calculate final project profitability (actual vs. projected from Deal Analyzer) | Owner/Principal | +5 business days after sale close |

*Completion: Property sold or placed into portfolio, final P&L calculated, project status set to Complete.*

---

### LOT DEVELOPMENT PROJECT WORKFLOW

**MILESTONE 1: ENGINEERING AND DESIGN**

**Task List 1.1: Civil Engineering**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Engage civil engineering firm and execute engineering agreement | Owner/Principal | +5 business days |
| 2 | Complete boundary and topographic survey (if not done in DD) | Surveyor | +10 business days |
| 3 | Develop preliminary site plan with lot layout, road network, stormwater | Engineer (external) | +30 business days |
| 4 | Develop construction drawings (grading, erosion control, utilities, roads, stormwater) | Engineer (external) | +45 business days |

**Task List 1.2: Regulatory Submissions**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Submit preliminary plat to municipality for review | Engineer (external) | Per engineering timeline |
| 2 | Address municipal review comments | Engineer (external) | +15 business days after comments |
| 3 | Obtain preliminary plat approval | Engineer (external) | Variable |
| 4 | Submit final plat for approval and recording | Engineer (external) | After construction substantially complete |

**Task List 1.3: Environmental Compliance**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Prepare and submit SWPPP (Stormwater Pollution Prevention Plan) | Engineer (external) | +20 business days |
| 2 | Obtain NPDES permit (NOI) for land disturbance | Engineer (external) | +30 business days |
| 3 | Address any wetlands mitigation requirements | Environmental Consultant | As required |

*Completion: Construction drawings complete, preliminary plat approved, environmental permits obtained.*

---

**MILESTONE 2: PERMITTING AND PRE-CONSTRUCTION**

**Task List 2.1: Permits and Bonds**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Submit land disturbance permit application | Engineer (external) | +5 business days |
| 2 | Post performance bonds / letters of credit as required by municipality | Owner/Principal | +10 business days |
| 3 | Obtain all required construction permits (land disturbance, utility, road, driveway) | Operations Coordinator | +20 business days |

**Task List 2.2: Contractor Procurement**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Solicit bids from qualified horizontal construction contractors (earthwork, utilities, paving) | Owner/Principal | +10 business days |
| 2 | Review bids and select contractors | Owner/Principal | +15 business days |
| 3 | Execute construction contracts | Attorney/Legal | +20 business days |

*Completion: All permits issued, contractors engaged, bonds posted.*

---

**MILESTONE 3: HORIZONTAL CONSTRUCTION**

**Task List 3.1: Earthwork and Grading**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Install erosion control measures (silt fence, inlet protection, construction entrance) | Superintendent | +3 business days |
| 2 | Clear and grub site | Superintendent | +10 business days |
| 3 | Mass grading to design elevations | Superintendent | +25 business days |
| 4 | Obtain grading inspection approval | Inspector | Upon completion |

**Task List 3.2: Underground Utilities**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Install sanitary sewer mains and laterals | Superintendent | +15 business days after grading |
| 2 | Install water mains and service connections | Superintendent | +15 business days after grading |
| 3 | Install storm drainage (pipes, inlets, detention/retention) | Superintendent | +15 business days after grading |
| 4 | Utility inspections passed | Inspector | Upon completion per phase |
| 5 | Coordinate power and gas installation with utility providers | Site Analyst | Parallel |

**Task List 3.3: Roads and Surface Improvements**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Install road subbase and base course | Superintendent | +10 business days after utilities |
| 2 | Install curb and gutter | Superintendent | +5 business days after base |
| 3 | Pave roads (base course asphalt — final coat after vertical construction if applicable) | Superintendent | +5 business days after curb |
| 4 | Install sidewalks | Superintendent | +5 business days after paving |
| 5 | Install signage, mailboxes, community amenities | Superintendent | +10 business days |
| 6 | Final grading of individual lots | Superintendent | +5 business days after roads |

*Completion: All horizontal improvements substantially complete, inspections passed.*

---

**MILESTONE 4: LOT DELIVERY AND SALES**

**Task List 4.1: Municipal Acceptance**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Request municipal inspection of completed infrastructure | Engineer (external) | +5 business days |
| 2 | Address punch list items from municipal inspection | Superintendent | +10 business days |
| 3 | Obtain infrastructure acceptance / dedication (roads, utilities to public entities) | Engineer (external) | +20 business days |
| 4 | Record final plat | Attorney/Legal | Upon acceptance |
| 5 | Release or reduce performance bonds | Owner/Principal | Upon acceptance |

**Task List 4.2: Lot Sales Execution**
| # | Task | Default Role | Relative Due |
|---|------|-------------|-------------|
| 1 | Execute lot purchase agreements with builders per LOI/LPA terms | Operations Coordinator | Per contract schedule |
| 2 | Coordinate individual lot closings | Operations Coordinator | Per contract schedule |
| 3 | Record lot sale revenue in Accounting module | Accounting | At each closing |
| 4 | Track lot inventory: remaining lots, lot status (contracted/sold/available) | Operations Coordinator | Ongoing |
| 5 | Final project reconciliation and P&L | Owner/Principal | After all lots sold |

*Completion: All lots sold or under contract, project financials reconciled.*

---

### COMMUNITY DEVELOPMENT PROJECT WORKFLOW

Combines the Lot Development workflow (Milestones 1–4 above) for horizontal work, plus Scattered Lot Project workflow Milestones 1–3 replicated for each home/unit in the community. Each unit gets its own Pre-Construction → Construction Monitoring → Completion cycle. All units are linked to the parent project and managed through Module 3 as a single Job with multiple Units.

### LOT PURCHASE PROJECT WORKFLOW

Same as Scattered Lot Project workflow (Milestones 1–3 above), starting at Pre-Construction since the lot is already finished. Milestone 1 excludes site analysis tasks (lot is already developed) and focuses on permitting and construction contract setup.

---

# MODULE 3: CONSTRUCTION MANAGEMENT (Red Cedar Operating System)

This is the **General Contractor operating environment** for Red Cedar Homes. It manages builds for internal entities (SPEs/funds under Olive Brynn) AND true third-party clients. Red Cedar maintains its own accounting (AP/AR), vendor management, and operational workflows within this module.

## 3.1 Naming Convention

**Jobs** = Overall engagement (replaces "Project" in the construction context to avoid confusion with Module 2 Projects)
**Units** = Individual homes within a Job

## 3.2 Job Structure

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
- Superintendent and PM assignment
- State: SC / NC (determines which construction agreement template, which state requirements)

**Job Dashboard:** Total contract value, cost to date, budget remaining, units by milestone status, schedule overview, open POs, pending inspections, open change orders, next draw status.

## 3.3 Unit Structure

**Unit Fields:**
- Unit number (auto: [Job]-01, [Job]-02, etc.)
- Lot/address
- Floor plan (from Admin library — pulls all specs: heated SF, bed/bath, garage, stories, type, width/depth, pad size)
- Upgrade package (Standard/Classic/Elegance/Harmony — pulls upgrade costs from Admin)
- Unit status / current milestone
- Base sticks & bricks cost (from floor plan selection)
- Upgrade cost (from package selection)
- Lot preparation cost (entered)
- Site-specific vertical adjustments (entered)
- Soft costs (from municipality selection in Admin)
- Builder fee (calculated: greater of $25,000 or 10%)
- Contingency (calculated: greater of $10,000 or 5%)
- Total budget (sum of above)
- Total committed (POs issued)
- Total actual (POs paid)
- Variance (budget minus actual)
- Key dates: permit issued, construction start, projected completion, actual completion, CO date, warranty expiration (CO + 365 days)

## 3.4 Construction Milestones (16 Phases)

Each Unit progresses through the following milestones. Each has planned start/end, actual start/end, required inspections, and finish-to-start dependency on the prior milestone.

| Phase | Milestone | Standard Duration (SFH) | Key Inspections |
|-------|-----------|------------------------|-----------------|
| 1 | Pre-Construction | 15 days | — |
| 2 | Site Work | 10 days | Erosion control |
| 3 | Foundation | 12 days | Footer/foundation inspection |
| 4 | Framing | 14 days (varies by plan) | Framing inspection |
| 5 | Dry-In (Roof/Sheathing/WRB) | 7 days | — |
| 6 | MEP Rough-In: Plumbing | 5 days | Plumbing rough-in inspection |
| 7 | MEP Rough-In: Electrical | 5 days | Electrical rough-in inspection |
| 8 | MEP Rough-In: HVAC | 5 days | HVAC rough-in inspection |
| 9 | Insulation | 3 days | Insulation inspection |
| 10 | Drywall | 10 days | — |
| 11 | Trim and Interior Finish | 12 days | — |
| 12 | Paint | 5 days | — |
| 13 | Flooring | 5 days | — |
| 14 | Final MEP (Fixtures, Trim-Out) | 5 days | — |
| 15 | Punch List & Final Inspection | 7 days | Final building inspection, CO |
| 16 | Close-Out | 5 days | — |

**Post-CO:** Warranty period (tracked separately — 1 year workmanship from CO date).

**Schedule Templates** are configured in Admin per floor plan with standard durations. When a Unit is created with a floor plan assignment, the schedule template is auto-applied. Durations are editable per Unit.

## 3.5 Purchase Orders

PO per Unit per trade category.

**Trade Categories (from Base House Costs data):**
Dumpster, Utilities, Portable Toilet, Permit Box, Termite Treatment, Lumber (All Floors), Framing Labor, Floor Trusses, Roof Trusses, Stairs, I-Joist/EWP, Roofing (Shingle), Roofing (Metal), Roofing Labor & Material, Siding Material, Siding Labor, Brick, Window Material, Window Labor, Exterior Door Material, Exterior Door Labor, Garage Door, Plumbing Turnkey, HVAC, Electrical Rough & Trim, Blower Test, Low Voltage/AV, Insulation, Drywall Material, Drywall Labor, Exterior Paint, Interior Paint, Interior Trim Turnkey, Interior Trim Material, Interior Trim Labor, Door Hardware, Shelving, Mirrors, Bath Accessories, Shower Door, Countertops, Cabinet Labor & Material, Tile, Light Fixtures, Appliances, Carpet, LVP Flooring, Interior Clean, Gutters, Mailbox, Pressure Wash, Foundation, Landscaping, Flatwork/Driveway, Deck, Blinds, Waterproofing, Site Work/Grading, Miscellaneous.

**PO Fields:** PO number (auto), Unit, trade category, vendor (from contacts), description, amount, status (Draft → Issued → Work Complete → Invoiced → Approved → Scheduled for Payment → Paid), issue date, completion date, invoice date, payment date, lien waiver status (None → Conditional Received → Unconditional Received), retainage (configurable 5–10% in Admin), linked change orders.

**Approval Workflow:** Under threshold (e.g., $5,000 configurable in Admin) auto-approve; above threshold requires Construction Manager or Principal; above second threshold (e.g., $25,000) requires Principal regardless.

## 3.6 Change Orders

CO fields: CO number (auto), linked PO or standalone, Unit, description, reason category (Owner Request/Upgrade, Field Condition, Design Error, Code Requirement, Scope Clarification), cost impact, schedule impact (days), approval status (Submitted → Under Review → Approved → Denied), approved by, approval date.

**Markup Rules per Construction Agreement:**
- Owner-initiated changes: actual cost + 30% markup (Article 4.2(b))
- Site condition changes (after contingency exhausted): actual cost + 10% markup (Article 4.2(c))
- Contingency-funded changes: no markup (Article 4.1)

Auto-adjusts: Unit budget, related PO amount, Job-level budget roll-up.

## 3.7 Design Center / Selections

Selection categories: Cabinets, Countertops, Flooring (by room), Interior Paint Colors, Exterior Paint/Siding, Plumbing Fixtures, Lighting Fixtures, Appliances, Hardware, Shower Doors, Mirrors, Bath Accessories, Specialty Items.

**Upgrade Packages (from Red Cedar data):**
- **Standard:** Base specifications included in sticks & bricks cost
- **Classic:** Per-plan upgrade cost (e.g., Dogwood Classic = $4,000; Magnolia Classic = $4,600; see Admin for complete table)
- **Elegance:** Per-plan upgrade cost (e.g., Dogwood Elegance = $8,300; Magnolia Elegance = $11,100)
- **Harmony:** Available on select TH plans (e.g., Jasmine Harmony = $4,500; Palmetto II Harmony = $5,000)

Selection record: Unit, category, item, description, vendor, base cost, upgrade delta, status (Pending → Selected → Ordered → Received → Installed), linked PO.

PDF Selection Sheet generation for trade distribution. Upgrade cost roll-up to Unit budget.

## 3.8 Inspections

Types mapped to milestones: Footer/Foundation, Framing, Plumbing Rough-In, Electrical Rough-In, HVAC Rough-In, Insulation, Final Building, specialty inspections as required.

Fields: Unit, type, municipality/jurisdiction, inspector name, scheduled date, actual date, result (Pass/Fail/Conditional), notes, re-inspection date/result, linked milestone.

**Gate Logic:** Cannot advance milestone without passing required inspection, or override by Construction Manager/Principal with documented note.

## 3.9 Permit Tracking

Per Unit or per Job. Fields: permit type (Building, Electrical, Plumbing, Mechanical, Land Disturbance, Driveway, Other), jurisdiction, application date, permit number, issued date, expiration date, inspection requirements, cost/fee, status (Applied → In Review → Issued → Active → Expired → Closed).

## 3.10 Warranty Management

One-year workmanship warranty period from CO date (per Article 7 of construction agreement). Two-year systems warranty. Five-year structural warranty.

Warranty claim fields: Unit, claim date, category (trade categories), description, photos, urgency (Routine/Urgent/Emergency), responsible sub, notification date, scheduled repair, completion date, resolution notes, owner sign-off, cost (charged back to sub or absorbed).

Dashboard: open claims by Unit, claims by trade category, average resolution time, warranty reserve balance per Job.

## 3.11 Issue Tracking

During active construction. Fields: Unit, milestone, category (Safety Hazard, Quality Deficiency, Schedule Impact, Material Defect, Sub Performance, Weather Delay, Code Violation), description, photos, severity (Low/Medium/High/Critical), assigned to, due date, resolution, cost impact, status (Open → In Progress → Resolved → Verified).

## 3.12 Construction Accounting (Red Cedar's Books)

**Accounts Payable:**
- Every PO at "Invoiced" status creates AP entry
- Workflow: Invoice Received → Coded to Job/Unit/Cost Code → Approved for Payment → Scheduled → Paid
- AP aging: Current, 30, 60, 90+ by vendor
- Payment runs: batch payments by vendor across Jobs
- Retainage tracking: held per vendor per Job, released at substantial completion + final lien waiver
- 1099 tracking: flag vendors over $600 annual, accumulate payments, generate 1099-NEC data

**Accounts Receivable:**
- For internal Jobs (Olive Brynn SPEs): AR generated when Red Cedar submits draw/invoice to SPE per 5-draw schedule (20/20/25/25/10)
- For third-party clients: AR per contract payment schedule
- AR aging report

**Vendor Management:**
- Profile: company name, contact info, trades performed, license number/expiration, insurance certificates (GL, workers' comp, auto) with 30-day expiration alerts, W-9 on file, bank info for ACH, performance score (on-time completion rate, punch items, PM rating)

**Job Costing:**
- Per-Unit cost report: budget vs. committed vs. actual vs. projected final by trade/cost code
- Per-Job cost report: all Units rolled up
- Variance analysis: flag cost codes where actual exceeds budget by configurable threshold (e.g., 5%)

## 3.13 Construction Schedule

**Unit-Level:** Each milestone has planned/actual start/end, finish-to-start dependency, days-in-milestone counter, overdue flag. Auto-shift downstream dates when milestone delayed.

**Job-Level Gantt:** All Units stacked with milestone bars. Color coding: Green (on/ahead), Yellow (1–7 days behind), Red (8+ behind), Blue (complete), Gray (not started). Critical path identification.

**Velocity Metrics:** Average days per milestone (actual vs. planned), average total build time by plan, trend over time, completions per month, projected completion dates.

## 3.14 Dual Budget View

For **internal Jobs** (Olive Brynn SPEs), two budget perspectives exist:

**Owner's View** (accessible from Module 2 Projects): Shows the construction contract amount between SPE and Red Cedar as a single "Construction Contract" line item within the total project budget. Also includes land, soft costs, financing, selling costs. Does NOT reveal Red Cedar's subcontractor pricing.

**Builder's View** (accessible from Module 3 Construction): Shows detailed cost breakdown by trade/cost code that Red Cedar manages against the contract amount. POs, change orders, and actual costs live here. Does NOT show SPV's land cost, investor terms, or overall deal economics.

---

# MODULE 4: ACCOUNTING (Owner/Developer Side)

Manages Olive Brynn LLC, all SPEs, holding entities, and investment funds. NOT Red Cedar GC operations (that is Module 3.12). NOT payroll.

## 4.1 Entity Hierarchy

**Entity Use Types:** Operating Company (Red Cedar Homes SC, Red Cedar Homes NC), Holding Company (Olive Brynn LLC), Single Purpose Entity (project-specific LLCs), Fund/Syndication (Red Cedar Scattered Lot Fund I, Fund II), Other.

**Legal Types (IRS):** LLC, S-Corporation, Partnership, C-Corporation, Sole Proprietorship, Trust.

**Parent-Child Relationships:** Olive Brynn LLC → Red Cedar Homes SC → SPEs; Olive Brynn LLC → Red Cedar Homes NC → SPEs. Each entity has own chart of accounts, transactions, and reporting.

## 4.2 Chart of Accounts

Per-entity with templates based on entity use type (configured in Admin). Standard SPE template ranges:

- 1000–1999: Assets (Cash Operating/Escrow, AR, Prepaid, Land, Construction in Progress, Finished Lots, Completed Homes)
- 2000–2999: Liabilities (AP, Accrued Expenses, Construction Loan, Development Loan, Seller Financing, Accrued Interest)
- 3000–3999: Equity (Member Capital Managing/Investors, Retained Earnings, Distributions)
- 4000–4999: Revenue (Home Sales, Lot Sales, Rental Income, Assignment/Wholesale Fee, Interest, Other)
- 5000–5999: Cost of Sales (Land, Hard Costs, Soft Costs, Financing Costs, Selling Costs, Contingency, Property Taxes, Insurance)
- 6000–6999: Operating Expenses (Property Management, Maintenance, Utilities, HOA, Marketing, Miscellaneous)

## 4.3 Capital Contributions and Investor Tracking

Investor records per entity: name, contact, ownership %, capital commitment, contributed to date, preferred return rate, promote/carry structure, accreditation status/verification date, linked documents (subscription agreement, operating agreement, W-9).

Capital call workflow: create call → issue notice → track responses → follow up on unfunded.

## 4.4 Waterfall Structures

Supported: (1) Simple Preferred Return + Promote, (2) Straight Split, (3) Multi-Tier IRR Waterfall.

Distribution calculator: inputs distributable amount, applies waterfall logic, outputs per-investor distribution with auditable calculation.

## 4.5 Transaction Entry and Ledger

Fields: date, description, entity (required), account (from entity COA), debit/credit, project (optional), Unit/house (optional), reference number, transaction type (Journal Entry, Bill Payment, Deposit, Transfer, Draw, Distribution, Capital Contribution), supporting document.

**Payment processing:** All payments are initiated and reconciled here. Project-level expense entries (from Module 2) appear as pending transactions awaiting approval and payment scheduling. Approved transactions can be batched for payment.

Period management: monthly close process (review, trial balance, adjusting entries, lock period).

## 4.6 Entity Financial Reporting

Per-entity: Balance Sheet, Income Statement, Cash Flow, Trial Balance, Transaction Register.
Consolidated: parent entity view with intercompany eliminations.
Project-level P&L: revenue minus all costs = project profit. Per-house profitability for communities.
Investor reporting: capital account statement, IRR, equity multiple.

## 4.7 Loan and Debt Tracking

Lender details, loan type, terms, drawn/available amounts, interest calculation, covenants. Draw tracking ties to Module 3 (when Red Cedar submits draw, corresponding lender draw appears). Interest accrual posts monthly journal entries. Maturity alerts at 90/60/30 days.

## 4.8 Integration: Akaunting Sync

One-way sync of approved transactions from Atlas Accounting to Akaunting (open-source accounting software). Mapping configured in Admin between Atlas COA and Akaunting accounts. Sync runs on transaction approval.

---

# MODULE 5: ADMIN

## 5.1 Organization Settings

Company name (Red Cedar Homes), logo, default entity (Olive Brynn LLC), timezone, fiscal year start, currency (USD), system-wide defaults: contingency %, default retainage %, margin thresholds for Deal Analyzer (GO: >10%, Good: 7-10%, Marginal: 5-7%, No-Go: <5%).

## 5.2 Construction Management Admin

### Floor Plan Library

Complete library derived from Red Cedar's current model portfolio. Per plan:

| Field | Example (Dogwood) |
|-------|-------------------|
| Plan Name | Dogwood |
| Type | SFH |
| Heated SF | 1,541 |
| Bedrooms | 3 |
| Bathrooms | 2.5 |
| Garage | 2-Car |
| Unheated SF | 397 |
| Stories | 2 |
| Minimum Lot Width | 29' |
| Minimum Lot Depth | 36' |
| Base Sticks & Bricks Cost | $124,030.98 |
| Total Cost (incl. soft + site-specific) | $137,555.98 |
| $/Heated SF (S&B) | $80.49 |
| $/Heated SF (Total) | $89.26 |
| Classic Upgrade Cost | $4,000 |
| Elegance Upgrade Cost | $8,300 |
| Harmony Upgrade Cost | — |
| Architectural Plan Document | [SharePoint link] |
| Reference Image/Rendering | [SharePoint link] |
| Notes | — |
| Status | Active / Archived |

**Current Active Plans (September 2025 pricing):**

**Single Family Homes:**

| Plan | SF | Bed/Bath | Garage | Stories | S&B Cost | Classic | Elegance | Min Lot |
|------|----|----------|--------|---------|----------|---------|----------|---------|
| Tulip | 1,170 | 3/2 | 1-Car | 1 | $105,821 | $3,000 | $6,500 | 30×50 |
| Lilac | 1,382 | 3/3 | 1-Car | 1.5 | $122,530 | $4,000 | $9,000 | 30×46 |
| Banyan | 1,400 | 3/3 | 2-Car | 3 | $134,058 | $4,600 | $10,300 | 28×24 |
| Dogwood | 1,541 | 3/2.5 | 2-Car | 2 | $124,031 | $4,000 | $8,300 | 29×36 |
| Atlas (plan) | 1,554 | 3/2.5 | None | 2 | $113,777 | $4,200 | $8,800 | 24×33 |
| Spruce | 1,545 | 3/2 | 2-Car | 1 | $129,518 | $2,800 | $7,300 | 39×54 |
| Elm | 1,712 | 4/2.5 | 2-Car | 2 | $134,540 | $4,300 | $9,000 | 28×35 |
| Hazel | 1,713 | 4/2.5 | 2-Car | 2 | $134,200 | $4,450 | $9,100 | 28×34 |
| Aspen 2-Story | 1,788 | 3/2.5 | 2-Car | 2 | $139,412 | $4,750 | $9,600 | 24×33 |
| Willow | 1,857 | 4/2.5 | 1-Car | 2 | $133,891 | $4,100 | $9,000 | 30×40 |
| Holly | 2,000 | 4/2.5 | 2-Car | 2 | $144,355 | $4,000 | $8,500 | 29×48 |
| Spindle | 2,001 | 3/2 | None | 2 | $147,508 | $4,100 | $8,800 | 24×51 |
| White Oak | 2,005 | 4/2.5 | 2-Car | 2 | $143,853 | $4,400 | $6,700 | 38×35 |
| Aspen 3-Story | 2,168 | 3/2.5 | 2-Car | 2 | $160,412 | $5,050 | $10,100 | 24×33 |
| Cherry | 2,214 | 4/3 | 2-Car | 2 | $156,913 | $5,000 | $11,000 | 38×38 |
| Acacia | 2,236 | 4/3 | 2-Car | 1.5 | $165,012 | $4,200 | $10,000 | 39×54 |
| Lily | 2,293 | 4/3.5 | None | 2.5 | $157,945 | $5,400 | $10,700 | 34×30 |
| Magnolia | 2,771 | 4/3 | 2-Car | 2 | $178,184 | $4,600 | $11,100 | 38×40 |

**Townhomes:**

| Plan | SF | Bed/Bath | Garage | Stories | S&B Cost | Classic | Elegance | Harmony | Width/Unit |
|------|----|----------|--------|---------|----------|---------|----------|---------|------------|
| Palmetto | 1,304 | 3/2.5 | None | 2 | $110,043 | $3,900 | $8,200 | — | 20' |
| Palmetto II | 1,424 | 3/2.5 | None | 2 | $111,055 | $4,100 | $7,200 | $5,000 | 20' |
| Jasmine | 1,500 | 3/2.5 | 1-Car | 2 | $127,142 | $3,800 | $8,000 | $4,500 | 20' |
| Bayberry | 1,500 | 3/2.5 | 1-Car F | 2 | $125,252 | $3,600 | $5,500 | $6,100 | 20' |
| Poplar | 1,483 | 3/2.5 | 2-Car R | 2 | $130,814 | $3,900 | $8,200 | $3,600 | 20' |
| Locust | 1,669 | 3/2.5 | 1-Car F | 2 | $133,947 | $4,600 | $7,200 | — | 22' |
| Palm II | 1,689 | 3/2.5 | 1-Car F | 2 | $132,402 | $5,000 | $8,500 | — | 20' |
| Fraser | 1,689 | 3/2.5 | 2-Car R | 2 | $133,563 | $3,300 | $2,700 | — | 22' |
| Alder | 1,700 | 3/2.5 | 1-Car R | 2 | $130,196 | $4,600 | $8,800 | $5,900 | 20' |
| Cottonwood | 1,729 | 3/2.5 | 1-Car F | 3 | $142,078 | $6,500 | $7,100 | — | 18' |
| Pinyon | 1,748 | 3/3.5 | 2-Car | — | $151,644 | $6,600 | $11,200 | $6,200 | — |
| Boxelder | 1,796 | 4/2.5 | 2-Car | — | $141,492 | $6,300 | $9,200 | $4,800 | 22' |
| Fig | 1,798 | 3/3.5 | 1-Car R | 3 | $150,175 | $3,900 | $8,200 | $9,000 | 18' |
| Conifer | 1,892 | —/— | 2-Car | — | $163,028 | $4,700 | $5,900 | $7,700 | — |
| Sycamore | 1,993 | 3/2.5 | 2-Car R | 2 | $146,861 | $5,500 | $8,600 | $4,400 | — |
| Linville | 2,188 | 4/2.5 | 2-Car F | 2 | $160,613 | $4,700 | $8,900 | $7,300 | 27' |

**Cost Components Per Plan (standardized):**
Each plan's sticks & bricks cost is the sum of ~40 trade-level line items: Dumpster, Utilities, Portable Toilet, Permit Box, Termite, Lumber, Framing Labor, Floor Trusses, Roof Trusses, Stairs, Roofing, Siding Material, Siding Labor, Window Material, Window Labor, Ext Door Material, Ext Door Labor, Garage Door, Plumbing Turnkey, HVAC, Electrical, Blower Test, Insulation, Drywall Material, Drywall Labor, Ext Paint, Int Paint, Cabinet L&M, Int Trim Turnkey, Countertops, Shelving, Mirrors, Bath Accessories, Door Hardware, Shower Door, Light Fixtures, Flooring (Carpet + LVP), Interior Clean, Gutters, Mailbox, Pressure Wash, Foundation, Landscaping, Flatwork, Appliances.

### Budget Packages
Named templates defining base cost per floor plan, standard soft cost line items, builder fee formula, contingency formula, and other standard fees. Auto-populates Unit budget when floor plan + package selected.

### Upgrade Packages
Named tiers with per-category selections and costs. Availability varies by floor plan. Total upgrade delta over base is maintained in Admin and pulled by Deal Analyzer and Unit budget.

### Cost Code Library
Master list of all trade categories with code numbers, descriptions, default vendors (optional), typical cost ranges. Derived from the Base House Costs data.

### Schedule Templates
Per floor plan, default milestone durations. Standard durations from the 16-phase milestone list, adjustable per plan (e.g., Magnolia framing = 16 days due to larger footprint vs. Tulip = 10 days).

### Contract Assembly
Template library for: Red Cedar Scattered Lot Construction Agreement (SC version), Red Cedar Scattered Lot Construction Agreement (NC version), PO templates, change order templates, selection sheets. Merge fields pull from Job, Unit, Contact, Entity, Selection data. Versioned templates. PDF output. Future DocuSeal e-signature integration.

### Lot Condition Report Template
Standard form for documenting lot conditions at construction start. Configurable fields: existing utilities, access, tree/vegetation, grade/slope, soil conditions, easements, setbacks, neighboring structures, site photos.

### Fees and Costs Defaults
- Builder fee: greater of $25,000 or 10% of construction costs (Sections 1–5 per construction agreement)
- Contingency: greater of $10,000 or 5% of construction costs
- Default soft costs: $2,650 per unit (soft cost standard) + $10,875 site-specific standard
- Permit fee schedules by municipality (from Municipalities table)
- Water/sewer tap fees by county (from Water & Sewer Data: e.g., Greenville County, Spartanburg County, and all NC counties in the system)
- Insurance premium estimates (builder's risk)

### Municipality / Jurisdiction Table

**SC Municipalities:** City of Greenville, City of Spartanburg, City of Greer, City of Mauldin, City of Simpsonville, Greenville County, Spartanburg County, Town of Travelers Rest, Town of Lyman, Town of Duncan, Town of Wellford, Town of Inman, City of Woodruff, City of Fountain Inn, Laurens County.

**NC Counties with Water/Sewer Data:**
Alexander, Cabarrus, Catawba, Cleveland, Davidson, Davie, Forsyth, Gaston, Guilford, Iredell, Lancaster, City of Lexington, Lincoln, Mecklenburg, Rowan, Stanly, Union, York, Town of Clover, City of Statesville.

Per jurisdiction: water tap fee, sewer tap fee, system development fees, total W/S fees, meter charges, impact fees, permit fee schedule, miscellaneous fees/notes.

## 5.3 Opportunity Management Admin

- **Deal Analyzer Configuration:** Margin thresholds, default financing assumptions (LTC 85%, interest rate, construction period 120 days), default selling cost % (8.5%), contingency default, cost of capital rate (16%), market-area pricing adjustments
- **Workflow Templates:** Default templates for each opportunity type with milestones, task lists, and tasks as defined in Module 1 sections 1.5–1.8
- **Stage Definitions:** Kanban stages per opportunity type with entry criteria and required fields

## 5.4 Project Module Admin

- **Workflow Templates:** Default templates for each project type as defined in Module 2 section 2.5
- **Project Number Format:** Auto-numbering (YY-XXX)
- **Budget Category Templates:** Per project type
- **SharePoint Folder Templates:** Configurable sub-folder structures per project type (as defined in SharePoint Integration section above)

## 5.5 Accounting Admin

- **Chart of Accounts Templates:** Pre-built per entity use type, cloneable and customizable
- **Waterfall Structure Templates:** Pre-built distribution models
- **Fiscal Period Settings:** Year start, period close schedule, period lock rules
- **Akaunting Integration Mapping:** Atlas COA ↔ Akaunting account mapping

## 5.6 Permission Settings

**Roles:**
- Global Admin: full access to all modules and Admin configuration
- Module Admin: full access within specific module(s) including module-specific Admin sections
- Team Member: access to assigned modules/records per team membership
- Read-Only: view access to assigned modules/records

**Permission Levels:**
- Module-level: which roles/teams access which modules
- Record-level: users see only records assigned to them or their team (unless Module Admin or Global Admin)
- Action-level: View, Create, Edit, Delete, Approve (POs/change orders/draws/distributions), Export

## 5.7 Teams

Named groups of users (e.g., "Acquisitions SC Team," "Red Cedar PM Team," "Accounting Team," "Oslo Development Team"). Users belong to multiple teams. Teams assigned to modules, projects, jobs, entities, opportunities. When team assigned to record, all team members gain access per role.

Team dashboard: all records across modules assigned to the team, member list, aggregate activity.

## 5.8 Integration Settings

### Microsoft 365 (Tier 1 — SharePoint, Outlook, Calendar, Teams)

**SharePoint** (detailed above): Credential entry in Admin, automatic folder creation, document upload sync, embedded document access from Atlas records.

**Outlook:** Email logging — send/receive from Atlas linked to Contacts/records, emails stored as activity records.

**Outlook Calendar:** Task due dates and milestone dates sync to Outlook calendars for assigned users. Inspection, hearing, and closing scheduling.

**Microsoft Teams:** Initiate Teams chats from Atlas linked to records, schedule video calls linked to calendar events, Atlas alerts push to Teams channel.

### DocuSeal (e-signature)
Send construction agreements, POs, change orders, investor subscription documents for signature from Atlas. Track status (Sent → Viewed → Signed → Complete). Auto-file signed documents to record and SharePoint.

### Akaunting Sync
One-way sync of approved transactions from Atlas Accounting (Module 4) to Akaunting. Account mapping in Admin. Sync on approval.

### Plaid (Future)
Bank account connections for auto-importing transactions, reconciliation support.

---

# WORKFLOW ENGINE — CROSS-MODULE ARCHITECTURE

Unified architecture across Opportunities, Projects, and Construction Management.

**Hierarchy:** Workflow → Milestones → Task Lists → Tasks

**Workflow:** Named process attached to record type and subtype. Every workflow has a goal statement.

**Milestone:** Major phase within workflow. Sequential (completed in order, override capability). Minimum 2 milestones per workflow. Fields: name, description, sequence, entry criteria, completion criteria (all task lists complete or manual override).

**Task List:** Group of related tasks within a milestone. Minimum 3 tasks per task list. Fields: name, description, linked milestone, completion criteria.

**Task:** Individual action item. Fields: title, description, assigned to (Role AND/OR specific User), relative due date (from milestone activation, e.g., "+5 business days"), priority (Low/Medium/High/Urgent), status (Not Started → In Progress → Complete → Skipped), completion date, notes, linked record.

**Template Management:** Created in Admin per module. Cloned and attached when new record created with matching type. Users customize instance without affecting master template.

**Role-Based Assignment:** Tasks assigned to Roles by default in templates. When instantiated, system maps roles to users based on team assignments. Specific user can override role assignment.

---

# DATA FLOW SUMMARY

```
Opportunities (deal pipeline)
    → CONVERTS TO →
Projects (owner/developer tracking)
    → LAUNCHES →
Construction Management Jobs (Red Cedar GC operations)
    → FEEDS →
Accounting (entity financials, investor reporting)

Reverse:
Construction Management (cost actuals, draw requests)
    → SYNCS TO →
Projects (budget vs. actual at owner level)
    → INFORMS →
Accounting (transaction entry, loan draws, distributions)
```

**Key Cross-Module Connections:**
1. Opportunity converts to Project, carrying forward all underwriting data, contacts, documents, and entity assignment
2. Project launches one or more Jobs in Construction Management when construction contracts are executed
3. Red Cedar's draw requests (Module 3) create corresponding lender draw records (Module 4) and update Project budget (Module 2)
4. Construction cost actuals (Module 3 POs) roll up to Job and Unit totals, which inform the Owner's View in Module 2
5. All financial transactions across modules feed to the Accounting module for entity-level reporting, investor distributions, and loan tracking
6. Contacts are global — assigned to specific roles on any Opportunity, Project, Job, or Entity
7. Calendar events aggregate from all modules into Company and Personal calendar views
8. SharePoint folder structures are created automatically and linked throughout

---

# APPENDIX: INSURANCE CERTIFICATE TRACKING (Shared Service)

Insurance tracking appears in multiple contexts (sub insurance in Module 3, builder's risk in Module 2/3, entity insurance in Module 4). Built as a shared service:

**Insurance Certificate Record:** Linkable to any Vendor, Entity, Project, or Job.
Fields: policy type (GL, Workers' Comp, Auto, Builder's Risk, Umbrella, E&O, D&O), carrier, policy number, effective date, expiration date, coverage limits, additional insured requirements, certificate document, alert threshold (default 30 days before expiration).

---

# APPENDIX: CLIENT MANAGEMENT (Third-Party)

Since Red Cedar builds for true third-party clients through Module 3, a Client record type exists distinct from the Entity hierarchy in Module 4.

**Client Record:** Company/individual name, contact info, billing address, payment terms, insurance requirements (do they provide builder's risk or does Red Cedar?), contract template preferences, all linked Jobs.

Third-party Jobs follow the same construction workflow as internal Jobs. Key differences: client is external (not linked to Module 4), billing per contract terms (typically monthly progress billing), AR tracked in Module 3.12 construction accounting, Red Cedar retains full P&L visibility without intercompany complexity.
