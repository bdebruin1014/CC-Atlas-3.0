"use client"

import { ArrowDownUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ProjectCashFlowPage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <ArrowDownUp className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-semibold">Cash Flow</h3>
        <p className="text-xs text-muted-foreground">
          Cash flow projections and actuals coming soon.
        </p>
      </CardContent>
    </Card>
  )
}
