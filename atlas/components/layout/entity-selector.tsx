"use client"

import { Building2, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils/format"
import { useUIStore } from "@/lib/stores/ui-store"
import { useEntities } from "@/lib/hooks/use-entity"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function EntitySelector() {
  const { selectedEntityId, setSelectedEntityId } = useUIStore()
  const { data } = useEntities({ limit: 50 })
  const entities = data?.data ?? []

  const selectedEntity = selectedEntityId
    ? entities.find((e) => e.id === selectedEntityId)
    : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded border border-white/20 bg-white/10 px-2.5 py-1 text-[12px] text-white/80 transition-colors hover:bg-white/15 max-w-[180px]"
        >
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {selectedEntity ? selectedEntity.name : "All Entities"}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Filter by Entity
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setSelectedEntityId(null)}
        >
          <span className="flex-1">All Entities</span>
          {!selectedEntityId && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {entities.map((entity) => (
          <DropdownMenuItem
            key={entity.id}
            className="cursor-pointer"
            onClick={() => setSelectedEntityId(entity.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm">{entity.name}</p>
              {entity.use_type && (
                <p className="text-[10px] text-muted-foreground capitalize">
                  {entity.use_type.replace(/_/g, " ")}
                </p>
              )}
            </div>
            {selectedEntityId === entity.id && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        {entities.length === 0 && (
          <DropdownMenuItem disabled className="text-muted-foreground text-xs">
            No entities found
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
