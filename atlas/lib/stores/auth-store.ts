import { create } from 'zustand'

interface UserProfile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  avatar_url: string | null
  organization_id: string | null
}

interface AuthStore {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: UserProfile) => void
  clearUser: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
