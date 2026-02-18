"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Info,
  MapPin,
  Users,
  Calculator,
  BarChart3,
  GitBranch,
  CheckSquare,
  FileText,
  StickyNote,
  Activity,
  Briefcase,
  ShieldCheck,
  Landmark,
  DollarSign,
  TrendingUp,
  Home,
  Building2,
  HardHat,
  Layers,
  CalendarDays,
  Package,
  ClipboardList,
  Eye,
  Camera,
  BookOpen,
  Wrench,
  Truck,
  Megaphone,
  Handshake,
  Gavel,
  Scale,
  Receipt,
  PieChart,
  CreditCard,
  Settings,
  Lock,
  Workflow,
  Map,
  LayoutGrid,
  ListChecks,
  Filter,
  Calendar,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarLink {
  label: string
  href: string
  icon: LucideIcon
  children?: SidebarLink[]
  count?: number
}

interface SidebarSection {
  title?: string
  links: SidebarLink[]
}

interface SidebarConfig {
  header?: {
    title: string
    subtitle?: string
    badge?: string
  }
  sections: SidebarSection[]
}

// ---------------------------------------------------------------------------
// Module sidebar configurations
// ---------------------------------------------------------------------------

function getOpportunitiesDetailSidebar(id: string): SidebarConfig {
  const base = `/opportunities/${id}`
  return {
    header: { title: "Opportunity", badge: "OPP" },
    sections: [
      {
        title: "OVERVIEW",
        links: [
          { label: "Basic Info", href: base, icon: Info },
          { label: "Property Details", href: `${base}/property`, icon: MapPin },
          { label: "Contacts", href: `${base}/contacts`, icon: Users },
        ],
      },
      {
        title: "ANALYSIS",
        links: [
          { label: "Deal Analyzer", href: `${base}/deal-analyzer`, icon: Calculator },
          { label: "Comps", href: `${base}/comps`, icon: BarChart3 },
        ],
      },
      {
        title: "PIPELINE",
        links: [
          { label: "Workflow", href: `${base}/workflow`, icon: GitBranch },
          { label: "Tasks", href: `${base}/tasks`, icon: CheckSquare },
        ],
      },
      {
        links: [
          { label: "Documents", href: `${base}/documents`, icon: FileText },
          { label: "Notes", href: `${base}/notes`, icon: StickyNote },
          { label: "Activity", href: `${base}/activity`, icon: Activity },
        ],
      },
    ],
  }
}

function getProjectsDetailSidebar(id: string): SidebarConfig {
  const base = `/projects/${id}`
  return {
    header: { title: "Project", badge: "PRJ" },
    sections: [
      {
        title: "OVERVIEW",
        links: [
          { label: "Basic Info", href: base, icon: Info },
          { label: "Property Details", href: `${base}/property`, icon: MapPin },
          { label: "Contacts", href: `${base}/contacts`, icon: Users },
        ],
      },
      {
        title: "ACQUISITION",
        links: [
          { label: "Contract", href: `${base}/contract`, icon: Briefcase },
          { label: "Due Diligence", href: `${base}/due-diligence`, icon: ShieldCheck },
        ],
      },
      {
        title: "CONSTRUCTION",
        links: [
          { label: "Budget", href: `${base}/budgets`, icon: Calculator },
          { label: "Workflow", href: `${base}/workflows`, icon: GitBranch },
          { label: "GC Draw Requests", href: `${base}/draw-requests`, icon: Receipt },
        ],
      },
      {
        title: "FINANCE",
        links: [
          { label: "Project P&L", href: `${base}/pnl`, icon: TrendingUp },
          { label: "Cash Flow", href: `${base}/cash-flow`, icon: DollarSign },
          { label: "Loan Tracking", href: `${base}/loans`, icon: Landmark },
          { label: "Investor Returns", href: `${base}/investors`, icon: PieChart },
        ],
      },
      {
        title: "DISPOSITION",
        links: [
          { label: "Sales Summary", href: `${base}/sales`, icon: Home },
        ],
      },
      {
        links: [
          { label: "Tasks", href: `${base}/tasks`, icon: CheckSquare },
          { label: "Documents", href: `${base}/documents`, icon: FileText },
          { label: "Notes", href: `${base}/notes`, icon: StickyNote },
          { label: "Activity", href: `${base}/activity`, icon: Activity },
        ],
      },
    ],
  }
}

function getConstructionDetailSidebar(id: string): SidebarConfig {
  const base = `/construction/jobs/${id}`
  return {
    header: { title: "Job", badge: "CON" },
    sections: [
      {
        links: [
          { label: "Dashboard", href: base, icon: LayoutGrid },
          { label: "Units", href: `${base}/units`, icon: Layers },
          { label: "Schedule", href: `${base}/schedule`, icon: CalendarDays },
          { label: "Budget", href: `${base}/budget`, icon: Calculator },
          { label: "Permitting", href: `${base}/permitting`, icon: ShieldCheck },
          { label: "Purchase Orders", href: `${base}/pos`, icon: Package },
          { label: "Change Orders", href: `${base}/change-orders`, icon: ClipboardList },
          { label: "Inspections", href: `${base}/inspections`, icon: Eye },
          { label: "Selections", href: `${base}/selections`, icon: ListChecks },
          { label: "Draw Requests", href: `${base}/draw-requests`, icon: Receipt },
          { label: "Photos", href: `${base}/photos`, icon: Camera },
          { label: "Daily Logs", href: `${base}/daily-logs`, icon: BookOpen },
          { label: "Punch List", href: `${base}/punch-list`, icon: CheckSquare },
          { label: "Warranty", href: `${base}/warranty`, icon: Wrench },
          { label: "Vendors", href: `${base}/vendors`, icon: Truck },
        ],
      },
      {
        links: [
          { label: "Tasks", href: `${base}/tasks`, icon: CheckSquare },
          { label: "Documents", href: `${base}/documents`, icon: FileText },
        ],
      },
    ],
  }
}

function getDispositionDetailSidebar(id: string): SidebarConfig {
  const base = `/disposition/${id}`
  return {
    header: { title: "Listing", badge: "DSP" },
    sections: [
      {
        title: "LISTING",
        links: [
          { label: "Overview", href: base, icon: Info },
          { label: "Workflow", href: `${base}/workflow`, icon: GitBranch },
          { label: "Marketing", href: `${base}/marketing`, icon: Megaphone },
          { label: "Showings", href: `${base}/showings`, icon: Eye },
        ],
      },
      {
        title: "SALES",
        links: [
          { label: "Offers", href: `${base}/offers`, icon: Handshake },
          { label: "Contract & Closing", href: `${base}/contract`, icon: Gavel },
          { label: "Settlement", href: `${base}/settlement`, icon: Scale },
          { label: "Costs", href: `${base}/costs`, icon: DollarSign },
        ],
      },
      {
        links: [
          { label: "Tasks", href: `${base}/tasks`, icon: CheckSquare },
          { label: "Documents", href: `${base}/documents`, icon: FileText },
          { label: "Notes", href: `${base}/notes`, icon: StickyNote },
          { label: "Activity", href: `${base}/activity`, icon: Activity },
        ],
      },
    ],
  }
}

function getAccountingSidebar(): SidebarConfig {
  return {
    header: { title: "Accounting", badge: "ACC" },
    sections: [
      {
        links: [
          { label: "Register", href: "/accounting", icon: BookOpen },
          { label: "Banking", href: "/accounting/banking", icon: Landmark },
          {
            label: "Reconciliations",
            href: "/accounting/reconciliations",
            icon: CheckSquare,
            children: [
              { label: "Bank Recs", href: "/accounting/reconciliations/bank", icon: Landmark },
              { label: "Credit Card", href: "/accounting/reconciliations/cc", icon: CreditCard },
            ],
          },
          { label: "AP", href: "/accounting/ap", icon: Receipt },
          { label: "AR", href: "/accounting/ar", icon: DollarSign },
          { label: "Reports", href: "/accounting/reports/consolidated", icon: PieChart },
          { label: "Investors", href: "/accounting/investors", icon: Users },
          { label: "Loans", href: "/accounting/loans", icon: Landmark },
        ],
      },
    ],
  }
}

function getContactsSidebar(): SidebarConfig {
  return {
    header: { title: "Contacts", badge: "CON" },
    sections: [
      {
        links: [
          {
            label: "Companies",
            href: "/contacts",
            icon: Building2,
            children: [
              { label: "Closing", href: "/contacts?filter=closing", icon: Gavel },
              { label: "Services", href: "/contacts?filter=services", icon: Wrench },
              { label: "Government", href: "/contacts?filter=government", icon: Landmark },
              { label: "Other", href: "/contacts?filter=other", icon: Building2 },
            ],
          },
          { label: "Employees", href: "/contacts/employees", icon: Users },
          { label: "Vendors", href: "/contacts/vendors", icon: Truck },
        ],
      },
    ],
  }
}

function getAdminSidebar(): SidebarConfig {
  return {
    header: { title: "Admin", badge: "ADM" },
    sections: [
      {
        links: [
          { label: "Overview", href: "/admin", icon: LayoutGrid },
          {
            label: "Organization",
            href: "/admin/organization",
            icon: Building2,
            children: [
              { label: "Users", href: "/admin/users", icon: Users },
              { label: "Permission Groups", href: "/admin/permissions", icon: Lock },
              { label: "Teams", href: "/admin/teams", icon: Users },
              { label: "Roles", href: "/admin/roles", icon: ShieldCheck },
            ],
          },
          { label: "Billing", href: "/admin/billing", icon: CreditCard },
          { label: "Security", href: "/admin/security", icon: Lock },
          { label: "Preferences", href: "/admin/preferences", icon: Settings },
          {
            label: "Workflows",
            href: "/admin/workflow-templates",
            icon: Workflow,
            children: [
              { label: "Templates", href: "/admin/workflow-templates", icon: GitBranch },
              { label: "Automations", href: "/admin/automations", icon: Workflow },
            ],
          },
          { label: "Documents", href: "/admin/documents", icon: FileText },
          { label: "Floor Plans", href: "/admin/floor-plans", icon: Map },
          { label: "Municipalities", href: "/admin/municipalities", icon: Landmark },
          { label: "Trade Categories", href: "/admin/trade-categories", icon: HardHat },
          { label: "Integrations", href: "/admin/integrations", icon: Package },
          { label: "Reports", href: "/admin/reports", icon: PieChart },
        ],
      },
    ],
  }
}

function getCalendarSidebar(): SidebarConfig {
  return {
    header: { title: "Calendar", badge: "CAL" },
    sections: [
      {
        links: [
          { label: "My Calendar", href: "/calendar", icon: Calendar },
          { label: "Company Calendar", href: "/calendar/company", icon: CalendarDays },
        ],
      },
    ],
  }
}

function getTasksSidebar(): SidebarConfig {
  return {
    header: { title: "Tasks", badge: "TSK" },
    sections: [
      {
        links: [
          { label: "My Tasks", href: "/tasks", icon: CheckSquare },
          { label: "All Tasks", href: "/tasks/all", icon: ListChecks },
          { label: "Overdue", href: "/tasks/overdue", icon: Activity },
        ],
      },
      {
        title: "FILTERS",
        links: [
          { label: "By Project", href: "/tasks?group=project", icon: Filter },
          { label: "By Assignee", href: "/tasks?group=assignee", icon: Users },
        ],
      },
    ],
  }
}

// Module index sidebars (simplified)
function getOpportunitiesIndexSidebar(): SidebarConfig {
  return {
    header: { title: "Opportunities" },
    sections: [
      {
        links: [
          { label: "All Opportunities", href: "/opportunities", icon: TrendingUp },
          { label: "Pipeline", href: "/opportunities/pipeline", icon: GitBranch },
          { label: "Deal Analyzer", href: "/opportunities/deal-analyzer", icon: Calculator },
        ],
      },
    ],
  }
}

function getProjectsIndexSidebar(): SidebarConfig {
  return {
    header: { title: "Projects" },
    sections: [
      {
        links: [
          { label: "All Projects", href: "/projects", icon: Briefcase },
          { label: "Active", href: "/projects?status=active", icon: Activity },
          { label: "Completed", href: "/projects?status=completed", icon: CheckSquare },
        ],
      },
    ],
  }
}

function getConstructionIndexSidebar(): SidebarConfig {
  return {
    header: { title: "Construction" },
    sections: [
      {
        links: [
          { label: "All Jobs", href: "/construction", icon: HardHat },
          { label: "Invoices", href: "/construction/invoices", icon: FileText },
          { label: "Payments", href: "/construction/payments", icon: CreditCard },
          { label: "AR / Draws", href: "/construction/ar", icon: Receipt },
          { label: "Job Cost", href: "/construction/job-cost", icon: BarChart3 },
          { label: "Vendors", href: "/construction/vendors", icon: Truck },
          { label: "Warranty", href: "/construction/warranty", icon: Wrench },
        ],
      },
    ],
  }
}

function getDispositionIndexSidebar(): SidebarConfig {
  return {
    header: { title: "Disposition" },
    sections: [
      {
        links: [
          { label: "All Listings", href: "/disposition", icon: Home },
          { label: "Active Listings", href: "/disposition?status=active", icon: Activity },
          { label: "Under Contract", href: "/disposition?status=under_contract", icon: Handshake },
          { label: "Closings", href: "/disposition?status=pending_closing", icon: Gavel },
        ],
      },
      {
        title: "REPORTS",
        links: [
          { label: "Community Reports", href: "/disposition?view=community", icon: Building2 },
          { label: "Bulk Sales", href: "/disposition?view=bulk_sales", icon: Layers },
          { label: "Price Changes", href: "/disposition?view=price_changes", icon: TrendingUp },
          { label: "Reports", href: "/disposition?view=reports", icon: BarChart3 },
        ],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Resolve sidebar config from pathname
// ---------------------------------------------------------------------------

function resolveSidebarConfig(pathname: string): SidebarConfig | null {
  // Opportunities detail: /opportunities/[uuid]
  const oppMatch = pathname.match(/^\/opportunities\/([^/]+)/)
  if (oppMatch && oppMatch[1] !== "pipeline" && oppMatch[1] !== "deal-analyzer") {
    return getOpportunitiesDetailSidebar(oppMatch[1])
  }
  if (pathname.startsWith("/opportunities")) {
    return getOpportunitiesIndexSidebar()
  }

  // Projects detail: /projects/[uuid]
  const projMatch = pathname.match(/^\/projects\/([^/]+)/)
  if (projMatch && projMatch[1] !== "new") {
    return getProjectsDetailSidebar(projMatch[1])
  }
  if (pathname.startsWith("/projects")) {
    return getProjectsIndexSidebar()
  }

  // Construction detail: /construction/jobs/[uuid]
  const conMatch = pathname.match(/^\/construction\/jobs\/([^/]+)/)
  if (conMatch) {
    return getConstructionDetailSidebar(conMatch[1])
  }
  if (pathname.startsWith("/construction")) {
    return getConstructionIndexSidebar()
  }

  // Disposition detail: /disposition/[uuid]
  const dspMatch = pathname.match(/^\/disposition\/([^/]+)/)
  if (dspMatch) {
    return getDispositionDetailSidebar(dspMatch[1])
  }
  if (pathname.startsWith("/disposition")) {
    return getDispositionIndexSidebar()
  }

  if (pathname.startsWith("/accounting")) return getAccountingSidebar()
  if (pathname.startsWith("/contacts")) return getContactsSidebar()
  if (pathname.startsWith("/admin")) return getAdminSidebar()
  if (pathname.startsWith("/calendar")) return getCalendarSidebar()
  if (pathname.startsWith("/tasks")) return getTasksSidebar()

  return null
}

// ---------------------------------------------------------------------------
// Sidebar link component
// ---------------------------------------------------------------------------

function SidebarLinkItem({
  link,
  pathname,
  depth = 0,
}: {
  link: SidebarLink
  pathname: string
  depth?: number
}) {
  const [expanded, setExpanded] = React.useState(() => {
    if (!link.children) return false
    return link.children.some(
      (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
    )
  })

  const isActive =
    pathname === link.href ||
    (pathname.startsWith(`${link.href}/`) && !link.children)
  const hasChildren = !!link.children?.length
  const Icon = link.icon

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex w-full items-center gap-2 rounded-r px-2 py-1.5 text-[13px] transition-colors",
            "hover:bg-[var(--sidebar-accent)]",
            isActive
              ? "border-l-2 border-[#1a5632] font-medium text-[#1a5632] bg-[#1a5632]/5"
              : "border-l-2 border-transparent text-[#1F2937]",
            depth > 0 && "pl-6"
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">{link.label}</span>
          {link.count !== undefined && (
            <Badge variant="secondary" className="ml-auto mr-1 h-5 px-1.5 text-[10px]">
              {link.count}
            </Badge>
          )}
          {expanded ? (
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
          )}
        </button>
        {expanded && (
          <div className="ml-3 border-l border-[var(--sidebar-border)] pl-1">
            {link.children!.map((child) => (
              <SidebarLinkItem
                key={child.href}
                link={child}
                pathname={pathname}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-2 rounded-r px-2 py-1.5 text-[13px] transition-colors",
        "hover:bg-[var(--sidebar-accent)]",
        isActive
          ? "border-l-2 border-[#1a5632] font-medium text-[#1a5632] bg-[#1a5632]/5"
          : "border-l-2 border-transparent text-[#1F2937]",
        depth > 0 && "pl-6"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{link.label}</span>
      {link.count !== undefined && (
        <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
          {link.count}
        </Badge>
      )}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Collapsible section component
// ---------------------------------------------------------------------------

function CollapsibleSection({
  section,
  pathname,
  isFirst,
}: {
  section: SidebarSection
  pathname: string
  isFirst: boolean
}) {
  // Check if any link in this section is active
  const hasActiveChild = section.links.some(
    (link) =>
      pathname === link.href ||
      (pathname.startsWith(`${link.href}/`) && !link.children) ||
      link.children?.some(
        (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
      )
  )

  const [expanded, setExpanded] = React.useState(true)

  // Sections without a title are always expanded (bottom utility links)
  if (!section.title) {
    return (
      <div className={cn(!isFirst && "mt-4")}>
        <div className="flex flex-col gap-0.5">
          {section.links.map((link) => (
            <SidebarLinkItem
              key={link.href}
              link={link}
              pathname={pathname}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(!isFirst && "mt-3")}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mb-1 flex w-full items-center gap-1 px-2 py-1 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-2.5 w-2.5 text-[#5A6B75]" />
        ) : (
          <ChevronRight className="h-2.5 w-2.5 text-[#5A6B75]" />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#5A6B75]">
          {section.title}
        </span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-0.5">
          {section.links.map((link) => (
            <SidebarLinkItem
              key={link.href}
              link={link}
              pathname={pathname}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ContextSidebar() {
  const pathname = usePathname()
  const config = resolveSidebarConfig(pathname)

  if (!config) {
    return null
  }

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]">
      {/* Header */}
      {config.header && (
        <div className="border-b border-[var(--sidebar-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1F2937] truncate">
              {config.header.title}
            </span>
            {config.header.badge && (
              <Badge
                variant="secondary"
                className="shrink-0 rounded-full px-2 py-0 text-[10px] font-medium"
              >
                {config.header.badge}
              </Badge>
            )}
          </div>
          {config.header.subtitle && (
            <p className="mt-0.5 text-xs text-[var(--sidebar-muted)] truncate">
              {config.header.subtitle}
            </p>
          )}
        </div>
      )}

      {/* Sections */}
      <ScrollArea className="flex-1">
        <nav className="px-3 py-2">
          {config.sections.map((section, sIdx) => (
            <CollapsibleSection
              key={sIdx}
              section={section}
              pathname={pathname}
              isFirst={sIdx === 0}
            />
          ))}
        </nav>
      </ScrollArea>
    </aside>
  )
}
