"use client"

import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import type { ListingDetail } from "@/lib/hooks/use-disposition"

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]",
  pre_listing: "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]",
  active: "bg-[#dbeafe] text-[#1e40af] border-[#93c5fd]",
  under_contract: "bg-[#fef3c7] text-[#92400e] border-[#fcd34d]",
  pending_closing: "bg-[#fef3c7] text-[#92400e] border-[#fcd34d]",
  closed: "bg-[#dcfce7] text-[#166534] border-[#86efac]",
  withdrawn: "bg-white text-[#ef4444] border-[#ef4444] border-2",
  expired: "bg-[#F3F4F6] text-[#9CA3AF] border-[#E5E7EB]",
}

export function CommunityUnitGrid({ listings, isLoading }: {
  listings: ListingDetail[]; isLoading: boolean
}) {
  if (isLoading) return <Skeleton className="h-48 w-full rounded-lg" />
  if (!listings.length) return null

  const sorted = [...listings].sort((a, b) => {
    const an = a.property_address?.match(/\d+/)?.[0] ?? a.property_address ?? ""
    const bn = b.property_address?.match(/\d+/)?.[0] ?? b.property_address ?? ""
    return an.localeCompare(bn, undefined, { numeric: true })
  })

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <h3 className="mb-2 text-[13px] font-semibold text-[#1F2937]">Unit / Lot Map</h3>
      <div className="mb-3 flex flex-wrap gap-3 text-[10px]">
        {[
          { label: "Available", cls: "bg-[#F3F4F6] border-[#E5E7EB]" },
          { label: "Active", cls: "bg-[#dbeafe] border-[#93c5fd]" },
          { label: "Under Contract", cls: "bg-[#fef3c7] border-[#fcd34d]" },
          { label: "Closed", cls: "bg-[#dcfce7] border-[#86efac]" },
          { label: "Withdrawn", cls: "bg-white border-[#ef4444] border-2" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded border ${l.cls}`} />{l.label}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((l) => (
          <Link key={l.id} href={`/disposition/${l.id}`}
            className={`flex h-10 w-14 items-center justify-center rounded border text-[11px] font-medium transition-shadow hover:shadow-md ${STATUS_COLORS[l.status] ?? STATUS_COLORS.draft}`}>
            {l.property_address?.match(/\d+$/)?.[0] ?? l.listing_number ?? "—"}
          </Link>
        ))}
      </div>
    </div>
  )
}
