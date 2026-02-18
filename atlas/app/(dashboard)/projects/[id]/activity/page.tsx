"use client"

import { Activity } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ProjectActivityPage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Activity className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-semibold">Activity Log</h3>
        <p className="text-xs text-muted-foreground">
          A full activity log for this project will appear here.
        </p>
      </CardContent>
    </Card>
  )
}
