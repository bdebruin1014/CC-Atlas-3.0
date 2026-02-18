"use client"

import { useState } from "react"
import {
  Plus,
  AlertTriangle,
  MapPin,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils/format"
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useProjectLots,
  LOT_STATUSES,
  getLotStatusColor,
  type LotStatus,
  type ProjectLot,
} from "@/lib/hooks/use-projects"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LotTableProps {
  projectId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LotTable({ projectId }: LotTableProps) {
  const { lots, loading, error, refetch, addLot, updateLot } = useProjectLots(projectId)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [adding, setAdding] = useState(false)

  const [newLot, setNewLot] = useState({
    lot_number: "",
    width: "",
    depth: "",
    sqft: "",
    status: "raw" as LotStatus,
    assigned_floor_plan_id: "",
    upgrade_package: "",
    list_price: "",
    sale_price: "",
    phase: "",
  })

  // Summary counts
  const statusCounts = LOT_STATUSES.reduce(
    (acc, s) => ({
      ...acc,
      [s.value]: lots.filter((l) => l.status === s.value).length,
    }),
    {} as Record<LotStatus, number>
  )

  const handleAddLot = async () => {
    if (!newLot.lot_number) return
    setAdding(true)

    try {
      await addLot({
        project_id: projectId,
        lot_number: newLot.lot_number,
        width: newLot.width ? parseFloat(newLot.width) : null,
        depth: newLot.depth ? parseFloat(newLot.depth) : null,
        sqft: newLot.sqft ? parseFloat(newLot.sqft) : null,
        status: newLot.status,
        assigned_floor_plan_id: newLot.assigned_floor_plan_id || null,
        upgrade_package: newLot.upgrade_package || null,
        list_price: newLot.list_price ? parseFloat(newLot.list_price) : null,
        sale_price: newLot.sale_price ? parseFloat(newLot.sale_price) : null,
        buyer_contact_id: null,
        phase: newLot.phase || null,
      } as any)
      setShowAddDialog(false)
      setNewLot({
        lot_number: "",
        width: "",
        depth: "",
        sqft: "",
        status: "raw",
        assigned_floor_plan_id: "",
        upgrade_package: "",
        list_price: "",
        sale_price: "",
        phase: "",
      })
    } catch {
      // error handled by mutation
    } finally {
      setAdding(false)
    }
  }

  const handleStatusChange = async (lotId: string, newStatus: LotStatus) => {
    await updateLot(lotId, { status: newStatus })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 p-6">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="text-sm text-destructive">{error}</div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm font-medium">
          {lots.length} Total Lot{lots.length !== 1 ? "s" : ""}
        </div>
        <div className="flex flex-wrap gap-2">
          {LOT_STATUSES.map((s) => (
            <Badge
              key={s.value}
              variant="secondary"
              className={cn("text-xs", getLotStatusColor(s.value))}
            >
              {s.label}: {statusCounts[s.value] ?? 0}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lots</CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Lot
          </Button>
        </CardHeader>
        <CardContent>
          {lots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MapPin className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-1 text-sm font-semibold">No lots added</h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Add lots to track development progress.
              </p>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add First Lot
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot #</TableHead>
                  <TableHead className="text-right">Width</TableHead>
                  <TableHead className="text-right">Depth</TableHead>
                  <TableHead className="text-right">SF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Floor Plan</TableHead>
                  <TableHead>Upgrade</TableHead>
                  <TableHead className="text-right">List Price</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead>Phase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell className="font-medium">{lot.lot_number}</TableCell>
                    <TableCell className="text-right">
                      {lot.width != null ? `${lot.width}'` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {lot.depth != null ? `${lot.depth}'` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {lot.sqft != null
                        ? lot.sqft.toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lot.status}
                        onValueChange={(val) =>
                          handleStatusChange(lot.id, val as LotStatus)
                        }
                      >
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              getLotStatusColor(lot.status)
                            )}
                          >
                            {LOT_STATUSES.find((s) => s.value === lot.status)?.label ?? lot.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {LOT_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{lot.assigned_floor_plan_id ?? "—"}</TableCell>
                    <TableCell>{lot.upgrade_package ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {lot.list_price != null
                        ? formatCurrency(lot.list_price)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {lot.sale_price != null
                        ? formatCurrency(lot.sale_price)
                        : "—"}
                    </TableCell>
                    <TableCell>{lot.phase ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={7} className="font-medium">
                    Totals ({lots.length} lots)
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(
                      lots.reduce((s, l) => s + (l.list_price ?? 0), 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(
                      lots.reduce((s, l) => s + (l.sale_price ?? 0), 0)
                    )}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Lot Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Lot</DialogTitle>
            <DialogDescription>
              Add a new lot to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lot_number">Lot Number *</Label>
                <Input
                  id="lot_number"
                  value={newLot.lot_number}
                  onChange={(e) =>
                    setNewLot({ ...newLot, lot_number: e.target.value })
                  }
                  placeholder="e.g. 001"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newLot.status}
                  onValueChange={(val) =>
                    setNewLot({ ...newLot, status: val as LotStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lot_width">Width (ft)</Label>
                <Input
                  id="lot_width"
                  type="number"
                  step="0.1"
                  value={newLot.width}
                  onChange={(e) =>
                    setNewLot({ ...newLot, width: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot_depth">Depth (ft)</Label>
                <Input
                  id="lot_depth"
                  type="number"
                  step="0.1"
                  value={newLot.depth}
                  onChange={(e) =>
                    setNewLot({ ...newLot, depth: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot_sf">Square Feet</Label>
                <Input
                  id="lot_sf"
                  type="number"
                  value={newLot.sqft}
                  onChange={(e) =>
                    setNewLot({ ...newLot, sqft: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lot_floor_plan">Floor Plan ID</Label>
                <Input
                  id="lot_floor_plan"
                  value={newLot.assigned_floor_plan_id}
                  onChange={(e) =>
                    setNewLot({ ...newLot, assigned_floor_plan_id: e.target.value })
                  }
                  placeholder="Floor plan ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot_upgrade">Upgrade Package</Label>
                <Input
                  id="lot_upgrade"
                  value={newLot.upgrade_package}
                  onChange={(e) =>
                    setNewLot({ ...newLot, upgrade_package: e.target.value })
                  }
                  placeholder="e.g. Premium"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lot_list_price">List Price</Label>
                <Input
                  id="lot_list_price"
                  type="number"
                  step="0.01"
                  value={newLot.list_price}
                  onChange={(e) =>
                    setNewLot({ ...newLot, list_price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot_sale_price">Sale Price</Label>
                <Input
                  id="lot_sale_price"
                  type="number"
                  step="0.01"
                  value={newLot.sale_price}
                  onChange={(e) =>
                    setNewLot({ ...newLot, sale_price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot_phase">Phase</Label>
              <Input
                id="lot_phase"
                value={newLot.phase}
                onChange={(e) =>
                  setNewLot({ ...newLot, phase: e.target.value })
                }
                placeholder="e.g. Phase 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddLot}
              disabled={!newLot.lot_number || adding}
            >
              {adding ? "Adding..." : "Add Lot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
