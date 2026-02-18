"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
  TrendingUp,
  FolderKanban,
  HardHat,
  Users,
  Clock,
  FileText,
  Building2,
  Home,
  Loader2,
} from "lucide-react"

import { useUIStore } from "@/lib/stores/ui-store"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

interface SearchResult {
  id: string
  label: string
  description?: string
  href: string
  category: string
  icon: React.ElementType
}

const RECENT_SEARCHES_KEY = "atlas-recent-searches"
const MAX_RECENT = 5

function getRecentSearches(): SearchResult[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(result: SearchResult) {
  try {
    const recent = getRecentSearches().filter((r) => r.id !== result.id)
    recent.unshift(result)
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT))
    )
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function formatLabel(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Module config
// ---------------------------------------------------------------------------
const MODULE_ICONS: Record<string, React.ElementType> = {
  Opportunities: TrendingUp,
  Projects: FolderKanban,
  Construction: HardHat,
  Disposition: Home,
  Contacts: Users,
  Entities: Building2,
}

// ---------------------------------------------------------------------------
// SearchCommand
// ---------------------------------------------------------------------------
export function SearchCommand() {
  const router = useRouter()
  const { searchOpen, setSearchOpen } = useUIStore()
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = React.useState<SearchResult[]>(
    []
  )
  const [isSearching, setIsSearching] = React.useState(false)

  // Load recent searches on mount
  React.useEffect(() => {
    if (searchOpen) {
      setRecentSearches(getRecentSearches())
      setQuery("")
      setResults([])
    }
  }, [searchOpen])

  // Keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(!searchOpen)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [searchOpen, setSearchOpen])

  // Debounced search via API
  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const searchResults: SearchResult[] = []

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`
        )
        if (!res.ok) throw new Error("Search failed")

        const data = await res.json()

        // Opportunities
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.opportunities?.forEach((o: any) => {
          searchResults.push({
            id: `opp-${o.id}`,
            label: o.name || "Untitled",
            description: [formatLabel(o.stage), o.address]
              .filter(Boolean)
              .join(" — "),
            href: `/opportunities/${o.id}`,
            category: "Opportunities",
            icon: TrendingUp,
          })
        })

        // Projects
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.projects?.forEach((p: any) => {
          searchResults.push({
            id: `proj-${p.id}`,
            label: p.name,
            description: [formatLabel(p.status), p.address]
              .filter(Boolean)
              .join(" — "),
            href: `/projects/${p.id}`,
            category: "Projects",
            icon: FolderKanban,
          })
        })

        // Construction (jobs)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.construction?.forEach((j: any) => {
          searchResults.push({
            id: `job-${j.id}`,
            label: j.name,
            description: formatLabel(j.status),
            href: `/construction/jobs/${j.id}`,
            category: "Construction",
            icon: HardHat,
          })
        })

        // Disposition
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.disposition?.forEach((l: any) => {
          searchResults.push({
            id: `listing-${l.id}`,
            label: l.address || l.listing_number || "Listing",
            description: [l.listing_number, formatLabel(l.status)]
              .filter(Boolean)
              .join(" — "),
            href: `/disposition/${l.id}`,
            category: "Disposition",
            icon: Home,
          })
        })

        // Contacts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.contacts?.forEach((c: any) => {
          searchResults.push({
            id: `contact-${c.id}`,
            label: c.name || "Unknown",
            description: c.company || undefined,
            href: `/contacts/${c.id}`,
            category: "Contacts",
            icon: Users,
          })
        })

        // Entities
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.entities?.forEach((e: any) => {
          searchResults.push({
            id: `entity-${e.id}`,
            label: e.name,
            description: formatLabel(e.type),
            href: `/accounting/entities/${e.id}`,
            category: "Entities",
            icon: Building2,
          })
        })
      } catch (error) {
        console.error("Search error:", error)
      }

      setResults(searchResults)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(result)
    setSearchOpen(false)
    router.push(result.href)
  }

  // Group results by category
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    results.forEach((result) => {
      if (!groups[result.category]) {
        groups[result.category] = []
      }
      groups[result.category].push(result)
    })
    return groups
  }, [results])

  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
      <CommandInput
        placeholder="Search opportunities, projects, contacts..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span>Searching...</span>
            </div>
          ) : query.length < 2 ? (
            "Type at least 2 characters to search..."
          ) : (
            "No results found."
          )}
        </CommandEmpty>

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <CommandGroup heading="Recent Searches">
            {recentSearches.map((result) => (
              <CommandItem
                key={result.id}
                value={`recent-${result.id}`}
                onSelect={() => handleSelect(result)}
                className="cursor-pointer"
              >
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-1 items-center justify-between">
                  <span>{result.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {result.category}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Navigation (when no query) */}
        {!query && (
          <CommandGroup heading="Quick Navigation">
            {[
              { label: "Opportunities", href: "/opportunities", icon: TrendingUp },
              { label: "Projects", href: "/projects", icon: FolderKanban },
              { label: "Construction", href: "/construction", icon: HardHat },
              { label: "Disposition", href: "/disposition", icon: Home },
              { label: "Contacts", href: "/contacts", icon: Users },
              { label: "Entities", href: "/accounting/entities", icon: Building2 },
            ].map((nav) => {
              const NavIcon = nav.icon
              return (
                <CommandItem
                  key={nav.href}
                  value={`nav-${nav.label.toLowerCase()}`}
                  onSelect={() => {
                    setSearchOpen(false)
                    router.push(nav.href)
                  }}
                  className="cursor-pointer"
                >
                  <NavIcon className="mr-2 h-4 w-4" />
                  {nav.label}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {/* Search Results */}
        {Object.entries(groupedResults).map(
          ([category, categoryResults], idx) => {
            const CategoryIcon =
              MODULE_ICONS[category] || FileText
            return (
              <React.Fragment key={category}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={category}>
                  {categoryResults.map((result) => {
                    const ResultIcon = result.icon
                    return (
                      <CommandItem
                        key={result.id}
                        value={result.id}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                      >
                        <ResultIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-1 flex-col">
                          <span>{result.label}</span>
                          {result.description && (
                            <span className="text-xs text-muted-foreground">
                              {result.description}
                            </span>
                          )}
                        </div>
                        <kbd className="ml-2 hidden text-[10px] text-muted-foreground/50 sm:inline">
                          ↵
                        </kbd>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </React.Fragment>
            )
          }
        )}
      </CommandList>
    </CommandDialog>
  )
}
