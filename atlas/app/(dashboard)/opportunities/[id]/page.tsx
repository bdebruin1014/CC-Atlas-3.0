'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
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
} from '@/components/ui/alert-dialog'
import { CompsTable } from '@/components/opportunities/comps-table'
import { cn, formatCurrency, formatDate } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import {
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_TYPE_COLORS,
  getStagesForType,
  getStageDefinition,
  type Opportunity,
  type OpportunityType,
} from '@/lib/types/opportunities'
import { toast } from '@/lib/hooks/use-toast'
import { ConversionDialog } from '@/components/opportunities/conversion-dialog'
import { RecordTasksPanel, useRecordTaskCount } from '@/components/shared/record-tasks-panel'
import type { ProjectType } from '@/lib/hooks/use-projects'
import {
  ArrowLeft,
  Pencil,
  FolderUp,
  Archive,
  Trash2,
  MapPin,
  Calendar,
  DollarSign,
  Building2,
  User,
  FileText,
  Ruler,
  Droplets,
  Zap,
  Trees,
  Home,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getInitials(name: string | undefined | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && (
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value || '—'}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function OpportunityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [converting, setConverting] = useState(false)

  const taskCount = useRecordTaskCount('opportunity', id)

  const fetchOpportunity = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('opportunities')
        .select(
          '*, assigned_user:profiles!opportunities_assigned_to_fkey(id, full_name, avatar_url), entity:entities!opportunities_entity_id_fkey(id, name), floor_plan:floor_plans!opportunities_floor_plan_id_fkey(id, name, sqft, base_cost)'
        )
        .eq('id', id)
        .single()

      if (error) throw error
      setOpportunity(data as unknown as Opportunity)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load opportunity.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOpportunity()
  }, [fetchOpportunity])

  // ---- Actions ----

  const handleArchive = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('opportunities')
        .update({ archived: true } as any)
        .eq('id', id)

      if (error) throw error
      toast({ title: 'Opportunity Archived' })
      router.push('/opportunities')
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to archive opportunity.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast({ title: 'Opportunity Deleted' })
      router.push('/opportunities')
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete opportunity.',
        variant: 'destructive',
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Conversion failed')
      }

      const { data: result } = await res.json()

      toast({
        title: 'Success',
        description: 'Opportunity converted to project successfully',
      })

      setShowConvertDialog(false)
      router.push(`/projects/${result.project_id}`)
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Failed to convert opportunity.',
        variant: 'destructive',
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
  const currentStage = getStageDefinition(opportunity.type, (opportunity as any).stage ?? opportunity.current_stage)
  const currentStageIndex = stages.findIndex(
    (s) => s.id === ((opportunity as any).stage ?? opportunity.current_stage)
  )
  const typeColor =
    OPPORTUNITY_TYPE_COLORS[opportunity.type] ?? '#6b7280'
  const typeLabel =
    OPPORTUNITY_TYPE_LABELS[opportunity.type] ?? opportunity.type

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pipeline
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {opportunity.name || (opportunity as any).address_line1 || opportunity.address_street || 'Untitled'}
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
                    src={opportunity.assigned_user.avatar_url ?? undefined}
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
          {opportunity.status === 'converted' && opportunity.converted_to_project_id ? (
            <Link href={`/projects/${opportunity.converted_to_project_id}`}>
              <Badge
                className="cursor-pointer gap-1.5 px-3 py-1.5"
                style={{
                  backgroundColor: '#1a563215',
                  color: '#1a5632',
                  borderColor: '#1a563240',
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
                (s) => s.id === 'under_contract'
              )
              const isClosable =
                underContractIdx >= 0 && currentStageIndex >= underContractIdx
              return isClosable ? (
                <Button
                  size="sm"
                  onClick={() => setShowConvertDialog(true)}
                  style={{ backgroundColor: '#1a5632' }}
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
            const isClosed =
              stage.id === 'closed_won' || stage.id === 'closed_lost'

            return (
              <div key={stage.id} className="flex flex-1 items-center">
                <div className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn(
                      'h-2 w-full rounded-full transition-all',
                      isComplete && 'bg-primary',
                      isCurrent &&
                        'bg-primary ring-2 ring-primary/30 ring-offset-1',
                      !isComplete && !isCurrent && 'bg-muted'
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
                      'text-[10px] leading-tight text-center',
                      isCurrent
                        ? 'font-semibold text-foreground'
                        : isComplete
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/50'
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deal-analyzer">Deal Analyzer</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks{taskCount > 0 ? ` (${taskCount})` : ''}
          </TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* OVERVIEW TAB                                                     */}
        {/* ================================================================ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Core Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Core Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow
                  label="Address"
                  icon={<MapPin className="h-4 w-4" />}
                  value={
                    [
                      (opportunity as any).address_line1 ?? opportunity.address_street,
                      opportunity.address_city,
                      opportunity.address_state,
                      opportunity.address_zip,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—'
                  }
                />
                <InfoRow
                  label="County"
                  value={opportunity.address_county}
                />
                <InfoRow
                  label="Parcel / TMS"
                  icon={<FileText className="h-4 w-4" />}
                  value={(opportunity as any).parcel_tms ?? opportunity.parcel_tms_number}
                />
                <InfoRow
                  label="Type"
                  value={typeLabel}
                />
                <InfoRow
                  label="Source"
                  value={opportunity.source}
                />
                <InfoRow
                  label="Created"
                  icon={<Calendar className="h-4 w-4" />}
                  value={formatDate(opportunity.created_at)}
                />
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow
                  label="Projected Purchase Price"
                  icon={<DollarSign className="h-4 w-4" />}
                  value={
                    opportunity.projected_purchase_price
                      ? formatCurrency(opportunity.projected_purchase_price)
                      : '—'
                  }
                />
                <InfoRow
                  label="Projected Sale Price"
                  icon={<DollarSign className="h-4 w-4" />}
                  value={
                    opportunity.projected_sale_price
                      ? formatCurrency(opportunity.projected_sale_price)
                      : '—'
                  }
                />
                <InfoRow
                  label="Projected ARV"
                  icon={<DollarSign className="h-4 w-4" />}
                  value={
                    (opportunity as any).projected_arv
                      ? formatCurrency((opportunity as any).projected_arv)
                      : '—'
                  }
                />
                {opportunity.projected_purchase_price &&
                  opportunity.projected_sale_price && (
                    <div className="mt-3 rounded-lg bg-muted/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Estimated Gross Margin
                      </p>
                      <p className="text-lg font-bold">
                        {formatCurrency(
                          opportunity.projected_sale_price -
                            opportunity.projected_purchase_price
                        )}
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Type-specific fields */}
          {opportunity.type === 'scattered_lot' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Scattered Lot Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoRow
                    label="Zoning"
                    icon={<Building2 className="h-4 w-4" />}
                    value={(opportunity as any).zoning ?? opportunity.zoning_current}
                  />
                  <InfoRow
                    label="Build Type"
                    icon={<Home className="h-4 w-4" />}
                    value={opportunity.build_type}
                  />
                  <InfoRow
                    label="Road Type"
                    value={(opportunity as any).road_type ?? opportunity.road_surrounding}
                  />
                  <InfoRow
                    label="Road Frontage"
                    value={
                      (opportunity as any).road_frontage
                        ? `${(opportunity as any).road_frontage} ft`
                        : null
                    }
                  />
                  <InfoRow
                    label="Survey Status"
                    value={(opportunity as any).survey_status ?? (opportunity.survey_complete ? 'Complete' : 'Pending')}
                  />
                  <InfoRow
                    label="Garage Position"
                    value={opportunity.garage_position}
                  />
                  <InfoRow
                    label="Setbacks"
                    icon={<Ruler className="h-4 w-4" />}
                    value={
                      [
                        (opportunity as any).setback_front != null
                          ? `F: ${(opportunity as any).setback_front}′`
                          : null,
                        (opportunity as any).setback_rear != null
                          ? `R: ${(opportunity as any).setback_rear}′`
                          : null,
                        (opportunity as any).setback_left != null
                          ? `L: ${(opportunity as any).setback_left}′`
                          : null,
                        (opportunity as any).setback_right != null
                          ? `R: ${(opportunity as any).setback_right}′`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' | ') || null
                    }
                  />
                  <InfoRow
                    label="Lot Dimensions"
                    value={
                      [
                        opportunity.lot_width
                          ? `${opportunity.lot_width}′ W`
                          : null,
                        opportunity.lot_depth
                          ? `${opportunity.lot_depth}′ D`
                          : null,
                        opportunity.lot_sqft
                          ? `${opportunity.lot_sqft.toLocaleString()} SF`
                          : null,
                        (opportunity as any).lot_acreage ?? opportunity.total_acreage
                          ? `${(opportunity as any).lot_acreage ?? opportunity.total_acreage} AC`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' | ') || null
                    }
                  />
                  <InfoRow
                    label="Floor Plan"
                    value={
                      opportunity.floor_plan
                        ? `${opportunity.floor_plan.name} (${((opportunity.floor_plan as any).sqft ?? opportunity.floor_plan.square_footage).toLocaleString()} SF)`
                        : null
                    }
                  />
                </div>

                {/* Utility toggles */}
                <Separator className="my-4" />
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5">
                    <Droplets
                      className={cn(
                        'h-4 w-4',
                        ((opportunity as any).has_water ?? opportunity.water_available)
                          ? 'text-blue-500'
                          : 'text-muted-foreground/30'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm',
                        ((opportunity as any).has_water ?? opportunity.water_available)
                          ? 'text-foreground'
                          : 'text-muted-foreground/50 line-through'
                      )}
                    >
                      Water
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trees
                      className={cn(
                        'h-4 w-4',
                        ((opportunity as any).has_sewer ?? opportunity.sewer_available)
                          ? 'text-green-500'
                          : 'text-muted-foreground/30'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm',
                        ((opportunity as any).has_sewer ?? opportunity.sewer_available)
                          ? 'text-foreground'
                          : 'text-muted-foreground/50 line-through'
                      )}
                    >
                      Sewer
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap
                      className={cn(
                        'h-4 w-4',
                        ((opportunity as any).has_electric ?? opportunity.electric_available)
                          ? 'text-yellow-500'
                          : 'text-muted-foreground/30'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm',
                        ((opportunity as any).has_electric ?? opportunity.electric_available)
                          ? 'text-foreground'
                          : 'text-muted-foreground/50 line-through'
                      )}
                    >
                      Electric
                    </span>
                  </div>
                  {((opportunity as any).historic_overlay ?? opportunity.historic_district) && (
                    <Badge variant="outline" className="text-xs">
                      Historic Overlay
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {opportunity.type === 'lot_development' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Lot Development Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoRow
                    label="Total Acreage"
                    value={
                      opportunity.total_acreage
                        ? `${opportunity.total_acreage} AC`
                        : null
                    }
                  />
                  <InfoRow
                    label="Estimated Lots"
                    value={(opportunity as any).estimated_lots ?? opportunity.estimated_total_lots}
                  />
                  <InfoRow
                    label="Rezoning Required"
                    value={
                      opportunity.zoning_required ? 'Yes' : 'No'
                    }
                  />
                  <InfoRow
                    label="Preliminary Plat Status"
                    value={opportunity.preliminary_plat_status}
                  />
                  <InfoRow
                    label="Infrastructure Estimate"
                    value={
                      ((opportunity as any).infrastructure_estimate ?? opportunity.infrastructure_scope_estimate)
                        ? formatCurrency((opportunity as any).infrastructure_estimate ?? opportunity.infrastructure_scope_estimate)
                        : null
                    }
                  />
                  <InfoRow
                    label="Target Builders"
                    value={opportunity.target_builders}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                {[
                  {
                    label: 'Offer Date',
                    value: (opportunity as any).date_offer ?? opportunity.date_identified,
                  },
                  {
                    label: 'Contract Date',
                    value: (opportunity as any).date_contract ?? opportunity.date_under_contract,
                  },
                  {
                    label: 'DD Expiration',
                    value: (opportunity as any).date_dd_expiration ?? opportunity.due_diligence_deadline,
                  },
                  {
                    label: 'Closing Date',
                    value: (opportunity as any).date_closing ?? opportunity.projected_close_date,
                  },
                ].map((d) => (
                  <div
                    key={d.label}
                    className={cn(
                      'rounded-lg border border-border p-3 text-center min-w-[140px]',
                      d.value ? 'border-border' : 'border-dashed'
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {d.label}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {d.value ? formatDate(d.value) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comps Table */}
          <CompsTable opportunityId={id} />
        </TabsContent>

        {/* ================================================================ */}
        {/* DEAL ANALYZER TAB                                                */}
        {/* ================================================================ */}
        <TabsContent value="deal-analyzer">
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Open the full deal analyzer for detailed financial modeling.
            </p>
            <Link href={`/opportunities/${id}/deal-analyzer`}>
              <Button>
                <DollarSign className="mr-2 h-4 w-4" />
                Open Deal Analyzer
              </Button>
            </Link>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* WORKFLOW TAB                                                      */}
        {/* ================================================================ */}
        <TabsContent value="workflow">
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              View and manage the workflow milestones and tasks for this
              opportunity.
            </p>
            <Link href={`/opportunities/${id}/workflow`}>
              <Button variant="outline">Open Workflow View</Button>
            </Link>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* CONTACTS TAB                                                     */}
        {/* ================================================================ */}
        <TabsContent value="contacts">
          <ContactsTab opportunityId={id} />
        </TabsContent>

        {/* ================================================================ */}
        {/* DOCUMENTS TAB                                                    */}
        {/* ================================================================ */}
        <TabsContent value="documents">
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">
              Document management coming soon.
            </p>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* NOTES TAB                                                        */}
        {/* ================================================================ */}
        <TabsContent value="notes">
          <NotesTab opportunityId={id} initialNotes={(opportunity as any).notes ?? null} />
        </TabsContent>

        {/* ================================================================ */}
        {/* TASKS TAB                                                        */}
        {/* ================================================================ */}
        <TabsContent value="tasks">
          <RecordTasksPanel
            recordType="opportunity"
            recordId={id}
            recordName={opportunity.name || (opportunity as any).address_line1 || opportunity.address_street || 'Opportunity'}
            recordUrl={`/opportunities/${id}`}
          />
        </TabsContent>

        {/* ================================================================ */}
        {/* ACTIVITY TAB                                                     */}
        {/* ================================================================ */}
        <TabsContent value="activity">
          <ActivityTab opportunityId={id} />
        </TabsContent>
      </Tabs>

      {/* Convert to Project Dialog */}
      {opportunity && (
        <ConversionDialog
          open={showConvertDialog}
          onOpenChange={setShowConvertDialog}
          opportunity={opportunity}
          onConvert={handleConvert}
          converting={converting}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contacts Tab (inline sub-component)
// ---------------------------------------------------------------------------

function ContactsTab({ opportunityId }: { opportunityId: string }) {
  const [contacts, setContacts] = useState<
    {
      id: string
      contact_id: string
      role_on_record: string | null
      contact: {
        id: string
        first_name: string
        last_name: string
        company: string | null
        email: string | null
        phone: string | null
      }
    }[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from('contact_assignments')
        .select(
          'id, contact_id, role_on_record, contact:contacts(id, first_name, last_name, company, email, phone)'
        )
        .eq('record_type', 'opportunity')
        .eq('record_id', opportunityId)

      setContacts((data as unknown as typeof contacts) ?? [])
      setLoading(false)
    }
    fetch()
  }, [opportunityId])

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <User className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">
          No contacts assigned to this opportunity yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 py-4">
      {contacts.map((ca) => (
        <Card key={ca.id}>
          <CardContent className="flex items-center gap-4 py-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {getInitials(`${ca.contact.first_name} ${ca.contact.last_name}`)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium">
                {ca.contact.first_name} {ca.contact.last_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {[ca.role_on_record, ca.contact.company]
                  .filter(Boolean)
                  .join(' - ')}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              {ca.contact.email && <p>{ca.contact.email}</p>}
              {ca.contact.phone && <p>{ca.contact.phone}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notes Tab (inline sub-component)
// ---------------------------------------------------------------------------

function NotesTab({
  opportunityId,
  initialNotes,
}: {
  opportunityId: string
  initialNotes: string | null
}) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('opportunities')
        .update({ notes } as any)
        .eq('id', opportunityId)

      if (error) throw error
      toast({ title: 'Notes Saved' })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save notes.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 py-4">
      <textarea
        className="min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes about this opportunity..."
      />
      <Button onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Notes'}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Activity Tab (inline sub-component)
// ---------------------------------------------------------------------------

function ActivityTab({ opportunityId }: { opportunityId: string }) {
  const [activities, setActivities] = useState<
    {
      id: string
      action: string
      description: string | null
      created_at: string
      user?: { full_name: string } | null
    }[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from('activity_log')
        .select('id, action, description, created_at, user:profiles(full_name)')
        .eq('record_type', 'opportunity')
        .eq('record_id', opportunityId)
        .order('created_at', { ascending: false })
        .limit(50)

      setActivities((data as unknown as typeof activities) ?? [])
      setLoading(false)
    }
    fetch()
  }, [opportunityId])

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Calendar className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">
          No activity recorded yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0 py-4">
      {activities.map((act, idx) => (
        <div
          key={act.id}
          className="flex gap-4 border-l-2 border-border pb-6 pl-4 last:pb-0"
        >
          <div className="flex-1">
            <p className="text-sm font-medium">{act.action}</p>
            {act.description && (
              <p className="text-sm text-muted-foreground">
                {act.description}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {act.user?.full_name ? `${act.user.full_name} - ` : ''}
              {formatDate(act.created_at, { includeTime: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
