"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { createClient } from "@/lib/supabase/client"
import { TopNav } from "@/components/layout/top-nav"
import { ContextSidebar } from "@/components/layout/context-sidebar"
import { RightPanel } from "@/components/layout/right-panel"
import { SearchCommand } from "@/components/shared/search-command"
import { Toaster } from "@/components/ui/toaster"
import { Skeleton } from "@/components/ui/skeleton"
import { OrgGuard } from "@/components/shared/org-guard"

interface UserProfile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  avatar_url: string | null
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
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
  const [user, setUser] = React.useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let isMounted = true

    async function loadUser() {
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          router.push("/login")
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, role, avatar_url")
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
            }
          )
          setIsLoading(false)
        }
      } catch {
        if (isMounted) {
          router.push("/login")
        }
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/login")
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopNav user={user} />
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
