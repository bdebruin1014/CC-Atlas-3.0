"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { FormSection, FormGrid, FormField } from "@/components/shared/form-section"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUpdateListing, type ListingDetail } from "@/lib/hooks/use-disposition"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { toast } from "@/lib/hooks/use-toast"
import { Pencil, Save, X, ExternalLink, DollarSign, TrendingUp, Receipt, Calculator } from "lucide-react"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "blue" | "warning" | "error" | "gray"> = {
  draft: "gray", pre_listing: "blue", active: "success", under_contract: "warning",
  pending_closing: "warning", closed: "default", withdrawn: "error", expired: "gray",
}
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", pre_listing: "Pre-Listing", active: "Active", under_contract: "Under Contract",
  pending_closing: "Pending Closing", closed: "Closed", withdrawn: "Withdrawn", expired: "Expired",
}
const PROP_TYPES: Record<string, string> = {
  single_family: "Single Family", townhome: "Townhome", lot: "Lot",
  condo: "Condo", duplex: "Duplex", land: "Land",
}

interface Props { listing: ListingDetail }

export function ListingOverviewTab({ listing }: Props) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => ({ ...listing }))
  const updateListing = useUpdateListing()

  const dom = useMemo(() => {
    if (!listing.listing_date) return null
    const end = listing.status === "closed" && listing.updated_at ? new Date(listing.updated_at) : new Date()
    return Math.max(0, Math.round((end.getTime() - new Date(listing.listing_date).getTime()) / 86_400_000))
  }, [listing.listing_date, listing.status, listing.updated_at])

  function handleEdit() { setForm({ ...listing }); setEditing(true) }
  function handleCancel() { setForm({ ...listing }); setEditing(false) }
  function set(f: string, v: string | number | null) { setForm((p) => ({ ...p, [f]: v })) }
  function num(v: string) { const n = Number(v); return v === "" || isNaN(n) ? null : n }

  async function handleSave() {
    try {
      await updateListing.mutateAsync({
        id: listing.id, property_address: form.property_address, property_city: form.property_city,
        property_state: form.property_state, property_zip: form.property_zip, property_county: form.property_county,
        property_type: form.property_type, bedrooms: form.bedrooms, bathrooms: form.bathrooms,
        sqft: form.sqft, lot_sqft: form.lot_sqft, year_built: form.year_built, garage_spaces: form.garage_spaces,
        list_price: form.list_price, original_list_price: form.original_list_price,
        listing_date: form.listing_date, expiration_date: form.expiration_date,
        mls_number: form.mls_number, listing_agent_commission: form.listing_agent_commission,
        buyer_agent_commission: form.buyer_agent_commission,
      })
      toast({ title: "Listing updated" }); setEditing(false)
    } catch { toast({ title: "Failed to update listing", variant: "destructive" }) }
  }

  const txt = (v: string | number | null | undefined) => <span className="text-[13px]">{v ?? "—"}</span>
  const cur = (v: number | null | undefined) => <span className="text-[13px] tabular-nums">{formatCurrency(v)}</span>
  const edt = (field: string, v: string | number | null | undefined, type = "text") =>
    editing ? <Input type={type} value={v ?? ""} onChange={(e) => set(field, type === "number" ? num(e.target.value) : e.target.value)} /> : null

  const listPrice = listing.list_price ?? 0
  const totalCosts = 0
  const agentName = listing.listing_agent ? `${listing.listing_agent.first_name} ${listing.listing_agent.last_name}` : null

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 flex gap-2">
        {editing ? (
          <>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={updateListing.isPending}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={updateListing.isPending}><Save className="mr-1 h-3.5 w-3.5" />{updateListing.isPending ? "Saving…" : "Save"}</Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={handleEdit}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
        )}
      </div>

      <FormSection title="Property Details">
        <FormGrid cols={3}>
          <FormField label="Address" className="md:col-span-2 lg:col-span-3">{edt("property_address", form.property_address) || txt(listing.property_address)}</FormField>
          <FormField label="City">{edt("property_city", form.property_city) || txt(listing.property_city)}</FormField>
          <FormField label="State">{edt("property_state", form.property_state) || txt(listing.property_state)}</FormField>
          <FormField label="Zip">{edt("property_zip", form.property_zip) || txt(listing.property_zip)}</FormField>
          <FormField label="County">{edt("property_county", form.property_county) || txt(listing.property_county)}</FormField>
          <FormField label="Property Type">
            {editing ? (
              <Select value={form.property_type ?? ""} onValueChange={(v) => set("property_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PROP_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            ) : txt(PROP_TYPES[listing.property_type ?? ""] || "—")}
          </FormField>
          <FormField label="Beds">{edt("bedrooms", form.bedrooms, "number") || txt(listing.bedrooms)}</FormField>
          <FormField label="Baths">{edt("bathrooms", form.bathrooms, "number") || txt(listing.bathrooms)}</FormField>
          <FormField label="Sqft">{edt("sqft", form.sqft, "number") || txt(listing.sqft?.toLocaleString())}</FormField>
          <FormField label="Lot Sqft">{edt("lot_sqft", form.lot_sqft, "number") || txt(listing.lot_sqft?.toLocaleString())}</FormField>
          <FormField label="Year Built">{edt("year_built", form.year_built, "number") || txt(listing.year_built)}</FormField>
          <FormField label="Garage">{edt("garage_spaces", form.garage_spaces, "number") || txt(listing.garage_spaces)}</FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Listing Details">
        <FormGrid cols={3}>
          <FormField label="Listing Number"><span className="font-mono text-[13px]">{listing.listing_number || "—"}</span></FormField>
          <FormField label="Status"><Badge variant={STATUS_VARIANT[listing.status] ?? "gray"}>{STATUS_LABELS[listing.status] ?? listing.status}</Badge></FormField>
          <FormField label="List Price">{edt("list_price", form.list_price, "number") || cur(listing.list_price)}</FormField>
          <FormField label="Original List Price">{edt("original_list_price", form.original_list_price, "number") || cur(listing.original_list_price)}</FormField>
          <FormField label="Listing Date">{editing ? <Input type="date" value={form.listing_date ?? ""} onChange={(e) => set("listing_date", e.target.value || null)} /> : txt(formatDate(listing.listing_date))}</FormField>
          <FormField label="Expiration Date">{editing ? <Input type="date" value={form.expiration_date ?? ""} onChange={(e) => set("expiration_date", e.target.value || null)} /> : txt(formatDate(listing.expiration_date))}</FormField>
          <FormField label="Days on Market"><span className="text-[13px] tabular-nums">{dom ?? "—"}</span></FormField>
          <FormField label="MLS Number">{edt("mls_number", form.mls_number) || txt(listing.mls_number)}</FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Agent">
        <FormGrid cols={3}>
          <FormField label="Listing Agent">{txt(agentName)}</FormField>
          <FormField label="Commission %">{edt("listing_agent_commission", form.listing_agent_commission, "number") || txt(listing.listing_agent_commission != null ? `${listing.listing_agent_commission}%` : null)}</FormField>
          <FormField label="Buyer Agent Commission %">{edt("buyer_agent_commission", form.buyer_agent_commission, "number") || txt(listing.buyer_agent_commission != null ? `${listing.buyer_agent_commission}%` : null)}</FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Financial Summary">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: DollarSign, label: "List Price", value: formatCurrency(listPrice) },
            { icon: TrendingUp, label: "Estimated Net", value: formatCurrency(listPrice - totalCosts) },
            { icon: Receipt, label: "Total Costs", value: formatCurrency(totalCosts) },
            { icon: Calculator, label: "Projected Profit", value: formatCurrency(listPrice - totalCosts) },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground"><c.icon className="h-4 w-4" />{c.label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">{c.value}</div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Linked Records">
        <FormGrid cols={4}>
          {([
            ["Project", listing.project ? `/projects/${listing.project.id}` : null, listing.project?.name],
            ["Job", listing.job_id ? `/construction/${listing.job_id}` : null, listing.job_id ? "View Job" : null],
            ["Unit", listing.unit_id ? `/construction/${listing.job_id}/units/${listing.unit_id}` : null, listing.unit_id ? "View Unit" : null],
            ["Entity", listing.entity_id ? `/admin/entities/${listing.entity_id}` : null, listing.entity?.name],
          ] as const).map(([label, href, name]) => (
            <FormField key={label} label={label}>
              {href && name ? (
                <Link href={href} className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline">{name}<ExternalLink className="h-3 w-3" /></Link>
              ) : <span className="text-[13px] text-muted-foreground">Not linked</span>}
            </FormField>
          ))}
        </FormGrid>
      </FormSection>
    </div>
  )
}
