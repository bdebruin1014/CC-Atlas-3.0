"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Contact {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  company: string | null
  email: string | null
  phone: string | null
  secondary_phone: string | null
  mailing_address_line1: string | null
  mailing_address_line2: string | null
  mailing_address_city: string | null
  mailing_address_state: string | null
  mailing_address_zip: string | null
  notes: string | null
  status: "active" | "inactive"
  tags: string[] | null
  created_at: string
  updated_at: string
  contact_types?: ContactType[]
}

export interface ContactType {
  id: string
  contact_id: string
  type: string
}

export interface ContactAssignment {
  id: string
  contact_id: string
  record_type: "opportunity" | "project" | "job" | "entity"
  record_id: string
  role_on_record: string | null
}

export interface ContactFilters {
  search?: string
  types?: string[]
  status?: "active" | "inactive" | "all"
}

const CONTACT_TYPE_LABELS: Record<string, string> = {
  owner_principal: "Owner/Principal",
  investor: "Investor",
  attorney_legal: "Attorney/Legal",
  lender: "Lender",
  surveyor: "Surveyor",
  engineer: "Engineer",
  architect: "Architect",
  appraiser: "Appraiser",
  real_estate_agent_broker: "Real Estate Agent/Broker",
  title_company: "Title Company",
  inspector: "Inspector",
  municipality_contact: "Municipality Contact",
  subcontractor_vendor: "Subcontractor/Vendor",
  superintendent: "Superintendent",
  project_manager: "Project Manager",
  accountant: "Accountant",
  insurance_agent: "Insurance Agent",
  utility_provider: "Utility Provider",
  property_manager: "Property Manager",
  buyer: "Buyer",
  seller: "Seller",
  other: "Other",
}

export function getContactTypeLabel(type: string): string {
  return CONTACT_TYPE_LABELS[type] || type
}

export const ALL_CONTACT_TYPES = Object.entries(CONTACT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  all: ['contacts'] as const,
  lists: () => [...keys.all, 'list'] as const,
  list: (filters?: ContactFilters) => [...keys.lists(), filters] as const,
  details: () => [...keys.all, 'detail'] as const,
  detail: (id: string) => [...keys.details(), id] as const,
  search: (query: string) => [...keys.all, 'search', query] as const,
}

// ---------------------------------------------------------------------------
// Hooks (TanStack Query)
// ---------------------------------------------------------------------------

export function useContacts(filters: ContactFilters = {}) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("*, contact_types(*)")
        .order("last_name", { ascending: true })

      if (filters.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,company.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        )
      }

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status)
      }

      const { data, error } = await query

      if (error) throw error

      let contacts = data as Contact[]

      // Client-side filter by contact types (Supabase doesn't easily support
      // filtering by values inside a joined relation)
      if (filters.types && filters.types.length > 0) {
        contacts = contacts.filter((contact) =>
          contact.contact_types?.some((ct) => filters.types!.includes(ct.type))
        )
      }

      return contacts
    },
  })
}

export function useContact(id: string) {
  const supabase = createClient()

  const contactQuery = useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, contact_types(*)")
        .eq("id", id)
        .single()

      if (error) throw error
      return data as Contact
    },
    enabled: !!id,
  })

  const assignmentsQuery = useQuery({
    queryKey: [...keys.detail(id), 'assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_assignments")
        .select("*")
        .eq("contact_id", id)

      if (error) throw error
      return data as ContactAssignment[]
    },
    enabled: !!id,
  })

  return {
    contact: contactQuery.data ?? null,
    assignments: assignmentsQuery.data ?? [],
    loading: contactQuery.isLoading || assignmentsQuery.isLoading,
    error: contactQuery.error?.message ?? assignmentsQuery.error?.message ?? null,
    refetch: () => {
      contactQuery.refetch()
      assignmentsQuery.refetch()
    },
  }
}

export function useCreateContact() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      contactData,
      types = [],
    }: {
      contactData: Omit<Contact, "id" | "created_at" | "updated_at" | "contact_types">
      types?: string[]
    }) => {
      const { data: newContact, error: createError } = await supabase
        .from("contacts")
        .insert(contactData)
        .select()
        .single()

      if (createError) throw createError

      if (types.length > 0) {
        const typeRecords = types.map((type) => ({
          contact_id: newContact.id,
          type,
        }))

        const { error: typeError } = await supabase
          .from("contact_types")
          .insert(typeRecords)

        if (typeError) throw typeError
      }

      return newContact as Contact
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
    },
    onError: (error) => {
      console.error('Failed to create contact:', error)
    },
  })
}

export function useUpdateContact() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      types,
    }: {
      id: string
      updates: Partial<Contact>
      types?: string[]
    }) => {
      const { error: updateError } = await supabase
        .from("contacts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (updateError) throw updateError

      // If types are provided, replace them entirely
      if (types !== undefined) {
        // Delete existing types
        await supabase.from("contact_types").delete().eq("contact_id", id)

        // Insert new types
        if (types.length > 0) {
          const typeRecords = types.map((type) => ({
            contact_id: id,
            type,
          }))
          const { error: typeError } = await supabase
            .from("contact_types")
            .insert(typeRecords)

          if (typeError) throw typeError
        }
      }

      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: keys.lists() })
      queryClient.invalidateQueries({ queryKey: keys.detail(id) })
    },
    onError: (error) => {
      console.error('Failed to update contact:', error)
    },
  })
}

export function useSearchContacts(query: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: keys.search(query),
    queryFn: async () => {
      if (query.length < 2) return []

      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company, email, phone, contact_types(*)")
        .or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%`
        )
        .eq("status", "active")
        .limit(20)

      if (error) throw error
      return (data ?? []) as Pick<
        Contact,
        'id' | 'first_name' | 'last_name' | 'company' | 'email' | 'phone' | 'contact_types'
      >[]
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  })
}
