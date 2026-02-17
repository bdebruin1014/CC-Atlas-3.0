# ATLAS — Red Cedar Homes Operating Platform

**Version 3.0** | Operated under Olive Brynn, LLC

ATLAS is an end-to-end operating system for residential construction and development. It manages the full lifecycle — from deal sourcing through construction, disposition, and investor reporting — across scattered lot, lot development, community development, and lot purchase channels.

---

## Table of Contents

- [Overview](#overview)
- [Core Modules](#core-modules)
  - [Opportunities](#1-opportunities)
  - [Projects](#2-projects)
  - [Construction Management](#3-construction-management)
  - [Accounting](#4-accounting)
  - [Contacts](#5-contacts)
  - [Calendar](#6-calendar)
  - [Admin](#7-admin)
- [Data Flow](#data-flow)
- [Key Features](#key-features)
  - [Deal Analyzer](#deal-analyzer)
  - [Workflow Engine](#workflow-engine)
  - [16-Phase Construction Milestones](#16-phase-construction-milestones)
  - [Dual Budget View](#dual-budget-view)
  - [Floor Plan Library](#floor-plan-library)
- [Integrations](#integrations)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

ATLAS serves Red Cedar Homes' internal operations and its client relationships, including SPEs, investment funds, and third-party owners. The platform is organized into seven interconnected modules that cover every stage of residential development.

**What ATLAS manages:**

| Channel | Description |
|---------|-------------|
| Scattered Lot | Individual infill lot acquisition for vertical construction |
| Lot Development | Raw land acquisition and horizontal development to produce finished lots |
| Community Development | Full cycle: land acquisition + lot development + vertical construction |
| Lot Purchase | Buying finished lots from another developer for vertical construction |

**Who uses it:**

- Acquisition Managers and Site Analysts (deal sourcing, site analysis)
- Operations Coordinators and Directors (workflow execution, contract management)
- Superintendents and Project Managers (construction oversight)
- Owners/Principals (approvals, financial oversight, investor management)
- Sales/Market Analysts (comps, pricing, disposition)
- Accounting teams (entity financials, distributions, loan tracking)

---

## Core Modules

### 1. Opportunities

Deal pipeline from identification through closing.

- **Pipeline Views:** Filterable list view and Kanban board grouped by stage
- **Analytics Dashboard:** Pipeline value by stage, conversion rates, average days to close, monthly deal flow
- **Opportunity Types:** Scattered Lot, Lot Development, Community Development, Lot Purchase, Other — each with configurable default stages
- **Deal Analyzer:** Built-in calculation engine producing GO/MARGINAL/NO-GO verdicts (see [Deal Analyzer](#deal-analyzer))
- **Detailed Workflows:** Multi-milestone workflows with task lists covering pre-offer analysis, contract negotiation, due diligence, financing, and closing (see specification for full task breakdowns)
- **Comps Tracking:** Up to 15 comparable sales per deal with auto-calculated averages

### 2. Projects

Owner/developer-level tracking from contract through disposition.

- **Project Types:** Scattered Lot, Lot Development, Community Development, Lot Purchase
- **Lifecycle:** Pre-Construction → Active → Construction → Punch/CO → Disposition → Complete → Closed
- **Budget & Actuals:** Real-time budget tracking with variance analysis, cost category breakdowns, and projected final cost
- **Builder Contract Tracking:** Contract type, fee structure, payment terms (5-draw schedule: 20/20/25/25/10), change order procedures, warranty terms
- **Type-Specific Tracking:** Lot dimensions, zoning, floor plan assignments, phase breakdowns, lot inventory management
- **Expense Entry:** Direct expense input tagged to project and entity, flowing to the Accounting module for processing

### 3. Construction Management

Red Cedar's General Contractor operating system — the core of daily operations.

- **Jobs & Units:** Jobs represent overall engagements; Units represent individual homes within a Job
- **16-Phase Milestones:** Pre-Construction through Close-Out with planned/actual dates, inspections, and dependencies (see [milestone details](#16-phase-construction-milestones))
- **Purchase Orders:** PO per Unit per trade category (~50+ trade categories) with full lifecycle tracking (Draft → Issued → Work Complete → Invoiced → Approved → Scheduled → Paid)
- **Change Orders:** Markup rules per construction agreement (owner-initiated: +30%, site conditions: +10%, contingency-funded: no markup)
- **Design Center / Selections:** Upgrade packages (Standard, Classic, Elegance, Harmony) with per-category tracking and PDF selection sheet generation
- **Inspections:** Tied to milestones with gate logic — cannot advance without passing required inspections
- **Permit Tracking:** Per Unit or Job with full lifecycle and expiration monitoring
- **Warranty Management:** 1-year workmanship, 2-year systems, 5-year structural with claim tracking and resolution workflow
- **Issue Tracking:** Safety hazards, quality deficiencies, schedule impacts, and more with severity levels and cost impact tracking
- **Construction Accounting:** AP/AR, vendor management with performance scoring, job costing (budget vs. committed vs. actual), retainage tracking, 1099 tracking
- **Schedule:** Unit-level milestone tracking, Job-level Gantt visualization, velocity metrics, critical path identification

### 4. Accounting

Multi-entity financial management for Olive Brynn LLC, all SPEs, and investment funds.

- **Entity Hierarchy:** Parent-child relationships (Olive Brynn → Red Cedar SC/NC → SPEs/Funds), each with its own chart of accounts
- **Chart of Accounts:** Templated per entity use type (Assets 1000–1999, Liabilities 2000–2999, Equity 3000–3999, Revenue 4000–4999, Cost of Sales 5000–5999, Operating Expenses 6000–6999)
- **Investor Tracking:** Ownership %, capital commitment, preferred return, promote/carry structure, accreditation status
- **Capital Calls:** Create → issue notice → track responses → follow up
- **Waterfall Distributions:** Simple Preferred Return + Promote, Straight Split, Multi-Tier IRR — with auditable per-investor calculations
- **Transaction Ledger:** Journal entries, bill payments, deposits, transfers, draws, distributions, capital contributions
- **Financial Reporting:** Balance Sheet, Income Statement, Cash Flow, Trial Balance per entity; consolidated views with intercompany eliminations; project-level P&L; investor capital account statements
- **Loan & Debt Tracking:** Draw tracking tied to construction, interest accrual with monthly journal entries, maturity alerts at 90/60/30 days
- **Akaunting Sync:** One-way sync of approved transactions to Akaunting

### 5. Contacts

Global contacts directory shared across all modules.

- **20+ Contact Types:** Owner/Principal, Investor, Attorney/Legal, Lender, Surveyor, Engineer, Architect, Subcontractor/Vendor, Municipality Contact, Buyer, Seller, and more
- **Role-Based Assignment:** Same contact can serve different roles on different records (e.g., "Closing Attorney" on Project A, "Lender" on Project B)
- **Cross-Module Linking:** Contact detail page shows all linked Opportunities, Projects, Jobs, and Entities
- **Quick-Add:** Create contacts from any module without leaving the current context

### 6. Calendar

Company-wide and personal calendar with cross-module event aggregation.

- **Company Calendar:** Milestone due dates, inspection dates, closings, recurring meetings (Land Committee Wednesdays, Handoff Mondays), permit expirations, insurance certificate expirations, loan maturity dates
- **Personal Calendar:** User-specific tasks and key dates for assigned projects
- **Outlook Sync:** Bidirectional calendar synchronization with Microsoft Outlook

### 7. Admin

Configuration, permissions, integrations, and master data management.

- **Floor Plan Library:** 18 SFH plans and 16 TH plans with full specifications and pricing (see [Floor Plan Library](#floor-plan-library))
- **Municipality/Jurisdiction Table:** 15 SC jurisdictions and 18+ NC counties with tap fees, permit fees, impact fees, and system development fees
- **Workflow Templates:** Master templates for all opportunity and project types
- **Cost Code Library, Budget Packages, Schedule Templates:** Standardized construction cost management
- **Contract Assembly:** Template library with merge fields, versioning, and PDF output
- **Permission System:** Role-based (Global Admin, Module Admin, Team Member, Read-Only) with module-level, record-level, and action-level controls
- **Teams:** Named groups with cross-module record access

---

## Data Flow

```
Opportunities (deal pipeline)
    → CONVERTS TO →
Projects (owner/developer tracking)
    → LAUNCHES →
Construction Management Jobs (Red Cedar GC operations)
    → FEEDS →
Accounting (entity financials, investor reporting)
```

**Key connections:**

1. **Opportunity → Project:** Carries forward all underwriting data, contacts, documents, and entity assignment
2. **Project → Job:** Launched when construction contracts are executed
3. **Job → Project:** Red Cedar's draw requests update Project budget actuals (Owner's View)
4. **Job → Accounting:** Construction cost actuals feed entity-level reporting, lender draw records, and investor distributions
5. **Contacts** are global — assigned to specific roles on any record across modules
6. **Calendar** aggregates events from all modules into Company and Personal views
7. **SharePoint** folder structures are auto-created and linked throughout

---

## Key Features

### Deal Analyzer

A built-in calculation engine on every Opportunity that pulls from Admin-managed data and produces a financial verdict.

**Data sources:** Floor Plan Library (costs, specs), Municipality Soft Cost Table (tap fees, permits), Default Fees (builder fee, contingency, insurance), Financing Assumptions (LTC 85%, cost of capital 16%), Selling Costs (8.5% default)

**Outputs:**
- Cost summary (sticks & bricks, upgrades, lot prep, soft costs, builder fee, contingency)
- Fixed per-house costs (warranty reserve, builder's risk, closing costs, utilities)
- Total project cost and financing structure (loan amount, equity required, carry costs)
- Net profit ($) and net profit margin (%)

**Verdict thresholds (configurable):**
| Margin | Verdict |
|--------|---------|
| > 10% | STRONG DEAL (green) |
| 7–10% | GOOD DEAL (blue) |
| 5–7% | MARGINAL (yellow) |
| < 5% | NO GO / REWORK (red) |

### Workflow Engine

Unified workflow architecture across Opportunities, Projects, and Construction Management.

**Hierarchy:** Workflow → Milestones → Task Lists → Tasks

- Template-based: master templates in Admin, cloned per record
- Role-based assignment: tasks assigned to roles, mapped to users via team membership
- Relative due dates: "+N business days" from milestone activation
- Gate logic: milestone completion criteria must be met before advancing
- Override capability for authorized users

### 16-Phase Construction Milestones

Every Unit progresses through these phases with planned/actual dates, required inspections, and finish-to-start dependencies:

| Phase | Milestone | Std. Duration | Inspections |
|-------|-----------|---------------|-------------|
| 1 | Pre-Construction | 15 days | — |
| 2 | Site Work | 10 days | Erosion control |
| 3 | Foundation | 12 days | Footer/foundation |
| 4 | Framing | 14 days | Framing |
| 5 | Dry-In (Roof/Sheathing/WRB) | 7 days | — |
| 6 | MEP Rough-In: Plumbing | 5 days | Plumbing rough-in |
| 7 | MEP Rough-In: Electrical | 5 days | Electrical rough-in |
| 8 | MEP Rough-In: HVAC | 5 days | HVAC rough-in |
| 9 | Insulation | 3 days | Insulation |
| 10 | Drywall | 10 days | — |
| 11 | Trim & Interior Finish | 12 days | — |
| 12 | Paint | 5 days | — |
| 13 | Flooring | 5 days | — |
| 14 | Final MEP (Fixtures/Trim-Out) | 5 days | — |
| 15 | Punch List & Final Inspection | 7 days | Final building, CO |
| 16 | Close-Out | 5 days | — |

Post-CO warranty period tracked separately (1-year workmanship from CO date).

### Dual Budget View

For internal Jobs (Olive Brynn SPEs), two budget perspectives coexist:

- **Owner's View** (Module 2 — Projects): Shows the construction contract as a single line item within the total project budget. Includes land, soft costs, financing, and selling costs. Does NOT reveal subcontractor pricing.
- **Builder's View** (Module 3 — Construction): Shows detailed cost breakdown by trade/cost code. POs, change orders, and actuals live here. Does NOT show land cost, investor terms, or deal economics.

### Floor Plan Library

34 active plans (September 2025 pricing) across two categories:

**Single Family Homes (18 plans):** Ranging from the Tulip (1,170 SF, $105,821 S&B) to the Magnolia (2,771 SF, $178,184 S&B)

**Townhomes (16 plans):** Ranging from the Palmetto (1,304 SF, $110,043 S&B) to the Linville (2,188 SF, $160,613 S&B)

Each plan includes: heated/unheated SF, bed/bath/garage count, stories, minimum lot dimensions, base sticks & bricks cost (~40 trade-level line items), and upgrade costs per tier (Classic, Elegance, Harmony).

---

## Integrations

| Integration | Tier | Description |
|------------|------|-------------|
| **SharePoint** | Tier 1 (Required) | Automatic folder structure creation per project type, document upload sync, embedded document access. Configured via Azure AD credentials in Admin. |
| **Outlook** | Tier 1 | Email logging linked to contacts/records, calendar sync for task and milestone dates |
| **Microsoft Teams** | Tier 1 | Chat initiation from records, video call scheduling, Atlas alert push to Teams channels |
| **DocuSeal** | Planned | E-signature for construction agreements, POs, change orders, investor documents. Status tracking and auto-filing to SharePoint. |
| **Akaunting** | Active | One-way sync of approved transactions from Atlas Accounting. Account mapping configured in Admin. |
| **Plaid** | Future | Bank account connections for auto-importing transactions and reconciliation |

---

## Getting Started

### Prerequisites

This project is in the specification and early development phase. The complete platform specification is available in [`Atlas-Platform-Specification-v3.md`](./Atlas-Platform-Specification-v3.md).

### Repository Contents

```
CC-Atlas-3.0/
├── README.md                              # This file
└── Atlas-Platform-Specification-v3.md     # Complete platform specification (v3.0)
```

### Development Roadmap

The recommended build order follows module dependencies:

1. **Admin & Configuration** — Master data (floor plans, municipalities, cost codes, templates) that all other modules depend on
2. **Contacts** — Global directory used across every module
3. **Opportunities** — Deal pipeline with Deal Analyzer; first user-facing workflow
4. **Projects** — Owner/developer tracking; receives conversions from Opportunities
5. **Construction Management** — GC operating system; receives Jobs from Projects
6. **Accounting** — Entity financials; consumes data from all upstream modules
7. **Calendar** — Aggregates events from all modules
8. **Integrations** — SharePoint, Outlook, Teams, DocuSeal, Akaunting

---

## Configuration

### SharePoint Setup

SharePoint is a first-class integration. Configuration in Admin requires:

- SharePoint Tenant URL
- Client ID and Client Secret (Azure AD App Registration)
- Site/Library selection
- Folder template configuration per project type

### Deal Analyzer Defaults

Configurable in Admin > Organization Settings:

| Setting | Default Value |
|---------|--------------|
| LTC Ratio | 85% |
| Construction Period | 120 days |
| Cost of Capital Rate | 16% annual |
| Selling Costs | 8.5% of ASP |
| Contingency | Greater of $10,000 or 5% |
| Builder Fee | Greater of $25,000 or 10% |
| Strong Deal Threshold | > 10% margin |
| Good Deal Threshold | 7–10% margin |
| Marginal Threshold | 5–7% margin |
| No-Go Threshold | < 5% margin |

### Permissions

Four role levels with granular controls:

| Role | Access |
|------|--------|
| Global Admin | Full access to all modules and Admin |
| Module Admin | Full access within assigned module(s) |
| Team Member | Access to assigned records per team membership |
| Read-Only | View-only access to assigned records |

---

## Documentation

- **[Atlas Platform Specification v3.0](./Atlas-Platform-Specification-v3.md)** — Complete application specification covering all modules, workflows, data models, and integration requirements

---

## License

Proprietary. All rights reserved by Red Cedar Homes / Olive Brynn, LLC.
