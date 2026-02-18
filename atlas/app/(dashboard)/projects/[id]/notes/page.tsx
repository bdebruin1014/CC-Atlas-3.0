"use client"

import { useParams } from "next/navigation"
import { NotesPanel } from "@/components/shared/notes-panel"

// ---------------------------------------------------------------------------
// Notes Page
// ---------------------------------------------------------------------------

export default function ProjectNotesPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <NotesPanel recordType="project" recordId={projectId} />
  )
}
