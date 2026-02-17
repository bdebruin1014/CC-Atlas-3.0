"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  UserPlus,
  X,
  User,
  Building2,
  Loader2,
  Phone,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/format"
import { createClient } from "@/lib/supabase/client"
import { ContactSearch, type ContactResult } from "./contact-search"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssignedContact {
  id: string
  contact_id: string
  record_type: string
  record_id: string
  role: string
  contact: {
    id: string
    first_name: string
    last_name: string
    company: string | null
    email: string | null
    phone: string | null
    contact_types: string[]
  }
}

export interface ContactAssignmentProps {
  recordType: string
  recordId: string
}

// ---------------------------------------------------------------------------
// Common roles
// ---------------------------------------------------------------------------

const COMMON_ROLES = [
  "Owner",
  "Buyer",
  "Seller",
  "Realtor",
  "Architect",
  "Engineer",
  "General Contractor",
  "Subcontractor",
  "Inspector",
  "Lender",
  "Attorney",
  "Project Manager",
  "Superintendent",
]

// ---------------------------------------------------------------------------
// ContactAssignment
// ---------------------------------------------------------------------------

export function ContactAssignment({
  recordType,
  recordId,
}: ContactAssignmentProps) {
  const [assignments, setAssignments] = useState<AssignedContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null)
  const [role, setRole] = useState("")
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [showNewContactForm, setShowNewContactForm] = useState(false)
  const [newContactData, setNewContactData] = useState({
    first_name: "",
    last_name: "",
    company: "",
    email: "",
    phone: "",
  })

  const supabase = createClient()

  // ---- Fetch assignments ----
  const fetchAssignments = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("contact_assignments")
        .select(
          `
          id,
          contact_id,
          record_type,
          record_id,
          role,
          contact:contacts (
            id,
            first_name,
            last_name,
            company,
            email,
            phone,
            contact_types
          )
        `
        )
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("created_at", { ascending: true })

      if (error) throw error
      setAssignments((data as unknown as AssignedContact[]) ?? [])
    } catch (err) {
      console.error("Failed to fetch contact assignments:", err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, recordType, recordId])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  // ---- Assign contact ----
  const handleAssign = useCallback(async () => {
    if (!selectedContact || !role.trim()) return

    setIsAssigning(true)
    try {
      const { error } = await supabase.from("contact_assignments").insert({
        contact_id: selectedContact.id,
        record_type: recordType,
        record_id: recordId,
        role: role.trim(),
      })

      if (error) throw error

      setSelectedContact(null)
      setRole("")
      setShowSearch(false)
      await fetchAssignments()
    } catch (err) {
      console.error("Failed to assign contact:", err)
    } finally {
      setIsAssigning(false)
    }
  }, [supabase, selectedContact, role, recordType, recordId, fetchAssignments])

  // ---- Remove assignment ----
  const handleRemove = useCallback(
    async (assignmentId: string) => {
      try {
        const { error } = await supabase
          .from("contact_assignments")
          .delete()
          .eq("id", assignmentId)

        if (error) throw error
        await fetchAssignments()
      } catch (err) {
        console.error("Failed to remove assignment:", err)
      }
    },
    [supabase, fetchAssignments]
  )

  // ---- Quick-add new contact ----
  const handleQuickAdd = useCallback(async () => {
    const { first_name, last_name } = newContactData
    if (!first_name.trim() || !last_name.trim()) return

    try {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          company: newContactData.company.trim() || null,
          email: newContactData.email.trim() || null,
          phone: newContactData.phone.trim() || null,
          contact_types: [],
          status: "active",
        })
        .select("id, first_name, last_name, company, email, phone, contact_types")
        .single()

      if (error) throw error

      setSelectedContact(data as ContactResult)
      setShowNewContactForm(false)
      setNewContactData({
        first_name: "",
        last_name: "",
        company: "",
        email: "",
        phone: "",
      })
    } catch (err) {
      console.error("Failed to create contact:", err)
    }
  }, [supabase, newContactData])

  const assignedContactIds = assignments.map((a) => a.contact_id)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            Contacts{" "}
            {!isLoading && (
              <span className="font-normal text-muted-foreground">
                ({assignments.length})
              </span>
            )}
          </h3>
        </div>
        {!showSearch && (
          <Button size="sm" variant="outline" onClick={() => setShowSearch(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Assign
          </Button>
        )}
      </div>

      {/* Search + assign form */}
      {showSearch && (
        <div className="space-y-3 rounded-md border border-border p-3">
          {!selectedContact ? (
            <>
              <ContactSearch
                onSelect={setSelectedContact}
                excludeIds={assignedContactIds}
                onCreateNew={() => setShowNewContactForm(true)}
                placeholder="Search contacts to assign..."
              />

              {/* Quick-add new contact inline */}
              {showNewContactForm && (
                <div className="space-y-2 rounded border border-dashed border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Quick-add new contact
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="First name *"
                      value={newContactData.first_name}
                      onChange={(e) =>
                        setNewContactData((prev) => ({
                          ...prev,
                          first_name: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Last name *"
                      value={newContactData.last_name}
                      onChange={(e) =>
                        setNewContactData((prev) => ({
                          ...prev,
                          last_name: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Company"
                      value={newContactData.company}
                      onChange={(e) =>
                        setNewContactData((prev) => ({
                          ...prev,
                          company: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={newContactData.email}
                      onChange={(e) =>
                        setNewContactData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Phone"
                      value={newContactData.phone}
                      onChange={(e) =>
                        setNewContactData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleQuickAdd}>
                      Create & Select
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNewContactForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Selected contact preview */}
              <div className="flex items-center gap-3 rounded-md bg-muted/50 p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {selectedContact.first_name} {selectedContact.last_name}
                  </p>
                  {selectedContact.company && (
                    <p className="text-xs text-muted-foreground">
                      {selectedContact.company}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedContact(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Role input */}
              <div className="relative">
                <Input
                  placeholder="Assign role (e.g., Owner, Realtor)..."
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value)
                    setShowRoleDropdown(true)
                  }}
                  onFocus={() => setShowRoleDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowRoleDropdown(false), 200)
                  }
                />
                {showRoleDropdown && role.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {COMMON_ROLES.map((r) => (
                        <li
                          key={r}
                          className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setRole(r)
                            setShowRoleDropdown(false)
                          }}
                        >
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAssign}
                  disabled={!role.trim() || isAssigning}
                >
                  {isAssigning ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Assign
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowSearch(false)
                    setSelectedContact(null)
                    setRole("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Assigned contacts list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md border border-border p-3"
            >
              <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No contacts assigned yet.
        </p>
      ) : (
        <div className="space-y-2">
          {assignments.map((assignment) => {
            const contact = assignment.contact
            return (
              <div
                key={assignment.id}
                className="group flex items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/30"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {assignment.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {contact.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {contact.company}
                      </span>
                    )}
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemove(assignment.id)}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
