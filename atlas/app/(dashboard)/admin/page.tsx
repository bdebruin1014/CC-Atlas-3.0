"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  MapPin,
  Wrench,
  Clock,
  GitBranch,
  FileText,
  Folder,
  Calculator,
  Plug,
  Users,
  Shield,
  Settings,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

interface AdminSection {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  countKey: string | null
}

const adminSections: AdminSection[] = [
  {
    title: "Floor Plan Library",
    description: "Manage home floor plans with pricing, specs, and upgrade packages",
    href: "/admin/floor-plans",
    icon: <Building2 className="h-6 w-6" />,
    countKey: "floor_plans",
  },
  {
    title: "Municipalities & Jurisdictions",
    description: "Configure permit fees, tap fees, and jurisdiction-specific costs",
    href: "/admin/municipalities",
    icon: <MapPin className="h-6 w-6" />,
    countKey: "municipalities",
  },
  {
    title: "Trade Categories",
    description: "Define trade categories with cost ranges and default vendors",
    href: "/admin/trade-categories",
    icon: <Wrench className="h-6 w-6" />,
    countKey: "trade_categories",
  },
  {
    title: "Schedule Templates",
    description: "Configure construction phase schedules by floor plan",
    href: "/admin/schedule-templates",
    icon: <Clock className="h-6 w-6" />,
    countKey: "schedule_templates",
  },
  {
    title: "Workflow Templates",
    description: "Design milestone and task workflows for opportunities and projects",
    href: "/admin/workflow-templates",
    icon: <GitBranch className="h-6 w-6" />,
    countKey: "workflow_templates",
  },
  {
    title: "Contract Templates",
    description: "Manage contract templates with merge fields and versioning",
    href: "/admin/contract-templates",
    icon: <FileText className="h-6 w-6" />,
    countKey: "contract_templates",
  },
  {
    title: "SharePoint Folders",
    description: "Configure default folder structures for project file management",
    href: "/admin/sharepoint-folders",
    icon: <Folder className="h-6 w-6" />,
    countKey: "sharepoint_folder_templates",
  },
  {
    title: "Deal Analyzer Config",
    description: "Set margin thresholds, financing defaults, and cost parameters",
    href: "/admin/deal-analyzer-config",
    icon: <Calculator className="h-6 w-6" />,
    countKey: null,
  },
  {
    title: "Integrations",
    description: "Configure SharePoint, Outlook, DocuSeal, and other integrations",
    href: "/admin/integrations",
    icon: <Plug className="h-6 w-6" />,
    countKey: "integration_settings",
  },
  {
    title: "Teams",
    description: "Manage teams and assign team members",
    href: "/admin/teams",
    icon: <Users className="h-6 w-6" />,
    countKey: "teams",
  },
  {
    title: "Permissions",
    description: "Configure module access permissions for each team",
    href: "/admin/permissions",
    icon: <Shield className="h-6 w-6" />,
    countKey: "module_access",
  },
  {
    title: "Organization Settings",
    description: "Manage organization name, timezone, fiscal year, and defaults",
    href: "/admin/deal-analyzer-config",
    icon: <Settings className="h-6 w-6" />,
    countKey: null,
  },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCounts() {
      try {
        const supabase = createClient()
        const tables = [
          "floor_plans",
          "municipalities",
          "trade_categories",
          "schedule_templates",
          "workflow_templates",
          "contract_templates",
          "sharepoint_folder_templates",
          "integration_settings",
          "teams",
          "module_access",
        ]

        const results = await Promise.allSettled(
          tables.map((table) =>
            supabase
              .from(table)
              .select("id", { count: "exact", head: true })
              .then((res) => ({
                table,
                count: res.count ?? 0,
              }))
          )
        )

        const newCounts: Record<string, number> = {}
        for (const result of results) {
          if (result.status === "fulfilled") {
            newCounts[result.value.table] = result.value.count
          }
        }
        setCounts(newCounts)
      } catch {
        // Counts are non-critical, fail silently
      } finally {
        setLoading(false)
      }
    }

    fetchCounts()
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-sm text-muted-foreground">
          Configure platform settings, templates, and integrations
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Card
            key={section.href}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
            onClick={() => router.push(section.href)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {section.icon}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold">{section.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {section.description}
                </p>
              </div>
              {section.countKey && (
                <div className="mt-3 pt-3 border-t">
                  {loading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {counts[section.countKey] ?? 0} item
                      {(counts[section.countKey] ?? 0) !== 1 ? "s" : ""} configured
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
