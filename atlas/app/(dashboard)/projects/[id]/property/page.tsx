"use client"

import { Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ProjectPropertyPage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Building2 className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-semibold">Property Details</h3>
        <p className="text-xs text-muted-foreground">
          Property information, parcel data, and site details coming soon.
        </p>
      </CardContent>
    </Card>
  )
}
