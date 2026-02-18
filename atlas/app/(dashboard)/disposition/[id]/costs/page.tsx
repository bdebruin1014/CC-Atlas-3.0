"use client"

import { useListingContext } from "../layout"
import { ListingCostsTab } from "@/components/disposition/listing-costs-tab"
import { Skeleton } from "@/components/ui/skeleton"

export default function ListingCostsPage() {
  const { listing, loading } = useListingContext()

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="flex h-64 items-center justify-center text-[#5A6B75]">
        Listing not found
      </div>
    )
  }

  return <ListingCostsTab listingId={listing.id} />
}
