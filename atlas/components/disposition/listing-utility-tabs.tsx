"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RecordTasksPanel } from "@/components/shared/record-tasks-panel"
import { Upload, FileText, MessageSquare, Clock } from "lucide-react"

export function ListingDocumentsTab({ listingId }: { listingId: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-16">
      <Upload className="mb-3 h-10 w-10 text-[#9CA3AF]" />
      <p className="mb-2 text-[13px] text-[#5A6B75]">No documents yet</p>
      <Button variant="outline" size="sm"><FileText className="mr-1 h-3.5 w-3.5" />Upload Document</Button>
    </div>
  )
}

export function ListingTasksTab({ listingId, listingName }: { listingId: string; listingName: string }) {
  const pathname = usePathname()
  return <RecordTasksPanel recordType="listing" recordId={listingId} recordName={listingName} recordUrl={pathname} />
}

export function ListingNotesTab({ listingId }: { listingId: string }) {
  const [text, setText] = useState("")
  const [notes, setNotes] = useState<{ id: string; text: string; date: string }[]>([])

  function addNote() {
    if (!text.trim()) return
    setNotes((prev) => [{ id: crypto.randomUUID(), text: text.trim(), date: new Date().toISOString() }, ...prev])
    setText("")
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note…" className="flex-1" />
        <Button className="bg-[#1a5632] text-white hover:bg-[#164528] self-end" size="sm" onClick={addNote} disabled={!text.trim()}>
          <MessageSquare className="mr-1 h-3.5 w-3.5" />Add Note
        </Button>
      </div>
      {notes.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[#5A6B75]">No notes yet</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="rounded-md border border-[#E5E7EB] px-3 py-2">
              <p className="text-[12px] text-[#9CA3AF]">{new Date(n.date).toLocaleString()}</p>
              <p className="mt-1 text-[13px] text-[#1F2937]">{n.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ListingActivityTab({ listingId }: { listingId: string }) {
  const sample = [
    { label: "Listing created", time: "Initial setup" },
    { label: "Price changed", time: "Price adjustment" },
    { label: "Offer received", time: "Buyer submitted offer" },
    { label: "Contract signed", time: "Under contract" },
  ]
  return (
    <div>
      <p className="mb-4 text-[13px] text-[#5A6B75]">Activity log coming soon</p>
      <div className="relative border-l-2 border-[#E5E7EB] pl-6">
        {sample.map((e, i) => (
          <div key={i} className="relative mb-6 last:mb-0">
            <div className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#E5E7EB] bg-white">
              <Clock className="h-3 w-3 text-[#9CA3AF]" />
            </div>
            <p className="text-[13px] font-medium text-[#1F2937]">{e.label}</p>
            <p className="text-[12px] text-[#9CA3AF]">{e.time}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
