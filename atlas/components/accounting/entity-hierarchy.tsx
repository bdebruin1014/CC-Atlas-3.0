"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, ChevronDown, Building2, Landmark, Briefcase, PiggyBank } from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import type { Entity, EntityUseType } from "@/lib/types/accounting"
import { ENTITY_USE_TYPE_LABELS, ENTITY_LEGAL_TYPE_LABELS } from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EntityHierarchyProps {
  entities: Entity[]
  onEntityClick?: (entity: Entity) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTree(entities: Entity[]): Entity[] {
  const map = new Map<string, Entity>()
  const roots: Entity[] = []

  entities.forEach((e) => {
    map.set(e.id, { ...e, children: [] })
  })

  map.forEach((entity) => {
    if (entity.parent_entity_id && map.has(entity.parent_entity_id)) {
      const parent = map.get(entity.parent_entity_id)!
      parent.children = parent.children || []
      parent.children.push(entity)
    } else {
      roots.push(entity)
    }
  })

  return roots
}

function getUseTypeIcon(useType: EntityUseType) {
  switch (useType) {
    case "holding_company":
      return <Building2 className="h-4 w-4 text-purple-500" />
    case "operating_company":
      return <Briefcase className="h-4 w-4 text-blue-500" />
    case "single_purpose_entity":
      return <Landmark className="h-4 w-4 text-emerald-500" />
    case "fund_syndication":
      return <PiggyBank className="h-4 w-4 text-amber-500" />
    default:
      return <Building2 className="h-4 w-4 text-gray-500" />
  }
}

function getUseTypeBadgeClass(useType: EntityUseType): string {
  switch (useType) {
    case "holding_company":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100"
    case "operating_company":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "single_purpose_entity":
      return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
    case "fund_syndication":
      return "bg-amber-100 text-amber-800 hover:bg-amber-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

// ---------------------------------------------------------------------------
// Tree Node
// ---------------------------------------------------------------------------

function EntityNode({
  entity,
  depth,
  onEntityClick,
}: {
  entity: Entity
  depth: number
  onEntityClick?: (entity: Entity) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = entity.children && entity.children.length > 0
  const router = useRouter()

  const handleClick = () => {
    if (onEntityClick) {
      onEntityClick(entity)
    } else {
      router.push(`/accounting/entities/${entity.id}`)
    }
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-muted/50 cursor-pointer group",
          depth > 0 && "ml-6"
        )}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Icon */}
        {getUseTypeIcon(entity.use_type)}

        {/* Name & Badges */}
        <div className="flex flex-1 items-center gap-2 min-w-0" onClick={handleClick}>
          <span className="font-medium text-sm truncate">{entity.name}</span>
          <Badge
            variant="secondary"
            className={cn("text-[10px] px-1.5 py-0 shrink-0", getUseTypeBadgeClass(entity.use_type))}
          >
            {ENTITY_USE_TYPE_LABELS[entity.use_type]}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {ENTITY_LEGAL_TYPE_LABELS[entity.legal_type]}
          </Badge>
          {entity.ein && (
            <span className="text-xs text-muted-foreground shrink-0">
              EIN: ***-**-{entity.ein.slice(-4)}
            </span>
          )}
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0 shrink-0 ml-auto",
              entity.status === "active"
                ? "bg-green-100 text-green-800 hover:bg-green-100"
                : entity.status === "dissolved"
                ? "bg-red-100 text-red-800 hover:bg-red-100"
                : "bg-gray-100 text-gray-600 hover:bg-gray-100"
            )}
          >
            {entity.status}
          </Badge>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-0 top-0 bottom-0 border-l border-border"
            style={{ marginLeft: `${(depth + 1) * 24 + 22}px` }}
          />
          {entity.children!.map((child) => (
            <EntityNode
              key={child.id}
              entity={child}
              depth={depth + 1}
              onEntityClick={onEntityClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EntityHierarchy
// ---------------------------------------------------------------------------

export function EntityHierarchy({ entities, onEntityClick, className }: EntityHierarchyProps) {
  const tree = useMemo(() => buildTree(entities), [entities])

  if (entities.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-muted-foreground", className)}>
        <Building2 className="h-10 w-10 mb-3 opacity-50" />
        <p className="text-sm">No entities found</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      {tree.map((entity) => (
        <EntityNode
          key={entity.id}
          entity={entity}
          depth={0}
          onEntityClick={onEntityClick}
        />
      ))}
    </div>
  )
}
