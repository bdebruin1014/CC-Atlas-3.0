"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  ArrowLeft,
  Wrench,
  Loader2,
  Pencil,
  ArrowUpDown,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

interface TradeCategory {
  id: string
  organization_id: string
  code: string
  name: string
  description: string | null
  default_vendor_id: string | null
  cost_range_low: number | null
  cost_range_high: number | null
  is_active: boolean
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "\u2014"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function TradeCategoriesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [categories, setCategories] = useState<TradeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editCategory, setEditCategory] = useState<TradeCategory | null>(null)
  const [sortField, setSortField] = useState<"code" | "name">("code")
  const [sortAsc, setSortAsc] = useState(true)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from("trade_categories")
        .select("*")
        .order("code", { ascending: true })

      if (fetchError) throw fetchError
      setCategories((data as unknown as TradeCategory[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trade categories")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const sortedCategories = [...categories].sort((a, b) => {
    const valA = a[sortField].toLowerCase()
    const valB = b[sortField].toLowerCase()
    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
  })

  const toggleSort = (field: "code" | "name") => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const toggleActive = async (category: TradeCategory) => {
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("trade_categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id)

      if (updateError) throw updateError
      toast({
        title: category.is_active ? "Category deactivated" : "Category activated",
      })
      fetchCategories()
    } catch {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const handleSave = async (data: Partial<TradeCategory>) => {
    try {
      const supabase = createClient()
      if (editCategory) {
        const { error: updateError } = await supabase
          .from("trade_categories")
          .update(data)
          .eq("id", editCategory.id)

        if (updateError) throw updateError
        toast({ title: "Trade category updated" })
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { error: insertError } = await supabase
          .from("trade_categories")
          .insert({
            ...data,
            organization_id: user?.user_metadata?.organization_id || "",
          } as any)

        if (insertError) throw insertError
        toast({ title: "Trade category added" })
      }
      fetchCategories()
      setShowDialog(false)
      setEditCategory(null)
    } catch {
      toast({
        title: "Error",
        description: "Failed to save trade category",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Trade Categories</h1>
          <p className="text-sm text-muted-foreground">
            {categories.length} categories configured
          </p>
        </div>
        <Button
          onClick={() => {
            setEditCategory(null)
            setShowDialog(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchCategories}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && categories.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No trade categories</h3>
            <p className="text-sm text-muted-foreground">
              Define trade categories to organize construction costs.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!loading && !error && categories.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th
                    className="h-12 px-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("code")}
                  >
                    <div className="flex items-center gap-1">
                      Code
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </div>
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground">
                    Typical Cost Range
                  </th>
                  <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground">
                    Active
                  </th>
                  <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((cat) => (
                  <tr key={cat.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {cat.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 font-medium text-sm">{cat.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[300px] truncate">
                      {cat.description || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {cat.cost_range_low || cat.cost_range_high ? (
                        <span>
                          {formatCurrency(cat.cost_range_low)} -{" "}
                          {formatCurrency(cat.cost_range_high)}
                        </span>
                      ) : (
                        "\u2014"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "cursor-pointer text-xs",
                          cat.is_active
                            ? "border-green-300 text-green-700 hover:bg-green-50"
                            : "border-gray-300 text-gray-500 hover:bg-gray-50"
                        )}
                        onClick={() => toggleActive(cat)}
                      >
                        {cat.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditCategory(cat)
                          setShowDialog(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <TradeCategoryDialog
        category={editCategory}
        open={showDialog}
        onOpenChange={(val) => {
          setShowDialog(val)
          if (!val) setEditCategory(null)
        }}
        onSave={handleSave}
      />
    </div>
  )
}

function TradeCategoryDialog({
  category,
  open,
  onOpenChange,
  onSave,
}: {
  category: TradeCategory | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<TradeCategory>) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    cost_range_low: "",
    cost_range_high: "",
    is_active: true,
  })

  useEffect(() => {
    if (category) {
      setFormData({
        code: category.code,
        name: category.name,
        description: category.description || "",
        cost_range_low: category.cost_range_low?.toString() || "",
        cost_range_high: category.cost_range_high?.toString() || "",
        is_active: category.is_active,
      })
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
        cost_range_low: "",
        cost_range_high: "",
        is_active: true,
      })
    }
  }, [category, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      code: formData.code,
      name: formData.name,
      description: formData.description || null,
      cost_range_low: formData.cost_range_low
        ? parseFloat(formData.cost_range_low)
        : null,
      cost_range_high: formData.cost_range_high
        ? parseFloat(formData.cost_range_high)
        : null,
      is_active: formData.is_active,
    })
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit Trade Category" : "Add Trade Category"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Update the trade category details."
              : "Define a new trade category for construction cost tracking."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g., ELEC"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Electrical"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe the scope of this trade category..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cost Range Low ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_range_low}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    cost_range_low: e.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Cost Range High ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_range_high}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    cost_range_high: e.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label>Active</Label>
            <Button
              type="button"
              size="sm"
              variant={formData.is_active ? "default" : "outline"}
              onClick={() =>
                setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))
              }
            >
              {formData.is_active ? "Active" : "Inactive"}
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : category ? "Save Changes" : "Add Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
