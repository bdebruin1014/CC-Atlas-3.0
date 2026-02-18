"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  Search,
  LogOut,
  Settings,
  User,
  ChevronDown,
  CheckSquare,
  Calendar,
  BarChart3,
  Shield,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils/format"
import { useUIStore } from "@/lib/stores/ui-store"
import { createClient } from "@/lib/supabase/client"
import { EntitySelector } from "@/components/layout/entity-selector"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Primary tabs — always visible in the top bar
const PRIMARY_TABS = [
  { label: "Opportunities", href: "/opportunities" },
  { label: "Projects", href: "/projects" },
  { label: "Construction", href: "/construction" },
  { label: "Disposition", href: "/disposition" },
  { label: "Accounting", href: "/accounting" },
] as const

// Secondary modules — housed in the "More" dropdown
const MORE_TABS = [
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Admin", href: "/admin", icon: Shield },
] as const

interface TopNavProps {
  user?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    avatar_url: string | null
    organization_id?: string | null
  } | null
}

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { notificationCount, setSearchOpen } = useUIStore()
  const supabase = createClient()

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

  return (
    <header
      className="flex h-12 shrink-0 items-center bg-[var(--nav-bg)] px-4"
      style={{ minHeight: 48, maxHeight: 48 }}
    >
      {/* Left: ATLAS wordmark */}
      <Link href="/" className="mr-4 flex items-center">
        <span className="text-base font-bold tracking-widest text-white">
          ATLAS
        </span>
      </Link>

      {/* Entity selector */}
      <div className="mr-3 hidden sm:block">
        <EntitySelector />
      </div>

      {/* Center: Module tabs */}
      <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
        {PRIMARY_TABS.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className={cn(
                "relative flex items-center px-3 py-1.5 text-[14px] font-medium text-white/80 transition-colors hover:bg-white/10 rounded",
                isActive && "text-white"
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-1 right-1 h-[3px] rounded-t bg-primary" />
              )}
            </Link>
          )
        })}

        {/* More dropdown for secondary modules */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "relative flex items-center gap-1 px-3 py-1.5 text-[14px] font-medium text-white/80 transition-colors hover:bg-white/10 rounded",
                MORE_TABS.some(
                  (t) =>
                    pathname === t.href || pathname.startsWith(`${t.href}/`)
                ) && "text-white"
              )}
            >
              More
              <ChevronDown className="h-3.5 w-3.5" />
              {MORE_TABS.some(
                (t) =>
                  pathname === t.href || pathname.startsWith(`${t.href}/`)
              ) && (
                <span className="absolute bottom-0 left-1 right-1 h-[3px] rounded-t bg-primary" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {MORE_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive =
                pathname === tab.href || pathname.startsWith(`${tab.href}/`)
              return (
                <DropdownMenuItem key={tab.href} asChild className="cursor-pointer">
                  <Link
                    href={tab.href}
                    prefetch={true}
                    className={cn(isActive && "font-medium")}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* Right: Search, Notifications, User */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 rounded border border-white/20 bg-white/10 px-3 py-1 text-[13px] text-white/70 transition-colors hover:bg-white/15"
          style={{ width: 200 }}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-auto text-[10px] text-white/40">⌘K</kbd>
        </button>

        {/* Mobile search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex md:hidden items-center justify-center rounded p-1.5 text-white/80 hover:bg-white/10"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <Link
          href="/admin/notifications"
          className="relative flex items-center justify-center rounded p-1.5 text-white/80 hover:bg-white/10"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </Link>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center rounded-full p-0.5 hover:ring-2 hover:ring-white/20">
              <Avatar className="h-7 w-7">
                <AvatarImage
                  src={user?.avatar_url || undefined}
                  alt={displayName}
                />
                <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/admin/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
