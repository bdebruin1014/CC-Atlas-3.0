'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, formatDate } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import type { ComparableSale } from '@/lib/types/opportunities'
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ExternalLink,
  BarChart3,
} from 'lucide-react'
import { toast } from '@/lib/hooks/use-toast'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CompsTableProps {
  opportunityId: string
}

// ---------------------------------------------------------------------------
// Blank comp for adding
// ---------------------------------------------------------------------------

function blankComp(opportunityId: string): Omit<ComparableSale, 'id' | 'created_at'> {
  return {
    opportunity_id: opportunityId,
    mls_link: '',
    address: '',
    beds: null,
    baths: null,
    sqft: null,
    sale_date: null,
    sale_price: null,
    price_per_sqft: null,
    notes: null,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CompsTable({ opportunityId }: CompsTableProps) {
  const [comps, setComps] = useState<ComparableSale[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [draft, setDraft] = useState<Omit<ComparableSale, 'id' | 'created_at'>>(
    blankComp(opportunityId)
  )

  // ---- Fetch comps ----
  const fetchComps = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('comparable_sales')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('sale_date', { ascending: false })
        .limit(15)

      if (error) throw error
      setComps((data as ComparableSale[]) ?? [])
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load comparable sales.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => {
    fetchComps()
  }, [fetchComps])

  // ---- Summary calculations ----
  const summary = useMemo(() => {
    const withSqft = comps.filter((c) => c.sqft && c.sqft > 0)
    const withPrice = comps.filter((c) => c.sale_price && c.sale_price > 0)
    const withPpsf = comps.filter(
      (c) => c.price_per_sqft && c.price_per_sqft > 0
    )

    const avgSqft =
      withSqft.length > 0
        ? Math.round(
            withSqft.reduce((sum, c) => sum + (c.sqft ?? 0), 0) /
              withSqft.length
          )
        : null

    const prices = withPrice
      .map((c) => c.sale_price ?? 0)
      .sort((a, b) => a - b)
    const medianPrice =
      prices.length > 0
        ? prices.length % 2 === 0
          ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
          : prices[Math.floor(prices.length / 2)]
        : null

    const avgPpsf =
      withPpsf.length > 0
        ? Math.round(
            withPpsf.reduce((sum, c) => sum + (c.price_per_sqft ?? 0), 0) /
              withPpsf.length
          )
        : null

    return { avgSqft, medianPrice, avgPpsf }
  }, [comps])

  // ---- Add a new comp ----
  const handleAdd = useCallback(async () => {
    try {
      const supabase = createClient()

      // Auto-calculate $/SF if we have both
      const price_per_sqft =
        draft.sale_price && draft.sqft && draft.sqft > 0
          ? Math.round((draft.sale_price / draft.sqft) * 100) / 100
          : null

      const { error } = await supabase.from('comparable_sales').insert({
        ...draft,
        price_per_sqft,
      })

      if (error) throw error

      setAddingNew(false)
      setDraft(blankComp(opportunityId))
      fetchComps()
      toast({ title: 'Comp Added', description: 'Comparable sale saved.' })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to add comparable sale.',
        variant: 'destructive',
      })
    }
  }, [draft, opportunityId, fetchComps])

  // ---- Delete a comp ----
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const supabase = createClient()
        const { error } = await supabase
          .from('comparable_sales')
          .delete()
          .eq('id', id)

        if (error) throw error

        fetchComps()
        toast({ title: 'Comp Deleted' })
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to delete comparable sale.',
          variant: 'destructive',
        })
      }
    },
    [fetchComps]
  )

  // ---- Edit a comp ----
  const [editDraft, setEditDraft] = useState<ComparableSale | null>(null)

  const startEdit = (comp: ComparableSale) => {
    setEditingId(comp.id)
    setEditDraft({ ...comp })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft(null)
  }

  const saveEdit = useCallback(async () => {
    if (!editDraft) return
    try {
      const supabase = createClient()

      const price_per_sqft =
        editDraft.sale_price && editDraft.sqft && editDraft.sqft > 0
          ? Math.round((editDraft.sale_price / editDraft.sqft) * 100) / 100
          : editDraft.price_per_sqft

      const { error } = await supabase
        .from('comparable_sales')
        .update({
          mls_link: editDraft.mls_link,
          address: editDraft.address,
          beds: editDraft.beds,
          baths: editDraft.baths,
          sqft: editDraft.sqft,
          sale_date: editDraft.sale_date,
          sale_price: editDraft.sale_price,
          price_per_sqft,
          notes: editDraft.notes,
        })
        .eq('id', editDraft.id)

      if (error) throw error

      setEditingId(null)
      setEditDraft(null)
      fetchComps()
      toast({ title: 'Comp Updated' })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update comparable sale.',
        variant: 'destructive',
      })
    }
  }, [editDraft, fetchComps])

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            Comparable Sales ({comps.length})
          </h3>
        </div>
        {!addingNew && comps.length < 15 && (
          <Button
            size="sm"
            onClick={() => setAddingNew(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Comp
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">MLS</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-center">Beds</TableHead>
              <TableHead className="text-center">Baths</TableHead>
              <TableHead className="text-right">SF</TableHead>
              <TableHead>Sale Date</TableHead>
              <TableHead className="text-right">Sale Price</TableHead>
              <TableHead className="text-right">$/SF</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {comps.length === 0 && !addingNew && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-muted-foreground"
                >
                  No comparable sales added yet.
                </TableCell>
              </TableRow>
            )}

            {comps.map((comp) =>
              editingId === comp.id && editDraft ? (
                <TableRow key={comp.id}>
                  <TableCell>
                    <Input
                      className="h-8 text-xs"
                      value={editDraft.mls_link ?? ''}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, mls_link: e.target.value })
                      }
                      placeholder="MLS #"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-xs"
                      value={editDraft.address ?? ''}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, address: e.target.value })
                      }
                      placeholder="Address"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 w-14 text-center text-xs"
                      value={editDraft.beds ?? ''}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          beds: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 w-14 text-center text-xs"
                      value={editDraft.baths ?? ''}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          baths: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 w-20 text-right text-xs"
                      value={editDraft.sqft ?? ''}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          sqft: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={editDraft.sale_date ?? ''}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          sale_date: e.target.value || null,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 w-28 text-right text-xs"
                      value={editDraft.sale_price ?? ''}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          sale_price: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                    {editDraft.sale_price && editDraft.sqft && editDraft.sqft > 0
                      ? `$${Math.round(editDraft.sale_price / editDraft.sqft)}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={saveEdit}
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={cancelEdit}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={comp.id}>
                  <TableCell>
                    {comp.mls_link ? (
                      <a
                        href={
                          comp.mls_link.startsWith('http')
                            ? comp.mls_link
                            : `https://${comp.mls_link}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Link
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {comp.address || '—'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {comp.beds ?? '—'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {comp.baths ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {comp.sqft ? comp.sqft.toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {comp.sale_date ? formatDate(comp.sale_date, { short: true }) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums font-medium">
                    {comp.sale_price ? formatCurrency(comp.sale_price) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {comp.price_per_sqft
                      ? `$${comp.price_per_sqft.toLocaleString()}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(comp)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleDelete(comp.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            )}

            {/* Add new row */}
            {addingNew && (
              <TableRow className="bg-muted/30">
                <TableCell>
                  <Input
                    className="h-8 text-xs"
                    value={draft.mls_link ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, mls_link: e.target.value })
                    }
                    placeholder="MLS #"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 text-xs"
                    value={draft.address ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, address: e.target.value })
                    }
                    placeholder="123 Main St"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="h-8 w-14 text-center text-xs"
                    value={draft.beds ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        beds: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="3"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="h-8 w-14 text-center text-xs"
                    value={draft.baths ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        baths: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="2"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="h-8 w-20 text-right text-xs"
                    value={draft.sqft ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        sqft: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="1800"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={draft.sale_date ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, sale_date: e.target.value || null })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="h-8 w-28 text-right text-xs"
                    value={draft.sale_price ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        sale_price: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    placeholder="350000"
                  />
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {draft.sale_price && draft.sqft && draft.sqft > 0
                    ? `$${Math.round(draft.sale_price / draft.sqft)}`
                    : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleAdd}
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setAddingNew(false)
                        setDraft(blankComp(opportunityId))
                      }}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>

          {/* Summary footer */}
          {comps.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="font-semibold">
                  Summary ({comps.length} comps)
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {summary.avgSqft
                    ? `${summary.avgSqft.toLocaleString()} avg`
                    : '—'}
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold tabular-nums">
                  {summary.medianPrice
                    ? `${formatCurrency(summary.medianPrice)} med`
                    : '—'}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {summary.avgPpsf ? `$${summary.avgPpsf} avg` : '—'}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  )
}
