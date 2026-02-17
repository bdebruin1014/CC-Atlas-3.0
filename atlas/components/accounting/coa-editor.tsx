"use client"

import { useState, useMemo, useCallback } from "react"
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Account, AccountType, NormalBalance } from "@/lib/types/accounting"
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_RANGES,
} from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface COAEditorProps {
  accounts: Account[]
  entityId: string
  onCreateAccount: (data: NewAccountData) => Promise<void>
  onUpdateAccount: (id: string, data: Partial<Account>) => Promise<void>
  onDrillDown: (account: Account) => void
  className?: string
}

export interface NewAccountData {
  account_number: string
  name: string
  account_type: AccountType
  normal_balance: NormalBalance
  parent_account_id: string | null
  description: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAccountTree(accounts: Account[]): Account[] {
  const map = new Map<string, Account>()
  const roots: Account[] = []

  accounts.forEach((a) => {
    map.set(a.id, { ...a, children: [] })
  })

  map.forEach((account) => {
    if (account.parent_account_id && map.has(account.parent_account_id)) {
      const parent = map.get(account.parent_account_id)!
      parent.children = parent.children || []
      parent.children.push(account)
    } else {
      roots.push(account)
    }
  })

  // Sort by account number
  const sortByNumber = (a: Account, b: Account) =>
    a.account_number.localeCompare(b.account_number)
  roots.sort(sortByNumber)
  map.forEach((acct) => acct.children?.sort(sortByNumber))

  return roots
}

function getAccountTypeBadgeClass(accountType: AccountType): string {
  switch (accountType) {
    case "asset":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "liability":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    case "equity":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100"
    case "revenue":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "cost_of_sales":
      return "bg-orange-100 text-orange-800 hover:bg-orange-100"
    case "operating_expense":
      return "bg-orange-100 text-orange-800 hover:bg-orange-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

// ---------------------------------------------------------------------------
// Account Row (supports inline editing)
// ---------------------------------------------------------------------------

function AccountRow({
  account,
  depth,
  onUpdate,
  onDrillDown,
  expanded,
  onToggleExpand,
  hasChildren,
}: {
  account: Account
  depth: number
  onUpdate: (id: string, data: Partial<Account>) => Promise<void>
  onDrillDown: (account: Account) => void
  expanded: boolean
  onToggleExpand: () => void
  hasChildren: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(account.name)
  const [editDescription, setEditDescription] = useState(
    account.description || ""
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(account.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditName(account.name)
    setEditDescription(account.description || "")
    setEditing(false)
  }

  const handleToggleActive = async () => {
    await onUpdate(account.id, { is_active: !account.is_active })
  }

  return (
    <div
      className={cn(
        "group flex items-center border-b border-border text-sm transition-colors hover:bg-muted/30",
        !account.is_active && "opacity-50"
      )}
      style={{ paddingLeft: `${depth * 24}px` }}
    >
      {/* Expand toggle */}
      <div className="flex w-8 shrink-0 items-center justify-center">
        {hasChildren ? (
          <button
            onClick={onToggleExpand}
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
      </div>

      {/* Account # */}
      <div className="w-24 shrink-0 px-3 py-2.5 font-mono text-xs text-muted-foreground">
        {account.account_number}
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1 px-3 py-2.5">
        {editing ? (
          <div className="space-y-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-7 text-sm"
              autoFocus
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description..."
              className="h-14 text-xs resize-none"
            />
          </div>
        ) : (
          <div>
            <span className="font-medium">{account.name}</span>
            {account.description && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {account.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Type */}
      <div className="w-32 shrink-0 px-3 py-2.5">
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] px-1.5 py-0",
            getAccountTypeBadgeClass(account.account_type)
          )}
        >
          {ACCOUNT_TYPE_LABELS[account.account_type]}
        </Badge>
      </div>

      {/* Normal Balance */}
      <div className="w-24 shrink-0 px-3 py-2.5 text-xs text-muted-foreground capitalize">
        {account.normal_balance}
      </div>

      {/* Balance */}
      <div className="w-32 shrink-0 px-3 py-2.5 text-right">
        <button
          onClick={() => onDrillDown(account)}
          className="font-mono tabular-nums text-sm hover:text-blue-600 hover:underline transition-colors"
        >
          {formatCurrency(account.current_balance, { decimals: 2 })}
        </button>
      </div>

      {/* Status */}
      <div className="w-20 shrink-0 px-3 py-2.5">
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] px-1.5 py-0",
            account.is_active
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : "bg-gray-100 text-gray-600 hover:bg-gray-100"
          )}
        >
          {account.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Actions */}
      <div className="w-24 shrink-0 px-2 py-2.5 flex items-center gap-1">
        {editing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleSave}
              disabled={saving || !editName.trim()}
            >
              <Check className="h-3.5 w-3.5 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="h-3.5 w-3.5 text-red-600" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditing(true)}
            >
              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleToggleActive}
              title={account.is_active ? "Deactivate" : "Reactivate"}
            >
              {account.is_active ? (
                <ToggleRight className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recursive tree render
// ---------------------------------------------------------------------------

function AccountTreeNode({
  account,
  depth,
  expandedMap,
  toggleExpand,
  onUpdate,
  onDrillDown,
}: {
  account: Account
  depth: number
  expandedMap: Record<string, boolean>
  toggleExpand: (id: string) => void
  onUpdate: (id: string, data: Partial<Account>) => Promise<void>
  onDrillDown: (account: Account) => void
}) {
  const hasChildren = (account.children?.length ?? 0) > 0
  const expanded = expandedMap[account.id] ?? true

  return (
    <>
      <AccountRow
        account={account}
        depth={depth}
        onUpdate={onUpdate}
        onDrillDown={onDrillDown}
        expanded={expanded}
        onToggleExpand={() => toggleExpand(account.id)}
        hasChildren={hasChildren}
      />
      {hasChildren &&
        expanded &&
        account.children!.map((child) => (
          <AccountTreeNode
            key={child.id}
            account={child}
            depth={depth + 1}
            expandedMap={expandedMap}
            toggleExpand={toggleExpand}
            onUpdate={onUpdate}
            onDrillDown={onDrillDown}
          />
        ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Add Account Dialog
// ---------------------------------------------------------------------------

function AddAccountDialog({
  accounts,
  entityId,
  onCreateAccount,
}: {
  accounts: Account[]
  entityId: string
  onCreateAccount: (data: NewAccountData) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [accountNumber, setAccountNumber] = useState("")
  const [name, setName] = useState("")
  const [accountType, setAccountType] = useState<AccountType>("asset")
  const [normalBalance, setNormalBalance] = useState<NormalBalance>("debit")
  const [parentAccountId, setParentAccountId] = useState<string>("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.is_active),
    [accounts]
  )

  const resetForm = () => {
    setAccountNumber("")
    setName("")
    setAccountType("asset")
    setNormalBalance("debit")
    setParentAccountId("")
    setDescription("")
  }

  const handleSubmit = async () => {
    if (!accountNumber.trim() || !name.trim()) return
    setSubmitting(true)
    try {
      await onCreateAccount({
        account_number: accountNumber.trim(),
        name: name.trim(),
        account_type: accountType,
        normal_balance: normalBalance,
        parent_account_id: parentAccountId || null,
        description: description.trim(),
      })
      resetForm()
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  // Auto-set normal balance based on type
  const handleTypeChange = (type: AccountType) => {
    setAccountType(type)
    if (type === "asset" || type === "cost_of_sales" || type === "operating_expense") {
      setNormalBalance("debit")
    } else {
      setNormalBalance("credit")
    }
    // Suggest account number from range
    const range = ACCOUNT_TYPE_RANGES[type]
    if (range) {
      const existingInRange = accounts
        .filter((a) => {
          const num = parseInt(a.account_number)
          return num >= range.min && num <= range.max
        })
        .map((a) => parseInt(a.account_number))
      const nextNum =
        existingInRange.length > 0
          ? Math.max(...existingInRange) + 10
          : range.min
      if (nextNum <= range.max) {
        setAccountNumber(String(nextNum))
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acct-type">Account Type</Label>
              <Select
                value={accountType}
                onValueChange={(val) => handleTypeChange(val as AccountType)}
              >
                <SelectTrigger id="acct-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(ACCOUNT_TYPE_LABELS) as [
                      AccountType,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="acct-number">
                Account # ({ACCOUNT_TYPE_RANGES[accountType].min}-
                {ACCOUNT_TYPE_RANGES[accountType].max})
              </Label>
              <Input
                id="acct-number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g., 1000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acct-name">Account Name</Label>
            <Input
              id="acct-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cash - Operating"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acct-normal">Normal Balance</Label>
              <Select
                value={normalBalance}
                onValueChange={(val) => setNormalBalance(val as NormalBalance)}
              >
                <SelectTrigger id="acct-normal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="acct-parent">Parent Account</Label>
              <Select
                value={parentAccountId}
                onValueChange={setParentAccountId}
              >
                <SelectTrigger id="acct-parent">
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {activeAccounts
                    .sort((a, b) =>
                      a.account_number.localeCompare(b.account_number)
                    )
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !accountNumber.trim() || !name.trim()}
            >
              {submitting ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// COAEditor
// ---------------------------------------------------------------------------

export function COAEditor({
  accounts,
  entityId,
  onCreateAccount,
  onUpdateAccount,
  onDrillDown,
  className,
}: COAEditorProps) {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})

  const tree = useMemo(() => buildAccountTree(accounts), [accounts])

  const toggleExpand = useCallback((id: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }))
  }, [])

  const expandAll = useCallback(() => {
    const map: Record<string, boolean> = {}
    accounts.forEach((a) => {
      map[a.id] = true
    })
    setExpandedMap(map)
  }, [accounts])

  const collapseAll = useCallback(() => {
    const map: Record<string, boolean> = {}
    accounts.forEach((a) => {
      map[a.id] = false
    })
    setExpandedMap(map)
  }, [accounts])

  const totalBalance = useMemo(
    () =>
      accounts
        .filter((a) => !a.parent_account_id && a.is_active)
        .reduce((sum, a) => sum + a.current_balance, 0),
    [accounts]
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {accounts.length} accounts
          </h3>
          <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
            Collapse All
          </Button>
        </div>
        <AddAccountDialog
          accounts={accounts}
          entityId={entityId}
          onCreateAccount={onCreateAccount}
        />
      </div>

      {/* Table header */}
      <div className="overflow-x-auto rounded-md border border-border">
        <div className="min-w-[800px]">
          <div className="flex items-center border-b bg-muted/50 text-xs font-medium text-muted-foreground">
            <div className="w-8 shrink-0" />
            <div className="w-24 shrink-0 px-3 py-2">Account #</div>
            <div className="min-w-0 flex-1 px-3 py-2">Name</div>
            <div className="w-32 shrink-0 px-3 py-2">Type</div>
            <div className="w-24 shrink-0 px-3 py-2">Normal Bal.</div>
            <div className="w-32 shrink-0 px-3 py-2 text-right">Balance</div>
            <div className="w-20 shrink-0 px-3 py-2">Status</div>
            <div className="w-24 shrink-0 px-2 py-2">Actions</div>
          </div>

          {/* Tree rows */}
          {tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">No accounts found. Add your first account to get started.</p>
            </div>
          ) : (
            tree.map((account) => (
              <AccountTreeNode
                key={account.id}
                account={account}
                depth={0}
                expandedMap={expandedMap}
                toggleExpand={toggleExpand}
                onUpdate={onUpdateAccount}
                onDrillDown={onDrillDown}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
