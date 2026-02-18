"use client"

import { ClipboardList } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ProjectDueDiligencePage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-semibold">Due Diligence</h3>
        <p className="text-xs text-muted-foreground">
          Due diligence checklists, inspections, and reports coming soon.
        </p>
      </CardContent>
    </Card>
  )
}
