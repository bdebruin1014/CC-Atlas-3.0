"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

import { cn } from "@/lib/utils/format"

const SEGMENT_LABELS: Record<string, string> = {
  opportunities: "Opportunities",
  projects: "Projects",
  construction: "Construction",
  accounting: "Accounting",
  contacts: "Contacts",
  calendar: "Calendar",
  admin: "Admin",
  new: "New",
  edit: "Edit",
  settings: "Settings",
  invoices: "Invoices",
  "draw-requests": "Draw Requests",
  budgets: "Budgets",
  jobs: "Jobs",
  units: "Units",
  tasks: "Tasks",
  documents: "Documents",
  reports: "Reports",
  teams: "Teams",
  users: "Users",
  entities: "Entities",
  vendors: "Vendors",
  "change-orders": "Change Orders",
  profile: "Profile",
}

function formatSegment(segment: string): string {
  if (SEGMENT_LABELS[segment]) {
    return SEGMENT_LABELS[segment]
  }

  // If it looks like a UUID, show a truncated version
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(segment)) {
    return `${segment.slice(0, 8)}...`
  }

  // Convert kebab-case/snake_case to Title Case
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbsProps {
  /** Optional override items. If not provided, breadcrumbs are auto-generated from the pathname. */
  items?: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname()

  const breadcrumbs: BreadcrumbItem[] = React.useMemo(() => {
    if (items) return items

    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) {
      return [{ label: "Dashboard", href: "/" }]
    }

    const crumbs: BreadcrumbItem[] = [{ label: "Dashboard", href: "/" }]

    segments.forEach((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/")
      crumbs.push({
        label: formatSegment(segment),
        href,
      })
    })

    return crumbs
  }, [pathname, items])

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1
          const isFirst = index === 0

          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
              {isLast ? (
                <span className="font-medium text-foreground">
                  {isFirst && (
                    <Home className="mr-1 inline-block h-3.5 w-3.5" />
                  )}
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {isFirst && (
                    <Home className="mr-1 inline-block h-3.5 w-3.5" />
                  )}
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
