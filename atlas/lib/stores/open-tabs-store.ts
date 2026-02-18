import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_TABS = 10

export type TabModule = 'opportunity' | 'project' | 'job' | 'listing' | 'entity' | 'contact'

export interface OpenTab {
  id: string
  label: string
  path: string
  module: TabModule
  icon?: string
}

interface OpenTabsStore {
  tabs: OpenTab[]
  activeTabId: string | null
  openTab: (tab: OpenTab) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  closeAllTabs: () => void
  closeOtherTabs: (id: string) => void
  updateTabLabel: (id: string, label: string) => void
}

export const useOpenTabsStore = create<OpenTabsStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      openTab: (tab) =>
        set((state) => {
          const existing = state.tabs.find((t) => t.id === tab.id)
          if (existing) {
            // Deduplicate: activate and update path/label
            return {
              tabs: state.tabs.map((t) =>
                t.id === tab.id
                  ? { ...t, path: tab.path, label: tab.label || t.label }
                  : t
              ),
              activeTabId: tab.id,
            }
          }

          let newTabs = [...state.tabs, tab]

          // Enforce max tabs — close oldest inactive tab
          if (newTabs.length > MAX_TABS) {
            const oldestInactive = newTabs.find(
              (t) => t.id !== tab.id && t.id !== state.activeTabId
            )
            if (oldestInactive) {
              newTabs = newTabs.filter((t) => t.id !== oldestInactive.id)
            }
          }

          return { tabs: newTabs, activeTabId: tab.id }
        }),

      closeTab: (id) =>
        set((state) => {
          const idx = state.tabs.findIndex((t) => t.id === id)
          if (idx === -1) return state

          const newTabs = state.tabs.filter((t) => t.id !== id)

          // If closing the active tab, pick a new one
          let newActiveId = state.activeTabId
          if (state.activeTabId === id) {
            if (newTabs.length === 0) {
              newActiveId = null
            } else if (idx < newTabs.length) {
              // Activate the tab to the right (same index in filtered array)
              newActiveId = newTabs[idx].id
            } else {
              // Activate the tab to the left
              newActiveId = newTabs[newTabs.length - 1].id
            }
          }

          return { tabs: newTabs, activeTabId: newActiveId }
        }),

      setActiveTab: (id) =>
        set({ activeTabId: id }),

      closeAllTabs: () =>
        set({ tabs: [], activeTabId: null }),

      closeOtherTabs: (id) =>
        set((state) => ({
          tabs: state.tabs.filter((t) => t.id === id),
          activeTabId: id,
        })),

      updateTabLabel: (id, label) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, label } : t
          ),
        })),
    }),
    {
      name: 'atlas-open-tabs',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
)
