"use client"

import { usePathname } from "next/navigation"
import { useListingContext } from "../layout"
import { RecordTasksPanel } from "@/components/shared/record-tasks-panel"
import { Skeleton } from "@/components/ui/skeleton"

export default function ListingTasksPage() {
  const { listing, loading } = useListingContext()
  const pathname = usePathname()

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

  const listingName = listing.property_address || "Untitled Listing"

  return (
    <RecordTasksPanel
      recordType="listing"
      recordId={listing.id}
      recordName={listingName}
      recordUrl={pathname}
    />
  )
}
