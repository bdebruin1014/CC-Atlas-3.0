"use client"

import * as React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { Search, Plus, User, Building2, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils/format"
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactResult {
  id: string
  first_name: string
  last_name: string
  company: string | null
  email: string | null
  phone: string | null
  contact_types: string[]
}

export interface ContactSearchProps {
  onSelect: (contact: ContactResult) => void
  contactTypes?: string[]
  placeholder?: string
  onCreateNew?: () => void
  excludeIds?: string[]
}

// ---------------------------------------------------------------------------
// ContactSearch
// ---------------------------------------------------------------------------

export function ContactSearch({
  onSelect,
  contactTypes,
  placeholder = "Search contacts...",
  onCreateNew,
  excludeIds = [],
}: ContactSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ContactResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  // ---- Search contacts ----
  const searchContacts = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([])
        return
      }

      setIsSearching(true)
      try {
        let queryBuilder = supabase
          .from("contacts")
          .select("id, first_name, last_name, company, email, phone, contact_types")
          .or(
            `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
          )
          .limit(20)

        if (contactTypes && contactTypes.length > 0) {
          queryBuilder = queryBuilder.overlaps("contact_types", contactTypes)
        }

        const { data, error } = await queryBuilder

        if (error) throw error

        const filtered = ((data as unknown as ContactResult[]) ?? []).filter(
          (c) => !excludeIds.includes(c.id)
        )
        setResults(filtered)
      } catch (err) {
        console.error("Contact search failed:", err)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [supabase, contactTypes, excludeIds]
  )

  // ---- Debounced search ----
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(() => {
      searchContacts(query)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, searchContacts])

  // ---- Click outside to close ----
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ---- Keyboard navigation ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = results.length + (onCreateNew ? 1 : 0)

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setHighlightedIndex((prev) => (prev + 1) % totalItems)
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems)
          break
        case "Enter":
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < results.length) {
            handleSelect(results[highlightedIndex])
          } else if (highlightedIndex === results.length && onCreateNew) {
            onCreateNew()
            setIsOpen(false)
          }
          break
        case "Escape":
          setIsOpen(false)
          inputRef.current?.blur()
          break
      }
    },
    [results, highlightedIndex, onCreateNew]
  )

  const handleSelect = useCallback(
    (contact: ContactResult) => {
      onSelect(contact)
      setQuery("")
      setResults([])
      setIsOpen(false)
      setHighlightedIndex(-1)
    },
    [onSelect]
  )

  const showDropdown = isOpen && (query.length >= 2 || results.length > 0)

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          {results.length === 0 && !isSearching && query.length >= 2 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              No contacts found
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((contact, idx) => (
                <li
                  key={contact.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent",
                    highlightedIndex === idx && "bg-accent"
                  )}
                  onClick={() => handleSelect(contact)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {contact.company && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3" />
                          {contact.company}
                        </span>
                      )}
                      {contact.contact_types?.length > 0 && (
                        <span className="truncate">
                          {contact.contact_types.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Create new option */}
          {onCreateNew && (
            <div
              className={cn(
                "flex cursor-pointer items-center gap-2 border-t border-border px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent",
                highlightedIndex === results.length && "bg-accent"
              )}
              onClick={() => {
                onCreateNew()
                setIsOpen(false)
              }}
              onMouseEnter={() => setHighlightedIndex(results.length)}
            >
              <Plus className="h-4 w-4" />
              Create new contact
            </div>
          )}
        </div>
      )}
    </div>
  )
}
