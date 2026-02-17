'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { useEntities, type ProjectType, PROJECT_TYPES } from '@/lib/hooks/use-projects'
import type { Opportunity, OpportunityType } from '@/lib/types/opportunities'
import { MapPin, DollarSign, Building2, Calendar } from 'lucide-react'

// ---------------------------------------------------------------------------
// Map opportunity type to default project type
// ---------------------------------------------------------------------------

const OPP_TO_PROJECT_TYPE: Record<OpportunityType, ProjectType> = {
  scattered_lot: 'scattered_lot',
  lot_development: 'lot_development',
  community_development: 'community_development',
  lot_purchase: 'lot_purchase',
  other: 'other',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConversionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: Opportunity
  onConvert: (data: {
    project_name: string
    project_type: ProjectType
    owner_entity_id: string | null
    builder_entity_id: string | null
  }) => Promise<void>
  converting: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConversionDialog({
  open,
  onOpenChange,
  opportunity,
  onConvert,
  converting,
}: ConversionDialogProps) {
  const { entities } = useEntities()

  const [projectName, setProjectName] = useState(
    opportunity.name || opportunity.address_street || ''
  )
  const [projectType, setProjectType] = useState<ProjectType>(
    OPP_TO_PROJECT_TYPE[opportunity.type] ?? 'other'
  )
  const [ownerEntityId, setOwnerEntityId] = useState<string>(
    opportunity.owner_entity_id ?? ''
  )
  const [builderEntityId, setBuilderEntityId] = useState<string>('')

  const address = [
    opportunity.address_street,
    opportunity.address_city,
    opportunity.address_state,
    opportunity.address_zip,
  ]
    .filter(Boolean)
    .join(', ')

  const handleSubmit = async () => {
    await onConvert({
      project_name: projectName,
      project_type: projectType,
      owner_entity_id: ownerEntityId || null,
      builder_entity_id: builderEntityId || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert to Project</DialogTitle>
          <DialogDescription>
            Create a new project from this opportunity. Review the data below
            and adjust project settings as needed.
          </DialogDescription>
        </DialogHeader>

        {/* Data summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Data Carried Over
          </p>
          {address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{address}</span>
            </div>
          )}
          {opportunity.projected_purchase_price != null && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                Purchase Price:{' '}
                {formatCurrency(opportunity.projected_purchase_price)}
              </span>
            </div>
          )}
          {opportunity.entity && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Entity: {opportunity.entity.name}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            {opportunity.date_under_contract && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Contract: {formatDate(opportunity.date_under_contract)}</span>
              </div>
            )}
            {opportunity.projected_close_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Closing: {formatDate(opportunity.projected_close_date)}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Editable fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-type">Project Type</Label>
            <Select
              value={projectType}
              onValueChange={(val) => setProjectType(val as ProjectType)}
            >
              <SelectTrigger id="project-type">
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-entity">Owner Entity</Label>
            <Select
              value={ownerEntityId}
              onValueChange={setOwnerEntityId}
            >
              <SelectTrigger id="owner-entity">
                <SelectValue placeholder="Select owner entity" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="builder-entity">Builder Entity</Label>
            <Select
              value={builderEntityId}
              onValueChange={setBuilderEntityId}
            >
              <SelectTrigger id="builder-entity">
                <SelectValue placeholder="Select builder entity" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={converting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={converting || !projectName.trim()}
            style={{ backgroundColor: '#1a5632' }}
            className="text-white hover:opacity-90"
          >
            {converting ? 'Converting...' : 'Convert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
