"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useOpenTabsStore, type TabModule } from "@/lib/stores/open-tabs-store"

const MODULE_ICONS: Record<TabModule, string> = {
  opportunity: "Lightbulb",
  project: "FolderKanban",
  job: "HardHat",
  listing: "Home",
  entity: "Building2",
  contact: "User",
}

export function useTabNavigation(params: {
  id: string
  label: string
  module: TabModule
}) {
  const pathname = usePathname()
  const { openTab, updateTabLabel } = useOpenTabsStore()

  // Open/update tab when navigating
  useEffect(() => {
    if (!params.id) return

    openTab({
      id: params.id,
      label: params.label,
      path: pathname,
      module: params.module,
      icon: MODULE_ICONS[params.module],
    })
  }, [params.id, pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update label when record data loads (e.g. from "Loading..." to actual name)
  useEffect(() => {
    if (!params.id || !params.label || params.label === "Loading...") return
    updateTabLabel(params.id, params.label)
  }, [params.id, params.label]) // eslint-disable-line react-hooks/exhaustive-deps
}
