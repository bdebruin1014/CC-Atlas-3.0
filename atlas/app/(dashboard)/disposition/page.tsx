"use client"

import { useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import {
  useListings,
  useCreateListing,
  type ListingFilters,
} from "@/lib/hooks/use-disposition"
import type { DispositionListing } from "@/lib/supabase/types"
import {
  Plus,
  Search,
  List,
  LayoutGrid,
  Columns3,
  Home,
  FileSignature,
  Clock,
  CheckCircle2,
  DollarSign,
  Timer,
  X,
  GripVertical,
  User,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type ViewMode = "all" | "community" | "pipeline"

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: "Draft", color: "text-gray-700", bgColor: "bg-gray-100" },
  pre_listing: {
    label: "Pre-Listing",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  active: {
    label: "Active",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  under_contract: {
    label: "Under Contract",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  pending_closing: {
    label: "Pending Closing",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  closed: {
    label: "Closed",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  withdrawn: {
    label: "Withdrawn",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  expired: {
    label: "Expired",
    color: "text-stone-700",
    bgColor: "bg-stone-100",
  },
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  single_family: "Single Family",
  townhome: "Townhome",
  lot: "Lot",
  condo: "Condo",
  duplex: "Duplex",
  land: "Land",
}

const PIPELINE_COLUMNS = [
  "draft",
  "pre_listing",
  "active",
  "under_contract",
  "pending_closing",
  "closed",
] as const

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <Badge
      variant="secondary"
      className={cn("text-[11px] font-medium", cfg.bgColor, cfg.color)}
    >
      {cfg.label}
    </Badge>
  )
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-[#9CA3AF] italic">—</span>
  return (
    <Badge variant="outline" className="text-[11px] font-normal">
      {PROPERTY_TYPE_LABELS[type] ?? type}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <Card className="border-[#E5E7EB]">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#5A6B75]">
            {label}
          </p>
          <p className="text-lg font-bold text-[#1F2937]">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Create Listing Dialog
// ---------------------------------------------------------------------------

function CreateListingDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const createListing = useCreateListing()
  const [form, setForm] = useState({
    property_address: "",
    property_city: "",
    property_state: "",
    property_zip: "",
    property_type: "" as string,
    list_price: "",
    listing_date: "",
    marketing_description: "",
  })

  const handleSubmit = async () => {
    await createListing.mutateAsync({
      property_address: form.property_address || null,
      property_city: form.property_city || null,
      property_state: form.property_state || null,
      property_zip: form.property_zip || null,
      property_type: (form.property_type || null) as DispositionListing["property_type"],
      list_price: form.list_price ? parseFloat(form.list_price) : null,
      listing_date: form.listing_date || null,
      marketing_description: form.marketing_description || null,
    })
    setForm({
      property_address: "",
      property_city: "",
      property_state: "",
      property_zip: "",
      property_type: "",
      list_price: "",
      listing_date: "",
      marketing_description: "",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Listing</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Property Address</Label>
            <Input
              value={form.property_address}
              onChange={(e) =>
                setForm((f) => ({ ...f, property_address: e.target.value }))
              }
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>City</Label>
              <Input
                value={form.property_city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, property_city: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={form.property_state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, property_state: e.target.value }))
                }
                placeholder="SC"
              />
            </div>
            <div>
              <Label>Zip</Label>
              <Input
                value={form.property_zip}
                onChange={(e) =>
                  setForm((f) => ({ ...f, property_zip: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Property Type</Label>
              <Select
                value={form.property_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, property_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>List Price</Label>
              <Input
                type="number"
                value={form.list_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, list_price: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label>Listing Date</Label>
            <Input
              type="date"
              value={form.listing_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, listing_date: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.marketing_description}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  marketing_description: e.target.value,
                }))
              }
              rows={3}
              placeholder="Property description..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createListing.isPending}
            className="bg-[#1a5632] hover:bg-[#164528] text-white"
          >
            {createListing.isPending ? "Creating..." : "Create Listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// All Listings View (table)
// ---------------------------------------------------------------------------

function AllListingsView({
  listings,
  isLoading,
}: {
  listings: ListingWithAgent[]
  isLoading: boolean
}) {
  const router = useRouter()

  const columns: ColumnDef<ListingWithAgent>[] = [
    {
      key: "listing_number",
      header: "Listing #",
      sortable: true,
      mono: true,
      cell: (row) => (
        <span className="text-[12px] font-mono text-[#1a5632]">
          {row.listing_number ?? "—"}
        </span>
      ),
    },
    {
      key: "property_address",
      header: "Address",
      sortable: true,
      cell: (row) => (
        <div className="max-w-[240px] truncate">
          <span className="font-medium">{row.property_address ?? "—"}</span>
          {row.property_city && (
            <span className="ml-1 text-[#5A6B75]">
              {row.property_city}, {row.property_state}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "property_type",
      header: "Type",
      sortable: true,
      cell: (row) => <TypeBadge type={row.property_type} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "list_price",
      header: "List Price",
      sortable: true,
      className: "text-right",
      cell: (row) => (
        <span className="tabular-nums font-medium">
          {row.list_price ? formatCurrency(row.list_price) : "—"}
        </span>
      ),
    },
    {
      key: "dom",
      header: "DOM",
      sortable: true,
      className: "text-right",
      cell: (row) => (
        <span className="tabular-nums text-[#5A6B75]">
          {row.dom ?? "—"}
        </span>
      ),
    },
    {
      key: "agent_name",
      header: "Agent",
      cell: (row) => {
        const agent = row.listing_agent as AgentRef | null
        if (!agent) return <span className="text-[#9CA3AF] italic">—</span>
        return (
          <span className="text-[13px]">
            {agent.first_name} {agent.last_name}
          </span>
        )
      },
    },
  ]

  return (
    <DataTable<ListingWithAgent>
      columns={columns}
      data={listings}
      onRowClick={(row) => router.push(`/disposition/${row.id}`)}
      isLoading={isLoading}
      emptyMessage="No listings found."
      pageSize={20}
    />
  )
}

// ---------------------------------------------------------------------------
// Community View
// ---------------------------------------------------------------------------

function CommunityView({
  listings,
  isLoading,
}: {
  listings: ListingWithAgent[]
  isLoading: boolean
}) {
  const router = useRouter()

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; listings: ListingWithAgent[] }
    >()
    const noProject: ListingWithAgent[] = []

    for (const l of listings) {
      const proj = l.project as ProjectRef | null
      if (proj) {
        const existing = map.get(proj.id)
        if (existing) {
          existing.listings.push(l)
        } else {
          map.set(proj.id, { name: proj.name, listings: [l] })
        }
      } else {
        noProject.push(l)
      }
    }

    const groups = Array.from(map.entries()).map(([id, g]) => ({
      id,
      ...g,
    }))
    if (noProject.length > 0) {
      groups.push({ id: "none", name: "Unlinked Listings", listings: noProject })
    }
    return groups
  }, [listings])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (grouped.length === 0) {
    return (
      <div className="py-16 text-center text-[13px] text-[#5A6B75]">
        No listings found.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => {
        const active = group.listings.filter(
          (l) => l.status === "active"
        ).length
        const contracted = group.listings.filter(
          (l) =>
            l.status === "under_contract" || l.status === "pending_closing"
        ).length
        const sold = group.listings.filter(
          (l) => l.status === "closed"
        ).length
        const remaining = group.listings.length - sold

        return (
          <Card key={group.id} className="border-[#E5E7EB]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[#1F2937]">
                  {group.name}
                </h3>
                <p className="text-[11px] text-[#5A6B75]">
                  {group.listings.length} listing
                  {group.listings.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-4 text-[12px]">
                <span>
                  <span className="font-medium text-emerald-600">
                    {active}
                  </span>{" "}
                  active
                </span>
                <span>
                  <span className="font-medium text-amber-600">
                    {contracted}
                  </span>{" "}
                  contracted
                </span>
                <span>
                  <span className="font-medium text-purple-600">{sold}</span>{" "}
                  sold
                </span>
                <span>
                  <span className="font-medium">{remaining}</span> remaining
                </span>
              </div>
            </div>
            <CardContent className="p-0">
              {group.listings.map((l, idx) => {
                const agent = l.listing_agent as AgentRef | null
                return (
                  <div
                    key={l.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-4 px-4 py-2 text-[13px] hover:bg-[#f9fafb]",
                      idx < group.listings.length - 1 &&
                        "border-b border-[#E5E7EB]"
                    )}
                    onClick={() => router.push(`/disposition/${l.id}`)}
                  >
                    <span className="w-[90px] font-mono text-[12px] text-[#1a5632]">
                      {l.listing_number}
                    </span>
                    <span className="flex-1 truncate font-medium">
                      {l.property_address ?? "—"}
                    </span>
                    <StatusBadge status={l.status} />
                    <span className="w-[100px] text-right tabular-nums">
                      {l.list_price ? formatCurrency(l.list_price) : "—"}
                    </span>
                    <span className="w-[40px] text-right tabular-nums text-[#5A6B75]">
                      {l.dom ?? "—"}
                    </span>
                    <span className="w-[100px] truncate text-right text-[#5A6B75]">
                      {agent
                        ? `${agent.first_name} ${agent.last_name}`
                        : "—"}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pipeline View (kanban)
// ---------------------------------------------------------------------------

function PipelineView({
  listings,
  isLoading,
}: {
  listings: ListingWithAgent[]
  isLoading: boolean
}) {
  const router = useRouter()

  const columns = useMemo(() => {
    const map: Record<string, ListingWithAgent[]> = {}
    for (const col of PIPELINE_COLUMNS) {
      map[col] = []
    }
    for (const l of listings) {
      if (map[l.status]) {
        map[l.status].push(l)
      }
    }
    return map
  }, [listings])

  if (isLoading) {
    return (
      <div className="flex gap-3">
        {PIPELINE_COLUMNS.map((col) => (
          <div key={col} className="w-[220px] shrink-0">
            <Skeleton className="mb-2 h-8 w-full" />
            {[1, 2].map((i) => (
              <Skeleton key={i} className="mb-2 h-24 w-full" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4" style={{ minWidth: PIPELINE_COLUMNS.length * 228 }}>
        {PIPELINE_COLUMNS.map((col) => {
          const cfg = STATUS_CONFIG[col]
          const cards = columns[col] ?? []
          return (
            <div key={col} className="w-[220px] shrink-0">
              <div
                className={cn(
                  "mb-2 flex items-center justify-between rounded-md px-3 py-2",
                  cfg.bgColor
                )}
              >
                <span
                  className={cn("text-[12px] font-semibold", cfg.color)}
                >
                  {cfg.label}
                </span>
                <Badge
                  variant="secondary"
                  className="h-5 min-w-[20px] justify-center px-1.5 text-[10px]"
                >
                  {cards.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {cards.map((l) => {
                  const agent = l.listing_agent as AgentRef | null
                  return (
                    <Card
                      key={l.id}
                      className="cursor-pointer border-[#E5E7EB] hover:shadow-sm"
                      onClick={() => router.push(`/disposition/${l.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-[#1F2937]">
                              {l.property_address ?? "No address"}
                            </p>
                            {l.property_city && (
                              <p className="text-[11px] text-[#5A6B75]">
                                {l.property_city}, {l.property_state}
                              </p>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[13px] font-semibold tabular-nums">
                                {l.list_price
                                  ? formatCurrency(l.list_price)
                                  : "—"}
                              </span>
                              {l.dom !== null && (
                                <span className="text-[11px] text-[#5A6B75]">
                                  {l.dom}d
                                </span>
                              )}
                            </div>
                            {agent && (
                              <div className="mt-1.5 flex items-center gap-1">
                                <User className="h-3 w-3 text-[#9CA3AF]" />
                                <span className="text-[11px] text-[#5A6B75]">
                                  {agent.first_name} {agent.last_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                {cards.length === 0 && (
                  <div className="py-6 text-center text-[11px] text-[#9CA3AF]">
                    No listings
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

// ---------------------------------------------------------------------------
// Filter Panel
// ---------------------------------------------------------------------------

function FilterPanel({
  filters,
  onFiltersChange,
}: {
  filters: PageFilters
  onFiltersChange: (f: PageFilters) => void
}) {
  const statusOptions = Object.entries(STATUS_CONFIG)

  const toggleStatus = (status: string) => {
    const current = filters.statuses ?? []
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    onFiltersChange({ ...filters, statuses: next })
  }

  const togglePropertyType = (type: string) => {
    const current = filters.propertyTypes ?? []
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    onFiltersChange({ ...filters, propertyTypes: next })
  }

  const hasFilters =
    (filters.statuses?.length ?? 0) > 0 ||
    (filters.propertyTypes?.length ?? 0) > 0 ||
    !!filters.search ||
    !!filters.priceMin ||
    !!filters.priceMax ||
    !!filters.dateFrom ||
    !!filters.dateTo

  return (
    <div className="w-[280px] shrink-0 border-l border-[#E5E7EB] bg-white">
      <ScrollArea className="h-full">
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#1F2937]">
              Filters
            </h3>
            {hasFilters && (
              <button
                onClick={() =>
                  onFiltersChange({
                    statuses: [],
                    propertyTypes: [],
                    search: "",
                    priceMin: "",
                    priceMax: "",
                    dateFrom: "",
                    dateTo: "",
                  })
                }
                className="text-[12px] text-[#1a5632] hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Search */}
          <div className="mb-4">
            <Label className="mb-1.5 text-[11px] uppercase tracking-wide text-[#5A6B75]">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                value={filters.search}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value })
                }
                placeholder="Address, MLS#, listing#..."
                className="h-8 pl-8 text-[13px]"
              />
            </div>
          </div>

          {/* Status */}
          <div className="mb-4">
            <Label className="mb-1.5 text-[11px] uppercase tracking-wide text-[#5A6B75]">
              Status
            </Label>
            <div className="space-y-1">
              {statusOptions.map(([key, cfg]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-[#f9fafb]"
                >
                  <Checkbox
                    checked={filters.statuses?.includes(key) ?? false}
                    onCheckedChange={() => toggleStatus(key)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-[13px] text-[#1F2937]">
                    {cfg.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Property Type */}
          <div className="mb-4">
            <Label className="mb-1.5 text-[11px] uppercase tracking-wide text-[#5A6B75]">
              Property Type
            </Label>
            <div className="space-y-1">
              {Object.entries(PROPERTY_TYPE_LABELS).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-[#f9fafb]"
                >
                  <Checkbox
                    checked={filters.propertyTypes?.includes(key) ?? false}
                    onCheckedChange={() => togglePropertyType(key)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-[13px] text-[#1F2937]">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-4">
            <Label className="mb-1.5 text-[11px] uppercase tracking-wide text-[#5A6B75]">
              Price Range
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={filters.priceMin}
                onChange={(e) =>
                  onFiltersChange({ ...filters, priceMin: e.target.value })
                }
                placeholder="Min"
                className="h-8 text-[13px]"
              />
              <span className="text-[#9CA3AF]">–</span>
              <Input
                type="number"
                value={filters.priceMax}
                onChange={(e) =>
                  onFiltersChange({ ...filters, priceMax: e.target.value })
                }
                placeholder="Max"
                className="h-8 text-[13px]"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="mb-4">
            <Label className="mb-1.5 text-[11px] uppercase tracking-wide text-[#5A6B75]">
              Listed Date
            </Label>
            <div className="space-y-2">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  onFiltersChange({ ...filters, dateFrom: e.target.value })
                }
                className="h-8 text-[13px]"
              />
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  onFiltersChange({ ...filters, dateTo: e.target.value })
                }
                className="h-8 text-[13px]"
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function StatsLoading() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px]" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Type helpers for joined data
// ---------------------------------------------------------------------------

interface AgentRef {
  id: string
  first_name: string
  last_name: string
  company: string | null
  email: string | null
  phone: string | null
}

interface ProjectRef {
  id: string
  name: string
}

interface ListingWithAgent extends DispositionListing {
  [key: string]: unknown
  project?: ProjectRef | null
  entity?: { id: string; name: string } | null
  listing_agent?: AgentRef | null
}

interface PageFilters {
  statuses: string[]
  propertyTypes: string[]
  search: string
  priceMin: string
  priceMax: string
  dateFrom: string
  dateTo: string
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DispositionPage() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status") || ""

  const [view, setView] = useState<ViewMode>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [filters, setFilters] = useState<PageFilters>({
    statuses: initialStatus ? [initialStatus] : [],
    propertyTypes: [],
    search: "",
    priceMin: "",
    priceMax: "",
    dateFrom: "",
    dateTo: "",
  })

  // Build API filters
  const apiFilters: ListingFilters = useMemo(() => {
    const f: ListingFilters = { page_size: 200 }
    if (filters.statuses.length > 0) {
      f.status = filters.statuses.join(",")
    }
    if (filters.propertyTypes.length === 1) {
      f.property_type = filters.propertyTypes[0]
    }
    if (filters.search) {
      f.search = filters.search
    }
    return f
  }, [filters])

  const { data: listingsData, isLoading } = useListings(apiFilters)
  const allListings = (listingsData?.data ?? []) as ListingWithAgent[]

  // Client-side filter for price range, date range, and multi property types
  const filteredListings = useMemo(() => {
    let result = allListings
    if (filters.propertyTypes.length > 1) {
      result = result.filter(
        (l) => l.property_type && filters.propertyTypes.includes(l.property_type)
      )
    }
    if (filters.priceMin) {
      const min = parseFloat(filters.priceMin)
      result = result.filter((l) => (l.list_price ?? 0) >= min)
    }
    if (filters.priceMax) {
      const max = parseFloat(filters.priceMax)
      result = result.filter((l) => (l.list_price ?? 0) <= max)
    }
    if (filters.dateFrom) {
      result = result.filter(
        (l) => l.listing_date && l.listing_date >= filters.dateFrom
      )
    }
    if (filters.dateTo) {
      result = result.filter(
        (l) => l.listing_date && l.listing_date <= filters.dateTo
      )
    }
    return result
  }, [allListings, filters])

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0]

    const active = allListings.filter((l) => l.status === "active").length
    const underContract = allListings.filter(
      (l) => l.status === "under_contract"
    ).length
    const pendingClosing = allListings.filter(
      (l) => l.status === "pending_closing"
    ).length
    const closedThisMonth = allListings.filter(
      (l) => l.status === "closed" && l.updated_at >= monthStart
    ).length

    const revenueMtd = allListings
      .filter(
        (l) => l.status === "closed" && l.updated_at >= monthStart
      )
      .reduce((sum, l) => sum + (l.list_price ?? 0), 0)

    const listingsWithDom = allListings.filter(
      (l) => l.dom !== null && l.dom !== undefined
    )
    const avgDom =
      listingsWithDom.length > 0
        ? Math.round(
            listingsWithDom.reduce((sum, l) => sum + (l.dom ?? 0), 0) /
              listingsWithDom.length
          )
        : 0

    return { active, underContract, pendingClosing, closedThisMonth, revenueMtd, avgDom }
  }, [allListings])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">
            Disposition
          </h1>
          <p className="text-sm text-[#5A6B75]">
            Manage property listings and sales pipeline
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-[#1a5632] hover:bg-[#164528] text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Listing
        </Button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <StatsLoading />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Active Listings"
            value={stats.active}
            icon={Home}
            color="bg-blue-500"
          />
          <StatCard
            label="Under Contract"
            value={stats.underContract}
            icon={FileSignature}
            color="bg-[#1a5632]"
          />
          <StatCard
            label="Pending Closing"
            value={stats.pendingClosing}
            icon={Clock}
            color="bg-yellow-500"
          />
          <StatCard
            label="Closed This Month"
            value={stats.closedThisMonth}
            icon={CheckCircle2}
            color="bg-green-500"
          />
          <StatCard
            label="Total Revenue MTD"
            value={formatCurrency(stats.revenueMtd)}
            icon={DollarSign}
            color="bg-emerald-600"
          />
          <StatCard
            label="Avg Days on Market"
            value={stats.avgDom}
            icon={Timer}
            color="bg-slate-500"
          />
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] p-1 w-fit">
        <Button
          variant={view === "all" ? "default" : "ghost"}
          size="sm"
          className={cn(
            "h-7 text-[12px]",
            view === "all" && "bg-[#1a5632] text-white hover:bg-[#164528]"
          )}
          onClick={() => setView("all")}
        >
          <List className="mr-1.5 h-3.5 w-3.5" />
          All Listings
        </Button>
        <Button
          variant={view === "community" ? "default" : "ghost"}
          size="sm"
          className={cn(
            "h-7 text-[12px]",
            view === "community" &&
              "bg-[#1a5632] text-white hover:bg-[#164528]"
          )}
          onClick={() => setView("community")}
        >
          <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
          By Community
        </Button>
        <Button
          variant={view === "pipeline" ? "default" : "ghost"}
          size="sm"
          className={cn(
            "h-7 text-[12px]",
            view === "pipeline" &&
              "bg-[#1a5632] text-white hover:bg-[#164528]"
          )}
          onClick={() => setView("pipeline")}
        >
          <Columns3 className="mr-1.5 h-3.5 w-3.5" />
          Pipeline
        </Button>
      </div>

      {/* Main content + Filter panel */}
      <div className="flex gap-0">
        {/* Content */}
        <div className="min-w-0 flex-1">
          {view === "all" && (
            <AllListingsView
              listings={filteredListings}
              isLoading={isLoading}
            />
          )}
          {view === "community" && (
            <CommunityView
              listings={filteredListings}
              isLoading={isLoading}
            />
          )}
          {view === "pipeline" && (
            <PipelineView
              listings={filteredListings}
              isLoading={isLoading}
            />
          )}

          {/* Empty state */}
          {!isLoading && allListings.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] py-16">
              <Home className="mb-3 h-10 w-10 text-[#9CA3AF]" />
              <p className="mb-1 text-[15px] font-medium text-[#1F2937]">
                No listings yet
              </p>
              <p className="mb-4 text-[13px] text-[#5A6B75]">
                Create your first listing to get started.
              </p>
              <Button
                onClick={() => setShowCreate(true)}
                className="bg-[#1a5632] hover:bg-[#164528] text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Listing
              </Button>
            </div>
          )}
        </div>

        {/* Filter Panel */}
        <FilterPanel filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Create Dialog */}
      <CreateListingDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
