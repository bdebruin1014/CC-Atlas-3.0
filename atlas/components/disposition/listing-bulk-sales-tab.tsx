"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FormField } from "@/components/shared/form-section"
import { useBulkSaleAgreements, useCreateBulkSale, useTakedownSchedule, useCreateTakedown, type BulkSaleDetail } from "@/lib/hooks/use-disposition"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { toast } from "@/lib/hooks/use-toast"
import { Plus, FileText } from "lucide-react"
import type { BulkSaleStatus } from "@/lib/supabase/types"

const BS_V: Record<string, "warning" | "blue" | "success" | "error" | "gray"> = { negotiating: "warning", active: "blue", complete: "success", terminated: "error" }
const TD_V: Record<string, "blue" | "warning" | "success" | "error" | "gray"> = { scheduled: "blue", upcoming: "warning", completed: "success", delayed: "error" }

export function ListingBulkSalesTab({ listingId, projectId }: { listingId: string; projectId: string }) {
  const { data: agreements, isLoading } = useBulkSaleAgreements(projectId)
  const createBulk = useCreateBulkSale()
  const [agreeOpen, setAgreeOpen] = useState(false)
  const [f, setF] = useState({ buyer: "", lots: "", pricePer: "", contractDate: "", escRate: "", escPeriod: "", notes: "" })
  const upd = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  const totalPrice = (Number(f.lots) || 0) * (Number(f.pricePer) || 0)

  async function submitAgreement() {
    try {
      await createBulk.mutateAsync({
        project_id: projectId, buyer_entity_name: f.buyer || null, total_lots: Number(f.lots) || null,
        price_per_lot: Number(f.pricePer) || null, total_price: totalPrice || null,
        contract_date: f.contractDate || null, escalation_rate: Number(f.escRate) || null,
        escalation_period: f.escPeriod || null, notes: f.notes || null,
      })
      toast({ title: "Agreement created" }); setAgreeOpen(false)
      setF({ buyer: "", lots: "", pricePer: "", contractDate: "", escRate: "", escPeriod: "", notes: "" })
    } catch { toast({ title: "Failed to create agreement", variant: "destructive" }) }
  }

  if (isLoading) return <div className="py-12 text-center text-[13px] text-muted-foreground">Loading…</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-medium text-foreground">Bulk Sale Agreements</h2>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAgreeOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />New Agreement
        </Button>
      </div>

      {!(agreements?.length) ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground">No bulk sale agreements yet</p>
        </div>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {agreements.map((a) => (
            <AccordionItem key={a.id} value={a.id} className="rounded-lg border border-border">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex flex-1 items-center gap-4 text-[13px]">
                  <span className="font-medium">{a.buyer_entity_name || "Unknown Buyer"}</span>
                  <span className="text-muted-foreground">{a.total_lots ?? 0} lots</span>
                  <span className="text-muted-foreground">{formatCurrency(a.price_per_lot)}/lot</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(a.total_price)}</span>
                  <Badge variant={BS_V[a.status] ?? "gray"}>{a.status}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="mb-3 grid grid-cols-4 gap-3 text-[12px]">
                  <div><span className="text-muted-foreground">Contract Date</span><p>{formatDate(a.contract_date)}</p></div>
                  <div><span className="text-muted-foreground">Escalation</span><p>{a.escalation_rate ? `${a.escalation_rate}% / ${a.escalation_period ?? "—"}` : "—"}</p></div>
                  <div><span className="text-muted-foreground">Buyer Contact</span><p>{a.buyer ? `${a.buyer.first_name} ${a.buyer.last_name}` : "—"}</p></div>
                  <div><span className="text-muted-foreground">Notes</span><p className="truncate">{a.notes || "—"}</p></div>
                </div>
                <TakedownSection agreement={a} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Dialog open={agreeOpen} onOpenChange={setAgreeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Bulk Sale Agreement</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Buyer Entity" required><Input value={f.buyer} onChange={(e) => upd("buyer", e.target.value)} /></FormField>
            <FormField label="Total Lots" required><Input type="number" value={f.lots} onChange={(e) => upd("lots", e.target.value)} /></FormField>
            <FormField label="Price Per Lot" required><Input type="number" value={f.pricePer} onChange={(e) => upd("pricePer", e.target.value)} /></FormField>
            <FormField label="Total Price"><span className="text-[13px] font-semibold tabular-nums leading-9">{formatCurrency(totalPrice)}</span></FormField>
            <FormField label="Contract Date"><Input type="date" value={f.contractDate} onChange={(e) => upd("contractDate", e.target.value)} /></FormField>
            <FormField label="Escalation Rate %"><Input type="number" step="0.1" value={f.escRate} onChange={(e) => upd("escRate", e.target.value)} /></FormField>
            <FormField label="Escalation Period"><Input value={f.escPeriod} onChange={(e) => upd("escPeriod", e.target.value)} placeholder="e.g. quarterly" /></FormField>
            <FormField label="Notes" className="col-span-2"><Textarea rows={2} value={f.notes} onChange={(e) => upd("notes", e.target.value)} /></FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgreeOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={submitAgreement} disabled={createBulk.isPending || !f.buyer || !f.lots}>
              {createBulk.isPending ? "Saving…" : "Save Agreement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TakedownSection({ agreement }: { agreement: BulkSaleDetail }) {
  const { data: takedowns } = useTakedownSchedule(agreement.id)
  const createTD = useCreateTakedown()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ date: "", lots: "", lotNums: "", amount: "" })
  const nextNum = (takedowns?.length ?? 0) + 1
  const autoAmt = (Number(f.lots) || 0) * (agreement.price_per_lot ?? 0)

  async function submit() {
    try {
      await createTD.mutateAsync({ agreementId: agreement.id, takedown_number: nextNum, scheduled_date: f.date || null, lots_count: Number(f.lots) || null, lot_numbers: f.lotNums ? f.lotNums.split(",").map((s) => s.trim()) : null, scheduled_amount: autoAmt || Number(f.amount) || null })
      toast({ title: "Takedown added" }); setOpen(false); setF({ date: "", lots: "", lotNums: "", amount: "" })
    } catch { toast({ title: "Failed to add takedown", variant: "destructive" }) }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase text-muted-foreground">Takedown Schedule</span>
        <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => setOpen(true)}><Plus className="mr-1 h-3 w-3" />Add Takedown</Button>
      </div>
      {!(takedowns?.length) ? <p className="py-4 text-center text-[12px] text-muted-foreground">No takedowns scheduled</p> : (
        <Table>
          <TableHeader><TableRow className="bg-muted">
            {["#", "Scheduled", "Lots", "Amount", "Status", "Actual Date", "Actual Amt", "Variance"].map((h) => <TableHead key={h} className="text-[10px] uppercase tracking-wide">{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {takedowns.map((t) => (
              <TableRow key={t.id} className="h-9 hover:bg-[#f9fafb]">
                <TableCell className="text-[12px]">{t.takedown_number}</TableCell>
                <TableCell className="text-[12px]">{formatDate(t.scheduled_date, { short: true })}</TableCell>
                <TableCell className="text-[12px]">{t.lots_count ?? "—"}</TableCell>
                <TableCell className="text-[12px] tabular-nums">{formatCurrency(t.scheduled_amount)}</TableCell>
                <TableCell><Badge variant={TD_V[t.status] ?? "gray"} className="text-[10px]">{t.status}</Badge></TableCell>
                <TableCell className="text-[12px]">{formatDate(t.actual_date, { short: true })}</TableCell>
                <TableCell className="text-[12px] tabular-nums">{t.actual_amount != null ? formatCurrency(t.actual_amount) : "—"}</TableCell>
                <TableCell className={`text-[12px] tabular-nums ${(t.variance ?? 0) > 0 ? "text-primary" : (t.variance ?? 0) < 0 ? "text-[#ef4444]" : ""}`}>{t.variance != null ? formatCurrency(t.variance) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Takedown #{nextNum}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Scheduled Date" required><Input type="date" value={f.date} onChange={(e) => setF((p) => ({ ...p, date: e.target.value }))} /></FormField>
            <FormField label="Lots Count" required><Input type="number" value={f.lots} onChange={(e) => setF((p) => ({ ...p, lots: e.target.value }))} /></FormField>
            <FormField label="Lot Numbers" className="col-span-2"><Input value={f.lotNums} onChange={(e) => setF((p) => ({ ...p, lotNums: e.target.value }))} placeholder="e.g. 1, 2, 3" /></FormField>
            <FormField label="Scheduled Amount"><span className="text-[13px] font-semibold tabular-nums leading-9">{formatCurrency(autoAmt)}</span></FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={submit} disabled={createTD.isPending || !f.date || !f.lots}>
              {createTD.isPending ? "Saving…" : "Save Takedown"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
