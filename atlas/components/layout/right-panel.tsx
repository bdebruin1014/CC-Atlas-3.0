"use client"

import React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils/format"
import { useUIStore } from "@/lib/stores/ui-store"

const TABS = [
  { key: "tasks" as const, label: "TASKS" },
  { key: "notes" as const, label: "NOTES" },
  { key: "activity" as const, label: "ACTIVITY" },
]

export function RightPanel() {
  const { rightPanelOpen, rightPanelTab, setRightPanelOpen, setRightPanelTab } =
    useUIStore()

  if (!rightPanelOpen) return null

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-[var(--border)] bg-white">
      {/* Header with tabs */}
      <div className="flex items-center border-b border-[var(--border)]">
        <div className="flex flex-1 items-center">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRightPanelTab(tab.key)}
              className={cn(
                "px-3 py-2.5 text-[11px] font-medium tracking-wide transition-colors",
                rightPanelTab === tab.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setRightPanelOpen(false)}
          className="mr-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Coming soon</p>
      </div>
    </aside>
  )
}
