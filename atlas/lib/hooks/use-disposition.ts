import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  DispositionListing,
  DispositionShowing,
  DispositionOffer,
  DispositionContract,
  DispositionSettlement,
  DispositionCost,
  DispositionBulkSaleAgreement,
  DispositionTakedownSchedule,
} from "@/lib/supabase/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListingFilters {
  status?: string
  project_id?: string
  entity_id?: string
  property_type?: string
  search?: string
  page?: number
  page_size?: number
  sort_by?: string
  sort_dir?: "asc" | "desc"
}

export interface ListingsResponse {
  data: DispositionListing[]
  total: number
  page: number
  page_size: number
}

export interface ListingDetail extends DispositionListing {
  project?: { id: string; name: string; type: string; status: string } | null
  entity?: { id: string; name: string } | null
  listing_agent?: {
    id: string
    first_name: string
    last_name: string
    company: string | null
    email: string | null
    phone: string | null
  } | null
  showings_count: number
  offers_count: number
  active_contracts_count: number
}

export interface ContractDetail extends DispositionContract {
  offer?: {
    id: string
    offer_number: string | null
    buyer_name: string | null
    offer_price: number | null
  } | null
  seller?: {
    id: string
    first_name: string
    last_name: string
    company: string | null
  } | null
  buyer?: {
    id: string
    first_name: string
    last_name: string
    company: string | null
  } | null
}

export interface SettlementDetail extends DispositionSettlement {
  contract?: {
    id: string
    contract_number: string | null
    purchase_price: number | null
    buyer_entity: string | null
  } | null
}

export interface CostDetail extends DispositionCost {
  vendor?: {
    id: string
    first_name: string
    last_name: string
    company: string | null
  } | null
}

export interface BulkSaleDetail extends DispositionBulkSaleAgreement {
  project?: { id: string; name: string } | null
  buyer?: {
    id: string
    first_name: string
    last_name: string
    company: string | null
  } | null
}

export interface CommunityStats {
  total_units: number
  contracted: number
  sold: number
  remaining: number
  total_revenue: number
  pending_revenue: number
  avg_dom: number
  avg_sale_vs_list_pct: number
  absorption_rate: number
  concession_total: number
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const dispositionKeys = {
  all: ["disposition"] as const,
  listings: () => [...dispositionKeys.all, "listings"] as const,
  listingsList: (filters: ListingFilters) =>
    [...dispositionKeys.listings(), filters] as const,
  listing: (id: string) => [...dispositionKeys.listings(), id] as const,
  showings: (listingId: string) =>
    [...dispositionKeys.all, "showings", listingId] as const,
  offers: (listingId: string) =>
    [...dispositionKeys.all, "offers", listingId] as const,
  contract: (listingId: string) =>
    [...dispositionKeys.all, "contract", listingId] as const,
  settlement: (listingId: string) =>
    [...dispositionKeys.all, "settlement", listingId] as const,
  costs: (listingId: string) =>
    [...dispositionKeys.all, "costs", listingId] as const,
  communityStats: (projectId: string) =>
    [...dispositionKeys.all, "community", projectId] as const,
  bulkSales: (projectId: string) =>
    [...dispositionKeys.all, "bulk-sales", projectId] as const,
  bulkSale: (id: string) =>
    [...dispositionKeys.all, "bulk-sale", id] as const,
  takedowns: (agreementId: string) =>
    [...dispositionKeys.all, "takedowns", agreementId] as const,
}

// ---------------------------------------------------------------------------
// Helper: build query string
// ---------------------------------------------------------------------------
function buildListingParams(filters: ListingFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", filters.status)
  if (filters.project_id) params.set("project_id", filters.project_id)
  if (filters.entity_id) params.set("entity_id", filters.entity_id)
  if (filters.property_type) params.set("property_type", filters.property_type)
  if (filters.search) params.set("search", filters.search)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.page_size) params.set("page_size", String(filters.page_size))
  if (filters.sort_by) params.set("sort_by", filters.sort_by)
  if (filters.sort_dir) params.set("sort_dir", filters.sort_dir)
  return params.toString()
}

async function fetchJson<T>(url: string, errorMsg: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || errorMsg)
  }
  return res.json()
}

async function mutateJson<T>(
  url: string,
  method: string,
  body: unknown,
  errorMsg: string
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || errorMsg)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// LISTINGS
// ---------------------------------------------------------------------------

export function useListings(filters: ListingFilters = {}) {
  return useQuery({
    queryKey: dispositionKeys.listingsList(filters),
    queryFn: async () => {
      const qs = buildListingParams(filters)
      const res = await fetchJson<ListingsResponse>(
        `/api/disposition/listings${qs ? `?${qs}` : ""}`,
        "Failed to fetch listings"
      )
      return res
    },
    staleTime: 30000,
  })
}

export function useListing(id: string) {
  return useQuery({
    queryKey: dispositionKeys.listing(id),
    queryFn: async () => {
      const res = await fetchJson<{ data: ListingDetail }>(
        `/api/disposition/listings/${id}`,
        "Failed to fetch listing"
      )
      return res.data
    },
    enabled: !!id,
    staleTime: 30000,
  })
}

export function useCreateListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<DispositionListing>) => {
      const res = await mutateJson<{ data: DispositionListing }>(
        "/api/disposition/listings",
        "POST",
        input,
        "Failed to create listing"
      )
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dispositionKeys.listings() })
    },
  })
}

export function useUpdateListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<DispositionListing> & { id: string }) => {
      const res = await mutateJson<{ data: DispositionListing }>(
        `/api/disposition/listings/${id}`,
        "PATCH",
        updates,
        "Failed to update listing"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: dispositionKeys.listings() })
      qc.invalidateQueries({
        queryKey: dispositionKeys.listing(variables.id),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// SHOWINGS
// ---------------------------------------------------------------------------

export function useShowings(listingId: string) {
  return useQuery({
    queryKey: dispositionKeys.showings(listingId),
    queryFn: async () => {
      const res = await fetchJson<{ data: DispositionShowing[] }>(
        `/api/disposition/listings/${listingId}/showings`,
        "Failed to fetch showings"
      )
      return res.data
    },
    enabled: !!listingId,
    staleTime: 30000,
  })
}

export function useCreateShowing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      listingId,
      ...input
    }: Partial<DispositionShowing> & { listingId: string }) => {
      const res = await mutateJson<{ data: DispositionShowing }>(
        `/api/disposition/listings/${listingId}/showings`,
        "POST",
        input,
        "Failed to create showing"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.showings(variables.listingId),
      })
      qc.invalidateQueries({
        queryKey: dispositionKeys.listing(variables.listingId),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// OFFERS
// ---------------------------------------------------------------------------

export function useOffers(listingId: string) {
  return useQuery({
    queryKey: dispositionKeys.offers(listingId),
    queryFn: async () => {
      const res = await fetchJson<{ data: DispositionOffer[] }>(
        `/api/disposition/listings/${listingId}/offers`,
        "Failed to fetch offers"
      )
      return res.data
    },
    enabled: !!listingId,
    staleTime: 30000,
  })
}

export function useCreateOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      listingId,
      ...input
    }: Partial<DispositionOffer> & { listingId: string }) => {
      const res = await mutateJson<{ data: DispositionOffer }>(
        `/api/disposition/listings/${listingId}/offers`,
        "POST",
        input,
        "Failed to create offer"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.offers(variables.listingId),
      })
      qc.invalidateQueries({
        queryKey: dispositionKeys.listing(variables.listingId),
      })
    },
  })
}

export function useUpdateOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      listingId,
      offerId,
      ...updates
    }: Partial<DispositionOffer> & {
      listingId: string
      offerId: string
    }) => {
      const res = await mutateJson<{ data: DispositionOffer }>(
        `/api/disposition/listings/${listingId}/offers/${offerId}`,
        "PATCH",
        updates,
        "Failed to update offer"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.offers(variables.listingId),
      })
      qc.invalidateQueries({
        queryKey: dispositionKeys.listing(variables.listingId),
      })
      // If accepted, contract was created
      qc.invalidateQueries({
        queryKey: dispositionKeys.contract(variables.listingId),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// CONTRACT
// ---------------------------------------------------------------------------

export function useContract(listingId: string) {
  return useQuery({
    queryKey: dispositionKeys.contract(listingId),
    queryFn: async () => {
      const res = await fetchJson<{ data: ContractDetail | null }>(
        `/api/disposition/listings/${listingId}/contract`,
        "Failed to fetch contract"
      )
      return res.data
    },
    enabled: !!listingId,
    staleTime: 30000,
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      listingId,
      ...updates
    }: Partial<DispositionContract> & {
      listingId: string
      id: string
    }) => {
      const res = await mutateJson<{ data: DispositionContract }>(
        `/api/disposition/listings/${listingId}/contract`,
        "PATCH",
        { ...updates },
        "Failed to update contract"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.contract(variables.listingId),
      })
      qc.invalidateQueries({
        queryKey: dispositionKeys.listing(variables.listingId),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// SETTLEMENT
// ---------------------------------------------------------------------------

export function useSettlement(listingId: string) {
  return useQuery({
    queryKey: dispositionKeys.settlement(listingId),
    queryFn: async () => {
      const res = await fetchJson<{ data: SettlementDetail | null }>(
        `/api/disposition/listings/${listingId}/settlement`,
        "Failed to fetch settlement"
      )
      return res.data
    },
    enabled: !!listingId,
    staleTime: 30000,
  })
}

export function useCreateSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      listingId,
      ...input
    }: Partial<DispositionSettlement> & { listingId: string }) => {
      const res = await mutateJson<{ data: DispositionSettlement }>(
        `/api/disposition/listings/${listingId}/settlement`,
        "POST",
        input,
        "Failed to create settlement"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.settlement(variables.listingId),
      })
      qc.invalidateQueries({
        queryKey: dispositionKeys.listing(variables.listingId),
      })
    },
  })
}

export function useUpdateSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      listingId,
      ...updates
    }: Partial<DispositionSettlement> & {
      listingId: string
      id: string
    }) => {
      const res = await mutateJson<{ data: DispositionSettlement }>(
        `/api/disposition/listings/${listingId}/settlement`,
        "PATCH",
        { ...updates },
        "Failed to update settlement"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.settlement(variables.listingId),
      })
      qc.invalidateQueries({
        queryKey: dispositionKeys.listing(variables.listingId),
      })
      qc.invalidateQueries({
        queryKey: dispositionKeys.contract(variables.listingId),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// COSTS
// ---------------------------------------------------------------------------

export function useCosts(listingId: string) {
  return useQuery({
    queryKey: dispositionKeys.costs(listingId),
    queryFn: async () => {
      const res = await fetchJson<{ data: CostDetail[] }>(
        `/api/disposition/listings/${listingId}/costs`,
        "Failed to fetch costs"
      )
      return res.data
    },
    enabled: !!listingId,
    staleTime: 30000,
  })
}

export function useCreateCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      listingId,
      ...input
    }: Partial<DispositionCost> & { listingId: string }) => {
      const res = await mutateJson<{ data: DispositionCost }>(
        `/api/disposition/listings/${listingId}/costs`,
        "POST",
        input,
        "Failed to create cost"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.costs(variables.listingId),
      })
    },
  })
}

export function useUpdateCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      listingId,
      ...updates
    }: Partial<DispositionCost> & {
      listingId: string
      id: string
    }) => {
      const res = await mutateJson<{ data: DispositionCost }>(
        `/api/disposition/listings/${listingId}/costs`,
        "PATCH",
        { ...updates },
        "Failed to update cost"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.costs(variables.listingId),
      })
    },
  })
}

export function useDeleteCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      listingId,
      id,
    }: {
      listingId: string
      id: string
    }) => {
      const res = await fetch(
        `/api/disposition/listings/${listingId}/costs`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete cost")
      }
      return true
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.costs(variables.listingId),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// COMMUNITY STATS
// ---------------------------------------------------------------------------

export function useCommunityStats(projectId: string) {
  return useQuery({
    queryKey: dispositionKeys.communityStats(projectId),
    queryFn: async () => {
      const res = await fetchJson<{ data: CommunityStats }>(
        `/api/disposition/community/${projectId}`,
        "Failed to fetch community stats"
      )
      return res.data
    },
    enabled: !!projectId,
    staleTime: 30000,
  })
}

// ---------------------------------------------------------------------------
// BULK SALE AGREEMENTS
// ---------------------------------------------------------------------------

export function useBulkSaleAgreements(projectId: string) {
  return useQuery({
    queryKey: dispositionKeys.bulkSales(projectId),
    queryFn: async () => {
      const res = await fetchJson<{ data: BulkSaleDetail[] }>(
        `/api/disposition/bulk-sales?project_id=${projectId}`,
        "Failed to fetch bulk sale agreements"
      )
      return res.data
    },
    enabled: !!projectId,
    staleTime: 30000,
  })
}

export function useCreateBulkSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: Partial<DispositionBulkSaleAgreement> & { project_id: string }
    ) => {
      const res = await mutateJson<{ data: DispositionBulkSaleAgreement }>(
        "/api/disposition/bulk-sales",
        "POST",
        input,
        "Failed to create bulk sale agreement"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.bulkSales(variables.project_id),
      })
    },
  })
}

export function useUpdateBulkSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      project_id,
      ...updates
    }: Partial<DispositionBulkSaleAgreement> & {
      id: string
      project_id: string
    }) => {
      const res = await mutateJson<{ data: DispositionBulkSaleAgreement }>(
        `/api/disposition/bulk-sales/${id}`,
        "PATCH",
        updates,
        "Failed to update bulk sale agreement"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.bulkSales(variables.project_id),
      })
      qc.invalidateQueries({
        queryKey: dispositionKeys.bulkSale(variables.id),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// TAKEDOWN SCHEDULE
// ---------------------------------------------------------------------------

export function useTakedownSchedule(agreementId: string) {
  return useQuery({
    queryKey: dispositionKeys.takedowns(agreementId),
    queryFn: async () => {
      const res = await fetchJson<{ data: DispositionTakedownSchedule[] }>(
        `/api/disposition/bulk-sales/${agreementId}/takedowns`,
        "Failed to fetch takedowns"
      )
      return res.data
    },
    enabled: !!agreementId,
    staleTime: 30000,
  })
}

export function useCreateTakedown() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      agreementId,
      ...input
    }: Partial<DispositionTakedownSchedule> & { agreementId: string }) => {
      const res = await mutateJson<{ data: DispositionTakedownSchedule }>(
        `/api/disposition/bulk-sales/${agreementId}/takedowns`,
        "POST",
        input,
        "Failed to create takedown"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.takedowns(variables.agreementId),
      })
    },
  })
}

export function useUpdateTakedown() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      agreementId,
      takedownId,
      ...updates
    }: Partial<DispositionTakedownSchedule> & {
      agreementId: string
      takedownId: string
    }) => {
      const res = await mutateJson<{ data: DispositionTakedownSchedule }>(
        `/api/disposition/bulk-sales/${agreementId}/takedowns/${takedownId}`,
        "PATCH",
        updates,
        "Failed to update takedown"
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: dispositionKeys.takedowns(variables.agreementId),
      })
    },
  })
}
