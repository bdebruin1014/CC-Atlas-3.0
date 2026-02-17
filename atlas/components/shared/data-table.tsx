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
  mono?: boolean
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
        <tr key={rowIdx} className="border-b border-[#E5E7EB]">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-2">
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
    const isActiveSort = sortKey === key
    if (!isActiveSort) return <ChevronsUpDown className="ml-1 h-3 w-3 text-[#5A6B75]" />
    if (sortDirection === "asc")
      return <ChevronUp className="ml-1 h-3 w-3 text-[#1a5632]" />
    return <ChevronDown className="ml-1 h-3 w-3 text-[#1a5632]" />
  }

  // ---- Render cell value ----
  const renderCellValue = (col: ColumnDef<T>, row: T) => {
    if (col.cell) return col.cell(row)
    const value = getNestedValue(row, col.key)
    if (value == null || value === "") {
      return <span className="text-[#9CA3AF] italic">—</span>
    }
    return String(value)
  }

  // ---- Page numbers for pagination ----
  const getPageNumbers = () => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className="w-full space-y-4">
      {/* Toolbar: search + page size */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {searchKey && (
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6B75]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#5A6B75]">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 rounded border border-[#E5E7EB] bg-transparent px-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#1a5632]"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-[#E5E7EB]">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F3F4F6]">
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-[#E5E7EB]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.3px] text-[#5A6B75]",
                    col.sortable && "cursor-pointer select-none hover:text-[#1F2937]",
                    sortKey === col.key && "text-[#1a5632]",
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
                  className="px-4 py-12 text-center text-[13px] text-[#5A6B75]"
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
                      "border-b border-[#E5E7EB] transition-colors",
                      onRowClick && "cursor-pointer hover:bg-[#f9fafb]",
                      isSelected && "bg-[#f0fdf4]"
                    )}
                    style={{ height: "38px" }}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-4 py-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleSelectRow(globalIdx)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-[#E5E7EB]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-1.5 text-[13px] text-[#1F2937]",
                          col.mono && "font-mono",
                          col.className
                        )}
                      >
                        {renderCellValue(col, row)}
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
        <p className="text-[13px] text-[#5A6B75]">
          {selectable && selectedRows.size > 0
            ? `${selectedRows.size} of ${sortedData.length} row(s) selected`
            : `Showing ${sortedData.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-${Math.min(
                safePage * pageSize,
                sortedData.length
              )} of ${sortedData.length}`}
        </p>
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded text-[13px] font-medium transition-colors",
                page === safePage
                  ? "bg-[#1a5632] text-white"
                  : "text-[#1F2937] hover:bg-[#f3f4f6]"
              )}
            >
              {page}
            </button>
          ))}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
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
