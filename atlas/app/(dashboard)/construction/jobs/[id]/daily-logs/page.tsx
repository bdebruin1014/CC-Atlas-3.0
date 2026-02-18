"use client"

import { CalendarDays } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useJobContext } from "../layout"

export default function DailyLogsPage() {
  const router = useRouter()
  const { job, jobId } = useJobContext()

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <CalendarDays className="h-12 w-12 mb-4" />
      <h2 className="text-lg font-semibold text-foreground">Daily Logs</h2>
      <p className="text-sm mt-1 mb-4">
        Daily construction logs for {job.name}
      </p>
      <Button
        variant="outline"
        onClick={() => router.push(`/construction/jobs/${jobId}/daily-log`)}
      >
        Open Daily Log Calendar
      </Button>
    </div>
  )
}
