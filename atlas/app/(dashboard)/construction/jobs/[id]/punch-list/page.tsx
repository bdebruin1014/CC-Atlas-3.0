"use client"

import { ClipboardList } from "lucide-react"
import { useJobContext } from "../layout"

export default function PunchListPage() {
  const { job } = useJobContext()

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <ClipboardList className="h-12 w-12 mb-4" />
      <h2 className="text-lg font-semibold text-foreground">Punch List</h2>
      <p className="text-sm mt-1">
        Punch list management for {job.name} is coming soon.
      </p>
    </div>
  )
}
