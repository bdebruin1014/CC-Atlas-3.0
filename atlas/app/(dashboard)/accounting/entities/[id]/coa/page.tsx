"use client"

import { use, useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Upload,
  Edit,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
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
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { Account, AccountType, NormalBalance } from "@/lib/types/accounting"
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_RANGES,
  DEFAULT_SPE_COA,
} from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountTreeNode extends Account {
  children: AccountTreeNode[]
  depth: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAccountTree(accounts: Account[]): AccountTreeNode[] {
  const map = new Map<string, AccountTreeNode>()
  const roots: AccountTreeNode[] = []

  // Group accounts by type and sort by account_number
  const sorted = [...accounts].sort((a, b) => a.account_number.localeCompare(b.account_number))

  sorted.forEach((acc) => {
    map.set(acc.id, { ...acc, children: [], depth: 0 })
  })

  map.forEach((node) => {
    if (node.parent_account_id && map.has(node.parent_account_id)) {
      const parent = map.get(node.parent_account_id)!
      node.depth = parent.depth + 1
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function groupByType(accounts: AccountTreeNode[]): Record<AccountType, AccountTreeNode[]> {
  const groups: Record<AccountType, AccountTreeNode[]> = {
    asset: [],
    liability: [],
    equity: [],
    revenue: [],
    cost_of_sales: [],
    operating_expense: [],
  }
  accounts.forEach((acc) => {
    if (groups[acc.account_type]) {
      groups[acc.account_type].push(acc)
    }
  })
  return groups
}

function getAccountTypeColor(type: AccountType): string {
  switch (type) {
    case "asset": return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "liability": return "bg-red-100 text-red-800 hover:bg-red-100"
    case "equity": return "bg-purple-100 text-purple-800 hover:bg-purple-100"
    case "revenue": return "bg-green-100 text-green-800 hover:bg-green-100"
    case "cost_of_sales": return "bg-orange-100 text-orange-800 hover:bg-orange-100"
    case "operating_expense": return "bg-amber-100 text-amber-800 hover:bg-amber-100"
    default: return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

const ACCOUNT_GROUP_TITLES: Record<AccountType, { label: string; range: string }> = {
  asset: { label: "Assets", range: "1000-1999" },
  liability: { label: "Liabilities", range: "2000-2999" },
  equity: { label: "Equity", range: "3000-3999" },
  revenue: { label: "Revenue", range: "4000-4999" },
  cost_of_sales: { label: "Cost of Sales", range: "5000-5999" },
  operating_expense: { label: "Operating Expenses", range: "6000-6999" },
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ChartOfAccountsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: entityId } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [entityName, setEntityName] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<AccountType>>(
    new Set(["asset", "liability", "equity", "revenue", "cost_of_sales", "operating_expense"])
  )

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

      const { data: accountData } = await supabase
        .from("accounts")
        .select("*")
        .eq("entity_id", entityId)
        .order("account_number")

      if (accountData) {
        setAccounts(accountData as Account[])
      }
      setLoading(false)
    }
    loadData()
  }, [entityId])

  const accountTree = useMemo(() => buildAccountTree(accounts), [accounts])
  const groupedAccounts = useMemo(() => groupByType(accountTree), [accountTree])

  const toggleGroup = (type: AccountType) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  // Import default SPE COA template
  const handleImportTemplate = async () => {
    const supabase = createClient()
    const payload = DEFAULT_SPE_COA.map((acct) => ({
      entity_id: entityId,
      account_number: acct.account_number,
      name: acct.name,
      account_type: acct.account_type,
      normal_balance: acct.normal_balance,
      description: acct.description,
      is_active: true,
      current_balance: 0,
      parent_account_id: null,
    }))

    const { data, error } = await supabase
      .from("accounts")
      .insert(payload)
      .select()

    if (error) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    if (data) {
      setAccounts((prev) => [...prev, ...(data as Account[])])
      toast({
        title: "Template imported",
        description: `${data.length} accounts created from the SPE template.`,
      })
    }
  }

  // Toggle account active/inactive
  const toggleAccountActive = async (account: Account) => {
    const supabase = createClient()
    const newStatus = !account.is_active
    const { error } = await supabase
      .from("accounts")
      .update({ is_active: newStatus })
      .eq("id", account.id)

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
      return
    }

    setAccounts((prev) =>
      prev.map((a) => (a.id === account.id ? { ...a, is_active: newStatus } : a))
    )
    toast({
      title: newStatus ? "Account activated" : "Account deactivated",
      description: `${account.account_number} - ${account.name}`,
    })
  }

  // Compute balance summaries by account type
  const balanceSummary = useMemo(() => {
    const summary: Record<string, number> = {
      asset: 0,
      liability: 0,
      equity: 0,
      revenue: 0,
      cost_of_sales: 0,
      operating_expense: 0,
    }
    accounts.forEach((acc) => {
      if (summary[acc.account_type] !== undefined) {
        summary[acc.account_type] += acc.current_balance
      }
    })
    return summary
  }, [accounts])

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => router.push("/accounting")}
        >
          Accounting
        </button>
        <ChevronRight className="h-3 w-3" />
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => router.push("/accounting/entities")}
        >
          Entities
        </button>
        <ChevronRight className="h-3 w-3" />
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => router.push(`/accounting/entities/${entityId}`)}
        >
          {entityName || "Entity"}
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Chart of Accounts</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">
            {entityName} - {accounts.length} accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleImportTemplate}
            disabled={accounts.length > 0}
          >
            <Upload className="h-4 w-4" />
            Import Template
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Account Balance Summary Cards */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Assets</p>
              <p className="text-lg font-bold font-mono tabular-nums text-blue-600">
                {formatCurrency(balanceSummary.asset, { decimals: 0 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Liabilities</p>
              <p className="text-lg font-bold font-mono tabular-nums text-red-600">
                {formatCurrency(balanceSummary.liability, { decimals: 0 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Equity</p>
              <p className="text-lg font-bold font-mono tabular-nums text-purple-600">
                {formatCurrency(balanceSummary.equity, { decimals: 0 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Revenue</p>
              <p className="text-lg font-bold font-mono tabular-nums text-green-600">
                {formatCurrency(balanceSummary.revenue, { decimals: 0 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cost of Sales</p>
              <p className="text-lg font-bold font-mono tabular-nums text-orange-600">
                {formatCurrency(balanceSummary.cost_of_sales, { decimals: 0 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Op. Expenses</p>
              <p className="text-lg font-bold font-mono tabular-nums text-amber-600">
                {formatCurrency(balanceSummary.operating_expense, { decimals: 0 })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Account Groups */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No accounts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Import the default SPE template or add accounts manually.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleImportTemplate}>
                <Upload className="h-4 w-4" />
                Import SPE Template
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(Object.keys(ACCOUNT_GROUP_TITLES) as AccountType[]).map((type) => {
            const group = groupedAccounts[type] || []
            const isExpanded = expandedGroups.has(type)
            const groupTotal = group.reduce((sum, acc) => sum + acc.current_balance, 0)

            return (
              <Card key={type}>
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => toggleGroup(type)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold">
                      {ACCOUNT_GROUP_TITLES[type].label}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {ACCOUNT_GROUP_TITLES[type].range}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {group.length} account{group.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <span className="text-sm font-mono tabular-nums font-medium">
                    {formatCurrency(groupTotal, { decimals: 2 })}
                  </span>
                </button>

                {isExpanded && group.length > 0 && (
                  <CardContent className="pt-0 pb-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">Number</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">Type</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">Normal</th>
                            <th className="px-3 py-2 text-center font-medium text-muted-foreground w-20">Active</th>
                            <th className="px-3 py-2 text-right font-medium text-muted-foreground w-32">Balance</th>
                            <th className="px-3 py-2 w-20" />
                          </tr>
                        </thead>
                        <tbody>
                          {renderAccountRows(group, 0, toggleAccountActive, setEditingAccount)}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Account Dialog */}
      <AddAccountDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        entityId={entityId}
        accounts={accounts}
        onSuccess={(newAccount) => {
          setShowAddDialog(false)
          setAccounts((prev) => [...prev, newAccount])
          toast({
            title: "Account created",
            description: `${newAccount.account_number} - ${newAccount.name}`,
          })
        }}
      />

      {/* Edit Account Dialog */}
      {editingAccount && (
        <EditAccountDialog
          open={!!editingAccount}
          onOpenChange={(open) => { if (!open) setEditingAccount(null) }}
          account={editingAccount}
          accounts={accounts}
          onSuccess={(updated) => {
            setEditingAccount(null)
            setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
            toast({
              title: "Account updated",
              description: `${updated.account_number} - ${updated.name}`,
            })
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recursive account row renderer
// ---------------------------------------------------------------------------

function renderAccountRows(
  accounts: AccountTreeNode[],
  depth: number,
  onToggleActive: (account: Account) => void,
  onEdit: (account: Account) => void
): React.ReactNode[] {
  const rows: React.ReactNode[] = []

  accounts.forEach((acc) => {
    rows.push(
      <tr
        key={acc.id}
        className={cn(
          "border-b last:border-b-0 transition-colors hover:bg-muted/20",
          !acc.is_active && "opacity-50"
        )}
      >
        <td className="px-3 py-2 font-mono text-xs" style={{ paddingLeft: `${depth * 16 + 12}px` }}>
          {acc.account_number}
        </td>
        <td className="px-3 py-2 font-medium">
          {acc.name}
          {acc.description && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{acc.description}</p>
          )}
        </td>
        <td className="px-3 py-2">
          <Badge
            variant="secondary"
            className={cn("text-[10px]", getAccountTypeColor(acc.account_type))}
          >
            {ACCOUNT_TYPE_LABELS[acc.account_type]}
          </Badge>
        </td>
        <td className="px-3 py-2 text-xs capitalize">{acc.normal_balance}</td>
        <td className="px-3 py-2 text-center">
          <button
            onClick={() => onToggleActive(acc)}
            className="inline-flex items-center"
          >
            {acc.is_active ? (
              <ToggleRight className="h-5 w-5 text-green-600" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </td>
        <td className="px-3 py-2 text-right font-mono tabular-nums text-xs">
          {formatCurrency(acc.current_balance, { decimals: 2 })}
        </td>
        <td className="px-3 py-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(acc)}>
            <Edit className="h-3 w-3" />
          </Button>
        </td>
      </tr>
    )

    if (acc.children.length > 0) {
      rows.push(...renderAccountRows(acc.children, depth + 1, onToggleActive, onEdit))
    }
  })

  return rows
}

// ---------------------------------------------------------------------------
// Add Account Dialog
// ---------------------------------------------------------------------------

function AddAccountDialog({
  open,
  onOpenChange,
  entityId,
  accounts,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  accounts: Account[]
  onSuccess: (account: Account) => void
}) {
  const [formData, setFormData] = useState({
    account_number: "",
    name: "",
    account_type: "asset" as AccountType,
    normal_balance: "debit" as NormalBalance,
    parent_account_id: "",
    description: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setFormData({
      account_number: "",
      name: "",
      account_type: "asset",
      normal_balance: "debit",
      parent_account_id: "",
      description: "",
    })
    setError(null)
  }

  // Auto-set normal balance based on account type
  const handleTypeChange = (type: AccountType) => {
    const normalBalance: NormalBalance =
      type === "asset" || type === "cost_of_sales" || type === "operating_expense"
        ? "debit"
        : "credit"
    setFormData((prev) => ({
      ...prev,
      account_type: type,
      normal_balance: normalBalance,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.account_number.trim() || !formData.name.trim()) {
      setError("Account number and name are required.")
      return
    }

    // Validate account number is in correct range for type
    const num = parseInt(formData.account_number, 10)
    const range = ACCOUNT_TYPE_RANGES[formData.account_type]
    if (isNaN(num) || num < range.min || num > range.max) {
      setError(
        `Account number must be between ${range.min} and ${range.max} for ${ACCOUNT_TYPE_LABELS[formData.account_type]} accounts.`
      )
      return
    }

    // Check duplicate
    if (accounts.some((a) => a.account_number === formData.account_number.trim())) {
      setError("An account with this number already exists.")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { data, error: dbError } = await supabase
      .from("accounts")
      .insert({
        entity_id: entityId,
        account_number: formData.account_number.trim(),
        name: formData.name.trim(),
        account_type: formData.account_type,
        normal_balance: formData.normal_balance,
        parent_account_id: formData.parent_account_id || null,
        description: formData.description.trim() || null,
        is_active: true,
        current_balance: 0,
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
      onSuccess(data as Account)
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
          <DialogDescription>
            Create a new account in the chart of accounts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acct-num">Account Number *</Label>
              <Input
                id="acct-num"
                value={formData.account_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, account_number: e.target.value }))}
                placeholder="1000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Account Type *</Label>
              <Select value={formData.account_type} onValueChange={(val) => handleTypeChange(val as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label} ({ACCOUNT_TYPE_RANGES[value].min}-{ACCOUNT_TYPE_RANGES[value].max})
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acct-name">Account Name *</Label>
            <Input
              id="acct-name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Cash - Operating"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Normal Balance</Label>
              <Select
                value={formData.normal_balance}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, normal_balance: val as NormalBalance }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parent Account</Label>
              <Select
                value={formData.parent_account_id}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, parent_account_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {accounts
                    .filter((a) => a.account_type === formData.account_type && a.is_active)
                    .sort((a, b) => a.account_number.localeCompare(b.account_number))
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_number} - {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acct-desc">Description</Label>
            <Textarea
              id="acct-desc"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Account description..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Edit Account Dialog
// ---------------------------------------------------------------------------

function EditAccountDialog({
  open,
  onOpenChange,
  account,
  accounts,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account
  accounts: Account[]
  onSuccess: (account: Account) => void
}) {
  const [name, setName] = useState(account.name)
  const [description, setDescription] = useState(account.description || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Account name is required.")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { data, error: dbError } = await supabase
      .from("accounts")
      .update({
        name: name.trim(),
        description: description.trim() || null,
      })
      .eq("id", account.id)
      .select()
      .single()

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    if (data) {
      onSuccess(data as Account)
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            {account.account_number} - {account.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name">Account Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
