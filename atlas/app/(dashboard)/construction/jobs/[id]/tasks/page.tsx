"use client"

import { RecordTasksPanel } from "@/components/shared/record-tasks-panel"
import { useJobContext } from "../layout"

export default function TasksPage() {
  const { job, jobId } = useJobContext()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Manage tasks for {job.name}
        </p>
      </div>
      <RecordTasksPanel
        recordType="job"
        recordId={jobId}
        recordName={job.name}
        recordUrl={`/construction/jobs/${jobId}`}
      />
    </div>
  )
}
