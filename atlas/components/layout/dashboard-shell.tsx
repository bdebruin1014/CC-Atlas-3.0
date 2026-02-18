"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"

import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/lib/stores/auth-store"
import { TopNav } from "@/components/layout/top-nav"
import { OpenTabsBar } from "@/components/layout/open-tabs-bar"
import { ContextSidebar } from "@/components/layout/context-sidebar"
import { RightPanel } from "@/components/layout/right-panel"
import { SearchCommand } from "@/components/shared/search-command"
import { Toaster } from "@/components/ui/toaster"
import { OrgGuard } from "@/components/shared/org-guard"

// QueryClient created ONCE at module scope — survives across navigations
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('[ATLAS] Query error:', error.message ?? error)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error('[ATLAS] Mutation error:', error.message ?? error)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // Data stays fresh for 5 minutes
      gcTime: 30 * 60 * 1000,           // Cache persists for 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,      // Don't refetch when user switches tabs back
      refetchOnMount: false,            // Don't refetch if data is already cached
      refetchOnReconnect: false,        // Don't refetch on network reconnect
    },
  },
})

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()
  const { user, isLoading, isAuthenticated, setUser, clearUser } = useAuthStore()

  React.useEffect(() => {
    // If already authenticated, skip entirely — ZERO delay
    if (isAuthenticated && user) return

    let isMounted = true

    async function loadUser() {
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          if (isMounted) { clearUser(); router.push("/login") }
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, role, avatar_url, organization_id")
          .eq("id", authUser.id)
          .single()

        if (isMounted) {
          setUser(
            profile || {
              id: authUser.id,
              first_name: authUser.user_metadata?.first_name || null,
              last_name: authUser.user_metadata?.last_name || null,
              email: authUser.email || null,
              role: "team_member",
              avatar_url: null,
              organization_id: null,
            }
          )
        }
      } catch {
        if (isMounted) { clearUser(); router.push("/login") }
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearUser()
        router.push("/login")
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- runs ONCE on mount

  if (isLoading && !isAuthenticated) {
    // Show loading only on FIRST visit — never again during session
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopNav user={user} />
        <OpenTabsBar />
        <div className="flex flex-1 overflow-hidden">
          <ContextSidebar />
          <main className="flex-1 overflow-y-auto bg-[var(--background)] p-6">
            <OrgGuard>{children}</OrgGuard>
          </main>
          <RightPanel />
        </div>
      </div>
      <SearchCommand />
      <Toaster />
    </QueryClientProvider>
  )
}
