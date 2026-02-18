"use client"

import { Receipt } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ProjectDrawRequestsPage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Receipt className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-semibold">GC Draw Requests</h3>
        <p className="text-xs text-muted-foreground">
          Track and manage general contractor draw requests coming soon.
        </p>
      </CardContent>
    </Card>
  )
}
