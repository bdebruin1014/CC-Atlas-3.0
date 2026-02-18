"use client"

import { Loader2, Check, AlertCircle } from "lucide-react"
import type { AutoSaveStatus } from "@/lib/hooks/use-auto-save"
import { cn } from "@/lib/utils/format"

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus
  error?: string
  onRetry?: () => void
  className?: string
}

export function AutoSaveIndicator({
  status,
  error,
  onRetry,
  className,
}: AutoSaveIndicatorProps) {
  if (status === "idle") return null

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-opacity duration-300",
        status === "saving" && "text-muted-foreground",
        status === "saved" && "text-green-600",
        status === "error" && "text-destructive",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3 w-3" />
          <span>Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>{error || "Error saving"}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-1 underline hover:no-underline"
            >
              Retry
            </button>
          )}
        </>
      )}
    </div>
  )
}
