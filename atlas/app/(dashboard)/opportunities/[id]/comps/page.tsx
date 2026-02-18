"use client"

import { useParams } from "next/navigation"
import { CompsTable } from "@/components/opportunities/comps-table"

export default function OpportunityCompsPage() {
  const { id } = useParams()
  return <CompsTable opportunityId={id as string} />
}
