"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  TrendingUp,
  FolderKanban,
  HardHat,
  Calculator,
  Users,
  CalendarDays,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Mountain,
  FileText,
  CreditCard,
  Receipt,
  BarChart3,
  Shield,
  Building2,
  BookOpen,
  Landmark,
  PieChart,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import { cn } from "@/lib/utils/format"
import { useUIStore } from "@/lib/stores/ui-store"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Opportunities",
    href: "/opportunities",
    icon: TrendingUp,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Construction",
    href: "/construction",
    icon: HardHat,
    children: [
      { label: "Invoices", href: "/construction/invoices", icon: FileText },
      { label: "Payments", href: "/construction/payments", icon: CreditCard },
      { label: "AR / Draws", href: "/construction/ar", icon: Receipt },
      { label: "Job Cost", href: "/construction/job-cost", icon: BarChart3 },
      { label: "Vendors", href: "/construction/vendors", icon: Users },
      { label: "Warranty", href: "/construction/warranty", icon: Shield },
    ],
  },
  {
    label: "Accounting",
    href: "/accounting",
    icon: Calculator,
    children: [
      { label: "Entities", href: "/accounting/entities", icon: Building2 },
      { label: "Loans", href: "/accounting/loans", icon: Landmark },
      { label: "Period Close", href: "/accounting/period-close", icon: BookOpen },
      { label: "Reports", href: "/accounting/reports/consolidated", icon: PieChart },
    ],
  },
  {
    label: "Contacts",
    href: "/contacts",
    icon: Users,
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    label: "Admin",
    href: "/admin",
    icon: Settings,
  },
]

interface SidebarProps {
  user?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    avatar_url: string | null
  } | null
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const supabase = createClient()
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())

  // Auto-expand parent when child is active
  React.useEffect(() => {
    const newExpanded = new Set(expandedItems)
    for (const item of NAV_ITEMS) {
      if (item.children && pathname.startsWith(item.href + "/")) {
        newExpanded.add(item.href)
      }
    }
    if (newExpanded.size !== expandedItems.size) {
      setExpandedItems(newExpanded)
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = user
    ? `${(user.first_name || "")[0] || ""}${(user.last_name || "")[0] || ""}`.toUpperCase() || "?"
    : "?"

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "User"
    : "User"

  const displayRole = user?.role
    ? user.role
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Team Member"

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {/* Logo / Brand */}
        <div
          className={cn(
            "flex h-16 items-center gap-3 border-b border-sidebar-border px-4",
            sidebarCollapsed && "justify-center px-0"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Mountain className="h-5 w-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight">ATLAS</span>
              <span className="text-xs text-muted-foreground">
                Red Cedar Homes
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="flex flex-col gap-1 px-2">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`)
              const hasChildren = !!item.children?.length
              const isExpanded = expandedItems.has(item.href)

              const linkContent = hasChildren && !sidebarCollapsed ? (
                <button
                  onClick={() => toggleExpanded(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70",
                    sidebarCollapsed && "justify-center px-0"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive && "text-primary"
                    )}
                  />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              )

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center rounded-lg px-0 py-2.5 text-sm font-medium transition-colors",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70"
                        )}
                      >
                        <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return (
                <React.Fragment key={item.href}>
                  {linkContent}
                  {hasChildren && isExpanded && !sidebarCollapsed && (
                    <div className="ml-4 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                      {item.children!.map((child) => {
                        const childActive =
                          pathname === child.href ||
                          pathname.startsWith(`${child.href}/`)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              childActive
                                ? "bg-sidebar-accent/60 text-sidebar-accent-foreground"
                                : "text-sidebar-foreground/60"
                            )}
                          >
                            <child.icon className={cn("h-4 w-4 shrink-0", childActive && "text-primary")} />
                            <span>{child.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="px-2 py-1">
          <Separator className="mb-2" />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "w-full justify-start gap-3",
              sidebarCollapsed && "justify-center px-0"
            )}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span className="text-xs text-muted-foreground">Collapse</span>
              </>
            )}
          </Button>
        </div>

        {/* User Profile */}
        <div
          className={cn(
            "border-t border-sidebar-border p-3",
            sidebarCollapsed && "flex justify-center p-2"
          )}
        >
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center rounded-lg p-1 transition-colors hover:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.avatar_url || undefined}
                      alt={displayName}
                    />
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <div className="flex flex-col">
                  <span className="font-medium">{displayName}</span>
                  <span className="text-xs opacity-70">{displayRole}</span>
                  <span className="mt-1 text-xs opacity-50">Click to logout</span>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={user?.avatar_url || undefined}
                  alt={displayName}
                />
                <AvatarFallback className="text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-medium">
                  {displayName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {displayRole}
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Logout</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
