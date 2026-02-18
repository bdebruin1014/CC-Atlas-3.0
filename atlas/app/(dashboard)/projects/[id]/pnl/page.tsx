"use client"

import { TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ProjectPnlPage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-semibold">Profit & Loss</h3>
        <p className="text-xs text-muted-foreground">
          Project P&L statement and profitability analysis coming soon.
        </p>
      </CardContent>
    </Card>
  )
}
