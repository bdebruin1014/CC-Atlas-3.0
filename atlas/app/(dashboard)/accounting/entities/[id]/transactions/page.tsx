"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  Filter,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { TransactionForm, type TransactionFormData } from "@/components/accounting/transaction-form"
import type {
  Transaction,
  TransactionStatus,
  TransactionType,
  Account,
} from "@/lib/types/accounting"
import { TRANSACTION_TYPE_LABELS } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function getStatusBadge(status: TransactionStatus) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
    case "approved":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Approved</Badge>
    case "posted":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Posted</Badge>
    case "voided":
      return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">Voided</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function TransactionsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const entityId = params.id as string

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [entityName, setEntityName] = useState("")
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | TransactionStatus>("all")
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Batch selection
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([])

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const supabase = createClient()

      const { data: entityData } = await supabase
        .from("entities")
        .select("name")
        .eq("id", entityId)
        .single()
      if (entityData) setEntityName(entityData.name)

      // Load accounts
      const { data: acctData } = await supabase
        .from("accounts")
        .select("*")
        .eq("entity_id", entityId)
        .eq("is_active", true)
        .order("account_number")
      if (acctData) setAccounts(acctData as Account[])

      // Load transactions
      const { data: txnData } = await supabase
        .from("transactions")
        .select("*, transaction_line_items(*)")
        .eq("entity_id", entityId)
        .order("date", { ascending: false })

      if (txnData) {
        setTransactions(
          txnData.map((t: any) => ({
            ...t,
            line_items: (t.transaction_line_items || []).map((li: any) => ({
              ...li,
              account_name: acctData?.find((a: any) => a.id === li.account_id)?.name || "",
              account_number: acctData?.find((a: any) => a.id === li.account_id)?.account_number || "",
            })),
            total_debits: (t.transaction_line_items || []).reduce(
              (s: number, li: any) => s + (li.debit_amount || 0), 0
            ),
            total_credits: (t.transaction_line_items || []).reduce(
              (s: number, li: any) => s + (li.credit_amount || 0), 0
            ),
          })) as Transaction[]
        )
      }

      setLoading(false)
    }
    loadData()
  }, [entityId])

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        if (
          !t.description.toLowerCase().includes(q) &&
          !(t.reference_number || "").toLowerCase().includes(q)
        ) {
          return false
        }
      }
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (typeFilter !== "all" && t.transaction_type !== typeFilter) return false
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo && t.date > dateTo) return false
      return true
    })
  }, [transactions, searchTerm, statusFilter, typeFilter, dateFrom, dateTo])

  // Totals
  const totalDebits = filteredTransactions.reduce((s, t) => s + t.total_debits, 0)
  const totalCredits = filteredTransactions.reduce((s, t) => s + t.total_credits, 0)

  // Create transaction
  const handleCreateTransaction = async (data: TransactionFormData) => {
    setIsSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const period = data.date.slice(0, 7)

    // Insert transaction header
    const { data: txnData, error: txnError } = await supabase
      .from("transactions")
      .insert({
        entity_id: entityId,
        date: data.date,
        description: data.description,
        transaction_type: data.transaction_type,
        status: "pending" as TransactionStatus,
        reference_number: data.reference_number || null,
        period,
        supporting_document_url: null,
        created_by: user?.id || "",
      })
      .select()
      .single()

    if (txnError) {
      toast({ title: "Error", description: txnError.message, variant: "destructive" })
      setIsSubmitting(false)
      return
    }

    // Insert line items
    const lineItems = data.line_items.map((li) => ({
      transaction_id: txnData.id,
      account_id: li.account_id,
      debit_amount: parseFloat(li.debit_amount) || 0,
      credit_amount: parseFloat(li.credit_amount) || 0,
      project_id: li.project_id || null,
      unit_id: li.unit_id || null,
      memo: li.memo || null,
    }))

    const { error: liError } = await supabase
      .from("transaction_line_items")
      .insert(lineItems)

    if (liError) {
      toast({ title: "Error creating line items", description: liError.message, variant: "destructive" })
      setIsSubmitting(false)
      return
    }

    // Add to state
    const newTxn: Transaction = {
      ...txnData,
      line_items: lineItems.map((li, idx) => ({
        ...li,
        id: `temp_${idx}`,
        account_name: accounts.find((a) => a.id === li.account_id)?.name || "",
        account_number: accounts.find((a) => a.id === li.account_id)?.account_number || "",
        project_name: null,
      })),
      total_debits: lineItems.reduce((s, li) => s + li.debit_amount, 0),
      total_credits: lineItems.reduce((s, li) => s + li.credit_amount, 0),
    }

    setTransactions((prev) => [newTxn, ...prev])
    setShowCreateDialog(false)
    setIsSubmitting(false)
    toast({ title: "Transaction created", description: `${data.description}` })
  }

  // Status change actions
  const updateTransactionStatus = async (id: string, newStatus: TransactionStatus) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const updates: Record<string, any> = { status: newStatus }
    const now = new Date().toISOString()

    if (newStatus === "approved") {
      updates.approved_by = user?.id
      updates.approved_at = now
    } else if (newStatus === "posted") {
      updates.posted_by = user?.id
      updates.posted_at = now
    } else if (newStatus === "voided") {
      updates.voided_by = user?.id
      updates.voided_at = now
    }

    const { error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id)

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
      return
    }

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus, ...updates } : t))
    )
    toast({ title: `Transaction ${newStatus}` })
  }

  // Batch approve
  const handleBatchApprove = async () => {
    const pending = selectedTransactions.filter((t) => t.status === "pending")
    for (const txn of pending) {
      await updateTransactionStatus(txn.id, "approved")
    }
    setSelectedTransactions([])
    toast({ title: `${pending.length} transaction(s) approved` })
  }

  // Table columns
  const columns: ColumnDef<Transaction>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        sortable: true,
        cell: (row) => <span className="text-sm">{formatDate(row.date, { short: true })}</span>,
      },
      {
        key: "description",
        header: "Description",
        sortable: true,
        cell: (row) => (
          <div className="max-w-[250px]">
            <p className="text-sm font-medium truncate">{row.description}</p>
            {row.reference_number && (
              <p className="text-[10px] text-muted-foreground">Ref: {row.reference_number}</p>
            )}
          </div>
        ),
      },
      {
        key: "transaction_type",
        header: "Type",
        cell: (row) => (
          <Badge variant="outline" className="text-[10px]">
            {TRANSACTION_TYPE_LABELS[row.transaction_type]}
          </Badge>
        ),
      },
      {
        key: "total_debits",
        header: "Debits",
        sortable: true,
        className: "text-right",
        cell: (row) => (
          <span className="text-sm font-mono tabular-nums">
            {formatCurrency(row.total_debits, { decimals: 2 })}
          </span>
        ),
      },
      {
        key: "total_credits",
        header: "Credits",
        sortable: true,
        className: "text-right",
        cell: (row) => (
          <span className="text-sm font-mono tabular-nums">
            {formatCurrency(row.total_credits, { decimals: 2 })}
          </span>
        ),
      },
      {
        key: "period",
        header: "Period",
        cell: (row) => <span className="text-xs font-mono">{row.period}</span>,
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => getStatusBadge(row.status),
      },
      {
        key: "actions",
        header: "",
        cell: (row) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {row.status === "pending" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => updateTransactionStatus(row.id, "approved")}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Approve
              </Button>
            )}
            {row.status === "approved" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => updateTransactionStatus(row.id, "posted")}
              >
                <FileCheck className="h-3 w-3 mr-1" />
                Post
              </Button>
            )}
            {(row.status === "pending" || row.status === "approved") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive"
                onClick={() => updateTransactionStatus(row.id, "voided")}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Void
              </Button>
            )}
          </div>
        ),
      },
    ],
    [accounts]
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => router.push(`/accounting/entities/${entityId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {entityName || "Entity"}
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transaction Ledger</h1>
            <p className="text-sm text-muted-foreground">
              {entityName} - {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedTransactions.length > 0 && (
              <Button variant="outline" onClick={handleBatchApprove}>
                <CheckCircle className="h-4 w-4" />
                Approve Selected ({selectedTransactions.filter((t) => t.status === "pending").length})
              </Button>
            )}
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              Create Transaction
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by description or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px]"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px]"
              placeholder="To"
            />
            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {(Object.entries(TRANSACTION_TYPE_LABELS) as [TransactionType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Totals Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Total Debits</p>
            <p className="text-xl font-bold font-mono tabular-nums">
              {formatCurrency(totalDebits, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Total Credits</p>
            <p className="text-xl font-bold font-mono tabular-nums">
              {formatCurrency(totalCredits, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-xl font-bold">{filteredTransactions.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredTransactions as any[]}
            searchKey="description"
            searchPlaceholder="Search transactions..."
            isLoading={loading}
            emptyMessage="No transactions found."
            selectable
            onSelectionChange={(selected) => setSelectedTransactions(selected as Transaction[])}
            pageSize={20}
          />
        </CardContent>
      </Card>

      {/* Create Transaction Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Transaction</DialogTitle>
            <DialogDescription>
              Create a double-entry transaction. Debits must equal credits.
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            entityId={entityId}
            accounts={accounts}
            onSubmit={handleCreateTransaction}
            onCancel={() => setShowCreateDialog(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
