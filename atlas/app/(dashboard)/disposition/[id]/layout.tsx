"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import { useListing, useContract, type ListingDetail } from "@/lib/hooks/use-disposition"
import type { ContractDetail } from "@/lib/hooks/use-disposition"
import { formatCurrency } from "@/lib/utils/format"
import { useTabNavigation } from "@/lib/hooks/use-tab-navigation"

// ---------------------------------------------------------------------------
// Context for sharing listing data across sub-routes
// ---------------------------------------------------------------------------

export interface ListingContextValue {
  listing: ListingDetail | null
  contract: ContractDetail | null
  loading: boolean
  refetch: () => void
}

export const ListingContext = React.createContext<ListingContextValue>({
  listing: null,
  contract: null,
  loading: true,
  refetch: () => {},
})

export function useListingContext() {
  return React.useContext(ListingContext)
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "blue" | "warning" | "error" | "gray"
> = {
  draft: "gray",
  pre_listing: "blue",
  active: "success",
  under_contract: "warning",
  pending_closing: "warning",
  closed: "default",
  withdrawn: "error",
  expired: "gray",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pre_listing: "Pre-Listing",
  active: "Active",
  under_contract: "Under Contract",
  pending_closing: "Pending Closing",
  closed: "Closed",
  withdrawn: "Withdrawn",
  expired: "Expired",
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function ListingDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { id } = useParams<{ id: string }>()
  const { data: listing, isLoading, refetch } = useListing(id)
  const { data: contract } = useContract(id)

  const handleRefetch = useCallback(() => {
    refetch()
  }, [refetch])

  // Register open-records tab
  useTabNavigation({
    id,
    label: listing?.property_address || "Loading...",
    module: "listing",
  })

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Listing not found.</p>
        <Link href="/disposition">
          <span className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Listings
          </span>
        </Link>
      </div>
    )
  }

  const listingName = listing.property_address || "Untitled Listing"
  const status = listing.status

  return (
    <ListingContext.Provider
      value={{
        listing,
        contract: contract ?? null,
        loading: isLoading,
        refetch: handleRefetch,
      }}
    >
      <div className="space-y-4 p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link
                href="/disposition"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-xl font-semibold text-[#1F2937]">
                {listingName}
              </h1>
              <Badge variant={STATUS_VARIANT[status] ?? "gray"}>
                {STATUS_LABELS[status] ?? status}
              </Badge>
            </div>
            {listing.list_price != null && (
              <p className="ml-7 text-sm tabular-nums text-muted-foreground">
                List Price: {formatCurrency(listing.list_price)}
              </p>
            )}
          </div>
        </div>

        {/* Sub-route content */}
        {children}
      </div>
    </ListingContext.Provider>
  )
}
