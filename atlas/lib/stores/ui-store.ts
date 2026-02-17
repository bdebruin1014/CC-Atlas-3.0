import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type RightPanelTab = 'tasks' | 'notes' | 'activity'

interface UIState {
  sidebarCollapsed: boolean
  searchOpen: boolean
  notificationCount: number
  rightPanelOpen: boolean
  rightPanelTab: RightPanelTab
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSearchOpen: (open: boolean) => void
  setNotificationCount: (count: number) => void
  toggleRightPanel: () => void
  setRightPanelOpen: (open: boolean) => void
  setRightPanelTab: (tab: RightPanelTab) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      searchOpen: false,
      notificationCount: 0,
      rightPanelOpen: false,
      rightPanelTab: 'tasks',
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setNotificationCount: (count) =>
        set({ notificationCount: count }),
      toggleRightPanel: () =>
        set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
    }),
    {
      name: 'atlas-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        rightPanelOpen: state.rightPanelOpen,
        rightPanelTab: state.rightPanelTab,
      }),
    }
  )
)
