"use client"

import { useParams } from "next/navigation"
import { RecordTasksPanel } from "@/components/shared/record-tasks-panel"
import { useOpportunityContext } from "../layout"

export default function OpportunityTasksPage() {
  const { id } = useParams()
  const { opportunity } = useOpportunityContext()

  return (
    <RecordTasksPanel
      recordType="opportunity"
      recordId={id as string}
      recordName={
        opportunity?.name ||
        (opportunity as any)?.address_line1 ||
        opportunity?.address_street ||
        "Opportunity"
      }
      recordUrl={`/opportunities/${id}`}
    />
  )
}
