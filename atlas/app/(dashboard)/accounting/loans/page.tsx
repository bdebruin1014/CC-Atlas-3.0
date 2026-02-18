"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Banknote,
  Search,
  AlertTriangle,
  ChevronDown,
  X,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { LoanTracker } from "@/components/accounting/loan-tracker"
import type {
  Loan,
  LoanType,
  LoanStatus,
  RateType,
  LoanDraw,
  Entity,
} from "@/lib/types/accounting"
import { LOAN_TYPE_LABELS } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDaysUntilMaturity(maturityDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maturity = new Date(maturityDate)
  maturity.setHours(0, 0, 0, 0)
  return Math.ceil((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getMaturityBadge(daysRemaining: number) {
  if (daysRemaining <= 0) {
    return <Badge variant="secondary" className="bg-red-200 text-red-800 hover:bg-red-200">Matured</Badge>
  }
  if (daysRemaining <= 30) {
    return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">{daysRemaining}d</Badge>
  }
  if (daysRemaining <= 60) {
    return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">{daysRemaining}d</Badge>
  }
  if (daysRemaining <= 90) {
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{daysRemaining}d</Badge>
  }
  return null
}

function getStatusBadge(status: LoanStatus) {
  switch (status) {
    case "active": return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
    case "paid_off": return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Paid Off</Badge>
    case "defaulted": return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">Defaulted</Badge>
    case "pending": return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function LoansPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loans, setLoans] = useState<Loan[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | LoanStatus>("all")
  const [showAddLoan, setShowAddLoan] = useState(false)
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null)
  const [showDrawDialog, setShowDrawDialog] = useState(false)
  const [drawLoanId, setDrawLoanId] = useState<string | null>(null)

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const supabase = createClient()

      const { data: entityData } = await supabase.from("entities").select("*").order("name")
      if (entityData) setEntities(entityData as unknown as Entity[])

      const { data: loanData } = await supabase
        .from("loans")
        .select("*, loan_draws(*)")
        .order("maturity_date")

      if (loanData) {
        setLoans(
          loanData.map((l: any) => ({
            ...l,
            draws: (l.loan_draws || []).sort(
              (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
            ),
            lender_name: l.lender_name || "Unknown",
          })) as Loan[]
        )
      }
      setLoading(false)
    }
    loadData()
  }, [])

  // Filtered loans
  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        if (
          !l.lender_name.toLowerCase().includes(q) &&
          !(l.project_name || "").toLowerCase().includes(q)
        ) {
          return false
        }
      }
      if (statusFilter !== "all" && l.status !== statusFilter) return false
      return true
    })
  }, [loans, searchTerm, statusFilter])

  // Table columns
  const columns: ColumnDef<Loan>[] = useMemo(
    () => [
      {
        key: "lender_name",
        header: "Lender",
        sortable: true,
        cell: (row) => <span className="font-medium text-sm">{row.lender_name}</span>,
      },
      {
        key: "loan_type",
        header: "Type",
        cell: (row) => (
          <Badge variant="outline" className="text-[10px]">
            {LOAN_TYPE_LABELS[row.loan_type]}
          </Badge>
        ),
      },
      {
        key: "original_amount",
        header: "Original",
        sortable: true,
        className: "text-right",
        cell: (row) => (
          <span className="font-mono tabular-nums text-sm">
            {formatCurrency(row.original_amount)}
          </span>
        ),
      },
      {
        key: "amount_drawn",
        header: "Drawn",
        sortable: true,
        className: "text-right",
        cell: (row) => (
          <span className="font-mono tabular-nums text-sm text-orange-600">
            {formatCurrency(row.amount_drawn)}
          </span>
        ),
      },
      {
        key: "available_amount",
        header: "Available",
        className: "text-right",
        cell: (row) => (
          <span className="font-mono tabular-nums text-sm text-green-600">
            {formatCurrency(row.available_amount)}
          </span>
        ),
      },
      {
        key: "interest_rate",
        header: "Rate",
        cell: (row) => (
          <span className="text-sm">
            {formatPercent(row.interest_rate)} {row.rate_type === "variable" ? "(V)" : "(F)"}
          </span>
        ),
      },
      {
        key: "maturity_date",
        header: "Maturity",
        sortable: true,
        cell: (row) => {
          const days = getDaysUntilMaturity(row.maturity_date)
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm">{formatDate(row.maturity_date, { short: true })}</span>
              {getMaturityBadge(days)}
            </div>
          )
        },
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => getStatusBadge(row.status),
      },
    ],
    []
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loans & Debt Tracking</h1>
          <p className="text-sm text-muted-foreground">
            {loans.length} loan{loans.length !== 1 ? "s" : ""} across all entities
          </p>
        </div>
        <Button onClick={() => setShowAddLoan(true)}>
          <Plus className="h-4 w-4" />
          Add Loan
        </Button>
      </div>

      {/* Maturity Alerts */}
      {(() => {
        const alerts = loans
          .filter((l) => l.status === "active")
          .map((l) => ({ ...l, daysRemaining: getDaysUntilMaturity(l.maturity_date) }))
          .filter((l) => l.daysRemaining <= 90)
          .sort((a, b) => a.daysRemaining - b.daysRemaining)

        if (alerts.length === 0) return null

        return (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Maturity Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {alerts.map((loan) => (
                  <div
                    key={loan.id}
                    className={cn(
                      "rounded-md border p-3 cursor-pointer transition-colors hover:bg-white/50",
                      loan.daysRemaining <= 30 && "border-red-300",
                      loan.daysRemaining > 30 && loan.daysRemaining <= 60 && "border-orange-300",
                      loan.daysRemaining > 60 && "border-yellow-300"
                    )}
                    onClick={() => setSelectedLoanId(loan.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{loan.lender_name}</span>
                      {getMaturityBadge(loan.daysRemaining)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(loan.current_balance)} | Matures {formatDate(loan.maturity_date, { short: true })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by lender or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paid_off">Paid Off</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loans Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredLoans as any[]}
            searchKey="lender_name"
            searchPlaceholder="Search loans..."
            isLoading={loading}
            emptyMessage="No loans found."
            onRowClick={(row) => setSelectedLoanId((row as Loan).id)}
            pageSize={20}
          />
        </CardContent>
      </Card>

      {/* Loan Detail Dialog */}
      {selectedLoanId && (
        <Dialog open={!!selectedLoanId} onOpenChange={(open) => { if (!open) setSelectedLoanId(null) }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Loan Details</DialogTitle>
              <DialogDescription>
                View loan terms, draw history, and interest summary.
              </DialogDescription>
            </DialogHeader>
            <LoanTracker loanId={selectedLoanId} />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDrawLoanId(selectedLoanId)
                  setShowDrawDialog(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Request Draw
              </Button>
              <Button variant="outline" onClick={() => setSelectedLoanId(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Loan Dialog */}
      <AddLoanDialog
        open={showAddLoan}
        onOpenChange={setShowAddLoan}
        entities={entities}
        onSuccess={(loan) => {
          setShowAddLoan(false)
          setLoans((prev) => [...prev, loan])
          toast({ title: "Loan created", description: loan.lender_name })
        }}
      />

      {/* Request Draw Dialog */}
      <RequestDrawDialog
        open={showDrawDialog}
        onOpenChange={setShowDrawDialog}
        loanId={drawLoanId}
        onSuccess={(draw) => {
          setShowDrawDialog(false)
          setLoans((prev) =>
            prev.map((l) =>
              l.id === draw.loan_id
                ? {
                    ...l,
                    draws: [draw, ...l.draws],
                    amount_drawn: l.amount_drawn + draw.amount,
                    available_amount: l.available_amount - draw.amount,
                  }
                : l
            )
          )
          toast({ title: "Draw requested", description: formatCurrency(draw.amount, { decimals: 2 }) })
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Loan Dialog
// ---------------------------------------------------------------------------

function AddLoanDialog({
  open,
  onOpenChange,
  entities,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entities: Entity[]
  onSuccess: (loan: Loan) => void
}) {
  const [formData, setFormData] = useState({
    entity_id: "",
    project_id: "",
    lender_name: "",
    loan_type: "construction" as any as LoanType,
    original_amount: "",
    interest_rate: "",
    rate_type: "fixed" as RateType,
    rate_index: "",
    rate_spread: "",
    origination_date: "",
    maturity_date: "",
    monthly_payment: "",
    interest_only: false,
    covenants: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setFormData({
      entity_id: "",
      project_id: "",
      lender_name: "",
      loan_type: "construction" as any,
      original_amount: "",
      interest_rate: "",
      rate_type: "fixed",
      rate_index: "",
      rate_spread: "",
      origination_date: "",
      maturity_date: "",
      monthly_payment: "",
      interest_only: false,
      covenants: "",
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.entity_id || !formData.lender_name.trim() || !formData.original_amount) {
      setError("Entity, lender name, and original amount are required.")
      return
    }

    const amount = parseFloat(formData.original_amount)
    if (isNaN(amount) || amount <= 0) {
      setError("Original amount must be greater than 0.")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { data, error: dbError } = await supabase
      .from("loans")
      .insert({
        entity_id: formData.entity_id,
        project_id: formData.project_id || null,
        lender_contact_id: "",
        lender_name: formData.lender_name.trim(),
        loan_type: formData.loan_type,
        original_amount: amount,
        current_balance: 0,
        amount_drawn: 0,
        available_amount: amount,
        interest_rate: parseFloat(formData.interest_rate) || 0,
        rate_type: formData.rate_type,
        rate_index: formData.rate_index.trim() || null,
        rate_spread: parseFloat(formData.rate_spread) || null,
        origination_date: formData.origination_date || new Date().toISOString().slice(0, 10),
        maturity_date: formData.maturity_date || null,
        monthly_payment: parseFloat(formData.monthly_payment) || null,
        interest_only: formData.interest_only,
        covenants: formData.covenants.trim() || null,
        status: "active" as LoanStatus,
      } as any)
      .select()
      .single()

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    if (data) {
      resetForm()
      onSuccess({ ...(data as any), draws: [] } as Loan)
    }
    setSaving(false)
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
          <DialogTitle>Add Loan</DialogTitle>
          <DialogDescription>Track a new loan or line of credit.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entity *</Label>
              <Select value={formData.entity_id} onValueChange={(val) => setFormData((p) => ({ ...p, entity_id: val }))}>
                <SelectTrigger><SelectValue placeholder="Select entity..." /></SelectTrigger>
                <SelectContent>
                  {entities.filter((e) => e.status === "active").map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loan Type *</Label>
              <Select value={formData.loan_type} onValueChange={(val) => setFormData((p) => ({ ...p, loan_type: val as LoanType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(LOAN_TYPE_LABELS) as [LoanType, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loan-lender">Lender Name *</Label>
              <Input
                id="loan-lender"
                value={formData.lender_name}
                onChange={(e) => setFormData((p) => ({ ...p, lender_name: e.target.value }))}
                placeholder="First National Bank"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan-amount">Original Amount *</Label>
              <Input
                id="loan-amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.original_amount}
                onChange={(e) => setFormData((p) => ({ ...p, original_amount: e.target.value }))}
                placeholder="2500000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loan-rate">Interest Rate (%)</Label>
              <Input
                id="loan-rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.interest_rate}
                onChange={(e) => setFormData((p) => ({ ...p, interest_rate: e.target.value }))}
                placeholder="7.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Rate Type</Label>
              <Select value={formData.rate_type} onValueChange={(val) => setFormData((p) => ({ ...p, rate_type: val as RateType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.rate_type === "variable" && (
              <div className="space-y-2">
                <Label htmlFor="loan-index">Rate Index</Label>
                <Input
                  id="loan-index"
                  value={formData.rate_index}
                  onChange={(e) => setFormData((p) => ({ ...p, rate_index: e.target.value }))}
                  placeholder="SOFR"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loan-orig">Origination Date</Label>
              <Input
                id="loan-orig"
                type="date"
                value={formData.origination_date}
                onChange={(e) => setFormData((p) => ({ ...p, origination_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan-maturity">Maturity Date</Label>
              <Input
                id="loan-maturity"
                type="date"
                value={formData.maturity_date}
                onChange={(e) => setFormData((p) => ({ ...p, maturity_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loan-payment">Monthly Payment</Label>
              <Input
                id="loan-payment"
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_payment}
                onChange={(e) => setFormData((p) => ({ ...p, monthly_payment: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <input
                type="checkbox"
                id="loan-io"
                checked={formData.interest_only}
                onChange={(e) => setFormData((p) => ({ ...p, interest_only: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="loan-io" className="font-normal">Interest Only</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loan-covenants">Covenants</Label>
            <Textarea
              id="loan-covenants"
              value={formData.covenants}
              onChange={(e) => setFormData((p) => ({ ...p, covenants: e.target.value }))}
              placeholder="Loan covenants and conditions..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Loan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Request Draw Dialog
// ---------------------------------------------------------------------------

function RequestDrawDialog({
  open,
  onOpenChange,
  loanId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loanId: string | null
  onSuccess: (draw: LoanDraw) => void
}) {
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setAmount("")
    setDescription("")
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loanId) return
    setError(null)

    const drawAmount = parseFloat(amount)
    if (isNaN(drawAmount) || drawAmount <= 0) {
      setError("Amount must be greater than 0.")
      return
    }
    if (!description.trim()) {
      setError("Description is required.")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { data, error: dbError } = await supabase
      .from("loan_draws")
      .insert({
        loan_id: loanId,
        draw_number: 1,
        amount: drawAmount,
        date: new Date().toISOString().slice(0, 10),
        description: description.trim(),
        construction_draw_id: null,
        status: "requested",
      })
      .select()
      .single()

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    if (data) {
      resetForm()
      onSuccess(data as LoanDraw)
    }
    setSaving(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Draw</DialogTitle>
          <DialogDescription>
            Request a draw against this loan facility.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="draw-amount">Draw Amount *</Label>
            <Input
              id="draw-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="250000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="draw-desc">Description *</Label>
            <Textarea
              id="draw-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Phase I framing and roofing..."
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Requesting..." : "Request Draw"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
