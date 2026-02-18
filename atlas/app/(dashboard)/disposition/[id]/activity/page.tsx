"use client"

import { useListingContext } from "../layout"
import { Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function ListingActivityPage() {
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

  const sample = [
    { label: "Listing created", time: "Initial setup" },
    { label: "Price changed", time: "Price adjustment" },
    { label: "Offer received", time: "Buyer submitted offer" },
    { label: "Contract signed", time: "Under contract" },
  ]

  return (
    <div>
      <p className="mb-4 text-[13px] text-muted-foreground">
        Activity log coming soon
      </p>
      <div className="relative border-l-2 border-border pl-6">
        {sample.map((e, i) => (
          <div key={i} className="relative mb-6 last:mb-0">
            <div className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-border bg-white">
              <Clock className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-[13px] font-medium text-foreground">{e.label}</p>
            <p className="text-[12px] text-muted-foreground">{e.time}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
