"use client"

import { useListingContext } from "../layout"
import { NotesPanel } from "@/components/shared/notes-panel"
import { Skeleton } from "@/components/ui/skeleton"

export default function ListingNotesPage() {
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

  return <NotesPanel recordType="listing" recordId={listing.id} />
}
