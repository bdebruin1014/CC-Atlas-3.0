"use client"

import { useParams } from "next/navigation"
import { useListing, useContract } from "@/lib/hooks/use-disposition"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ListingOverviewTab } from "@/components/disposition/listing-overview-tab"
import { ListingMarketingTab } from "@/components/disposition/listing-marketing-tab"
import { ListingShowingsTab } from "@/components/disposition/listing-showings-tab"
import { ListingOffersTab } from "@/components/disposition/listing-offers-tab"
import { ListingContractTab } from "@/components/disposition/listing-contract-tab"
import { ListingSettlementTab } from "@/components/disposition/listing-settlement-tab"
import { ListingCostsTab } from "@/components/disposition/listing-costs-tab"
import { ListingBulkSalesTab } from "@/components/disposition/listing-bulk-sales-tab"
import { ListingDocumentsTab, ListingTasksTab, ListingNotesTab, ListingActivityTab } from "@/components/disposition/listing-utility-tabs"

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: listing, isLoading } = useListing(id)
  const { data: contract } = useContract(id)

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (!listing) {
    return <div className="flex h-64 items-center justify-center text-[#5A6B75]">Listing not found</div>
  }

  const hasContract = contract != null || listing.active_contracts_count > 0
  const showSettlement = contract?.status === "clear_to_close" || contract?.status === "closed"
  const isLotDev = listing.project?.type === "lot_development"
  const listingName = listing.property_address || "Untitled Listing"

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-semibold text-[#1F2937]">{listingName}</h1>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="showings">Showings</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          {hasContract && <TabsTrigger value="contract">Contract</TabsTrigger>}
          {showSettlement && <TabsTrigger value="settlement">Settlement</TabsTrigger>}
          <TabsTrigger value="costs">Costs</TabsTrigger>
          {isLotDev && <TabsTrigger value="bulk-sales">Bulk Sales</TabsTrigger>}
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><ListingOverviewTab listing={listing} /></TabsContent>
        <TabsContent value="marketing"><ListingMarketingTab listing={listing} /></TabsContent>
        <TabsContent value="showings"><ListingShowingsTab listingId={listing.id} /></TabsContent>
        <TabsContent value="offers"><ListingOffersTab listingId={listing.id} /></TabsContent>
        {hasContract && <TabsContent value="contract"><ListingContractTab listingId={listing.id} /></TabsContent>}
        {showSettlement && <TabsContent value="settlement"><ListingSettlementTab listingId={listing.id} /></TabsContent>}
        <TabsContent value="costs"><ListingCostsTab listingId={listing.id} /></TabsContent>
        {isLotDev && listing.project && (
          <TabsContent value="bulk-sales"><ListingBulkSalesTab listingId={listing.id} projectId={listing.project.id} /></TabsContent>
        )}
        <TabsContent value="documents"><ListingDocumentsTab listingId={listing.id} /></TabsContent>
        <TabsContent value="tasks"><ListingTasksTab listingId={listing.id} listingName={listingName} /></TabsContent>
        <TabsContent value="notes"><ListingNotesTab listingId={listing.id} /></TabsContent>
        <TabsContent value="activity"><ListingActivityTab listingId={listing.id} /></TabsContent>
      </Tabs>
    </div>
  )
}
