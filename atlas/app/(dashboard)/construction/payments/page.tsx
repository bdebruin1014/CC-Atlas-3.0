"use client"

import { useState, useMemo } from "react"
import {
  CreditCard,
  DollarSign,
  Clock,
  CalendarDays,
  CheckCircle,
  Send,
  FileText,
  Download,
  Search,
  X,
  Banknote,
  Building2,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "voided"
type PaymentMethod = "ACH" | "Check" | "Wire" | "Credit Card"

interface PayableInvoice {
  id: string
  invoice_number: string
  vendor_name: string
  vendor_id: string
  job_name: string
  cost_code: string
  net_amount: number
  due_date: string
  days_outstanding: number
  selected: boolean
}

interface PaymentRecord {
  id: string
  payment_number: string
  vendor_name: string
  vendor_id: string
  amount: number
  payment_method: PaymentMethod
  check_number: string | null
  payment_date: string
  status: PaymentStatus
  invoices_paid: string[]
  job_name: string
  approved_by: string
  notes: string | null
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

// TODO: Replace with API call to fetch approved invoices ready for payment
const MOCK_PAYABLE_INVOICES: PayableInvoice[] = [
  {
    id: "pi-001",
    invoice_number: "INV-2026-0138",
    vendor_name: "Carolina Framing Inc.",
    vendor_id: "v2",
    job_name: "Greenview Phase I",
    cost_code: "06-100",
    net_amount: 83160.00,
    due_date: "2026-02-19",
    days_outstanding: 28,
    selected: false,
  },
  {
    id: "pi-002",
    invoice_number: "INV-2026-0115",
    vendor_name: "Lowcountry Electric Co.",
    vendor_id: "v3",
    job_name: "Oakmont Reserve",
    cost_code: "16-100",
    net_amount: 30780.00,
    due_date: "2026-02-09",
    days_outstanding: 38,
    selected: false,
  },
  {
    id: "pi-003",
    invoice_number: "INV-2026-0098",
    vendor_name: "Coastal Plumbing Services",
    vendor_id: "v4",
    job_name: "Oakmont Reserve",
    cost_code: "15-100",
    net_amount: 51120.00,
    due_date: "2026-01-27",
    days_outstanding: 51,
    selected: false,
  },
  {
    id: "pi-004",
    invoice_number: "INV-2026-0142",
    vendor_name: "Palmetto Concrete LLC",
    vendor_id: "v1",
    job_name: "Greenview Phase I",
    cost_code: "03-100",
    net_amount: 43875.00,
    due_date: "2026-02-27",
    days_outstanding: 20,
    selected: false,
  },
  {
    id: "pi-005",
    invoice_number: "INV-2026-0145",
    vendor_name: "Heritage HVAC Solutions",
    vendor_id: "v6",
    job_name: "Oakmont Reserve",
    cost_code: "15-500",
    net_amount: 37080.00,
    due_date: "2026-03-03",
    days_outstanding: 14,
    selected: false,
  },
  {
    id: "pi-006",
    invoice_number: "INV-2026-0147",
    vendor_name: "Palmetto Concrete LLC",
    vendor_id: "v1",
    job_name: "Oakmont Reserve",
    cost_code: "03-100",
    net_amount: 20160.00,
    due_date: "2026-03-05",
    days_outstanding: 12,
    selected: false,
  },
]

// TODO: Replace with API call to fetch payment history
const MOCK_PAYMENT_HISTORY: PaymentRecord[] = [
  {
    id: "pay-001",
    payment_number: "PMT-2026-0045",
    vendor_name: "Southern Roofing Partners",
    vendor_id: "v5",
    amount: 60750.00,
    payment_method: "ACH",
    check_number: null,
    payment_date: "2026-02-10",
    status: "completed",
    invoices_paid: ["INV-2026-0130"],
    job_name: "Greenview Phase I",
    approved_by: "Sarah Chen",
    notes: null,
  },
  {
    id: "pay-002",
    payment_number: "PMT-2026-0044",
    vendor_name: "Lowcountry Lumber Supply",
    vendor_id: "v7",
    amount: 28950.00,
    payment_method: "Check",
    check_number: "10482",
    payment_date: "2026-02-05",
    status: "completed",
    invoices_paid: ["INV-2026-0121"],
    job_name: "Greenview Phase I",
    approved_by: "Mike Thompson",
    notes: null,
  },
  {
    id: "pay-003",
    payment_number: "PMT-2026-0038",
    vendor_name: "Carolina Framing Inc.",
    vendor_id: "v2",
    amount: 70380.00,
    payment_method: "ACH",
    check_number: null,
    payment_date: "2026-01-15",
    status: "completed",
    invoices_paid: ["INV-2026-0088"],
    job_name: "Oakmont Reserve",
    approved_by: "Sarah Chen",
    notes: null,
  },
  {
    id: "pay-004",
    payment_number: "PMT-2026-0035",
    vendor_name: "Palmetto Concrete LLC",
    vendor_id: "v1",
    amount: 32400.00,
    payment_method: "ACH",
    check_number: null,
    payment_date: "2026-01-10",
    status: "completed",
    invoices_paid: ["INV-2025-0485"],
    job_name: "Greenview Phase I",
    approved_by: "Mike Thompson",
    notes: null,
  },
  {
    id: "pay-005",
    payment_number: "PMT-2026-0032",
    vendor_name: "Heritage HVAC Solutions",
    vendor_id: "v6",
    amount: 45600.00,
    payment_method: "Check",
    check_number: "10478",
    payment_date: "2026-01-08",
    status: "completed",
    invoices_paid: ["INV-2025-0472"],
    job_name: "Oakmont Reserve",
    approved_by: "Sarah Chen",
    notes: null,
  },
  {
    id: "pay-006",
    payment_number: "PMT-2025-0210",
    vendor_name: "Coastal Plumbing Services",
    vendor_id: "v4",
    amount: 38200.00,
    payment_method: "ACH",
    check_number: null,
    payment_date: "2025-12-20",
    status: "completed",
    invoices_paid: ["INV-2025-0448"],
    job_name: "Greenview Phase I",
    approved_by: "Mike Thompson",
    notes: null,
  },
  {
    id: "pay-007",
    payment_number: "PMT-2025-0205",
    vendor_name: "Midlands Drywall Co.",
    vendor_id: "v8",
    amount: 27540.00,
    payment_method: "Wire",
    check_number: null,
    payment_date: "2025-12-15",
    status: "completed",
    invoices_paid: ["INV-2025-0435", "INV-2025-0436"],
    job_name: "Greenview Phase I",
    approved_by: "Sarah Chen",
    notes: "Combined payment for two invoices",
  },
]

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; bgColor: string }> = {
  pending: {
    label: "Pending",
    bgColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  processing: {
    label: "Processing",
    bgColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  completed: {
    label: "Completed",
    bgColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  failed: {
    label: "Failed",
    bgColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  voided: {
    label: "Voided",
    bgColor: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  },
}

// ---------------------------------------------------------------------------
// PaymentRun Component
// ---------------------------------------------------------------------------

// TODO: Extract to @/components/construction/payment-run
function PaymentRun() {
  const [payables, setPayables] = useState(MOCK_PAYABLE_INVOICES)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ACH")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const selectedInvoices = payables.filter((p) => p.selected)
  const selectedTotal = selectedInvoices.reduce((sum, inv) => sum + inv.net_amount, 0)
  const overdueInvoices = payables.filter((p) => p.days_outstanding > 30)

  const toggleInvoice = (id: string) => {
    setPayables((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    )
  }

  const toggleAll = () => {
    const allSelected = payables.every((p) => p.selected)
    setPayables((prev) => prev.map((p) => ({ ...p, selected: !allSelected })))
  }

  const selectOverdue = () => {
    setPayables((prev) =>
      prev.map((p) => ({ ...p, selected: p.days_outstanding > 30 }))
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick Select Actions */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {payables.every((p) => p.selected) ? "Deselect All" : "Select All"}
        </Button>
        <Button variant="outline" size="sm" onClick={selectOverdue}>
          <AlertTriangle className="mr-1 h-3.5 w-3.5 text-red-500" />
          Select Overdue ({overdueInvoices.length})
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Payment Method:</span>
          <Select
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACH">ACH</SelectItem>
              <SelectItem value="Check">Check</SelectItem>
              <SelectItem value="Wire">Wire</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payable Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] pl-4">
                  <Checkbox
                    checked={payables.length > 0 && payables.every((p) => p.selected)}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Cost Code</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payables.map((invoice) => {
                const isOverdue = invoice.days_outstanding > 30

                return (
                  <TableRow key={invoice.id} className={cn(invoice.selected && "bg-primary/5")}>
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={invoice.selected}
                        onCheckedChange={() => toggleInvoice(invoice.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="font-medium">{invoice.vendor_name}</TableCell>
                    <TableCell className="text-muted-foreground">{invoice.job_name}</TableCell>
                    <TableCell className="font-mono text-xs">{invoice.cost_code}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.net_amount)}
                    </TableCell>
                    <TableCell className={cn(isOverdue && "text-red-600 font-medium")}>
                      {formatDate(invoice.due_date, { short: true })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-xs",
                          isOverdue
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : invoice.days_outstanding > 20
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        )}
                      >
                        {invoice.days_outstanding}d
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card className={cn(selectedInvoices.length > 0 && "border-primary/30")}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? "s" : ""} selected
              </p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(selectedTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Via {paymentMethod}
                {selectedInvoices.length > 0 && (
                  <> to {new Set(selectedInvoices.map((i) => i.vendor_name)).size} vendor(s)</>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {/* TODO: Wire up export payment register */}
              <Button variant="outline" disabled={selectedInvoices.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export Register
              </Button>
              {/* TODO: Wire up payment processing */}
              <Button
                disabled={selectedInvoices.length === 0}
                onClick={() => setShowConfirmDialog(true)}
              >
                <Send className="mr-2 h-4 w-4" />
                Process Payment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment Run</DialogTitle>
            <DialogDescription>
              Review the payment details before processing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoices</span>
              <span className="font-medium">{selectedInvoices.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Vendors</span>
              <span className="font-medium">
                {new Set(selectedInvoices.map((i) => i.vendor_name)).size}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Method</span>
              <span className="font-medium">{paymentMethod}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-medium">Total Amount</span>
              <span className="text-lg font-bold">{formatCurrency(selectedTotal)}</span>
            </div>

            {selectedInvoices.length > 0 && (
              <div className="max-h-[200px] overflow-y-auto rounded border p-2 space-y-1">
                {selectedInvoices.map((inv) => (
                  <div key={inv.id} className="flex justify-between text-xs">
                    <span>
                      {inv.vendor_name} - {inv.invoice_number}
                    </span>
                    <span className="font-medium">{formatCurrency(inv.net_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            {/* TODO: Wire up actual payment processing API */}
            <Button onClick={() => setShowConfirmDialog(false)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm & Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PaymentHistory Component
// ---------------------------------------------------------------------------

// TODO: Extract to @/components/construction/payment-history
function PaymentHistory() {
  const [search, setSearch] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")

  const filteredPayments = useMemo(() => {
    let payments = [...MOCK_PAYMENT_HISTORY]

    if (methodFilter !== "all") {
      payments = payments.filter((p) => p.payment_method === methodFilter)
    }
    if (search) {
      const s = search.toLowerCase()
      payments = payments.filter(
        (p) =>
          p.payment_number.toLowerCase().includes(s) ||
          p.vendor_name.toLowerCase().includes(s) ||
          (p.check_number && p.check_number.includes(s))
      )
    }

    return payments.sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    )
  }, [search, methodFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by payment #, vendor, or check #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="ACH">ACH</SelectItem>
            <SelectItem value="Check">Check</SelectItem>
            <SelectItem value="Wire">Wire</SelectItem>
          </SelectContent>
        </Select>
        {(search || methodFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setMethodFilter("all")
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Payment History Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Payment #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Job</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Check #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approved By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const statusConfig = PAYMENT_STATUS_CONFIG[payment.status]

                return (
                  <TableRow key={payment.id}>
                    <TableCell className="pl-4 font-mono text-xs font-medium">
                      {payment.payment_number}
                    </TableCell>
                    <TableCell className="font-medium">{payment.vendor_name}</TableCell>
                    <TableCell className="text-muted-foreground">{payment.job_name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {payment.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {payment.check_number || "---"}
                    </TableCell>
                    <TableCell>{formatDate(payment.payment_date, { short: true })}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {payment.invoices_paid.join(", ")}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", statusConfig.bgColor)}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {payment.approved_by}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredPayments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No payments found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filters.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState("payment-run")
  const [showPaymentRunDialog, setShowPaymentRunDialog] = useState(false)

  // ---- Computed summary stats ----
  const summaryStats = useMemo(() => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    const paymentsThisMonth = MOCK_PAYMENT_HISTORY.filter((p) =>
      p.payment_date.startsWith(thisMonth)
    )
    const totalPaidThisMonth = paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0)

    const totalOutstandingAP = MOCK_PAYABLE_INVOICES.reduce(
      (sum, inv) => sum + inv.net_amount, 0
    )

    // Upcoming due within 7 days
    const sevenDaysOut = new Date(now.getTime() + 7 * 86400000)
    const upcomingDue = MOCK_PAYABLE_INVOICES.filter((inv) => {
      const due = new Date(inv.due_date)
      return due <= sevenDaysOut
    })
    const upcomingDueAmount = upcomingDue.reduce((sum, inv) => sum + inv.net_amount, 0)

    return {
      paymentsThisMonth: paymentsThisMonth.length,
      totalPaidThisMonth,
      totalOutstandingAP,
      upcomingDueCount: upcomingDue.length,
      upcomingDueAmount,
    }
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Manage payment runs, process vendor payments, and view payment history
          </p>
        </div>
        <Button
          onClick={() => {
            setActiveTab("payment-run")
            setShowPaymentRunDialog(false)
          }}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Start Payment Run
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Banknote className="h-4 w-4 text-green-500" />
              Payments This Month
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(summaryStats.totalPaidThisMonth, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summaryStats.paymentsThisMonth} payment{summaryStats.paymentsThisMonth !== 1 ? "s" : ""} processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Outstanding AP
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(summaryStats.totalOutstandingAP, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {MOCK_PAYABLE_INVOICES.length} approved invoices pending payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CalendarDays className="h-4 w-4 text-orange-500" />
              Upcoming Due This Week
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {formatCurrency(summaryStats.upcomingDueAmount, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summaryStats.upcomingDueCount} invoice{summaryStats.upcomingDueCount !== 1 ? "s" : ""} due within 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="payment-run">
            <CreditCard className="mr-2 h-4 w-4" />
            Payment Run
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="mr-2 h-4 w-4" />
            Payment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment-run" className="mt-4">
          <PaymentRun />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <PaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}
