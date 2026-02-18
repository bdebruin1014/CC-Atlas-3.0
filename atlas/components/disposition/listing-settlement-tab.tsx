"use client"

import { useState, useMemo } from "react"
import { FormSection, FormGrid, FormField } from "@/components/shared/form-section"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useSettlement, useCreateSettlement, useUpdateSettlement, useContract, type SettlementDetail } from "@/lib/hooks/use-disposition"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { toast } from "@/lib/hooks/use-toast"
import { Save, CheckCircle2, Plus } from "lucide-react"

const STATUS_V: Record<string, "gray" | "blue" | "success"> = { pending: "gray", scheduled: "blue", closed: "success" }

export function ListingSettlementTab({ listingId }: { listingId: string }) {
  const { data: settlement, isLoading } = useSettlement(listingId)
  const { data: contract } = useContract(listingId)
  const createSettlement = useCreateSettlement()

  if (isLoading) return <div className="py-12 text-center text-[13px] text-muted-foreground">Loading…</div>

  if (!settlement) return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16">
      <p className="text-[13px] text-muted-foreground">No settlement record yet.</p>
      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={createSettlement.isPending}
        onClick={async () => {
          try {
            await createSettlement.mutateAsync({
              listingId, contract_id: contract?.id ?? "", listing_id: listingId,
              gross_sale_price: contract?.purchase_price ?? null, credit_contract_price: contract?.purchase_price ?? null,
              credit_earnest_money: contract?.earnest_money ?? null, title_company: contract?.title_company ?? null,
              closing_attorney: contract?.closing_attorney ?? null, escrow_officer: contract?.escrow_officer ?? null,
              escrow_number: contract?.escrow_number ?? null,
            })
            toast({ title: "Settlement created" })
          } catch { toast({ title: "Failed to create settlement", variant: "destructive" }) }
        }}>
        <Plus className="mr-1 h-3.5 w-3.5" />Create Settlement
      </Button>
    </div>
  )

  return <SettlementForm settlement={settlement} listingId={listingId} />
}

function SettlementForm({ settlement: s, listingId }: { settlement: SettlementDetail; listingId: string }) {
  const [f, setF] = useState(() => ({ ...s }))
  const update = useUpdateSettlement()
  const [confirmClose, setConfirmClose] = useState(false)
  const upd = (k: string, v: string | number | boolean | null) => setF((p) => ({ ...p, [k]: v }))
  const num = (v: string) => { const n = Number(v); return v === "" || isNaN(n) ? null : n }

  const totalCredits = useMemo(() => (f.credit_contract_price ?? 0) + (f.credit_earnest_money ?? 0) + (f.credit_other ?? 0), [f.credit_contract_price, f.credit_earnest_money, f.credit_other])
  const totalCharges = useMemo(() => (f.charge_commission ?? 0) + (f.charge_title_insurance ?? 0) + (f.charge_settlement_fee ?? 0) + (f.charge_recording_fees ?? 0) + (f.charge_transfer_tax ?? 0) + (f.charge_hoa_transfer ?? 0) + (f.charge_loan_payoff ?? 0) + (f.charge_prorated_taxes ?? 0) + (f.charge_other ?? 0), [f.charge_commission, f.charge_title_insurance, f.charge_settlement_fee, f.charge_recording_fees, f.charge_transfer_tax, f.charge_hoa_transfer, f.charge_loan_payoff, f.charge_prorated_taxes, f.charge_other])
  const netToSeller = totalCredits - totalCharges

  async function save() {
    try {
      const { id: _id, ...fields } = f
      await update.mutateAsync({ listingId, id: s.id, ...fields, total_credits: totalCredits, total_charges: totalCharges, net_to_seller: netToSeller })
      toast({ title: "Settlement saved" })
    } catch { toast({ title: "Failed to save", variant: "destructive" }) }
  }

  async function recordClosing() {
    try {
      await update.mutateAsync({ listingId, id: s.id, status: "closed", closing_date: f.closing_date ?? new Date().toISOString().split("T")[0] })
      toast({ title: "Closing recorded" }); setConfirmClose(false)
    } catch { toast({ title: "Failed to record closing", variant: "destructive" }) }
  }

  const isClosed = s.status === "closed"

  return (
    <div>
      {isClosed && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-accent p-3 text-[13px] text-primary">
          <CheckCircle2 className="h-4 w-4" /> Closed on {formatDate(s.closing_date)}.{s.wire_confirmation ? ` Wire received: ${s.wire_confirmation}` : ""}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] text-muted-foreground">{s.settlement_number || "—"}</span>
          <Badge variant={STATUS_V[s.status] ?? "gray"}>{s.status}</Badge>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={save} disabled={update.isPending}>
          <Save className="mr-1 h-3.5 w-3.5" />{update.isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      <FormSection title="Closing Details">
        <FormGrid>
          <FormField label="Closing Date"><Input type="date" value={f.closing_date ?? ""} onChange={(e) => upd("closing_date", e.target.value || null)} /></FormField>
          <FormField label="Title Company"><Input value={f.title_company ?? ""} onChange={(e) => upd("title_company", e.target.value || null)} /></FormField>
          <FormField label="Closing Attorney"><Input value={f.closing_attorney ?? ""} onChange={(e) => upd("closing_attorney", e.target.value || null)} /></FormField>
          <FormField label="Escrow Officer"><Input value={f.escrow_officer ?? ""} onChange={(e) => upd("escrow_officer", e.target.value || null)} /></FormField>
          <FormField label="Escrow Number"><Input value={f.escrow_number ?? ""} onChange={(e) => upd("escrow_number", e.target.value || null)} /></FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Property">
        <FormGrid cols={3}>
          <FormField label="Units Conveyed"><Input type="number" value={f.units_conveyed ?? ""} onChange={(e) => upd("units_conveyed", num(e.target.value))} /></FormField>
          <FormField label="Lot Numbers"><Input value={f.lot_numbers ?? ""} onChange={(e) => upd("lot_numbers", e.target.value || null)} /></FormField>
          <FormField label="Gross Sale Price"><Input type="number" value={f.gross_sale_price ?? ""} onChange={(e) => upd("gross_sale_price", num(e.target.value))} /></FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Seller Credits">
        <LedgerTable rows={[
          ["Contract Price", f.credit_contract_price, (v: string) => upd("credit_contract_price", num(v))],
          ["Earnest Money", f.credit_earnest_money, (v: string) => upd("credit_earnest_money", num(v))],
          ["Other Credits", f.credit_other, (v: string) => upd("credit_other", num(v))],
        ]} total={totalCredits} totalLabel="Total Credits" />
      </FormSection>

      <FormSection title="Seller Charges">
        <LedgerTable rows={[
          ["Commission", f.charge_commission, (v: string) => upd("charge_commission", num(v))],
          ["Title Insurance", f.charge_title_insurance, (v: string) => upd("charge_title_insurance", num(v))],
          ["Settlement Fee", f.charge_settlement_fee, (v: string) => upd("charge_settlement_fee", num(v))],
          ["Recording Fees", f.charge_recording_fees, (v: string) => upd("charge_recording_fees", num(v))],
          ["Transfer Tax", f.charge_transfer_tax, (v: string) => upd("charge_transfer_tax", num(v))],
          ["HOA Transfer Fee", f.charge_hoa_transfer, (v: string) => upd("charge_hoa_transfer", num(v))],
          ["Loan Payoff", f.charge_loan_payoff, (v: string) => upd("charge_loan_payoff", num(v))],
          ["Prorated Taxes", f.charge_prorated_taxes, (v: string) => upd("charge_prorated_taxes", num(v))],
          ["Other Charges", f.charge_other, (v: string) => upd("charge_other", num(v))],
        ]} total={totalCharges} totalLabel="Total Charges" />
      </FormSection>

      <FormSection title="Settlement Summary">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-white p-4 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">Total Credits</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-primary">{formatCurrency(totalCredits)}</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-4 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">Total Charges</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-[#ef4444]">{formatCurrency(totalCharges)}</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-4 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">Net to Seller</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${netToSeller >= 0 ? "text-primary" : "text-[#ef4444]"}`}>{formatCurrency(netToSeller)}</p>
          </div>
        </div>
      </FormSection>

      <FormSection title="Fund Tracking">
        <FormGrid>
          <FormField label="Funds Received">
            <div className="flex items-center gap-2">
              <Switch checked={!!f.funds_received} onCheckedChange={(v) => upd("funds_received", v)} />
              <span className={`text-[13px] ${f.funds_received ? "font-medium text-primary" : "text-muted-foreground"}`}>{f.funds_received ? "Received" : "Pending"}</span>
            </div>
          </FormField>
          <FormField label="Date Received"><Input type="date" value={f.date_received ?? ""} onChange={(e) => upd("date_received", e.target.value || null)} /></FormField>
          <FormField label="Amount Received"><Input type="number" value={f.amount_received ?? ""} onChange={(e) => upd("amount_received", num(e.target.value))} /></FormField>
          <FormField label="Wire Confirmation #"><Input value={f.wire_confirmation ?? ""} onChange={(e) => upd("wire_confirmation", e.target.value || null)} /></FormField>
        </FormGrid>
      </FormSection>

      {!isClosed && (
        <div className="mt-6 flex justify-end">
          <Button className="bg-primary px-6 text-primary-foreground hover:bg-primary/90" onClick={() => setConfirmClose(true)}>Record Closing</Button>
        </div>
      )}

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record Closing</AlertDialogTitle>
            <AlertDialogDescription>Record this closing? This will mark the listing as sold and trigger accounting entries.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-primary hover:bg-primary/90" onClick={recordClosing}>Confirm Closing</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function LedgerTable({ rows, total, totalLabel }: { rows: [string, number | null, (v: string) => void][]; total: number; totalLabel: string }) {
  return (
    <div className="rounded-md border border-border">
      {rows.map(([label, value, onChange]) => (
        <div key={label} className="flex items-center justify-between border-b border-border px-3 py-2 last:border-b-0">
          <span className="text-[13px] text-muted-foreground">{label}</span>
          <Input type="number" className="w-36 text-right" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      ))}
      <div className="flex items-center justify-between bg-muted px-3 py-2 font-semibold">
        <span className="text-[13px]">{totalLabel}</span>
        <span className="text-[13px] tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
