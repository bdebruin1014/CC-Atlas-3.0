"use client"

import { Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ProjectInvestorsPage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Users className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-semibold">Investor Returns</h3>
        <p className="text-xs text-muted-foreground">
          Investor equity tracking, distributions, and return calculations coming soon.
        </p>
      </CardContent>
    </Card>
  )
}
