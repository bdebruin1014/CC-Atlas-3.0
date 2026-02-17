"use client"

import * as React from "react"
import { useState, useMemo, useCallback } from "react"
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/format"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColumnDef<T> {
  key: string
  header: string
  cell?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  searchKey?: string
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  isLoading?: boolean
  emptyMessage?: string
  selectable?: boolean
  onSelectionChange?: (selected: T[]) => void
  pageSize?: number
}

type SortDirection = "asc" | "desc" | null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-border">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  onRowClick,
  isLoading = false,
  emptyMessage = "No results found.",
  selectable = false,
  onSelectionChange,
  pageSize: initialPageSize,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize ?? 10)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  // ---- Filtering ----
  const filteredData = useMemo(() => {
    if (!searchQuery || !searchKey) return data
    const query = searchQuery.toLowerCase()
    return data.filter((row) => {
      const value = getNestedValue(row, searchKey)
      if (value == null) return false
      return String(value).toLowerCase().includes(query)
    })
  }, [data, searchQuery, searchKey])

  // ---- Sorting ----
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData
    return [...filteredData].sort((a, b) => {
      const aVal = getNestedValue(a, sortKey)
      const bVal = getNestedValue(b, sortKey)
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      if (aStr < bStr) return sortDirection === "asc" ? -1 : 1
      if (aStr > bStr) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [filteredData, sortKey, sortDirection])

  // ---- Pagination ----
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, safePage, pageSize])

  // ---- Reset page on filter/sort change ----
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortKey, sortDirection, pageSize])

  // ---- Sort toggle ----
  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        if (sortDirection === "asc") setSortDirection("desc")
        else if (sortDirection === "desc") {
          setSortKey(null)
          setSortDirection(null)
        }
      } else {
        setSortKey(key)
        setSortDirection("asc")
      }
    },
    [sortKey, sortDirection]
  )

  // ---- Selection ----
  const allOnPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((_, idx) => {
      const globalIdx = (safePage - 1) * pageSize + idx
      return selectedRows.has(globalIdx)
    })

  const handleSelectAll = useCallback(() => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      const start = (safePage - 1) * pageSize
      if (allOnPageSelected) {
        paginatedData.forEach((_, idx) => next.delete(start + idx))
      } else {
        paginatedData.forEach((_, idx) => next.add(start + idx))
      }
      return next
    })
  }, [safePage, pageSize, paginatedData, allOnPageSelected])

  const handleSelectRow = useCallback(
    (globalIndex: number) => {
      setSelectedRows((prev) => {
        const next = new Set(prev)
        if (next.has(globalIndex)) next.delete(globalIndex)
        else next.add(globalIndex)
        return next
      })
    },
    []
  )

  // ---- Notify parent of selection changes ----
  React.useEffect(() => {
    if (onSelectionChange) {
      const selected = Array.from(selectedRows)
        .filter((idx) => idx < sortedData.length)
        .map((idx) => sortedData[idx])
      onSelectionChange(selected)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRows])

  // ---- Render sort icon ----
  const renderSortIcon = (key: string) => {
    if (sortKey !== key) return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
    if (sortDirection === "asc") return <ChevronUp className="ml-1 h-3.5 w-3.5" />
    return <ChevronDown className="ml-1 h-3.5 w-3.5" />
  }

  return (
    <div className="w-full space-y-4">
      {/* Toolbar: search + page size */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {searchKey && (
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-input"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-muted-foreground",
                    col.sortable && "cursor-pointer select-none hover:text-foreground",
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center">
                    {col.header}
                    {col.sortable && renderSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton
                columns={columns.length + (selectable ? 1 : 0)}
                rows={pageSize}
              />
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const globalIdx = (safePage - 1) * pageSize + idx
                const isSelected = selectedRows.has(globalIdx)
                return (
                  <tr
                    key={globalIdx}
                    className={cn(
                      "border-b border-border transition-colors",
                      onRowClick && "cursor-pointer hover:bg-muted/50",
                      isSelected && "bg-muted/30"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleSelectRow(globalIdx)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-input"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-3", col.className)}>
                        {col.cell
                          ? col.cell(row)
                          : String(getNestedValue(row, col.key) ?? "")}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectable && selectedRows.size > 0
            ? `${selectedRows.size} of ${sortedData.length} row(s) selected`
            : `Showing ${sortedData.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-${Math.min(
                safePage * pageSize,
                sortedData.length
              )} of ${sortedData.length}`}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
