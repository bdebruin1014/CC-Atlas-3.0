"use client"

import { useState } from "react"
import { FormSection, FormGrid, FormField } from "@/components/shared/form-section"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUpdateListing, type ListingDetail } from "@/lib/hooks/use-disposition"
import { toast } from "@/lib/hooks/use-toast"
import { Upload, Save } from "lucide-react"

// ---------------------------------------------------------------------------
// MLS status options
// ---------------------------------------------------------------------------

const MLS_STATUSES: Record<string, string> = {
  not_listed: "Not Listed",
  coming_soon: "Coming Soon",
  active: "Active",
  pending: "Pending",
  sold: "Sold",
}

// ---------------------------------------------------------------------------
// Checklist items
// ---------------------------------------------------------------------------

const CHECKLIST_ITEMS = [
  { key: "photos", label: "Photos uploaded" },
  { key: "description", label: "Description written" },
  { key: "tour", label: "Virtual tour linked" },
  { key: "mls", label: "MLS listed" },
  { key: "sign", label: "Sign installed" },
  { key: "flyer", label: "Flyer created" },
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ListingMarketingTabProps {
  listing: ListingDetail
}

export function ListingMarketingTab({ listing }: ListingMarketingTabProps) {
  const updateListing = useUpdateListing()

  const [description, setDescription] = useState(listing.marketing_description ?? "")
  const [tourUrl, setTourUrl] = useState(listing.virtual_tour_url ?? "")
  const [mlsNumber, setMlsNumber] = useState(listing.mls_number ?? "")
  const [mlsStatus, setMlsStatus] = useState(listing.mls_status ?? "not_listed")
  const [showingInstructions, setShowingInstructions] = useState(listing.showing_instructions ?? "")
  const [lockboxCode, setLockboxCode] = useState(listing.lockbox_code ?? "")
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  function toggleCheck(key: string) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateListing.mutateAsync({
        id: listing.id,
        marketing_description: description || null,
        virtual_tour_url: tourUrl || null,
        mls_number: mlsNumber || null,
        mls_status: mlsStatus || null,
        showing_instructions: showingInstructions || null,
        lockbox_code: lockboxCode || null,
      })
      toast({ title: "Marketing details saved" })
    } catch {
      toast({ title: "Failed to save", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-0">
      {/* Photo Upload */}
      <FormSection title="Photos">
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-[#F9FAFB] px-6 py-12">
          <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 text-[13px] text-muted-foreground">
            Drag and drop photos here, or click to browse
          </p>
          <Button variant="outline" size="sm">
            Upload Photos
          </Button>
        </div>
      </FormSection>

      {/* Marketing Details */}
      <FormSection title="Marketing Details">
        <FormGrid cols={2}>
          <FormField label="Marketing Description" className="md:col-span-2">
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter property marketing description…"
            />
          </FormField>
          <FormField label="Virtual Tour URL">
            <Input
              value={tourUrl}
              onChange={(e) => setTourUrl(e.target.value)}
              placeholder="https://…"
            />
          </FormField>
          <FormField label="MLS Number">
            <Input
              value={mlsNumber}
              onChange={(e) => setMlsNumber(e.target.value)}
            />
          </FormField>
          <FormField label="MLS Status">
            <Select value={mlsStatus} onValueChange={setMlsStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MLS_STATUSES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Showing Setup */}
      <FormSection title="Showing Setup">
        <FormGrid cols={2}>
          <FormField label="Showing Instructions" className="md:col-span-2">
            <Textarea
              rows={3}
              value={showingInstructions}
              onChange={(e) => setShowingInstructions(e.target.value)}
              placeholder="Enter showing instructions…"
            />
          </FormField>
          <FormField label="Lockbox Code">
            <Input
              value={lockboxCode}
              onChange={(e) => setLockboxCode(e.target.value)}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Marketing Checklist */}
      <FormSection title="Marketing Checklist">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {CHECKLIST_ITEMS.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-[#F9FAFB]"
            >
              <Checkbox
                checked={!!checklist[item.key]}
                onCheckedChange={() => toggleCheck(item.key)}
              />
              <span className="text-[13px] text-foreground">{item.label}</span>
            </label>
          ))}
        </div>
      </FormSection>

      {/* Save */}
      <div className="mt-6 flex justify-end">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="mr-1 h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save Marketing Details"}
        </Button>
      </div>
    </div>
  )
}
