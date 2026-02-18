"use client"

import { Workflow } from "lucide-react"

export default function AutomationsPage() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
        <Workflow className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">Automations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This feature is coming soon.
      </p>
    </div>
  )
}
