import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type RightPanelTab = 'tasks' | 'notes' | 'activity'
export type ViewMode = 'card' | 'list'

interface ViewPreferences {
  opportunities: ViewMode
  projects: ViewMode
  construction: ViewMode
  disposition: ViewMode
  contacts: ViewMode
  tasks: ViewMode
}

interface UIState {
  sidebarCollapsed: boolean
  searchOpen: boolean
  notificationCount: number
  rightPanelOpen: boolean
  rightPanelTab: RightPanelTab
  selectedEntityId: string | null
  viewPreferences: ViewPreferences
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSearchOpen: (open: boolean) => void
  setNotificationCount: (count: number) => void
  toggleRightPanel: () => void
  setRightPanelOpen: (open: boolean) => void
  setRightPanelTab: (tab: RightPanelTab) => void
  setSelectedEntityId: (id: string | null) => void
  setViewPreference: (module: keyof ViewPreferences, mode: ViewMode) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      searchOpen: false,
      notificationCount: 0,
      rightPanelOpen: false,
      rightPanelTab: 'tasks',
      selectedEntityId: null,
      viewPreferences: {
        opportunities: 'card',
        projects: 'card',
        construction: 'card',
        disposition: 'card',
        contacts: 'list',
        tasks: 'list',
      },
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
      setSelectedEntityId: (id) => set({ selectedEntityId: id }),
      setViewPreference: (module, mode) =>
        set((state) => ({
          viewPreferences: { ...state.viewPreferences, [module]: mode },
        })),
    }),
    {
      name: 'atlas-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        rightPanelOpen: state.rightPanelOpen,
        rightPanelTab: state.rightPanelTab,
        selectedEntityId: state.selectedEntityId,
        viewPreferences: state.viewPreferences,
      }),
    }
  )
)
