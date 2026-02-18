"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useProject } from "@/lib/hooks/use-projects"
import { useCommunityStats, useListings, type ListingDetail } from "@/lib/hooks/use-disposition"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { CommunityStatCards } from "@/components/disposition/community-stat-cards"
import { SalesVelocityChart, PricingAnalysisChart, ConcessionChart } from "@/components/disposition/community-charts"
import { CommunityUnitGrid } from "@/components/disposition/community-unit-grid"
import { CommunityUnitTable, AgentPerformanceTable } from "@/components/disposition/community-tables"
import { CommunityBulkSales } from "@/components/disposition/community-bulk-sales"
import { ArrowLeft, Download, Home } from "lucide-react"

export default function CommunityDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading: projLoading } = useProject(projectId)
  const { data: stats, isLoading: statsLoading } = useCommunityStats(projectId)
  const { data: listingsRes, isLoading: listLoading } = useListings({ project_id: projectId, page_size: 500 })

  const listings: ListingDetail[] = (listingsRes?.data ?? []) as ListingDetail[]
  const isLoading = projLoading || statsLoading || listLoading
  const isLotDev = project?.type === "lot_development"

  if (projLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-6 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!project) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Project not found</div>
  }

  if (!listings.length && !isLoading) {
    return (
      <div className="p-6">
        <Header name={project.name} />
        <div className="mt-12 flex flex-col items-center gap-3 rounded-lg border border-dashed border-[#E5E7EB] py-16">
          <Home className="h-10 w-10 text-[#9CA3AF]" />
          <p className="text-[14px] font-medium text-foreground">No listings for this project yet</p>
          <p className="text-[13px] text-muted-foreground">Create listings to see community analytics</p>
          <Link href="/disposition"><Button size="sm" className="mt-2 bg-[#1a5632] text-white hover:bg-[#164528]">Go to Disposition</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <Header name={project.name} />
      <CommunityStatCards stats={stats} isLoading={statsLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SalesVelocityChart listings={listings} stats={stats} isLoading={isLoading} />
        <PricingAnalysisChart listings={listings} isLoading={isLoading} />
      </div>

      <CommunityUnitGrid listings={listings} isLoading={isLoading} />
      <CommunityUnitTable listings={listings} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConcessionChart listings={listings} stats={stats} isLoading={isLoading} />
        <AgentPerformanceTable listings={listings} isLoading={isLoading} />
      </div>

      <CommunityBulkSales projectId={projectId} isLotDev={isLotDev} />
    </div>
  )
}

function Header({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/disposition" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{name}</h1>
          <p className="text-[13px] text-muted-foreground">Community Sales Dashboard</p>
        </div>
      </div>
      <Button variant="outline" size="sm" disabled title="Export coming soon"><Download className="mr-1.5 h-3.5 w-3.5" />Export Report</Button>
    </div>
  )
}
