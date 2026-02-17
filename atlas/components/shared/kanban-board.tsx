"use client"

import * as React from "react"
import { useState, useCallback, useRef } from "react"
import { cn } from "@/lib/utils/format"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KanbanColumn<T> {
  id: string
  title: string
  items: T[]
  color?: string
}

export interface KanbanBoardProps<T extends { id: string | number }> {
  columns: KanbanColumn<T>[]
  onCardMove: (item: T, fromColumnId: string, toColumnId: string) => void
  renderCard: (item: T) => React.ReactNode
  isLoading?: boolean
  columnValueAccessor?: (item: T) => number
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function KanbanSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: columnCount || 4 }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="flex min-w-[280px] flex-1 flex-col rounded-lg border border-border bg-muted/30"
        >
          <div className="flex items-center justify-between p-3">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-5 w-8 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex-1 space-y-2 p-3 pt-0">
            {Array.from({ length: 3 }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="h-24 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanBoard
// ---------------------------------------------------------------------------

export function KanbanBoard<T extends { id: string | number }>({
  columns,
  onCardMove,
  renderCard,
  isLoading = false,
  columnValueAccessor,
}: KanbanBoardProps<T>) {
  const [dragState, setDragState] = useState<{
    item: T
    fromColumnId: string
  } | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = useState<string | null>(null)
  const dragCounterRef = useRef<Record<string, number>>({})

  // ---- Drag handlers ----

  const handleDragStart = useCallback(
    (e: React.DragEvent, item: T, columnId: string) => {
      e.dataTransfer.effectAllowed = "move"
      // Store minimal data for HTML5 drag
      e.dataTransfer.setData("text/plain", String(item.id))
      setDragState({ item, fromColumnId: columnId })
    },
    []
  )

  const handleDragEnd = useCallback(() => {
    setDragState(null)
    setDropTargetColumnId(null)
    dragCounterRef.current = {}
  }, [])

  const handleDragEnterColumn = useCallback(
    (columnId: string) => {
      if (!dragCounterRef.current[columnId]) {
        dragCounterRef.current[columnId] = 0
      }
      dragCounterRef.current[columnId]++
      setDropTargetColumnId(columnId)
    },
    []
  )

  const handleDragLeaveColumn = useCallback(
    (columnId: string) => {
      if (dragCounterRef.current[columnId]) {
        dragCounterRef.current[columnId]--
      }
      if (dragCounterRef.current[columnId] === 0) {
        setDropTargetColumnId((prev) => (prev === columnId ? null : prev))
      }
    },
    []
  )

  const handleDragOverColumn = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
    },
    []
  )

  const handleDropOnColumn = useCallback(
    (e: React.DragEvent, toColumnId: string) => {
      e.preventDefault()
      if (dragState && dragState.fromColumnId !== toColumnId) {
        onCardMove(dragState.item, dragState.fromColumnId, toColumnId)
      }
      setDragState(null)
      setDropTargetColumnId(null)
      dragCounterRef.current = {}
    },
    [dragState, onCardMove]
  )

  // ---- Loading ----
  if (isLoading) {
    return <KanbanSkeleton columnCount={columns.length} />
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const isDropTarget = dropTargetColumnId === column.id && dragState?.fromColumnId !== column.id
        const columnTotal = columnValueAccessor
          ? column.items.reduce((sum, item) => sum + columnValueAccessor(item), 0)
          : null

        return (
          <div
            key={column.id}
            className={cn(
              "flex min-w-[280px] flex-1 flex-col rounded-lg border border-border bg-muted/20 transition-colors",
              isDropTarget && "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
            )}
            onDragEnter={() => handleDragEnterColumn(column.id)}
            onDragLeave={() => handleDragLeaveColumn(column.id)}
            onDragOver={handleDragOverColumn}
            onDrop={(e) => handleDropOnColumn(e, column.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                {column.color && (
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                )}
                <h3 className="text-sm font-semibold">{column.title}</h3>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                  {column.items.length}
                </span>
              </div>
              {columnTotal !== null && (
                <span className="text-xs font-medium text-muted-foreground">
                  ${columnTotal.toLocaleString()}
                </span>
              )}
            </div>

            {/* Column body (scrollable) */}
            <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: "calc(100vh - 280px)" }}>
              {column.items.length === 0 && (
                <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border">
                  <p className="text-xs text-muted-foreground">No items</p>
                </div>
              )}
              {column.items.map((item) => {
                const isDragging =
                  dragState?.item.id === item.id &&
                  dragState?.fromColumnId === column.id

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item, column.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "cursor-grab rounded-md border border-border bg-card p-0 shadow-sm transition-all hover:shadow-md active:cursor-grabbing",
                      isDragging && "opacity-40"
                    )}
                  >
                    {renderCard(item)}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
