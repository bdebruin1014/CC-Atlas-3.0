"use client"

import { useState, useMemo } from "react"
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  X,
  Filter,
  Download,
  CreditCard,
  Eye,
  MoreHorizontal,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { toast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoiceStatus = "draft" | "pending_approval" | "approved" | "paid" | "overdue" | "disputed" | "void"

interface APInvoice {
  id: string
  invoice_number: string
  vendor_name: string
  vendor_id: string
  job_name: string
  job_number: string
  cost_code: string
  description: string
  amount: number
  retention_amount: number
  net_amount: number
  invoice_date: string
  due_date: string
  received_date: string
  status: InvoiceStatus
  po_number: string | null
  approved_by: string | null
  approved_at: string | null
  paid_date: string | null
  payment_method: string | null
  check_number: string | null
  notes: string | null
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

// TODO: Replace with API call to fetch invoices from backend
const MOCK_INVOICES: APInvoice[] = [
  {
    id: "inv-001",
    invoice_number: "INV-2026-0142",
    vendor_name: "Palmetto Concrete LLC",
    vendor_id: "v1",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    cost_code: "03-100",
    description: "Foundation pour - Lots 12-16",
    amount: 48750.00,
    retention_amount: 4875.00,
    net_amount: 43875.00,
    invoice_date: "2026-01-28",
    due_date: "2026-02-27",
    received_date: "2026-01-30",
    status: "pending_approval",
    po_number: "PO-2026-0089",
    approved_by: null,
    approved_at: null,
    paid_date: null,
    payment_method: null,
    check_number: null,
    notes: "Includes extra 2 yards per field change directive",
  },
  {
    id: "inv-002",
    invoice_number: "INV-2026-0138",
    vendor_name: "Carolina Framing Inc.",
    vendor_id: "v2",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    cost_code: "06-100",
    description: "Rough framing - Units 8-11",
    amount: 92400.00,
    retention_amount: 9240.00,
    net_amount: 83160.00,
    invoice_date: "2026-01-20",
    due_date: "2026-02-19",
    received_date: "2026-01-22",
    status: "approved",
    po_number: "PO-2026-0072",
    approved_by: "Mike Thompson",
    approved_at: "2026-01-25T14:30:00Z",
    paid_date: null,
    payment_method: null,
    check_number: null,
    notes: null,
  },
  {
    id: "inv-003",
    invoice_number: "INV-2026-0115",
    vendor_name: "Lowcountry Electric Co.",
    vendor_id: "v3",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    cost_code: "16-100",
    description: "Rough electrical - Building A",
    amount: 34200.00,
    retention_amount: 3420.00,
    net_amount: 30780.00,
    invoice_date: "2026-01-10",
    due_date: "2026-02-09",
    received_date: "2026-01-12",
    status: "overdue",
    po_number: "PO-2026-0051",
    approved_by: "Sarah Chen",
    approved_at: "2026-01-15T09:00:00Z",
    paid_date: null,
    payment_method: null,
    check_number: null,
    notes: "Vendor requesting expedited payment",
  },
  {
    id: "inv-004",
    invoice_number: "INV-2026-0098",
    vendor_name: "Coastal Plumbing Services",
    vendor_id: "v4",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    cost_code: "15-100",
    description: "Plumbing rough-in - Units 1-6",
    amount: 56800.00,
    retention_amount: 5680.00,
    net_amount: 51120.00,
    invoice_date: "2025-12-28",
    due_date: "2026-01-27",
    received_date: "2025-12-30",
    status: "overdue",
    po_number: "PO-2025-0412",
    approved_by: "Mike Thompson",
    approved_at: "2026-01-03T11:00:00Z",
    paid_date: null,
    payment_method: null,
    check_number: null,
    notes: "Disputed amount on change order work - under review",
  },
  {
    id: "inv-005",
    invoice_number: "INV-2026-0130",
    vendor_name: "Southern Roofing Partners",
    vendor_id: "v5",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    cost_code: "07-100",
    description: "Roofing installation - Lots 8-11",
    amount: 67500.00,
    retention_amount: 6750.00,
    net_amount: 60750.00,
    invoice_date: "2026-01-15",
    due_date: "2026-02-14",
    received_date: "2026-01-17",
    status: "paid",
    po_number: "PO-2026-0065",
    approved_by: "Sarah Chen",
    approved_at: "2026-01-20T10:00:00Z",
    paid_date: "2026-02-10",
    payment_method: "ACH",
    check_number: null,
    notes: null,
  },
  {
    id: "inv-006",
    invoice_number: "INV-2026-0145",
    vendor_name: "Heritage HVAC Solutions",
    vendor_id: "v6",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    cost_code: "15-500",
    description: "HVAC rough-in - Building B",
    amount: 41200.00,
    retention_amount: 4120.00,
    net_amount: 37080.00,
    invoice_date: "2026-02-01",
    due_date: "2026-03-03",
    received_date: "2026-02-03",
    status: "pending_approval",
    po_number: "PO-2026-0095",
    approved_by: null,
    approved_at: null,
    paid_date: null,
    payment_method: null,
    check_number: null,
    notes: null,
  },
  {
    id: "inv-007",
    invoice_number: "INV-2026-0121",
    vendor_name: "Lowcountry Lumber Supply",
    vendor_id: "v7",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    cost_code: "06-050",
    description: "Lumber delivery - January materials",
    amount: 28950.00,
    retention_amount: 0,
    net_amount: 28950.00,
    invoice_date: "2026-01-12",
    due_date: "2026-02-11",
    received_date: "2026-01-14",
    status: "paid",
    po_number: "PO-2026-0058",
    approved_by: "Mike Thompson",
    approved_at: "2026-01-16T08:30:00Z",
    paid_date: "2026-02-05",
    payment_method: "Check",
    check_number: "10482",
    notes: null,
  },
  {
    id: "inv-008",
    invoice_number: "INV-2026-0150",
    vendor_name: "Midlands Drywall Co.",
    vendor_id: "v8",
    job_name: "Greenview Phase I",
    job_number: "JOB-2024-001",
    cost_code: "09-100",
    description: "Drywall hang and finish - Units 4-7",
    amount: 38600.00,
    retention_amount: 3860.00,
    net_amount: 34740.00,
    invoice_date: "2026-02-05",
    due_date: "2026-03-07",
    received_date: "2026-02-07",
    status: "draft",
    po_number: "PO-2026-0101",
    approved_by: null,
    approved_at: null,
    paid_date: null,
    payment_method: null,
    check_number: null,
    notes: "Awaiting PO reconciliation before submission",
  },
  {
    id: "inv-009",
    invoice_number: "INV-2026-0147",
    vendor_name: "Palmetto Concrete LLC",
    vendor_id: "v1",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    cost_code: "03-100",
    description: "Flatwork and sidewalks - Phase 1 common areas",
    amount: 22400.00,
    retention_amount: 2240.00,
    net_amount: 20160.00,
    invoice_date: "2026-02-03",
    due_date: "2026-03-05",
    received_date: "2026-02-05",
    status: "pending_approval",
    po_number: "PO-2026-0098",
    approved_by: null,
    approved_at: null,
    paid_date: null,
    payment_method: null,
    check_number: null,
    notes: null,
  },
  {
    id: "inv-010",
    invoice_number: "INV-2026-0088",
    vendor_name: "Carolina Framing Inc.",
    vendor_id: "v2",
    job_name: "Oakmont Reserve",
    job_number: "JOB-2024-002",
    cost_code: "06-100",
    description: "Framing - Building A units 1-4",
    amount: 78200.00,
    retention_amount: 7820.00,
    net_amount: 70380.00,
    invoice_date: "2025-12-18",
    due_date: "2026-01-17",
    received_date: "2025-12-20",
    status: "paid",
    po_number: "PO-2025-0398",
    approved_by: "Sarah Chen",
    approved_at: "2025-12-23T14:00:00Z",
    paid_date: "2026-01-15",
    payment_method: "ACH",
    check_number: null,
    notes: null,
  },
]

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; bgColor: string; icon: React.ElementType }> = {
  draft: {
    label: "Draft",
    bgColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: FileText,
  },
  pending_approval: {
    label: "Pending Approval",
    bgColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    bgColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: CheckCircle,
  },
  paid: {
    label: "Paid",
    bgColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: CheckCircle,
  },
  overdue: {
    label: "Overdue",
    bgColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: AlertTriangle,
  },
  disputed: {
    label: "Disputed",
    bgColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    icon: AlertTriangle,
  },
  void: {
    label: "Void",
    bgColor: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
    icon: X,
  },
}

// ---------------------------------------------------------------------------
// InvoiceForm Component (inline for now)
// ---------------------------------------------------------------------------

// TODO: Extract InvoiceForm to @/components/construction/invoice-form
function InvoiceForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Vendor</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="v1">Palmetto Concrete LLC</SelectItem>
              <SelectItem value="v2">Carolina Framing Inc.</SelectItem>
              <SelectItem value="v3">Lowcountry Electric Co.</SelectItem>
              <SelectItem value="v4">Coastal Plumbing Services</SelectItem>
              <SelectItem value="v5">Southern Roofing Partners</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Input placeholder="e.g. INV-2026-0155" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Job</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="j1">Greenview Phase I</SelectItem>
              <SelectItem value="j2">Oakmont Reserve</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cost Code</Label>
          <Input placeholder="e.g. 03-100" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Invoice Amount</Label>
          <Input type="number" placeholder="0.00" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label>Retention (%)</Label>
          <Input type="number" placeholder="10" defaultValue="10" />
        </div>
        <div className="space-y-2">
          <Label>Net Amount</Label>
          <Input type="number" placeholder="0.00" disabled className="bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Invoice Date</Label>
          <Input type="date" />
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input type="date" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>PO Number (optional)</Label>
        <Input placeholder="Link to purchase order" />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea placeholder="Invoice description and scope of work..." rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Notes (internal)</Label>
        <Textarea placeholder="Internal notes..." rows={2} />
      </div>

      <Separator />

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onClose()
            toast({
              title: "Invoice creation coming soon",
              description: "Invoice API integration is not yet available.",
            })
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </DialogFooter>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function InvoicesPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all")
  const [jobFilter, setJobFilter] = useState("all")
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<APInvoice | null>(null)

  // ---- Computed summary stats ----
  const summaryStats = useMemo(() => {
    const outstanding = MOCK_INVOICES.filter((inv) =>
      ["pending_approval", "approved", "overdue"].includes(inv.status)
    )
    const overdue = MOCK_INVOICES.filter((inv) => inv.status === "overdue")
    const pendingApproval = MOCK_INVOICES.filter(
      (inv) => inv.status === "pending_approval"
    )
    const paidThisMonth = MOCK_INVOICES.filter((inv) => {
      if (!inv.paid_date) return false
      const paidDate = new Date(inv.paid_date)
      const now = new Date()
      return (
        paidDate.getMonth() === now.getMonth() &&
        paidDate.getFullYear() === now.getFullYear()
      )
    })

    return {
      totalOutstanding: outstanding.reduce((sum, inv) => sum + inv.net_amount, 0),
      overdueAmount: overdue.reduce((sum, inv) => sum + inv.net_amount, 0),
      pendingApprovalCount: pendingApproval.length,
      paidThisMonth: paidThisMonth.reduce((sum, inv) => sum + inv.net_amount, 0),
    }
  }, [])

  // ---- Filtered invoices ----
  const filteredInvoices = useMemo(() => {
    let invoices = [...MOCK_INVOICES]

    if (statusFilter !== "all") {
      invoices = invoices.filter((inv) => inv.status === statusFilter)
    }
    if (jobFilter !== "all") {
      invoices = invoices.filter((inv) => inv.job_number === jobFilter)
    }
    if (search) {
      const s = search.toLowerCase()
      invoices = invoices.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(s) ||
          inv.vendor_name.toLowerCase().includes(s) ||
          inv.description.toLowerCase().includes(s) ||
          inv.cost_code.toLowerCase().includes(s) ||
          (inv.po_number && inv.po_number.toLowerCase().includes(s))
      )
    }

    return invoices.sort((a, b) => {
      // Show overdue first, then pending, then approved, then others
      const order: Record<InvoiceStatus, number> = {
        overdue: 0,
        pending_approval: 1,
        approved: 2,
        draft: 3,
        disputed: 4,
        paid: 5,
        void: 6,
      }
      return (order[a.status] ?? 9) - (order[b.status] ?? 9)
    })
  }, [search, statusFilter, jobFilter])

  // Unique jobs from invoices
  const jobOptions = useMemo(() => {
    const jobs = new Map<string, string>()
    MOCK_INVOICES.forEach((inv) => jobs.set(inv.job_number, inv.job_name))
    return Array.from(jobs.entries())
  }, [])

  const hasFilters =
    statusFilter !== "all" || jobFilter !== "all" || search !== ""

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AP Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Manage accounts payable invoices, approvals, and payment processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled title="Payment run coming soon">
            <CreditCard className="mr-2 h-4 w-4" />
            Payment Run
          </Button>
          <Button variant="outline" disabled title="Export coming soon">
            <Download className="mr-2 h-4 w-4" />
            Export Aging Report
          </Button>
          <Button onClick={() => setShowNewInvoice(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Total Outstanding
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(summaryStats.totalOutstanding, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Pending + approved + overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue Amount
            </div>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(summaryStats.overdueAmount, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Past due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending Approval
            </div>
            <p className="text-3xl font-bold">
              {summaryStats.pendingApprovalCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Invoices awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Paid This Month
            </div>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(summaryStats.paidThisMonth, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              February 2026
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices by number, vendor, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>

        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobOptions.map(([number, name]) => (
              <SelectItem key={number} value={number}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setStatusFilter("all")
              setJobFilter("all")
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}
        {statusFilter !== "all" && ` (${INVOICE_STATUS_CONFIG[statusFilter].label})`}
      </p>

      {/* Invoice List Table */}
      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">No invoices found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {hasFilters
                ? "Try adjusting your filters."
                : "Get started by creating a new invoice."}
            </p>
            {!hasFilters && (
              <Button onClick={() => setShowNewInvoice(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const statusConfig = INVOICE_STATUS_CONFIG[invoice.status]
                  const isOverdue = invoice.status === "overdue"

                  return (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <TableCell className="pl-4 font-mono text-xs font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.vendor_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.job_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {invoice.cost_code}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {invoice.description}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.net_amount)}
                      </TableCell>
                      <TableCell className={cn(isOverdue && "text-red-600 font-medium")}>
                        {formatDate(invoice.due_date, { short: true })}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", statusConfig.bgColor)}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* TODO: Wire up actions to API */}
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedInvoice(invoice) }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {invoice.status === "pending_approval" && (
                              <DropdownMenuItem>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {invoice.status === "approved" && (
                              <DropdownMenuItem>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New Invoice Dialog */}
      <Dialog open={showNewInvoice} onOpenChange={setShowNewInvoice}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New AP Invoice</DialogTitle>
            <DialogDescription>
              Enter invoice details to create a new accounts payable record.
            </DialogDescription>
          </DialogHeader>
          <InvoiceForm onClose={() => setShowNewInvoice(false)} />
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      {selectedInvoice && (
        <Dialog
          open={!!selectedInvoice}
          onOpenChange={(open) => !open && setSelectedInvoice(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Invoice {selectedInvoice.invoice_number}</DialogTitle>
              <DialogDescription>
                {selectedInvoice.vendor_name} - {selectedInvoice.job_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "text-xs",
                    INVOICE_STATUS_CONFIG[selectedInvoice.status].bgColor
                  )}
                >
                  {INVOICE_STATUS_CONFIG[selectedInvoice.status].label}
                </Badge>
                {selectedInvoice.po_number && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {selectedInvoice.po_number}
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cost Code</p>
                  <p className="font-mono font-medium">{selectedInvoice.cost_code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Job Number</p>
                  <p className="font-mono font-medium">{selectedInvoice.job_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className={cn("font-medium", selectedInvoice.status === "overdue" && "text-red-600")}>
                    {formatDate(selectedInvoice.due_date)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Amount</span>
                  <span className="font-medium">{formatCurrency(selectedInvoice.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retention</span>
                  <span className="text-red-600">-{formatCurrency(selectedInvoice.retention_amount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Net Payable</span>
                  <span className="text-lg font-bold">{formatCurrency(selectedInvoice.net_amount)}</span>
                </div>
              </div>

              {selectedInvoice.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedInvoice.description}</p>
                  </div>
                </>
              )}

              {selectedInvoice.approved_by && (
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Approved by {selectedInvoice.approved_by} on{" "}
                    {formatDate(selectedInvoice.approved_at, { includeTime: true })}
                  </p>
                </div>
              )}

              {selectedInvoice.paid_date && (
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Paid on {formatDate(selectedInvoice.paid_date)} via{" "}
                    {selectedInvoice.payment_method}
                    {selectedInvoice.check_number && ` (#${selectedInvoice.check_number})`}
                  </p>
                </div>
              )}

              {selectedInvoice.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{selectedInvoice.notes}</p>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              {/* TODO: Wire up status transition actions */}
              {selectedInvoice.status === "pending_approval" && (
                <Button>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Invoice
                </Button>
              )}
              {selectedInvoice.status === "approved" && (
                <Button>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
