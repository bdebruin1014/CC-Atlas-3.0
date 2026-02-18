"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  CreditCard,
  Lock,
  Settings,
  GitBranch,
  FileText,
  Map,
  Landmark,
  HardHat,
  CalendarDays,
  Package,
  PieChart,
  Search,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Admin cards config (12 items per spec)
// ---------------------------------------------------------------------------

interface AdminCard {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

const ADMIN_CARDS: AdminCard[] = [
  {
    title: "Organization",
    description: "Manage company profile, users, teams, and roles",
    href: "/admin/organization",
    icon: Building2,
  },
  {
    title: "Billing",
    description: "View invoices, manage subscription, and payment methods",
    href: "/admin/billing",
    icon: CreditCard,
  },
  {
    title: "Security",
    description: "Configure authentication, SSO, and security policies",
    href: "/admin/security",
    icon: Lock,
  },
  {
    title: "Preferences",
    description: "Set timezone, date format, fiscal year, and display defaults",
    href: "/admin/preferences",
    icon: Settings,
  },
  {
    title: "Workflows",
    description: "Design milestone and task workflow templates for all modules",
    href: "/admin/workflow-templates",
    icon: GitBranch,
  },
  {
    title: "Documents",
    description: "Manage contract templates, folder structures, and merge fields",
    href: "/admin/documents",
    icon: FileText,
  },
  {
    title: "Floor Plans",
    description: "Manage home floor plans with pricing, specs, and packages",
    href: "/admin/floor-plans",
    icon: Map,
  },
  {
    title: "Municipalities",
    description: "Configure permit fees, tap fees, and jurisdiction-specific costs",
    href: "/admin/municipalities",
    icon: Landmark,
  },
  {
    title: "Trade Categories",
    description: "Define trade categories with cost ranges and default vendors",
    href: "/admin/trade-categories",
    icon: HardHat,
  },
  {
    title: "Schedule Templates",
    description: "Configure construction phase schedules by floor plan",
    href: "/admin/schedule-templates",
    icon: CalendarDays,
  },
  {
    title: "Integrations",
    description: "Configure SharePoint, Outlook, DocuSeal, and other connections",
    href: "/admin/integrations",
    icon: Package,
  },
  {
    title: "Reports",
    description: "Manage report templates, scheduled reports, and export settings",
    href: "/admin/reports",
    icon: PieChart,
  },
]

// ---------------------------------------------------------------------------
// Admin Dashboard
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")

  // Fetch current user name for greeting
  const supabase = createClient()
  const { data: currentUser } = useQuery({
    queryKey: ["admin", "current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single()
      return data
    },
  })

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 17) return "Good Afternoon"
    return "Good Evening"
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return ADMIN_CARDS
    const q = search.toLowerCase()
    return ADMIN_CARDS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="space-y-6 p-6">
      {/* Greeting */}
      <div>
        <h1
          className="text-[24px] font-bold tracking-tight"
          style={{ color: "#1a5632" }}
        >
          {greeting}
          {currentUser?.first_name ? `, ${currentUser.first_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure platform settings, templates, and integrations.
        </p>
      </div>

      {/* Heading + Search */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1F2937]">
          What Would You Like to Do?
        </h2>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admin settings..."
            className="h-9 border-[#E5E7EB] pl-9 focus:ring-[#1a5632]"
          />
        </div>
      </div>

      {/* 3-column card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.href}
              type="button"
              onClick={() => router.push(card.href)}
              className="group flex items-start gap-4 rounded-[6px] border border-[#E5E7EB] bg-white p-6 text-left transition-colors hover:bg-[#f9fafb]"
              style={{ boxShadow: "none" }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1a5632]/10">
                <Icon className="h-5 w-5 text-[#1a5632]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1F2937]">
                    {card.title}
                  </h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
                  {card.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Empty state for search */}
      {filtered.length === 0 && (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          No settings found matching &quot;{search}&quot;
        </div>
      )}
    </div>
  )
}
