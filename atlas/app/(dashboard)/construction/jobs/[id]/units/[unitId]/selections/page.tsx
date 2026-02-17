"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  Palette,
  DollarSign,
  Package,
  Edit,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { StatCard } from "@/components/construction/job-dashboard"
import { MOCK_SELECTIONS, MOCK_UNITS_JOB001 } from "@/lib/construction/mock-data"
import {
  SELECTION_CATEGORIES,
  SELECTION_STATUS_CONFIG,
} from "@/lib/construction/types"
import type { Selection, SelectionStatus } from "@/lib/construction/types"

export default function SelectionsPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const unitId = params.unitId as string

  const unit = MOCK_UNITS_JOB001.find((u) => u.id === unitId)
  const [selections, setSelections] = useState<Selection[]>(
    MOCK_SELECTIONS.filter((s) => s.unit_id === unitId)
  )
  const [showDialog, setShowDialog] = useState(false)
  const [editingSelection, setEditingSelection] = useState<Selection | null>(
    null
  )

  // Form state
  const [formCategory, setFormCategory] = useState("")
  const [formItemName, setFormItemName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formVendor, setFormVendor] = useState("")
  const [formBaseCost, setFormBaseCost] = useState("")
  const [formUpgradeDelta, setFormUpgradeDelta] = useState("")
  const [formStatus, setFormStatus] = useState<SelectionStatus>("pending")

  const totalUpgradeCost = selections.reduce(
    (sum, s) => sum + s.upgrade_delta,
    0
  )
  const totalBaseCost = selections.reduce((sum, s) => sum + s.base_cost, 0)
  const selectedCount = selections.filter(
    (s) => s.status !== "pending"
  ).length
  const installedCount = selections.filter(
    (s) => s.status === "installed"
  ).length

  const resetForm = () => {
    setFormCategory("")
    setFormItemName("")
    setFormDescription("")
    setFormVendor("")
    setFormBaseCost("")
    setFormUpgradeDelta("")
    setFormStatus("pending")
    setEditingSelection(null)
  }

  const handleOpenEdit = (selection: Selection) => {
    setEditingSelection(selection)
    setFormCategory(selection.category)
    setFormItemName(selection.item_name)
    setFormDescription(selection.description || "")
    setFormVendor(selection.vendor || "")
    setFormBaseCost(selection.base_cost.toString())
    setFormUpgradeDelta(selection.upgrade_delta.toString())
    setFormStatus(selection.status)
    setShowDialog(true)
  }

  const handleOpenNew = () => {
    resetForm()
    setShowDialog(true)
  }

  const handleSave = () => {
    const data: Selection = {
      id: editingSelection?.id || `sel-new-${Date.now()}`,
      unit_id: unitId,
      category: formCategory,
      item_name: formItemName,
      description: formDescription || undefined,
      vendor: formVendor || undefined,
      base_cost: parseFloat(formBaseCost) || 0,
      upgrade_delta: parseFloat(formUpgradeDelta) || 0,
      status: formStatus,
    }

    if (editingSelection) {
      setSelections((prev) =>
        prev.map((s) => (s.id === editingSelection.id ? data : s))
      )
    } else {
      setSelections((prev) => [...prev, data])
    }

    setShowDialog(false)
    resetForm()
  }

  if (!unit) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold">Unit not found</h2>
      </div>
    )
  }

  // Group selections by category
  const byCategory = SELECTION_CATEGORIES.map((cat) => ({
    category: cat,
    items: selections.filter((s) => s.category === cat),
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push(`/construction/jobs/${jobId}/units/${unitId}`)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Unit {unit.unit_number}
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Design Selections - {unit.unit_number}
            </h1>
            <p className="text-sm text-muted-foreground">
              {unit.floor_plan_name} &middot;{" "}
              {unit.upgrade_package || "Standard Package"}
            </p>
          </div>
          <Button onClick={handleOpenNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Selection
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Base Cost"
          value={formatCurrency(totalBaseCost)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Upgrade Total"
          value={formatCurrency(totalUpgradeCost)}
          subtitle="Additional over base"
          icon={<DollarSign className="h-4 w-4" />}
          className={totalUpgradeCost > 0 ? "border-orange-200 dark:border-orange-800" : undefined}
        />
        <StatCard
          title="Selections Made"
          value={`${selectedCount}/${selections.length}`}
          icon={<Palette className="h-4 w-4" />}
        />
        <StatCard
          title="Installed"
          value={`${installedCount}/${selections.length}`}
          icon={<Package className="h-4 w-4" />}
        />
      </div>

      {/* Selections by Category */}
      <div className="space-y-4">
        {byCategory.map(({ category, items }) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{category}</CardTitle>
                {items.length === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetForm()
                      setFormCategory(category)
                      setShowDialog(true)
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No selection made for this category yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {items.map((sel) => (
                    <div
                      key={sel.id}
                      className="flex items-start justify-between rounded-lg border px-4 py-3"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {sel.item_name}
                          </span>
                          <Badge
                            className={cn(
                              "text-xs",
                              SELECTION_STATUS_CONFIG[sel.status].bgColor
                            )}
                          >
                            {SELECTION_STATUS_CONFIG[sel.status].label}
                          </Badge>
                        </div>
                        {sel.description && (
                          <p className="text-xs text-muted-foreground">
                            {sel.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {sel.vendor && <span>Vendor: {sel.vendor}</span>}
                          <span>Base: {formatCurrency(sel.base_cost)}</span>
                          {sel.upgrade_delta > 0 && (
                            <span className="text-orange-600 font-medium">
                              +{formatCurrency(sel.upgrade_delta)} upgrade
                            </span>
                          )}
                          {sel.linked_po_id && (
                            <span className="text-blue-600">Linked to PO</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(sel)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSelection ? "Edit Selection" : "Add Selection"}
            </DialogTitle>
            <DialogDescription>
              {editingSelection
                ? "Update the selection details."
                : "Add a new design selection for this unit."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {SELECTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="selItemName">Item Name *</Label>
              <Input
                id="selItemName"
                placeholder="e.g., Shaker White - Full Overlay"
                value={formItemName}
                onChange={(e) => setFormItemName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="selDescription">Description</Label>
              <Textarea
                id="selDescription"
                placeholder="Detailed description..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="selVendor">Vendor</Label>
              <Input
                id="selVendor"
                placeholder="e.g., Heritage Cabinet Co"
                value={formVendor}
                onChange={(e) => setFormVendor(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="selBaseCost">Base Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="selBaseCost"
                    type="number"
                    placeholder="0.00"
                    value={formBaseCost}
                    onChange={(e) => setFormBaseCost(e.target.value)}
                    className="pl-7"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="selUpgradeDelta">Upgrade Delta</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="selUpgradeDelta"
                    type="number"
                    placeholder="0.00"
                    value={formUpgradeDelta}
                    onChange={(e) => setFormUpgradeDelta(e.target.value)}
                    className="pl-7"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formStatus}
                onValueChange={(v) => setFormStatus(v as SelectionStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="selected">Selected</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="installed">Installed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formCategory || !formItemName}
            >
              {editingSelection ? "Update" : "Add Selection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
