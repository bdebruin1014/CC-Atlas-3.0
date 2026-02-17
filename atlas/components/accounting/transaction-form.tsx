"use client"

import { useState, useCallback, useMemo } from "react"
import { Plus, Trash2, AlertCircle, Check } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  Account,
  TransactionType,
  TransactionLineItem,
} from "@/lib/types/accounting"
import { TRANSACTION_TYPE_LABELS } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionFormData {
  date: string
  description: string
  transaction_type: TransactionType
  reference_number: string
  line_items: LineItemFormData[]
}

export interface LineItemFormData {
  id: string
  account_id: string
  debit_amount: string
  credit_amount: string
  project_id: string
  unit_id: string
  memo: string
}

interface TransactionFormProps {
  entityId: string
  accounts: Account[]
  projects?: Array<{ id: string; name: string }>
  units?: Array<{ id: string; name: string }>
  onSubmit: (data: TransactionFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  initialData?: Partial<TransactionFormData>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let lineItemIdCounter = 0
function newLineItem(): LineItemFormData {
  return {
    id: `li_${++lineItemIdCounter}_${Date.now()}`,
    account_id: "",
    debit_amount: "",
    credit_amount: "",
    project_id: "",
    unit_id: "",
    memo: "",
  }
}

function parseAmount(value: string): number {
  const num = parseFloat(value)
  return isNaN(num) ? 0 : Math.round(num * 100) / 100
}

function groupAccountsByType(accounts: Account[]) {
  const groups: Record<string, Account[]> = {
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

const ACCOUNT_GROUP_LABELS: Record<string, string> = {
  asset: "Assets (1000-1999)",
  liability: "Liabilities (2000-2999)",
  equity: "Equity (3000-3999)",
  revenue: "Revenue (4000-4999)",
  cost_of_sales: "Cost of Sales (5000-5999)",
  operating_expense: "Operating Expenses (6000-6999)",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransactionForm({
  entityId,
  accounts,
  projects = [],
  units = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
}: TransactionFormProps) {
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().slice(0, 10)
  )
  const [description, setDescription] = useState(initialData?.description || "")
  const [transactionType, setTransactionType] = useState<TransactionType>(
    initialData?.transaction_type || "journal_entry"
  )
  const [referenceNumber, setReferenceNumber] = useState(
    initialData?.reference_number || ""
  )
  const [lineItems, setLineItems] = useState<LineItemFormData[]>(
    initialData?.line_items || [newLineItem(), newLineItem()]
  )
  const [errors, setErrors] = useState<string[]>([])

  const accountGroups = useMemo(
    () => groupAccountsByType(accounts.filter((a) => a.is_active)),
    [accounts]
  )

  // Compute totals
  const totalDebits = useMemo(
    () => lineItems.reduce((sum, li) => sum + parseAmount(li.debit_amount), 0),
    [lineItems]
  )
  const totalCredits = useMemo(
    () => lineItems.reduce((sum, li) => sum + parseAmount(li.credit_amount), 0),
    [lineItems]
  )
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.005 && totalDebits > 0
  const difference = Math.abs(totalDebits - totalCredits)

  // Line item handlers
  const addLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, newLineItem()])
  }, [])

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => {
      if (prev.length <= 2) return prev // minimum 2 line items
      return prev.filter((li) => li.id !== id)
    })
  }, [])

  const updateLineItem = useCallback(
    (id: string, field: keyof LineItemFormData, value: string) => {
      setLineItems((prev) =>
        prev.map((li) => {
          if (li.id !== id) return li
          const updated = { ...li, [field]: value }
          // If entering a debit, clear credit and vice versa
          if (field === "debit_amount" && value !== "" && parseFloat(value) > 0) {
            updated.credit_amount = ""
          }
          if (field === "credit_amount" && value !== "" && parseFloat(value) > 0) {
            updated.debit_amount = ""
          }
          return updated
        })
      )
    },
    []
  )

  // Validation
  const validate = useCallback((): boolean => {
    const errs: string[] = []

    if (!date) errs.push("Date is required")
    if (!description.trim()) errs.push("Description is required")

    // Check line items
    const activeLines = lineItems.filter(
      (li) => li.account_id || parseAmount(li.debit_amount) > 0 || parseAmount(li.credit_amount) > 0
    )

    if (activeLines.length < 2) {
      errs.push("At least two line items are required")
    }

    activeLines.forEach((li, idx) => {
      if (!li.account_id) {
        errs.push(`Line ${idx + 1}: Account is required`)
      }
      if (parseAmount(li.debit_amount) === 0 && parseAmount(li.credit_amount) === 0) {
        errs.push(`Line ${idx + 1}: Enter a debit or credit amount`)
      }
      if (parseAmount(li.debit_amount) > 0 && parseAmount(li.credit_amount) > 0) {
        errs.push(`Line ${idx + 1}: A line cannot have both debit and credit amounts`)
      }
    })

    if (!isBalanced) {
      errs.push(
        `Transaction does not balance. Debits: ${formatCurrency(totalDebits, { decimals: 2 })}, Credits: ${formatCurrency(totalCredits, { decimals: 2 })}. Difference: ${formatCurrency(difference, { decimals: 2 })}`
      )
    }

    setErrors(errs)
    return errs.length === 0
  }, [date, description, lineItems, isBalanced, totalDebits, totalCredits, difference])

  // Submit
  const handleSubmit = async () => {
    if (!validate()) return

    await onSubmit({
      date,
      description: description.trim(),
      transaction_type: transactionType,
      reference_number: referenceNumber.trim(),
      line_items: lineItems.filter(
        (li) => li.account_id && (parseAmount(li.debit_amount) > 0 || parseAmount(li.credit_amount) > 0)
      ),
    })
  }

  return (
    <div className="space-y-6">
      {/* Error display */}
      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              Please fix the following errors:
            </span>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="text-sm text-destructive">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Header fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="txn-date">Date *</Label>
          <Input
            id="txn-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="txn-type">Transaction Type *</Label>
          <Select
            value={transactionType}
            onValueChange={(val) => setTransactionType(val as TransactionType)}
          >
            <SelectTrigger id="txn-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(TRANSACTION_TYPE_LABELS) as [TransactionType, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="txn-desc">Description *</Label>
        <Textarea
          id="txn-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter transaction description..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="txn-ref">Reference Number</Label>
        <Input
          id="txn-ref"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="e.g., INV-001, CHK-1234"
        />
      </div>

      {/* Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Line Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="h-3.5 w-3.5" />
            Add Line
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[30%]">
                  Account *
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[15%]">
                  Debit
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[15%]">
                  Credit
                </th>
                {projects.length > 0 && (
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[15%]">
                    Project
                  </th>
                )}
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[20%]">
                  Memo
                </th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, idx) => (
                <tr key={li.id} className="border-b last:border-b-0">
                  <td className="px-2 py-2">
                    <select
                      value={li.account_id}
                      onChange={(e) => updateLineItem(li.id, "account_id", e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Select account...</option>
                      {Object.entries(accountGroups).map(([type, accts]) =>
                        accts.length > 0 ? (
                          <optgroup key={type} label={ACCOUNT_GROUP_LABELS[type] || type}>
                            {accts
                              .sort((a, b) => a.account_number.localeCompare(b.account_number))
                              .map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.account_number} - {acc.name}
                                </option>
                              ))}
                          </optgroup>
                        ) : null
                      )}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={li.debit_amount}
                      onChange={(e) => updateLineItem(li.id, "debit_amount", e.target.value)}
                      className="text-right"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={li.credit_amount}
                      onChange={(e) => updateLineItem(li.id, "credit_amount", e.target.value)}
                      className="text-right"
                    />
                  </td>
                  {projects.length > 0 && (
                    <td className="px-2 py-2">
                      <select
                        value={li.project_id}
                        onChange={(e) =>
                          updateLineItem(li.id, "project_id", e.target.value)
                        }
                        className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">None</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className="px-2 py-2">
                    <Input
                      value={li.memo}
                      onChange={(e) => updateLineItem(li.id, "memo", e.target.value)}
                      placeholder="Line memo"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeLineItem(li.id)}
                      disabled={lineItems.length <= 2}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="border-t-2 border-border bg-muted/30 font-medium">
                <td className="px-3 py-2 text-right">Totals:</td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(totalDebits, { decimals: 2 })}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(totalCredits, { decimals: 2 })}
                </td>
                {projects.length > 0 && <td />}
                <td colSpan={2} className="px-3 py-2">
                  {isBalanced ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <Check className="h-3.5 w-3.5" />
                      Balanced
                    </span>
                  ) : totalDebits > 0 || totalCredits > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Difference: {formatCurrency(difference, { decimals: 2 })}
                    </span>
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Period auto-computed */}
      {date && (
        <p className="text-xs text-muted-foreground">
          Period: {date.slice(0, 7)}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !isBalanced}
        >
          {isSubmitting ? "Saving..." : "Save Transaction"}
        </Button>
      </div>
    </div>
  )
}
