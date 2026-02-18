"use client"

import { useState } from "react"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  FileText,
} from "lucide-react"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useProjectBudget,
  COST_CATEGORIES,
  type ProjectExpense,
  type ExpenseStatus,
} from "@/lib/hooks/use-projects"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BudgetTrackerProps {
  projectId: string
  totalBudget: number
  currentSpend: number
  committedAmount: number
  projectedFinal: number
}

// ---------------------------------------------------------------------------
// Expense status helpers
// ---------------------------------------------------------------------------

function getExpenseStatusColor(status: ExpenseStatus): string {
  const colors: Record<ExpenseStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }
  return colors[status] ?? ""
}

function getExpenseStatusLabel(status: ExpenseStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function BudgetSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BudgetTracker({
  projectId,
  totalBudget,
  currentSpend,
  committedAmount,
  projectedFinal,
}: BudgetTrackerProps) {
  const { categories, expenses, loading, error, refetch, addExpense } =
    useProjectBudget(projectId)
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)

  // New expense form state
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().substring(0, 10),
    description: "",
    amount: "",
    cost_category: "",
    reference_number: "",
    status: "pending" as ExpenseStatus,
  })

  const variance = totalBudget - projectedFinal
  const varianceIsPositive = variance >= 0

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.cost_category) return

    setExpenseSubmitting(true)
    try {
      await addExpense({
        project_id: projectId,
        entity_id: null,
        date: newExpense.date,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        cost_category: newExpense.cost_category,
        vendor_contact_id: null,
        reference_number: newExpense.reference_number || null,
        document_id: null,
        accounting_transaction_id: null,
        status: newExpense.status,
      })
      setShowExpenseDialog(false)
      setNewExpense({
        date: new Date().toISOString().substring(0, 10),
        description: "",
        amount: "",
        cost_category: "",
        reference_number: "",
        status: "pending",
      })
    } catch {
      // error handled by mutation
    } finally {
      setExpenseSubmitting(false)
    }
  }

  if (loading) return <BudgetSkeleton />

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 p-6">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="text-sm text-destructive">{error}</div>
          <Button variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Total Budget
            </div>
            <div className="text-xl font-bold">{formatCurrency(totalBudget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              Committed
            </div>
            <div className="text-xl font-bold">{formatCurrency(committedAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Actual Spend
            </div>
            <div className="text-xl font-bold">{formatCurrency(currentSpend)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Projected Final
            </div>
            <div className="text-xl font-bold">{formatCurrency(projectedFinal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {varianceIsPositive ? (
                <TrendingDown className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingUp className="h-4 w-4 text-red-600" />
              )}
              Variance
            </div>
            <div
              className={cn(
                "text-xl font-bold",
                varianceIsPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {varianceIsPositive ? "+" : ""}
              {formatCurrency(variance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Budget by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No budget categories configured. Categories will appear once budget line items are added.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Committed</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="w-[160px]">% Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => {
                  const catVariance = cat.budget_amount - cat.actual_amount
                  const pctUsed =
                    cat.budget_amount > 0
                      ? (cat.actual_amount / cat.budget_amount) * 100
                      : 0
                  const barColor =
                    pctUsed > 100
                      ? "bg-red-500"
                      : pctUsed >= 90
                        ? "bg-yellow-500"
                        : "bg-green-500"

                  return (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.category}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cat.budget_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cat.committed_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cat.actual_amount)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          catVariance >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {catVariance >= 0 ? "+" : ""}
                        {formatCurrency(catVariance)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", barColor)}
                              style={{
                                width: `${Math.min(pctUsed, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {formatPercent(pctUsed, 0)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Expense list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Expenses</CardTitle>
          <Button size="sm" onClick={() => setShowExpenseDialog(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Expense
          </Button>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No expenses recorded yet. Click &ldquo;Add Expense&rdquo; to record the first one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Ref #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(exp.date, { short: true })}
                    </TableCell>
                    <TableCell>{exp.description}</TableCell>
                    <TableCell>{exp.cost_category}</TableCell>
                    <TableCell>{exp.reference_number ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(exp.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          getExpenseStatusColor(exp.status)
                        )}
                      >
                        {getExpenseStatusLabel(exp.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a new expense for this project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exp_date">Date *</Label>
                <Input
                  id="exp_date"
                  type="date"
                  value={newExpense.date}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp_amount">Amount *</Label>
                <Input
                  id="exp_amount"
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp_description">Description *</Label>
              <Input
                id="exp_description"
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
                placeholder="e.g. Foundation concrete pour"
              />
            </div>
            <div className="space-y-2">
              <Label>Cost Category *</Label>
              <Select
                value={newExpense.cost_category}
                onValueChange={(val) =>
                  setNewExpense({ ...newExpense, cost_category: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {COST_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp_ref">Reference #</Label>
              <Input
                id="exp_ref"
                value={newExpense.reference_number}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    reference_number: e.target.value,
                  })
                }
                placeholder="Invoice/PO #"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={newExpense.status}
                onValueChange={(val) =>
                  setNewExpense({ ...newExpense, status: val as ExpenseStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExpenseDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddExpense}
              disabled={
                !newExpense.description ||
                !newExpense.amount ||
                !newExpense.cost_category ||
                expenseSubmitting
              }
            >
              {expenseSubmitting ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
