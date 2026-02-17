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
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
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

export function SearchCommand() {
  const router = useRouter()
  const { searchOpen, setSearchOpen } = useUIStore()
  const supabase = createClient()
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = React.useState<SearchResult[]>([])
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

  // Debounced search
  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const searchResults: SearchResult[] = []

      try {
        // Search opportunities
        const { data: opportunities } = await supabase
          .from("opportunities")
          .select("id, name, stage")
          .ilike("name", `%${query}%`)
          .limit(5)

        opportunities?.forEach((opp) => {
          searchResults.push({
            id: `opp-${opp.id}`,
            label: opp.name,
            description: opp.stage
              ?.replace(/_/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            href: `/opportunities/${opp.id}`,
            category: "Opportunities",
            icon: TrendingUp,
          })
        })

        // Search projects
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name, status")
          .ilike("name", `%${query}%`)
          .limit(5)

        projects?.forEach((proj) => {
          searchResults.push({
            id: `proj-${proj.id}`,
            label: proj.name,
            description: proj.status
              ?.replace(/_/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            href: `/projects/${proj.id}`,
            category: "Projects",
            icon: FolderKanban,
          })
        })

        // Search jobs
        const { data: jobs } = await supabase
          .from("jobs")
          .select("id, name, status")
          .ilike("name", `%${query}%`)
          .limit(5)

        jobs?.forEach((job) => {
          searchResults.push({
            id: `job-${job.id}`,
            label: job.name,
            description: job.status
              ?.replace(/_/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            href: `/construction/${job.id}`,
            category: "Construction",
            icon: HardHat,
          })
        })

        // Search contacts
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id, first_name, last_name, company")
          .or(
            `first_name.ilike.%${query}%,last_name.ilike.%${query}%,company.ilike.%${query}%`
          )
          .limit(5)

        contacts?.forEach((contact) => {
          searchResults.push({
            id: `contact-${contact.id}`,
            label: `${contact.first_name} ${contact.last_name}`,
            description: contact.company || undefined,
            href: `/contacts/${contact.id}`,
            category: "Contacts",
            icon: Users,
          })
        })
      } catch (error) {
        console.error("Search error:", error)
      }

      setResults(searchResults)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, supabase])

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
          {isSearching
            ? "Searching..."
            : query.length < 2
              ? "Type at least 2 characters to search..."
              : "No results found."}
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
            <CommandItem
              value="nav-opportunities"
              onSelect={() => {
                setSearchOpen(false)
                router.push("/opportunities")
              }}
              className="cursor-pointer"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Opportunities
            </CommandItem>
            <CommandItem
              value="nav-projects"
              onSelect={() => {
                setSearchOpen(false)
                router.push("/projects")
              }}
              className="cursor-pointer"
            >
              <FolderKanban className="mr-2 h-4 w-4" />
              Projects
            </CommandItem>
            <CommandItem
              value="nav-construction"
              onSelect={() => {
                setSearchOpen(false)
                router.push("/construction")
              }}
              className="cursor-pointer"
            >
              <HardHat className="mr-2 h-4 w-4" />
              Construction
            </CommandItem>
            <CommandItem
              value="nav-contacts"
              onSelect={() => {
                setSearchOpen(false)
                router.push("/contacts")
              }}
              className="cursor-pointer"
            >
              <Users className="mr-2 h-4 w-4" />
              Contacts
            </CommandItem>
          </CommandGroup>
        )}

        {/* Search Results */}
        {Object.entries(groupedResults).map(([category, categoryResults], idx) => (
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
                    <FileText className="ml-2 h-3 w-3 text-muted-foreground/50" />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
