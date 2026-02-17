"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  Users,
  ChevronDown,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDebounce } from "@/lib/hooks/use-debounce"
import {
  useContacts,
  useCreateContact,
  getContactTypeLabel,
  ALL_CONTACT_TYPES,
} from "@/lib/hooks/use-contacts"
import type { Contact, ContactFilters } from "@/lib/hooks/use-contacts"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

export default function ContactsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("all")
  const [showAddDialog, setShowAddDialog] = useState(false)

  const debouncedSearch = useDebounce(searchTerm, 300)

  const filters: ContactFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      status: statusFilter,
    }),
    [debouncedSearch, selectedTypes, statusFilter]
  )

  const { data: contacts = [], isLoading: loading, error, refetch } = useContacts(filters)

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedTypes([])
    setStatusFilter("all")
  }

  const hasActiveFilters =
    searchTerm !== "" || selectedTypes.length > 0 || statusFilter !== "all"

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your contacts directory
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              Type
              {selectedTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {selectedTypes.length}
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
            <DropdownMenuLabel>Contact Types</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_CONTACT_TYPES.map((ct) => (
              <DropdownMenuCheckboxItem
                key={ct.value}
                checked={selectedTypes.includes(ct.value)}
                onCheckedChange={() => toggleType(ct.value)}
              >
                {ct.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select
          value={statusFilter}
          onValueChange={(val) =>
            setStatusFilter(val as "active" | "inactive" | "all")
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error.message}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Name</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Company</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Type(s)</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Email</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Phone</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 animate-pulse rounded bg-muted" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && contacts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No contacts found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {hasActiveFilters
                ? "Try adjusting your search or filter criteria."
                : "Get started by adding your first contact."}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {!loading && !error && contacts.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Name</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Company</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Type(s)</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Email</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Phone</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact: Contact) => (
                  <tr
                    key={contact.id}
                    className="border-b cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {contact.first_name[0]}
                          {contact.last_name[0]}
                        </div>
                        <span className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {contact.company || "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.contact_types && contact.contact_types.length > 0 ? (
                          contact.contact_types.slice(0, 2).map((ct: { id: string; type: string }) => (
                            <Badge key={ct.id} variant="secondary" className="text-xs">
                              {getContactTypeLabel(ct.type)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">{"\u2014"}</span>
                        )}
                        {contact.contact_types && contact.contact_types.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{contact.contact_types.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {contact.email || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {contact.phone || "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={contact.status === "active" ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          contact.status === "active"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        {contact.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </Card>
      )}

      {/* Add Contact Dialog */}
      <AddContactDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false)
          refetch()
          toast({ title: "Contact created", description: "New contact has been added successfully." })
        }}
      />
    </div>
  )
}

function AddContactDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const createContactMutation = useCreateContact()
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    company: "",
    email: "",
    phone: "",
    secondary_phone: "",
    mailing_address_line1: "",
    mailing_address_city: "",
    mailing_address_state: "",
    mailing_address_zip: "",
    notes: "",
    status: "active" as "active" | "inactive",
  })
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      company: "",
      email: "",
      phone: "",
      secondary_phone: "",
      mailing_address_line1: "",
      mailing_address_city: "",
      mailing_address_state: "",
      mailing_address_zip: "",
      notes: "",
      status: "active",
    })
    setSelectedTypes([])
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setFormError("First name and last name are required.")
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const contactPayload = {
      ...formData,
      organization_id: user?.user_metadata?.organization_id || "",
      company: formData.company || null,
      email: formData.email || null,
      phone: formData.phone || null,
      secondary_phone: formData.secondary_phone || null,
      mailing_address_line1: formData.mailing_address_line1 || null,
      mailing_address_line2: null,
      mailing_address_city: formData.mailing_address_city || null,
      mailing_address_state: formData.mailing_address_state || null,
      mailing_address_zip: formData.mailing_address_zip || null,
      notes: formData.notes || null,
      tags: null,
    }

    try {
      await createContactMutation.mutateAsync({
        contactData: contactPayload,
        types: selectedTypes,
      })
      resetForm()
      onSuccess()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create contact")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new contact record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, first_name: e.target.value }))
                }
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, last_name: e.target.value }))
                }
                placeholder="Smith"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, company: e.target.value }))
              }
              placeholder="ABC Construction"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contact Types</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_CONTACT_TYPES.map((ct) => (
                <Badge
                  key={ct.value}
                  variant={selectedTypes.includes(ct.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedTypes((prev) =>
                      prev.includes(ct.value)
                        ? prev.filter((t) => t !== ct.value)
                        : [...prev, ct.value]
                    )
                  }
                >
                  {ct.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={formData.mailing_address_line1}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, mailing_address_line1: e.target.value }))
              }
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.mailing_address_city}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mailing_address_city: e.target.value }))
                }
                placeholder="Charlotte"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.mailing_address_state}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mailing_address_state: e.target.value }))
                }
                placeholder="SC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                value={formData.mailing_address_zip}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mailing_address_zip: e.target.value }))
                }
                placeholder="29201"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Additional notes about this contact..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createContactMutation.isPending}>
              {createContactMutation.isPending ? "Creating..." : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
