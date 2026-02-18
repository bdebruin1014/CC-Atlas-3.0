"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils/format"
import { createClient } from "@/lib/supabase/client"
import {
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_TYPE_COLORS,
  getStagesForType,
  getStageDefinition,
  type Opportunity,
  type OpportunityType,
} from "@/lib/types/opportunities"
import { toast } from "@/lib/hooks/use-toast"
import { ConversionDialog } from "@/components/opportunities/conversion-dialog"
import type { ProjectType } from "@/lib/hooks/use-projects"
import {
  ArrowLeft,
  DollarSign,
  FolderUp,
  Archive,
  Trash2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"
import { useTabNavigation } from "@/lib/hooks/use-tab-navigation"

// ---------------------------------------------------------------------------
// Context for sharing opportunity data across sub-routes
// ---------------------------------------------------------------------------

export const OpportunityContext = React.createContext<{
  opportunity: Opportunity | null
  loading: boolean
  refetch: () => void
}>({ opportunity: null, loading: true, refetch: () => {} })

export function useOpportunityContext() {
  return React.useContext(OpportunityContext)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | undefined | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function OpportunityDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [converting, setConverting] = useState(false)

  const fetchOpportunity = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("opportunities")
        .select(
          "*, assigned_user:profiles!opportunities_assigned_to_fkey(id, full_name, avatar_url), entity:entities!opportunities_owner_entity_id_fkey(id, name), floor_plan:floor_plans!opportunities_floor_plan_id_fkey(id, name, sqft, base_cost)"
        )
        .eq("id", id)
        .single()

      if (error) throw error
      setOpportunity(data as unknown as Opportunity)
    } catch {
      toast({
        title: "Error",
        description: "Failed to load opportunity.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOpportunity()
  }, [fetchOpportunity])

  // Register open-records tab
  useTabNavigation({
    id,
    label: opportunity?.name || opportunity?.address_street || "Loading...",
    module: "opportunity",
  })

  // ---- Actions ----

  const handleArchive = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("opportunities")
        .update({ archived: true } as any)
        .eq("id", id)

      if (error) throw error
      toast({ title: "Opportunity Archived" })
      router.push("/opportunities")
    } catch {
      toast({
        title: "Error",
        description: "Failed to archive opportunity.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("opportunities")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast({ title: "Opportunity Deleted" })
      router.push("/opportunities")
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete opportunity.",
        variant: "destructive",
      })
    }
  }

  const handleConvert = async (data: {
    project_name: string
    project_type: ProjectType
    owner_entity_id: string | null
    builder_entity_id: string | null
  }) => {
    setConverting(true)
    try {
      const res = await fetch(`/api/opportunities/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Conversion failed")
      }

      const { data: result } = await res.json()

      toast({
        title: "Success",
        description: "Opportunity converted to project successfully",
      })

      setShowConvertDialog(false)
      router.push(`/projects/${result.project_id}`)
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to convert opportunity.",
        variant: "destructive",
      })
    } finally {
      setConverting(false)
    }
  }

  // ---- Loading ----
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Opportunity not found.</p>
        <Link href="/opportunities">
          <Button variant="link" className="mt-2">
            Back to Pipeline
          </Button>
        </Link>
      </div>
    )
  }

  const stages = getStagesForType(opportunity.type)
  const currentStage = getStageDefinition(
    opportunity.type,
    (opportunity as any).stage ?? opportunity.current_stage
  )
  const currentStageIndex = stages.findIndex(
    (s) => s.id === ((opportunity as any).stage ?? opportunity.current_stage)
  )
  const typeColor =
    OPPORTUNITY_TYPE_COLORS[opportunity.type] ?? "#6b7280"
  const typeLabel =
    OPPORTUNITY_TYPE_LABELS[opportunity.type] ?? opportunity.type

  return (
    <OpportunityContext.Provider
      value={{ opportunity, loading, refetch: fetchOpportunity }}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {opportunity.name ||
                  (opportunity as any).address_line1 ||
                  opportunity.address_street ||
                  "Untitled"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                style={{
                  backgroundColor: `${typeColor}15`,
                  color: typeColor,
                  borderColor: `${typeColor}30`,
                }}
              >
                {typeLabel}
              </Badge>
              {currentStage && (
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: `${currentStage.color}15`,
                    color: currentStage.color,
                    borderColor: `${currentStage.color}40`,
                  }}
                >
                  {currentStage.label}
                </Badge>
              )}
              {opportunity.assigned_user && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage
                      src={
                        opportunity.assigned_user.avatar_url ?? undefined
                      }
                    />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(opportunity.assigned_user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {opportunity.assigned_user.full_name}
                  </span>
                </div>
              )}
              {opportunity.entity && (
                <span className="text-sm text-muted-foreground">
                  | {opportunity.entity.name}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/opportunities/${id}/deal-analyzer`}>
              <Button variant="outline" size="sm">
                <DollarSign className="mr-1.5 h-4 w-4" />
                Deal Analyzer
              </Button>
            </Link>
            {opportunity.status === "converted" &&
            opportunity.converted_to_project_id ? (
              <Link
                href={`/projects/${opportunity.converted_to_project_id}`}
              >
                <Badge
                  className="cursor-pointer gap-1.5 px-3 py-1.5"
                  style={{
                    backgroundColor: "#1a563215",
                    color: "#1a5632",
                    borderColor: "#1a563240",
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Converted
                  <ExternalLink className="h-3 w-3" />
                </Badge>
              </Link>
            ) : (
              (() => {
                const underContractIdx = stages.findIndex(
                  (s) => s.id === "under_contract"
                )
                const isClosable =
                  underContractIdx >= 0 &&
                  currentStageIndex >= underContractIdx
                return isClosable ? (
                  <Button
                    size="sm"
                    onClick={() => setShowConvertDialog(true)}
                    style={{ backgroundColor: "#1a5632" }}
                    className="text-white hover:opacity-90"
                  >
                    <FolderUp className="mr-1.5 h-4 w-4" />
                    Convert to Project
                  </Button>
                ) : null
              })()
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
            >
              <Archive className="mr-1.5 h-4 w-4" />
              Archive
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="mr-1.5 h-4 w-4 text-destructive" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Opportunity?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    this opportunity and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Stage progress bar */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-1">
            {stages.map((stage, idx) => {
              const isComplete = idx < currentStageIndex
              const isCurrent = idx === currentStageIndex
              return (
                <div key={stage.id} className="flex flex-1 items-center">
                  <div className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={cn(
                        "h-2 w-full rounded-full transition-all",
                        isComplete && "bg-primary",
                        isCurrent &&
                          "bg-primary ring-2 ring-primary/30 ring-offset-1",
                        !isComplete && !isCurrent && "bg-muted"
                      )}
                      style={
                        isCurrent
                          ? { backgroundColor: stage.color }
                          : isComplete
                          ? { backgroundColor: stage.color }
                          : {}
                      }
                    />
                    <span
                      className={cn(
                        "text-[10px] leading-tight text-center",
                        isCurrent
                          ? "font-semibold text-foreground"
                          : isComplete
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50"
                      )}
                    >
                      {stage.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sub-route content */}
        {children}

        {/* Convert to Project Dialog */}
        <ConversionDialog
          open={showConvertDialog}
          onOpenChange={setShowConvertDialog}
          opportunity={opportunity}
          onConvert={handleConvert}
          converting={converting}
        />
      </div>
    </OpportunityContext.Provider>
  )
}
