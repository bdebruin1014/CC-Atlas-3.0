"use client"

import { FileText } from "lucide-react"
import { useJobContext } from "../layout"

export default function PurchaseOrdersPage() {
  const { job } = useJobContext()

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <FileText className="h-12 w-12 mb-4" />
      <h2 className="text-lg font-semibold text-foreground">Purchase Orders</h2>
      <p className="text-sm mt-1">
        Purchase order management for {job.name} is coming soon.
      </p>
    </div>
  )
}
