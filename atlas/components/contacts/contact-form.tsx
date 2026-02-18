"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState, useCallback } from "react"
import { X, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/format"
import { FormSection, FormGrid, FormField } from "@/components/shared/form-section"

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  company: z.string().max(200).optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  secondary_phone: z.string().max(30).optional().nullable(),
  address_line1: z.string().max(200).optional().nullable(),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["active", "inactive", "archived"]),
})

type ContactFormValues = z.infer<typeof contactSchema>

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactFormData extends ContactFormValues {
  contact_types: string[]
  tags: string[]
}

export interface ContactFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<ContactFormData>
  onSubmit: (data: ContactFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

// ---------------------------------------------------------------------------
// Available contact types
// ---------------------------------------------------------------------------

const CONTACT_TYPES = [
  "Homeowner",
  "Buyer",
  "Seller",
  "Realtor",
  "Investor",
  "Architect",
  "Engineer",
  "General Contractor",
  "Subcontractor",
  "Supplier",
  "Inspector",
  "Lender",
  "Attorney",
  "Title Company",
  "Insurance Agent",
  "Property Manager",
  "Government/Municipal",
  "Utility Company",
  "Other",
]

// ---------------------------------------------------------------------------
// ContactForm
// ---------------------------------------------------------------------------

export function ContactForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting: externalIsSubmitting,
}: ContactFormProps) {
  const [contactTypes, setContactTypes] = useState<string[]>(
    defaultValues?.contact_types ?? []
  )
  const [tags, setTags] = useState<string[]>(defaultValues?.tags ?? [])
  const [tagInput, setTagInput] = useState("")
  const [internalSubmitting, setInternalSubmitting] = useState(false)

  const isSubmitting = externalIsSubmitting ?? internalSubmitting

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: defaultValues?.first_name ?? "",
      last_name: defaultValues?.last_name ?? "",
      company: defaultValues?.company ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      secondary_phone: defaultValues?.secondary_phone ?? "",
      address_line1: defaultValues?.address_line1 ?? "",
      address_line2: defaultValues?.address_line2 ?? "",
      city: defaultValues?.city ?? "",
      state: defaultValues?.state ?? "",
      zip: defaultValues?.zip ?? "",
      country: defaultValues?.country ?? "",
      notes: defaultValues?.notes ?? "",
      status: defaultValues?.status ?? "active",
    },
  })

  // ---- Contact type toggle ----
  const toggleContactType = useCallback((type: string) => {
    setContactTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }, [])

  // ---- Tag management ----
  const addTag = useCallback(() => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag])
    }
    setTagInput("")
  }, [tagInput, tags])

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        addTag()
      }
      if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
        setTags((prev) => prev.slice(0, -1))
      }
    },
    [addTag, tagInput, tags]
  )

  // ---- Submit ----
  const onFormSubmit = useCallback(
    async (values: ContactFormValues) => {
      setInternalSubmitting(true)
      try {
        // Normalize empty strings to null
        const normalized: ContactFormValues = { ...values }
        for (const key of Object.keys(normalized) as (keyof ContactFormValues)[]) {
          if (normalized[key] === "") {
            (normalized as Record<string, unknown>)[key] = null
          }
        }

        await onSubmit({
          ...normalized,
          contact_types: contactTypes,
          tags,
        })
      } finally {
        setInternalSubmitting(false)
      }
    },
    [onSubmit, contactTypes, tags]
  )

  const inputClass = "h-9 border-border focus:ring-primary"

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Basic Info */}
      <FormSection title="Basic Info">
        <FormGrid>
          <FormField label="First Name" required>
            <Input
              {...register("first_name")}
              className={cn(inputClass, errors.first_name && "border-destructive")}
            />
            {errors.first_name && (
              <p className="text-xs text-destructive">{errors.first_name.message}</p>
            )}
          </FormField>

          <FormField label="Last Name" required>
            <Input
              {...register("last_name")}
              className={cn(inputClass, errors.last_name && "border-destructive")}
            />
            {errors.last_name && (
              <p className="text-xs text-destructive">{errors.last_name.message}</p>
            )}
          </FormField>

          <FormField label="Company">
            <Input {...register("company")} className={inputClass} />
          </FormField>

          <FormField label="Status">
            <select
              {...register("status")}
              className={cn(
                "flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              )}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </FormField>

          <FormField label="Email">
            <Input
              type="email"
              {...register("email")}
              className={cn(inputClass, errors.email && "border-destructive")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </FormField>

          <FormField label="Phone">
            <Input type="tel" {...register("phone")} className={inputClass} />
          </FormField>

          <FormField label="Secondary Phone">
            <Input type="tel" {...register("secondary_phone")} className={inputClass} />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Contact types */}
      <FormSection title="Contact Types">
        <div className="flex flex-wrap gap-2">
          {CONTACT_TYPES.map((type) => {
            const isSelected = contactTypes.includes(type)
            return (
              <Badge
                key={type}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected
                    ? "hover:bg-primary/80"
                    : "hover:bg-accent"
                )}
                onClick={() => toggleContactType(type)}
              >
                {type}
              </Badge>
            )
          })}
        </div>
      </FormSection>

      {/* Address */}
      <FormSection title="Address">
        <FormGrid>
          <FormField label="Address Line 1" className="md:col-span-2">
            <Input placeholder="Address line 1" {...register("address_line1")} className={inputClass} />
          </FormField>

          <FormField label="Address Line 2" className="md:col-span-2">
            <Input placeholder="Address line 2" {...register("address_line2")} className={inputClass} />
          </FormField>
        </FormGrid>

        <FormGrid cols={3} className="mt-4">
          <FormField label="City">
            <Input placeholder="City" {...register("city")} className={inputClass} />
          </FormField>
          <FormField label="State">
            <Input placeholder="State" {...register("state")} className={inputClass} />
          </FormField>
          <FormField label="ZIP">
            <Input placeholder="ZIP" {...register("zip")} className={inputClass} />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Tags */}
      <FormSection title="Tags">
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? "Add tags..." : ""}
            className="h-7 min-w-[120px] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Press Enter to add a tag
        </p>
      </FormSection>

      {/* Notes */}
      <FormSection title="Notes">
        <Textarea
          {...register("notes")}
          rows={4}
          placeholder="Internal notes about this contact..."
          className="resize-none"
        />
      </FormSection>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          {mode === "create" ? "Create Contact" : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
