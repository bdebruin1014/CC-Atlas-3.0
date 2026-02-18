"use client"

import { useParams, useRouter } from "next/navigation"
import { DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// ---------------------------------------------------------------------------
// Budgets Page — Links to the full budget sub-module
// ---------------------------------------------------------------------------

export default function ProjectBudgetsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <DollarSign className="h-10 w-10 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Budget & Actuals</h3>
        <p className="text-sm text-muted-foreground">
          View the full budget breakdown, expenses, and draw schedule.
        </p>
        <Button onClick={() => router.push(`/projects/${projectId}/budget`)}>
          Open Budget & Actuals
        </Button>
      </CardContent>
    </Card>
  )
}
