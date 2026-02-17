"use client"

import { useState } from "react"
import { FormSection, FormGrid, FormField } from "@/components/shared/form-section"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useContract, useUpdateContract, type ContractDetail } from "@/lib/hooks/use-disposition"
import { formatCurrency, formatDate, cn } from "@/lib/utils/format"
import { toast } from "@/lib/hooks/use-toast"
import { Save, FileText, Check, Clock, Minus } from "lucide-react"
import type { DispositionContractStatus } from "@/lib/supabase/types"

const STATUS_OPTS: Record<string, string> = {
  pending: "Pending", active: "Active", contingent: "Contingent",
  clear_to_close: "Clear to Close", closed: "Closed", terminated: "Terminated", cancelled: "Cancelled",
}
const STATUS_VARIANT: Record<string, "gray" | "blue" | "warning" | "success" | "error" | "default"> = {
  pending: "gray", active: "blue", contingent: "warning",
  clear_to_close: "success", closed: "success", terminated: "error", cancelled: "gray",
}
const INSP_OPTS = ["pending", "scheduled", "passed", "failed", "waived"] as const
const APPR_OPTS = ["pending", "ordered", "received", "approved", "disputed", "waived"] as const
const FIN_OPTS = ["pending", "pre_approved", "underwriting", "clear_to_close", "denied"] as const
const MILESTONE_VARIANT: Record<string, "gray" | "blue" | "warning" | "success" | "error"> = {
  pending: "gray", scheduled: "blue", ordered: "blue", pre_approved: "blue", underwriting: "warning",
  passed: "success", received: "success", approved: "success", clear_to_close: "success",
  failed: "error", disputed: "warning", denied: "error", waived: "gray",
}

const TIMELINE_STEPS = [
  "Contract Signed", "Earnest Money", "Inspection", "Appraisal", "Financing", "Title",
  "Survey", "Final Walk-Through", "Clear to Close", "Closing", "Recording", "Possession",
] as const

export function ListingContractTab({ listingId }: { listingId: string }) {
  const { data: contract, isLoading } = useContract(listingId)

  if (isLoading) return <div className="py-12 text-center text-[13px] text-[#5A6B75]">Loading…</div>
  if (!contract) return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[#E5E7EB] py-16">
      <FileText className="h-10 w-10 text-[#9CA3AF]" />
      <p className="text-[13px] text-[#5A6B75]">No contract yet. Accept an offer to create a contract.</p>
    </div>
  )

  return (
    <div>
      <ClosingTimeline contract={contract} />
      <ContractForm contract={contract} listingId={listingId} />
      <BuyerMilestones contract={contract} />
      <KeyDates contract={contract} />
    </div>
  )
}

function ClosingTimeline({ contract }: { contract: ContractDetail }) {
  const completedIdx = getCompletedIndex(contract)
  return (
    <div className="mb-6 overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white p-4">
      <div className="relative flex min-w-[700px] items-start justify-between">
        <div className="absolute left-4 right-4 top-3 h-0.5 bg-[#E5E7EB]" />
        <div className="absolute left-4 top-3 h-0.5 bg-[#1a5632]" style={{ width: `${Math.max(0, (completedIdx / (TIMELINE_STEPS.length - 1)) * 100)}%` }} />
        {TIMELINE_STEPS.map((step, i) => {
          const done = i <= completedIdx
          const current = i === completedIdx + 1
          return (
            <div key={step} className="relative z-10 flex w-16 flex-col items-center">
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border-2",
                done ? "border-[#1a5632] bg-[#1a5632] text-white" : current ? "border-[#2563eb] bg-white text-[#2563eb]" : "border-[#E5E7EB] bg-white text-[#9CA3AF]"
              )}>
                {done ? <Check className="h-3 w-3" /> : current ? <Clock className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              </div>
              <span className={cn("mt-1.5 text-center text-[10px] leading-tight", done ? "font-medium text-[#1a5632]" : current ? "font-medium text-[#2563eb]" : "text-[#9CA3AF]")}>{step}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ContractForm({ contract, listingId }: { contract: ContractDetail; listingId: string }) {
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState(() => ({ ...contract }))
  const update = useUpdateContract()
  const upd = (k: string, v: string | number | null) => setF((p) => ({ ...p, [k]: v }))
  const num = (v: string) => { const n = Number(v); return v === "" || isNaN(n) ? null : n }

  async function save() {
    try {
      await update.mutateAsync({
        listingId, id: contract.id, status: f.status, effective_date: f.effective_date,
        purchase_price: f.purchase_price, earnest_money: f.earnest_money,
        seller_entity: f.seller_entity, buyer_entity: f.buyer_entity,
        title_company: f.title_company, escrow_officer: f.escrow_officer, escrow_number: f.escrow_number,
        closing_attorney: f.closing_attorney, dd_deadline: f.dd_deadline, financing_deadline: f.financing_deadline,
        appraisal_deadline: f.appraisal_deadline, closing_date: f.closing_date, possession_date: f.possession_date,
      })
      toast({ title: "Contract updated" }); setEditing(false)
    } catch { toast({ title: "Failed to update", variant: "destructive" }) }
  }

  const txt = (v: string | number | null | undefined, fmt?: "currency" | "date") =>
    <span className="text-[13px]">{fmt === "currency" ? formatCurrency(v as number) : fmt === "date" ? formatDate(v as string) : (v ?? "—")}</span>

  return (
    <FormSection title="Contract Details">
      <div className="mb-3 flex justify-end gap-2">
        {editing ? (
          <>
            <Button size="sm" variant="outline" onClick={() => { setF({ ...contract }); setEditing(false) }}>Cancel</Button>
            <Button size="sm" className="bg-[#1a5632] text-white hover:bg-[#164528]" onClick={save} disabled={update.isPending}><Save className="mr-1 h-3.5 w-3.5" />{update.isPending ? "Saving…" : "Save"}</Button>
          </>
        ) : <Button size="sm" variant="outline" onClick={() => { setF({ ...contract }); setEditing(true) }}>Edit</Button>}
      </div>
      <FormGrid>
        <FormField label="Status">
          {editing ? (
            <Select value={f.status} onValueChange={(v) => upd("status", v as DispositionContractStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(STATUS_OPTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          ) : <Badge variant={STATUS_VARIANT[contract.status] ?? "gray"}>{STATUS_OPTS[contract.status] ?? contract.status}</Badge>}
        </FormField>
        <FormField label="Effective Date">{editing ? <Input type="date" value={f.effective_date ?? ""} onChange={(e) => upd("effective_date", e.target.value || null)} /> : txt(contract.effective_date, "date")}</FormField>
        <FormField label="Purchase Price">{editing ? <Input type="number" value={f.purchase_price ?? ""} onChange={(e) => upd("purchase_price", num(e.target.value))} /> : txt(contract.purchase_price, "currency")}</FormField>
        <FormField label="Earnest Money">{editing ? <Input type="number" value={f.earnest_money ?? ""} onChange={(e) => upd("earnest_money", num(e.target.value))} /> : txt(contract.earnest_money, "currency")}</FormField>
        <FormField label="Seller Entity">{editing ? <Input value={f.seller_entity ?? ""} onChange={(e) => upd("seller_entity", e.target.value || null)} /> : txt(contract.seller_entity)}</FormField>
        <FormField label="Buyer Entity">{editing ? <Input value={f.buyer_entity ?? ""} onChange={(e) => upd("buyer_entity", e.target.value || null)} /> : txt(contract.buyer_entity)}</FormField>
        <FormField label="Title Company">{editing ? <Input value={f.title_company ?? ""} onChange={(e) => upd("title_company", e.target.value || null)} /> : txt(contract.title_company)}</FormField>
        <FormField label="Escrow Officer">{editing ? <Input value={f.escrow_officer ?? ""} onChange={(e) => upd("escrow_officer", e.target.value || null)} /> : txt(contract.escrow_officer)}</FormField>
        <FormField label="Escrow Number">{editing ? <Input value={f.escrow_number ?? ""} onChange={(e) => upd("escrow_number", e.target.value || null)} /> : txt(contract.escrow_number)}</FormField>
        <FormField label="Closing Attorney">{editing ? <Input value={f.closing_attorney ?? ""} onChange={(e) => upd("closing_attorney", e.target.value || null)} /> : txt(contract.closing_attorney)}</FormField>
      </FormGrid>
    </FormSection>
  )
}

function BuyerMilestones({ contract }: { contract: ContractDetail }) {
  const cards = [
    { title: "Inspection", status: contract.inspection_status, date: contract.inspection_date, extra: contract.inspection_notes ? `Notes: ${contract.inspection_notes}` : null },
    { title: "Appraisal", status: contract.appraisal_status, date: contract.appraisal_date, extra: contract.appraisal_value ? `Value: ${formatCurrency(contract.appraisal_value)}` : null },
    { title: "Financing", status: contract.financing_status, date: contract.loan_commitment_date, extra: null },
  ]
  return (
    <FormSection title="Buyer Milestones">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-lg border border-[#E5E7EB] bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#1F2937]">{c.title}</span>
              {c.status && <Badge variant={MILESTONE_VARIANT[c.status] ?? "gray"}>{c.status.replace(/_/g, " ")}</Badge>}
            </div>
            <p className="text-[12px] text-[#5A6B75]">{c.date ? formatDate(c.date) : "No date set"}</p>
            {c.extra && <p className="mt-1 text-[12px] text-[#5A6B75]">{c.extra}</p>}
          </div>
        ))}
      </div>
    </FormSection>
  )
}

function KeyDates({ contract }: { contract: ContractDetail }) {
  const now = new Date()
  const dates = [
    { label: "Effective Date", value: contract.effective_date },
    { label: "DD Deadline", value: contract.dd_deadline, milestone: contract.inspection_status },
    { label: "Financing Deadline", value: contract.financing_deadline, milestone: contract.financing_status },
    { label: "Appraisal Deadline", value: contract.appraisal_deadline, milestone: contract.appraisal_status },
    { label: "Closing Date", value: contract.closing_date },
    { label: "Possession Date", value: contract.possession_date },
  ]
  return (
    <FormSection title="Key Dates">
      <FormGrid>
        {dates.map((d) => {
          const past = d.value && new Date(d.value) < now
          const complete = d.milestone && !["pending", "scheduled", "ordered", "pre_approved", "underwriting"].includes(d.milestone)
          const color = past ? (complete ? "text-[#1a5632]" : "text-[#ef4444]") : ""
          return (
            <FormField key={d.label} label={d.label}>
              <span className={cn("text-[13px]", color)}>{formatDate(d.value)}</span>
            </FormField>
          )
        })}
      </FormGrid>
    </FormSection>
  )
}

function getCompletedIndex(c: ContractDetail): number {
  if (c.status === "closed") return 11
  if (c.status === "clear_to_close") return 8
  const done = (s: string | null) => s != null && !["pending", "scheduled", "ordered", "pre_approved"].includes(s)
  if (done(c.financing_status)) return 5
  if (done(c.appraisal_status)) return 4
  if (done(c.inspection_status)) return 3
  if (c.earnest_money && c.earnest_money > 0) return 1
  if (c.effective_date) return 0
  return -1
}
