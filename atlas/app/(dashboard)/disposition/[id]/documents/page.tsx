"use client"

import { useListingContext } from "../layout"
import { FileText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function ListingDocumentsPage() {
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

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-[#F9FAFB] px-6 py-24">
      <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="mb-1 text-sm font-medium text-foreground">Documents</p>
      <p className="text-[13px] text-muted-foreground">Coming soon</p>
    </div>
  )
}
