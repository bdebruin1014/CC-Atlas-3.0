"use client"

import { Landmark } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ProjectLoansPage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Landmark className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-semibold">Loan Tracking</h3>
        <p className="text-xs text-muted-foreground">
          Construction loans, draws, and payoff tracking coming soon.
        </p>
      </CardContent>
    </Card>
  )
}
