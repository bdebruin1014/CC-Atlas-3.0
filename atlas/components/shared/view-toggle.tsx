"use client"

import { LayoutGrid, List } from "lucide-react"
import { cn } from "@/lib/utils/format"
import { useUIStore, type ViewMode } from "@/lib/stores/ui-store"

interface ViewToggleProps {
  module: "opportunities" | "projects" | "construction" | "disposition" | "contacts" | "tasks"
  className?: string
}

export function ViewToggle({ module, className }: ViewToggleProps) {
  const { viewPreferences, setViewPreference } = useUIStore()
  const current = viewPreferences[module]

  return (
    <div className={cn("inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5", className)}>
      <button
        onClick={() => setViewPreference(module, "card")}
        className={cn(
          "inline-flex items-center justify-center rounded-sm px-2 py-1 text-xs font-medium transition-colors",
          current === "card"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Card view"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setViewPreference(module, "list")}
        className={cn(
          "inline-flex items-center justify-center rounded-sm px-2 py-1 text-xs font-medium transition-colors",
          current === "list"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="List view"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
