"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Search, LogOut, Settings, User } from "lucide-react"

import { cn } from "@/lib/utils/format"
import { useUIStore } from "@/lib/stores/ui-store"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const MODULE_TABS = [
  { label: "Opportunities", href: "/opportunities" },
  { label: "Projects", href: "/projects" },
  { label: "Disposition", href: "/disposition" },
  { label: "Construction", href: "/construction" },
  { label: "Tasks", href: "/tasks" },
  { label: "Contacts", href: "/contacts" },
  { label: "Calendar", href: "/calendar" },
  { label: "Accounting", href: "/accounting" },
  { label: "Admin", href: "/admin" },
] as const

interface TopNavProps {
  user?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    avatar_url: string | null
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
      <Link href="/" className="mr-6 flex items-center">
        <span className="text-base font-bold tracking-widest text-white">
          ATLAS
        </span>
      </Link>

      {/* Center: Module tabs */}
      <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
        {MODULE_TABS.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex items-center px-3 py-1.5 text-[14px] font-medium text-white/80 transition-colors hover:bg-white/10 rounded",
                isActive && "text-white"
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-1 right-1 h-[3px] rounded-t bg-[#1a5632]" />
              )}
            </Link>
          )
        })}
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
        <button
          onClick={() => router.push("/admin/notifications")}
          className="relative flex items-center justify-center rounded p-1.5 text-white/80 hover:bg-white/10"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center rounded-full p-0.5 hover:ring-2 hover:ring-white/20">
              <Avatar className="h-7 w-7">
                <AvatarImage
                  src={user?.avatar_url || undefined}
                  alt={displayName}
                />
                <AvatarFallback className="bg-[#1a5632] text-[10px] text-white">
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
            <DropdownMenuItem
              onClick={() => router.push("/admin/profile")}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/admin/settings")}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
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
