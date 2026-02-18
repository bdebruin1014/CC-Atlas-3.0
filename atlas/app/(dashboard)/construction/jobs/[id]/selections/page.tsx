"use client"

import { Palette } from "lucide-react"
import { useJobContext } from "../layout"

export default function SelectionsPage() {
  const { job } = useJobContext()

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Palette className="h-12 w-12 mb-4" />
      <h2 className="text-lg font-semibold text-foreground">Selections</h2>
      <p className="text-sm mt-1">
        Selection management for {job.name} is coming soon.
      </p>
    </div>
  )
}
