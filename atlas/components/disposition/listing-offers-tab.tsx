"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useOffers, useUpdateOffer } from "@/lib/hooks/use-disposition"
import { formatCurrency } from "@/lib/utils/format"
import { toast } from "@/lib/hooks/use-toast"
import { Plus, MoreHorizontal, FileText, Search, BarChart3, DollarSign, Home } from "lucide-react"
import { OfferFormDialog } from "./offer-form-dialog"
import type { DispositionOffer, OfferStatus } from "@/lib/supabase/types"

const STATUS_CFG: Record<string, { label: string; variant: "blue" | "warning" | "default" | "success" | "error" | "gray" }> = {
  received: { label: "Received", variant: "blue" }, reviewing: { label: "Reviewing", variant: "warning" },
  countered: { label: "Countered", variant: "default" }, accepted: { label: "Accepted", variant: "success" },
  rejected: { label: "Rejected", variant: "error" }, expired: { label: "Expired", variant: "gray" },
  withdrawn: { label: "Withdrawn", variant: "gray" },
}
const FIN_CFG: Record<string, { label: string; variant: "success" | "blue" | "warning" | "default" }> = {
  cash: { label: "Cash", variant: "success" }, conventional: { label: "Conv.", variant: "blue" },
  fha: { label: "FHA", variant: "warning" }, va: { label: "VA", variant: "default" },
  usda: { label: "USDA", variant: "blue" }, other: { label: "Other", variant: "default" },
}
const CONT_ICONS = [
  { key: "contingency_inspection" as const, icon: "🔍", tip: "Inspection" },
  { key: "contingency_appraisal" as const, icon: "📊", tip: "Appraisal" },
  { key: "contingency_financing" as const, icon: "💰", tip: "Financing" },
  { key: "contingency_sale" as const, icon: "🏠", tip: "Sale" },
]

export function ListingOffersTab({ listingId }: { listingId: string }) {
  const { data: offers, isLoading } = useOffers(listingId)
  const updateOffer = useUpdateOffer()
  const [formOpen, setFormOpen] = useState(false)
  const [counterOffer, setCounterOffer] = useState<DispositionOffer | null>(null)
  const [counterPrice, setCounterPrice] = useState("")
  const [counterNotes, setCounterNotes] = useState("")
  const [confirmAction, setConfirmAction] = useState<{ offer: DispositionOffer; action: "accepted" | "rejected" | "withdrawn" } | null>(null)

  const count = offers?.length ?? 0
  const comparables = useMemo(() => (offers ?? []).filter((o) => o.status === "received" || o.status === "reviewing"), [offers])
  const showComparison = comparables.length >= 2
  const bestNet = useMemo(() => Math.max(...comparables.map((o) => o.net_to_seller ?? 0)), [comparables])

  async function doAction(offer: DispositionOffer, status: OfferStatus, extra?: Record<string, unknown>) {
    try {
      await updateOffer.mutateAsync({ listingId, offerId: offer.id, status, ...extra })
      toast({ title: `Offer ${status}` })
    } catch { toast({ title: "Failed to update offer", variant: "destructive" }) }
  }

  async function submitCounter() {
    if (!counterOffer) return
    await doAction(counterOffer, "countered", { counter_price: Number(counterPrice) || null, counter_notes: counterNotes || null })
    setCounterOffer(null); setCounterPrice(""); setCounterNotes("")
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-medium text-[#1F2937]">Offers</h2>
          <Badge variant="secondary" className="text-xs">{count}</Badge>
        </div>
        <Button size="sm" className="bg-[#1a5632] text-white hover:bg-[#164528]" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />Record Offer
        </Button>
      </div>

      {showComparison && <ComparisonCard offers={comparables} bestNet={bestNet} />}

      {isLoading ? (
        <div className="py-12 text-center text-[13px] text-[#5A6B75]">Loading…</div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[#E5E7EB] py-16">
          <FileText className="h-10 w-10 text-[#9CA3AF]" />
          <p className="text-[13px] text-[#5A6B75]">No offers recorded yet</p>
          <Button size="sm" className="bg-[#1a5632] text-white hover:bg-[#164528]" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />Record Offer
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F3F4F6]">
              {["Offer #", "Buyer", "Amount", "Financing", "Contingencies", "Net to Seller", "Status", ""].map((h) => (
                <TableHead key={h} className="text-[11px] uppercase tracking-wide">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers!.map((o) => (
              <TableRow key={o.id} className={`h-10 hover:bg-[#f9fafb] ${o.status === "accepted" ? "bg-[#f0fdf4]" : ""}`}>
                <TableCell className="font-mono text-[13px]">{o.offer_number || "—"}</TableCell>
                <TableCell className="text-[13px]">{o.buyer_name || "—"}</TableCell>
                <TableCell className="text-[13px] font-semibold tabular-nums">{formatCurrency(o.offer_price)}</TableCell>
                <TableCell>
                  {o.financing_type ? <Badge variant={FIN_CFG[o.financing_type]?.variant ?? "default"}>{FIN_CFG[o.financing_type]?.label ?? o.financing_type}</Badge> : "—"}
                </TableCell>
                <TableCell>
                  <span className="flex gap-0.5 text-sm">
                    {CONT_ICONS.map((c) => <span key={c.key} className={o[c.key] ? "opacity-100" : "opacity-25"} title={c.tip}>{c.icon}</span>)}
                  </span>
                </TableCell>
                <TableCell className="text-[13px] tabular-nums">{formatCurrency(o.net_to_seller)}</TableCell>
                <TableCell><Badge variant={STATUS_CFG[o.status]?.variant ?? "gray"}>{STATUS_CFG[o.status]?.label ?? o.status}</Badge></TableCell>
                <TableCell>
                  {(o.status === "received" || o.status === "reviewing") && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setConfirmAction({ offer: o, action: "accepted" })}>Accept</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setCounterOffer(o); setCounterPrice(String(o.offer_price ?? "")); setCounterNotes("") }}>Counter</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setConfirmAction({ offer: o, action: "rejected" })}>Reject</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setConfirmAction({ offer: o, action: "withdrawn" })}>Withdraw</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <OfferFormDialog listingId={listingId} open={formOpen} onOpenChange={setFormOpen} />

      {/* Counter dialog */}
      <Dialog open={!!counterOffer} onOpenChange={(v) => { if (!v) setCounterOffer(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Counter Offer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.3px] text-[#6B7280]">Counter Price</label>
              <Input type="number" value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.3px] text-[#6B7280]">Counter Notes</label>
              <Textarea rows={3} value={counterNotes} onChange={(e) => setCounterNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterOffer(null)}>Cancel</Button>
            <Button className="bg-[#1a5632] text-white hover:bg-[#164528]" onClick={submitCounter} disabled={updateOffer.isPending}>
              {updateOffer.isPending ? "Saving…" : "Send Counter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm action dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "accepted" ? "Accept Offer" : confirmAction?.action === "rejected" ? "Reject Offer" : "Withdraw Offer"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "accepted"
                ? "Accepting this offer will auto-create a contract and reject all other active offers. Continue?"
                : `Are you sure you want to ${confirmAction?.action === "rejected" ? "reject" : "withdraw"} this offer?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.action === "accepted" ? "bg-[#1a5632] hover:bg-[#164528]" : "bg-[#ef4444] hover:bg-[#dc2626]"}
              onClick={() => { if (confirmAction) doAction(confirmAction.offer, confirmAction.action); setConfirmAction(null) }}
            >
              {confirmAction?.action === "accepted" ? "Accept" : confirmAction?.action === "rejected" ? "Reject" : "Withdraw"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ComparisonCard({ offers, bestNet }: { offers: DispositionOffer[]; bestNet: number }) {
  return (
    <div className="mb-4 rounded-lg border border-[#E5E7EB] bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#1F2937]"><BarChart3 className="h-4 w-4" />Offer Comparison</h3>
      <div className="flex gap-4 overflow-x-auto">
        {offers.map((o) => (
          <div key={o.id} className="min-w-[180px] flex-1 rounded-md border border-[#E5E7EB] p-3">
            <p className="mb-2 truncate text-[13px] font-medium">{o.buyer_name || "Unknown"}</p>
            <div className="space-y-1 text-[12px]">
              <Row label="Price" value={formatCurrency(o.offer_price)} />
              <Row label="Financing" value={FIN_CFG[o.financing_type ?? ""]?.label ?? "—"} />
              <Row label="Contingencies" value={[o.contingency_inspection && "Insp", o.contingency_appraisal && "Appr", o.contingency_financing && "Fin", o.contingency_sale && "Sale"].filter(Boolean).join(", ") || "None"} />
              <Row label="Concessions" value={formatCurrency((o.closing_cost_assistance ?? 0) + (o.other_concessions ?? 0))} />
              <div className={`flex justify-between font-semibold ${o.net_to_seller === bestNet ? "text-[#1a5632]" : ""}`}>
                <span>Net to Seller</span><span>{formatCurrency(o.net_to_seller)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-[#5A6B75]"><span>{label}</span><span className="font-medium text-[#1F2937]">{value}</span></div>
}
