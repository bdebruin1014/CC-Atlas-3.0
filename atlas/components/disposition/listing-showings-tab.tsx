"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FormField } from "@/components/shared/form-section"
import { useShowings, useCreateShowing } from "@/lib/hooks/use-disposition"
import { toast } from "@/lib/hooks/use-toast"
import { Plus, CheckCircle2, Calendar } from "lucide-react"
import type { DispositionShowing, ShowingInterestLevel } from "@/lib/supabase/types"

const INTEREST: Record<string, { label: string; variant: "gray" | "warning" | "blue" | "success" }> = {
  not_interested: { label: "Not Interested", variant: "gray" },
  somewhat: { label: "Somewhat", variant: "warning" },
  very_interested: { label: "Very Interested", variant: "blue" },
  making_offer: { label: "Making Offer", variant: "success" },
}

export function ListingShowingsTab({ listingId }: { listingId: string }) {
  const { data: showings, isLoading } = useShowings(listingId)
  const createShowing = useCreateShowing()
  const [open, setOpen] = useState(false)
  const count = showings?.length ?? 0

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-medium text-[#1F2937]">Showings</h2>
          <Badge variant="secondary" className="text-xs">{count}</Badge>
        </div>
        <Button size="sm" className="bg-[#1a5632] text-white hover:bg-[#164528]" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />Schedule Showing
        </Button>
      </div>
      {isLoading ? (
        <div className="py-12 text-center text-[13px] text-[#5A6B75]">Loading…</div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[#E5E7EB] py-16">
          <Calendar className="h-10 w-10 text-[#9CA3AF]" />
          <p className="text-[13px] text-[#5A6B75]">No showings recorded yet</p>
          <Button size="sm" className="bg-[#1a5632] text-white hover:bg-[#164528]" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />Schedule Showing
          </Button>
        </div>
      ) : (
        <ShowingsTable showings={showings!} />
      )}
      <ShowingDialog listingId={listingId} open={open} onOpenChange={setOpen} create={createShowing} />
    </div>
  )
}

function ShowingsTable({ showings }: { showings: DispositionShowing[] }) {
  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F3F4F6]">
            {["Date/Time", "Agent Name", "Company", "Interest Level", "Feedback", "Follow-up"].map((h) => (
              <TableHead key={h} className="text-[11px] uppercase tracking-wide">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {showings.map((s) => (
            <TableRow key={s.id} className="h-10 hover:bg-[#f9fafb]">
              <TableCell className="text-[13px]">{s.showing_date ? format(new Date(s.showing_date), "MMM d, yyyy h:mm a") : "—"}</TableCell>
              <TableCell className="text-[13px]">{s.showing_agent_name || "—"}</TableCell>
              <TableCell className="text-[13px]">{s.showing_agent_company || "—"}</TableCell>
              <TableCell>
                {s.interest_level ? <Badge variant={INTEREST[s.interest_level]?.variant ?? "gray"}>{INTEREST[s.interest_level]?.label ?? s.interest_level}</Badge> : <span className="text-[13px] text-[#9CA3AF]">—</span>}
              </TableCell>
              <TableCell className="max-w-[200px] text-[13px]">
                {s.feedback ? (s.feedback.length > 50 ? (
                  <Tooltip><TooltipTrigger asChild><span className="block cursor-default truncate">{s.feedback.slice(0, 50)}…</span></TooltipTrigger><TooltipContent className="max-w-xs"><p>{s.feedback}</p></TooltipContent></Tooltip>
                ) : s.feedback) : "—"}
              </TableCell>
              <TableCell>
                {s.follow_up_needed ? (
                  <Tooltip><TooltipTrigger asChild><span className="inline-flex items-center gap-1 text-[#1a5632]"><CheckCircle2 className="h-4 w-4" />{s.follow_up_date && <span className="text-[12px]">{format(new Date(s.follow_up_date), "M/d")}</span>}</span></TooltipTrigger><TooltipContent>{s.follow_up_notes || "Follow-up needed"}</TooltipContent></Tooltip>
                ) : <span className="text-[13px] text-[#9CA3AF]">—</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}

function ShowingDialog({ listingId, open, onOpenChange, create }: {
  listingId: string; open: boolean; onOpenChange: (v: boolean) => void; create: ReturnType<typeof useCreateShowing>
}) {
  const [f, setF] = useState({ date: "", time: "", name: "", company: "", phone: "", email: "", feedback: "", interest: "", followUp: false, followDate: "", followNotes: "" })
  const upd = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  const reset = () => setF({ date: "", time: "", name: "", company: "", phone: "", email: "", feedback: "", interest: "", followUp: false, followDate: "", followNotes: "" })

  async function submit() {
    try {
      await create.mutateAsync({
        listingId,
        showing_date: f.date && f.time ? `${f.date}T${f.time}` : f.date || null,
        showing_agent_name: f.name || null, showing_agent_company: f.company || null,
        showing_agent_phone: f.phone || null, showing_agent_email: f.email || null,
        feedback: f.feedback || null, interest_level: (f.interest || null) as ShowingInterestLevel | null,
        follow_up_needed: f.followUp, follow_up_date: f.followDate || null, follow_up_notes: f.followNotes || null,
      })
      toast({ title: "Showing scheduled" }); reset(); onOpenChange(false)
    } catch { toast({ title: "Failed to schedule showing", variant: "destructive" }) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Schedule Showing</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date" required><Input type="date" value={f.date} onChange={(e) => upd("date", e.target.value)} /></FormField>
          <FormField label="Time"><Input type="time" value={f.time} onChange={(e) => upd("time", e.target.value)} /></FormField>
          <FormField label="Agent Name" required><Input value={f.name} onChange={(e) => upd("name", e.target.value)} /></FormField>
          <FormField label="Company"><Input value={f.company} onChange={(e) => upd("company", e.target.value)} /></FormField>
          <FormField label="Phone"><Input value={f.phone} onChange={(e) => upd("phone", e.target.value)} /></FormField>
          <FormField label="Email"><Input type="email" value={f.email} onChange={(e) => upd("email", e.target.value)} /></FormField>
        </div>
        <div className="mt-2 border-t border-[#E5E7EB] pt-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.3px] text-[#6B7280]">After the Showing</p>
          <div className="space-y-4">
            <FormField label="Feedback"><Textarea rows={2} value={f.feedback} onChange={(e) => upd("feedback", e.target.value)} placeholder="Agent feedback…" /></FormField>
            <FormField label="Interest Level">
              <Select value={f.interest} onValueChange={(v) => upd("interest", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{Object.entries(INTEREST).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={f.followUp} onCheckedChange={(v) => upd("followUp", v === true)} />
              <span className="text-[13px] text-[#1F2937]">Follow-up Needed</span>
            </label>
            {f.followUp && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Follow-up Date"><Input type="date" value={f.followDate} onChange={(e) => upd("followDate", e.target.value)} /></FormField>
                <FormField label="Follow-up Notes" className="col-span-2"><Textarea rows={2} value={f.followNotes} onChange={(e) => upd("followNotes", e.target.value)} /></FormField>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-[#1a5632] text-white hover:bg-[#164528]" onClick={submit} disabled={create.isPending || !f.date || !f.name}>
            {create.isPending ? "Saving…" : "Save Showing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
