"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { FormSection, FormGrid, FormField } from "@/components/shared/form-section"
import { useCreateOffer } from "@/lib/hooks/use-disposition"
import { toast } from "@/lib/hooks/use-toast"
import type { OfferFinancingType } from "@/lib/supabase/types"

const FINANCING: Record<string, string> = {
  cash: "Cash", conventional: "Conventional", fha: "FHA", va: "VA", usda: "USDA", other: "Other",
}

const empty = () => ({
  buyer_name: "", buyer_agent_name: "", buyer_agent_company: "", buyer_agent_email: "", buyer_agent_phone: "",
  offer_price: "", earnest_money: "", em_due_date: "", financing_type: "" as string,
  loan_amount: "", down_payment: "",
  closing_cost_assistance: "", other_concessions: "", concession_notes: "",
  contingency_financing: false, contingency_inspection: false, contingency_appraisal: false, contingency_sale: false,
  proposed_closing_date: "", proposed_possession_date: "", expiration_date: "",
  notes: "",
})

interface Props { listingId: string; open: boolean; onOpenChange: (v: boolean) => void }

export function OfferFormDialog({ listingId, open, onOpenChange }: Props) {
  const [f, setF] = useState(empty)
  const create = useCreateOffer()
  const upd = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  const num = (v: string) => { const n = Number(v); return v === "" || isNaN(n) ? null : n }

  async function submit() {
    try {
      await create.mutateAsync({
        listingId,
        buyer_name: f.buyer_name || null, buyer_agent_name: f.buyer_agent_name || null,
        buyer_agent_company: f.buyer_agent_company || null, buyer_agent_email: f.buyer_agent_email || null,
        buyer_agent_phone: f.buyer_agent_phone || null,
        offer_price: num(f.offer_price), earnest_money: num(f.earnest_money), em_due_date: f.em_due_date || null,
        financing_type: (f.financing_type || null) as OfferFinancingType | null,
        loan_amount: num(f.loan_amount), down_payment: num(f.down_payment),
        closing_cost_assistance: num(f.closing_cost_assistance), other_concessions: num(f.other_concessions),
        concession_notes: f.concession_notes || null,
        contingency_financing: f.contingency_financing, contingency_inspection: f.contingency_inspection,
        contingency_appraisal: f.contingency_appraisal, contingency_sale: f.contingency_sale,
        proposed_closing_date: f.proposed_closing_date || null, proposed_possession_date: f.proposed_possession_date || null,
        expiration_date: f.expiration_date || null, notes: f.notes || null,
      })
      toast({ title: "Offer recorded" }); setF(empty()); onOpenChange(false)
    } catch { toast({ title: "Failed to record offer", variant: "destructive" }) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Record Offer</DialogTitle></DialogHeader>
        <FormSection title="Buyer" className="mt-0">
          <FormGrid>
            <FormField label="Buyer Name" required><Input value={f.buyer_name} onChange={(e) => upd("buyer_name", e.target.value)} /></FormField>
            <FormField label="Buyer Agent Name"><Input value={f.buyer_agent_name} onChange={(e) => upd("buyer_agent_name", e.target.value)} /></FormField>
            <FormField label="Company"><Input value={f.buyer_agent_company} onChange={(e) => upd("buyer_agent_company", e.target.value)} /></FormField>
            <FormField label="Email"><Input type="email" value={f.buyer_agent_email} onChange={(e) => upd("buyer_agent_email", e.target.value)} /></FormField>
            <FormField label="Phone"><Input value={f.buyer_agent_phone} onChange={(e) => upd("buyer_agent_phone", e.target.value)} /></FormField>
          </FormGrid>
        </FormSection>
        <FormSection title="Terms">
          <FormGrid>
            <FormField label="Offer Price" required><Input type="number" value={f.offer_price} onChange={(e) => upd("offer_price", e.target.value)} /></FormField>
            <FormField label="Earnest Money"><Input type="number" value={f.earnest_money} onChange={(e) => upd("earnest_money", e.target.value)} /></FormField>
            <FormField label="EM Due Date"><Input type="date" value={f.em_due_date} onChange={(e) => upd("em_due_date", e.target.value)} /></FormField>
            <FormField label="Financing Type">
              <Select value={f.financing_type} onValueChange={(v) => upd("financing_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{Object.entries(FINANCING).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Loan Amount"><Input type="number" value={f.loan_amount} onChange={(e) => upd("loan_amount", e.target.value)} /></FormField>
            <FormField label="Down Payment"><Input type="number" value={f.down_payment} onChange={(e) => upd("down_payment", e.target.value)} /></FormField>
          </FormGrid>
        </FormSection>
        <FormSection title="Concessions">
          <FormGrid>
            <FormField label="Closing Cost Assistance"><Input type="number" value={f.closing_cost_assistance} onChange={(e) => upd("closing_cost_assistance", e.target.value)} /></FormField>
            <FormField label="Other Concessions"><Input type="number" value={f.other_concessions} onChange={(e) => upd("other_concessions", e.target.value)} /></FormField>
            <FormField label="Concession Notes" className="md:col-span-2"><Textarea rows={2} value={f.concession_notes} onChange={(e) => upd("concession_notes", e.target.value)} /></FormField>
          </FormGrid>
        </FormSection>
        <FormSection title="Contingencies">
          <div className="grid grid-cols-2 gap-3">
            {([["contingency_financing", "Financing"], ["contingency_inspection", "Inspection"], ["contingency_appraisal", "Appraisal"], ["contingency_sale", "Sale of Buyer's Home"]] as const).map(([k, l]) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-[#F9FAFB]">
                <Checkbox checked={f[k]} onCheckedChange={(v) => upd(k, v === true)} />
                <span className="text-[13px] text-foreground">{l}</span>
              </label>
            ))}
          </div>
        </FormSection>
        <FormSection title="Dates">
          <FormGrid cols={3}>
            <FormField label="Proposed Closing Date"><Input type="date" value={f.proposed_closing_date} onChange={(e) => upd("proposed_closing_date", e.target.value)} /></FormField>
            <FormField label="Proposed Possession Date"><Input type="date" value={f.proposed_possession_date} onChange={(e) => upd("proposed_possession_date", e.target.value)} /></FormField>
            <FormField label="Offer Expiration"><Input type="datetime-local" value={f.expiration_date} onChange={(e) => upd("expiration_date", e.target.value)} /></FormField>
          </FormGrid>
        </FormSection>
        <FormSection title="Notes">
          <Textarea rows={3} value={f.notes} onChange={(e) => upd("notes", e.target.value)} placeholder="Additional notes…" />
        </FormSection>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={submit} disabled={create.isPending || !f.buyer_name || !f.offer_price}>
            {create.isPending ? "Saving…" : "Save Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
