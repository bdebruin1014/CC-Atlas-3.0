"use client"

import { useParams } from "next/navigation"
import { NotesPanel } from "@/components/shared/notes-panel"

export default function OpportunityNotesPage() {
  const { id } = useParams()
  return <NotesPanel recordType="opportunity" recordId={id as string} />
}
