"use client"

import { useState, useMemo, useCallback } from "react"
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Lock,
  Loader2,
  ClipboardCheck,
  ListChecks,
  Scale,
  PenLine,
  PartyPopper,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
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
import type {
  AccountingPeriod,
  TrialBalanceRow,
  AccountType,
} from "@/lib/types/accounting"
import { ACCOUNT_TYPE_LABELS } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PeriodSummary {
  transactionCount: number
  totalDebits: number
  totalCredits: number
  unpostedCount: number
  pendingCount: number
  trialBalance: TrialBalanceRow[]
}

interface AdjustingEntry {
  id: string
  date: string
  description: string
  debitAccountNumber: string
  creditAccountNumber: string
  amount: string
}

interface PeriodCloseWizardProps {
  period: AccountingPeriod
  entityId: string
  summary: PeriodSummary
  onClose: (adjustingEntries: AdjustingEntry[]) => Promise<void>
  onCancel: () => void
  className?: string
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS = [
  { id: "review", label: "Review", icon: ClipboardCheck },
  { id: "trial-balance", label: "Trial Balance", icon: Scale },
  { id: "adjustments", label: "Adjusting Entries", icon: PenLine },
  { id: "confirm", label: "Confirm Close", icon: ListChecks },
  { id: "complete", label: "Complete", icon: PartyPopper },
] as const

type StepId = (typeof STEPS)[number]["id"]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let entryIdCounter = 0
function newAdjustingEntry(): AdjustingEntry {
  return {
    id: `adj_${++entryIdCounter}_${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    description: "",
    debitAccountNumber: "",
    creditAccountNumber: "",
    amount: "",
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PeriodCloseWizard({
  period,
  entityId,
  summary,
  onClose,
  onCancel,
  className,
}: PeriodCloseWizardProps) {
  const [currentStep, setCurrentStep] = useState<StepId>("review")
  const [adjustingEntries, setAdjustingEntries] = useState<AdjustingEntry[]>([])
  const [closing, setClosing] = useState(false)
  const [closed, setClosed] = useState(false)

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep)
  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100

  const isTrialBalanceBalanced = useMemo(() => {
    const totalDebits = summary.trialBalance.reduce(
      (s, r) => s + r.debit_balance,
      0
    )
    const totalCredits = summary.trialBalance.reduce(
      (s, r) => s + r.credit_balance,
      0
    )
    return Math.abs(totalDebits - totalCredits) < 0.01
  }, [summary.trialBalance])

  const tbTotalDebits = useMemo(
    () => summary.trialBalance.reduce((s, r) => s + r.debit_balance, 0),
    [summary.trialBalance]
  )
  const tbTotalCredits = useMemo(
    () => summary.trialBalance.reduce((s, r) => s + r.credit_balance, 0),
    [summary.trialBalance]
  )

  const canProceed = useMemo(() => {
    if (currentStep === "review") {
      return summary.unpostedCount === 0
    }
    if (currentStep === "trial-balance") {
      return isTrialBalanceBalanced
    }
    return true
  }, [currentStep, summary.unpostedCount, isTrialBalanceBalanced])

  const goNext = useCallback(() => {
    const idx = STEPS.findIndex((s) => s.id === currentStep)
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].id)
    }
  }, [currentStep])

  const goBack = useCallback(() => {
    const idx = STEPS.findIndex((s) => s.id === currentStep)
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].id)
    }
  }, [currentStep])

  const handleClose = async () => {
    setClosing(true)
    try {
      await onClose(adjustingEntries.filter((e) => e.description && e.amount))
      setClosed(true)
      setCurrentStep("complete")
    } finally {
      setClosing(false)
    }
  }

  // Adjusting entry handlers
  const addEntry = () => {
    setAdjustingEntries((prev) => [...prev, newAdjustingEntry()])
  }

  const removeEntry = (id: string) => {
    setAdjustingEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const updateEntry = (
    id: string,
    field: keyof AdjustingEntry,
    value: string
  ) => {
    setAdjustingEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Period Close Wizard</h2>
          <p className="text-sm text-muted-foreground">
            Closing period: <span className="font-medium">{period.period}</span>
            {period.entity_name && (
              <span className="ml-2">({period.entity_name})</span>
            )}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            period.status === "open" && "bg-green-100 text-green-800",
            period.status === "in_review" && "bg-yellow-100 text-yellow-800",
            period.status === "closed" && "bg-blue-100 text-blue-800",
            period.status === "locked" && "bg-gray-100 text-gray-800"
          )}
        >
          {period.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <Progress value={progressPercent} className="h-2" />
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isCompleted = idx < currentStepIndex
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  isActive && "text-foreground font-medium",
                  isCompleted && "text-green-600",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Step Content */}
      {currentStep === "review" && (
        <StepReview summary={summary} period={period} />
      )}
      {currentStep === "trial-balance" && (
        <StepTrialBalance
          trialBalance={summary.trialBalance}
          totalDebits={tbTotalDebits}
          totalCredits={tbTotalCredits}
          isBalanced={isTrialBalanceBalanced}
        />
      )}
      {currentStep === "adjustments" && (
        <StepAdjustments
          entries={adjustingEntries}
          onAdd={addEntry}
          onRemove={removeEntry}
          onUpdate={updateEntry}
        />
      )}
      {currentStep === "confirm" && (
        <StepConfirm
          period={period}
          summary={summary}
          adjustingEntries={adjustingEntries}
          onClose={handleClose}
          closing={closing}
        />
      )}
      {currentStep === "complete" && <StepComplete period={period} />}

      {/* Navigation */}
      {currentStep !== "complete" && (
        <div className="flex items-center justify-between pt-4">
          <div>
            {currentStepIndex > 0 && (
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {currentStep !== "confirm" && (
              <Button
                onClick={goNext}
                disabled={!canProceed}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Review
// ---------------------------------------------------------------------------

function StepReview({
  summary,
  period,
}: {
  summary: PeriodSummary
  period: AccountingPeriod
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Period Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold">{summary.transactionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Debits</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(summary.totalDebits, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Credits</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(summary.totalCredits, { decimals: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            summary.unpostedCount > 0 && "border-red-300 bg-red-50"
          )}
        >
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Unposted Items</p>
            <p
              className={cn(
                "text-2xl font-bold",
                summary.unpostedCount > 0 && "text-red-600"
              )}
            >
              {summary.unpostedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {summary.unpostedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {summary.unpostedCount} unposted transaction
              {summary.unpostedCount > 1 ? "s" : ""} must be posted or voided
              before closing this period.
            </p>
            <p className="text-xs text-red-600 mt-1">
              All transactions must be in "posted" or "voided" status to proceed.
            </p>
          </div>
        </div>
      )}

      {summary.pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800">
            {summary.pendingCount} pending transaction
            {summary.pendingCount > 1 ? "s" : ""} need review.
          </p>
        </div>
      )}

      {summary.unpostedCount === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800">
            All transactions are posted. Ready to proceed.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Trial Balance
// ---------------------------------------------------------------------------

function StepTrialBalance({
  trialBalance,
  totalDebits,
  totalCredits,
  isBalanced,
}: {
  trialBalance: TrialBalanceRow[]
  totalDebits: number
  totalCredits: number
  isBalanced: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Trial Balance</h3>
        {isBalanced ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Balanced
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Out of Balance:{" "}
            {formatCurrency(Math.abs(totalDebits - totalCredits), {
              decimals: 2,
            })}
          </Badge>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account #</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trialBalance.map((row, idx) => {
              const hasBalance =
                row.debit_balance > 0 || row.credit_balance > 0
              return (
                <TableRow
                  key={idx}
                  className={cn(!hasBalance && "opacity-40")}
                >
                  <TableCell className="font-mono text-xs">
                    {row.account_number}
                  </TableCell>
                  <TableCell>{row.account_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {ACCOUNT_TYPE_LABELS[row.account_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.debit_balance > 0
                      ? formatCurrency(row.debit_balance, { decimals: 2 })
                      : ""}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.credit_balance > 0
                      ? formatCurrency(row.credit_balance, { decimals: 2 })
                      : ""}
                  </TableCell>
                </TableRow>
              )
            })}

            {/* Totals */}
            <TableRow className="border-t-2 bg-muted/30 font-semibold">
              <TableCell colSpan={3} className="text-right">
                Totals
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(totalDebits, { decimals: 2 })}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(totalCredits, { decimals: 2 })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {!isBalanced && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">
            The trial balance is out of balance. You cannot close this period
            until debits equal credits. Please review your transactions and make
            adjusting entries.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Adjusting Entries
// ---------------------------------------------------------------------------

function StepAdjustments({
  entries,
  onAdd,
  onRemove,
  onUpdate,
}: {
  entries: AdjustingEntry[]
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, field: keyof AdjustingEntry, value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Adjusting Entries</h3>
          <p className="text-sm text-muted-foreground">
            Create any necessary adjusting entries before closing the period.
            This step is optional.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <PenLine className="h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <PenLine className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No adjusting entries needed</p>
            <p className="text-xs mt-1">
              Click "Add Entry" if you need to create adjustments
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        value={entry.date}
                        onChange={(e) =>
                          onUpdate(entry.id, "date", e.target.value)
                        }
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={entry.description}
                        onChange={(e) =>
                          onUpdate(entry.id, "description", e.target.value)
                        }
                        placeholder="e.g., Accrued interest adjustment"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Debit Account #</Label>
                      <Input
                        value={entry.debitAccountNumber}
                        onChange={(e) =>
                          onUpdate(
                            entry.id,
                            "debitAccountNumber",
                            e.target.value
                          )
                        }
                        placeholder="e.g., 6000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Credit Account #</Label>
                      <Input
                        value={entry.creditAccountNumber}
                        onChange={(e) =>
                          onUpdate(
                            entry.id,
                            "creditAccountNumber",
                            e.target.value
                          )
                        }
                        placeholder="e.g., 2400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={entry.amount}
                        onChange={(e) =>
                          onUpdate(entry.id, "amount", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => onRemove(entry.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Confirm Close
// ---------------------------------------------------------------------------

function StepConfirm({
  period,
  summary,
  adjustingEntries,
  onClose,
  closing,
}: {
  period: AccountingPeriod
  summary: PeriodSummary
  adjustingEntries: AdjustingEntry[]
  onClose: () => Promise<void>
  closing: boolean
}) {
  const validEntries = adjustingEntries.filter(
    (e) => e.description && e.amount
  )

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Confirm Period Close</h3>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Period</p>
              <p className="font-medium">{period.period}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Transactions</p>
              <p className="font-medium">{summary.transactionCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Debits</p>
              <p className="font-medium font-mono tabular-nums">
                {formatCurrency(summary.totalDebits, { decimals: 2 })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Credits</p>
              <p className="font-medium font-mono tabular-nums">
                {formatCurrency(summary.totalCredits, { decimals: 2 })}
              </p>
            </div>
            {validEntries.length > 0 && (
              <div>
                <p className="text-muted-foreground">Adjusting Entries</p>
                <p className="font-medium">{validEntries.length}</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-start gap-3 rounded-md bg-yellow-50 border border-yellow-200 p-4">
            <Lock className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                This action is permanent
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Once the period is closed, no further transactions can be posted
                to this period. Adjusting entries will be posted automatically.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onClose}
              disabled={closing}
              className="bg-red-600 hover:bg-red-700"
            >
              {closing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Closing Period...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Close Period
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5: Complete
// ---------------------------------------------------------------------------

function StepComplete({ period }: { period: AccountingPeriod }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-xl font-bold">Period Closed Successfully</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Period <span className="font-medium">{period.period}</span> has been
        closed. All transactions have been locked and adjusting entries have been
        posted.
      </p>
    </div>
  )
}
