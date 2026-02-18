"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FormField } from "@/components/shared/form-section"
import { useCosts, useCreateCost, useUpdateCost, useDeleteCost, type CostDetail } from "@/lib/hooks/use-disposition"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { toast } from "@/lib/hooks/use-toast"
import { Plus, Pencil, Trash2, Receipt, DollarSign, Calculator } from "lucide-react"
import type { DispositionCostCategory } from "@/lib/supabase/types"

const CATS: Record<string, { label: string; variant: "success" | "default" | "blue" | "warning" | "gray" }> = {
  commission: { label: "Commission", variant: "success" }, staging: { label: "Staging", variant: "default" },
  photography: { label: "Photography", variant: "blue" }, marketing: { label: "Marketing", variant: "warning" },
  closing_costs: { label: "Closing Costs", variant: "warning" }, title_insurance: { label: "Title Insurance", variant: "blue" },
  recording: { label: "Recording", variant: "gray" }, transfer_tax: { label: "Transfer Tax", variant: "gray" },
  hoa: { label: "HOA", variant: "gray" }, loan_payoff: { label: "Loan Payoff", variant: "gray" },
  taxes: { label: "Taxes", variant: "warning" }, repairs: { label: "Repairs", variant: "default" },
  other: { label: "Other", variant: "gray" },
}

export function ListingCostsTab({ listingId }: { listingId: string }) {
  const { data: costs, isLoading } = useCosts(listingId)
  const createCost = useCreateCost()
  const updateCost = useUpdateCost()
  const deleteCost = useDeleteCost()
  const [editCost, setEditCost] = useState<CostDetail | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [delTarget, setDelTarget] = useState<CostDetail | null>(null)
  const [f, setF] = useState({ category: "", description: "", amount: "", paid_date: "", vendor_name: "" })
  const upd = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  const totalCosts = useMemo(() => (costs ?? []).reduce((s, c) => s + (c.amount ?? 0), 0), [costs])
  const commTotal = useMemo(() => (costs ?? []).filter((c) => c.category === "commission").reduce((s, c) => s + (c.amount ?? 0), 0), [costs])

  function openAdd() { setEditCost(null); setF({ category: "", description: "", amount: "", paid_date: "", vendor_name: "" }); setFormOpen(true) }
  function openEdit(c: CostDetail) { setEditCost(c); setF({ category: c.category ?? "", description: c.description ?? "", amount: String(c.amount ?? ""), paid_date: c.paid_date ?? "", vendor_name: c.vendor ? `${c.vendor.first_name} ${c.vendor.last_name}` : "" }); setFormOpen(true) }

  async function submit() {
    const num = f.amount ? Number(f.amount) : null
    try {
      if (editCost) {
        await updateCost.mutateAsync({ listingId, id: editCost.id, category: (f.category || null) as DispositionCostCategory | null, description: f.description || null, amount: num, paid_date: f.paid_date || null })
      } else {
        await createCost.mutateAsync({ listingId, category: (f.category || null) as DispositionCostCategory | null, description: f.description || null, amount: num, paid_date: f.paid_date || null })
      }
      toast({ title: editCost ? "Cost updated" : "Cost added" }); setFormOpen(false)
    } catch { toast({ title: "Failed to save cost", variant: "destructive" }) }
  }

  async function confirmDelete() {
    if (!delTarget) return
    try { await deleteCost.mutateAsync({ listingId, id: delTarget.id }); toast({ title: "Cost deleted" }) }
    catch { toast({ title: "Failed to delete", variant: "destructive" }) }
    setDelTarget(null)
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[{ icon: Receipt, label: "Total Costs", value: totalCosts }, { icon: DollarSign, label: "Commission Total", value: commTotal }, { icon: Calculator, label: "Other Selling Costs", value: totalCosts - commTotal }].map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-white p-4">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground"><c.icon className="h-4 w-4" />{c.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatCurrency(c.value)}</div>
          </div>
        ))}
      </div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={openAdd}><Plus className="mr-1 h-3.5 w-3.5" />Add Cost</Button>
      </div>
      {isLoading ? <div className="py-12 text-center text-[13px] text-muted-foreground">Loading…</div> : !(costs?.length) ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-[13px] text-muted-foreground">No costs recorded yet</div>
      ) : (
        <Table>
          <TableHeader><TableRow className="bg-muted">
            {["Category", "Description", "Amount", "Paid Date", "Vendor", ""].map((h) => <TableHead key={h} className="text-[11px] uppercase tracking-wide">{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {costs.map((c) => (
              <TableRow key={c.id} className="h-10 hover:bg-[#f9fafb]">
                <TableCell>{c.category ? <Badge variant={CATS[c.category]?.variant ?? "gray"}>{CATS[c.category]?.label ?? c.category}</Badge> : "—"}</TableCell>
                <TableCell className="text-[13px]">{c.description || "—"}</TableCell>
                <TableCell className="text-[13px] font-semibold tabular-nums">{formatCurrency(c.amount)}</TableCell>
                <TableCell className="text-[13px]">{formatDate(c.paid_date)}</TableCell>
                <TableCell className="text-[13px]">{c.vendor ? `${c.vendor.first_name} ${c.vendor.last_name}` : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#ef4444]" onClick={() => setDelTarget(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editCost ? "Edit Cost" : "Add Cost"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <FormField label="Category" required>
              <Select value={f.category} onValueChange={(v) => upd("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{Object.entries(CATS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Description"><Input value={f.description} onChange={(e) => upd("description", e.target.value)} /></FormField>
            <FormField label="Amount" required><Input type="number" value={f.amount} onChange={(e) => upd("amount", e.target.value)} /></FormField>
            <FormField label="Paid Date"><Input type="date" value={f.paid_date} onChange={(e) => upd("paid_date", e.target.value)} /></FormField>
            <FormField label="Vendor"><Input value={f.vendor_name} onChange={(e) => upd("vendor_name", e.target.value)} placeholder="Vendor name" /></FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={submit} disabled={createCost.isPending || updateCost.isPending || !f.category || !f.amount}>
              {(createCost.isPending || updateCost.isPending) ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTarget} onOpenChange={(v) => { if (!v) setDelTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Cost</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this cost entry?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-[#ef4444] hover:bg-[#dc2626]" onClick={confirmDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
