"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Lightbulb,
  FolderKanban,
  HardHat,
  Home,
  Building2,
  User,
  X,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { useOpenTabsStore, type OpenTab, type TabModule } from "@/lib/stores/open-tabs-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ---------------------------------------------------------------------------
// Module icon mapping
// ---------------------------------------------------------------------------

const MODULE_ICON_MAP: Record<TabModule, React.ComponentType<{ className?: string }>> = {
  opportunity: Lightbulb,
  project: FolderKanban,
  job: HardHat,
  listing: Home,
  entity: Building2,
  contact: User,
}

const MODULE_FALLBACK_ROUTES: Record<TabModule, string> = {
  opportunity: "/opportunities",
  project: "/projects",
  job: "/construction",
  listing: "/disposition",
  entity: "/accounting/entities",
  contact: "/contacts",
}

// ---------------------------------------------------------------------------
// Single tab component
// ---------------------------------------------------------------------------

function TabItem({
  tab,
  isActive,
  onActivate,
  onClose,
  onContextAction,
}: {
  tab: OpenTab
  isActive: boolean
  onActivate: () => void
  onClose: (e: React.MouseEvent) => void
  onContextAction: (action: "close" | "closeOthers" | "closeAll") => void
}) {
  const [showContext, setShowContext] = useState(false)
  const Icon = MODULE_ICON_MAP[tab.module] || FolderKanban

  // Truncate label
  const displayLabel =
    tab.label.length > 18 ? tab.label.slice(0, 17) + "\u2026" : tab.label

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle-click to close
    if (e.button === 1) {
      e.preventDefault()
      onClose(e)
    }
  }

  return (
    <DropdownMenu open={showContext} onOpenChange={setShowContext}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={onActivate}
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => {
            e.preventDefault()
            setShowContext(true)
          }}
          className={cn(
            "group relative flex h-full max-w-[180px] min-w-[100px] shrink-0 items-center gap-1.5 border-r border-[#E5E7EB] px-3 text-[13px] leading-none transition-colors select-none",
            isActive
              ? "bg-white text-[#1F2937]"
              : "bg-[#f3f4f6] text-[#6B7280] hover:bg-[#e5e7eb]"
          )}
          title={tab.label}
        >
          {/* Active indicator */}
          {isActive && (
            <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1a5632]" />
          )}

          {/* Module icon */}
          <Icon className="h-3 w-3 shrink-0 opacity-60" />

          {/* Label */}
          <span className="truncate flex-1 text-left">{displayLabel}</span>

          {/* Close button */}
          <span
            role="button"
            onClick={onClose}
            className={cn(
              "ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-colors",
              isActive
                ? "text-[#6B7280] hover:bg-[#e5e7eb] hover:text-[#1F2937]"
                : "text-transparent group-hover:text-[#6B7280] group-hover:hover:bg-[#d1d5db] group-hover:hover:text-[#1F2937]"
            )}
          >
            <X className="h-3 w-3" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={() => onContextAction("close")}>
          Close
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onContextAction("closeOthers")}>
          Close Others
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onContextAction("closeAll")}>
          Close All
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Overflow dropdown
// ---------------------------------------------------------------------------

function OverflowMenu({
  tabs,
  activeTabId,
  onActivate,
}: {
  tabs: OpenTab[]
  activeTabId: string | null
  onActivate: (tab: OpenTab) => void
}) {
  if (tabs.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-full items-center px-2 text-[#6B7280] hover:bg-[#e5e7eb] transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {tabs.map((tab) => {
          const Icon = MODULE_ICON_MAP[tab.module] || FolderKanban
          return (
            <DropdownMenuItem
              key={tab.id}
              onClick={() => onActivate(tab)}
              className={cn(
                "gap-2",
                tab.id === activeTabId && "font-semibold"
              )}
            >
              <Icon className="h-3.5 w-3.5 opacity-60" />
              <span className="truncate">{tab.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Main tab bar
// ---------------------------------------------------------------------------

export function OpenTabsBar() {
  const router = useRouter()
  const {
    tabs,
    activeTabId,
    setActiveTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
  } = useOpenTabsStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(tabs.length)

  // Calculate how many tabs fit
  const recalcOverflow = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      setVisibleCount(tabs.length)
      return
    }

    // Reserve 40px for overflow button
    const available = container.clientWidth - 40
    const tabMinWidth = 100
    const tabMaxWidth = 180
    const avgWidth = Math.min(tabMaxWidth, Math.max(tabMinWidth, available / tabs.length))

    const fits = Math.max(1, Math.floor(available / avgWidth))
    setVisibleCount(Math.min(fits, tabs.length))
  }, [tabs.length])

  useEffect(() => {
    recalcOverflow()
    window.addEventListener("resize", recalcOverflow)
    return () => window.removeEventListener("resize", recalcOverflow)
  }, [recalcOverflow])

  const visibleTabs = tabs.slice(0, visibleCount)
  const overflowTabs = tabs.slice(visibleCount)

  const handleActivate = (tab: OpenTab) => {
    setActiveTab(tab.id)
    router.push(tab.path)
  }

  const handleClose = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const closingTab = tabs.find((t) => t.id === tabId)
    const isActive = tabId === activeTabId

    closeTab(tabId)

    if (isActive) {
      // After close, navigate to the new active tab or module index
      const remaining = tabs.filter((t) => t.id !== tabId)
      if (remaining.length === 0) {
        // No tabs left — navigate to the module index of the closed tab
        const fallback = closingTab
          ? MODULE_FALLBACK_ROUTES[closingTab.module]
          : "/opportunities"
        router.push(fallback)
      } else {
        // The store already picked a new active tab, navigate to it
        const idx = tabs.findIndex((t) => t.id === tabId)
        const newIdx = idx < remaining.length ? idx : remaining.length - 1
        router.push(remaining[newIdx].path)
      }
    }
  }

  const handleContextAction = (
    tabId: string,
    action: "close" | "closeOthers" | "closeAll"
  ) => {
    const tab = tabs.find((t) => t.id === tabId)

    if (action === "close") {
      handleClose(tabId, { stopPropagation: () => {} } as React.MouseEvent)
    } else if (action === "closeOthers") {
      closeOtherTabs(tabId)
      if (tab) {
        setActiveTab(tab.id)
        router.push(tab.path)
      }
    } else if (action === "closeAll") {
      closeAllTabs()
      const fallback = tab
        ? MODULE_FALLBACK_ROUTES[tab.module]
        : "/opportunities"
      router.push(fallback)
    }
  }

  return (
    <div
      className="flex h-9 shrink-0 items-stretch border-b border-[#E5E7EB] bg-white"
      style={{ minHeight: 36, maxHeight: 36 }}
    >
      <div ref={containerRef} className="flex flex-1 items-stretch overflow-hidden">
        {visibleTabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onActivate={() => handleActivate(tab)}
            onClose={(e) => handleClose(tab.id, e)}
            onContextAction={(action) => handleContextAction(tab.id, action)}
          />
        ))}
      </div>

      {/* Overflow menu */}
      {overflowTabs.length > 0 && (
        <OverflowMenu
          tabs={overflowTabs}
          activeTabId={activeTabId}
          onActivate={handleActivate}
        />
      )}
    </div>
  )
}
