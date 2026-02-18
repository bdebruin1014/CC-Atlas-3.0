'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, type ColumnDef } from '@/components/shared/data-table'
import { PipelineKanban } from '@/components/opportunities/pipeline-kanban'
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
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  BarChart3,
  TrendingUp,
  Clock,
  Target,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'

// ---------------------------------------------------------------------------
// View type
// ---------------------------------------------------------------------------

type ViewMode = 'kanban' | 'list' | 'analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysInStage(updatedAt: string): number {
  const now = new Date()
  const updated = new Date(updatedAt)
  return Math.max(0, Math.floor((now.getTime() - updated.getTime()) / 86_400_000))
}

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#6b7280']

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OpportunitiesPage() {
  const router = useRouter()

  // State
  const [view, setView] = useState<ViewMode>('kanban')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([])

  // Filters
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterAssigned, setFilterAssigned] = useState<string>('all')
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ---- Fetch data ----
  const fetchOpportunities = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('opportunities')
        .select(
          '*, assigned_user:profiles!opportunities_assigned_to_fkey(id, full_name, avatar_url), entity:entities!opportunities_owner_entity_id_fkey(id, name)'
        )
        .eq('archived', false)
        .order('updated_at', { ascending: false })

      if (filterType !== 'all') {
        query = query.eq('type', filterType as OpportunityType)
      }
      if (filterStage !== 'all') {
        query = query.eq('current_stage', filterStage)
      }
      if (filterAssigned !== 'all') {
        query = query.eq('assigned_to', filterAssigned)
      }
      if (filterEntity !== 'all') {
        query = query.eq('entity_id', filterEntity)
      }
      if (searchQuery.trim()) {
        query = query.or(
          `name.ilike.%${searchQuery}%,address_street.ilike.%${searchQuery}%,address_city.ilike.%${searchQuery}%`
        )
      }

      const { data, error } = await query

      if (error) throw error
      setOpportunities((data as unknown as Opportunity[]) ?? [])
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load opportunities.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [filterType, filterStage, filterAssigned, filterEntity, searchQuery])

  // Fetch reference data
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('profiles').select('id, first_name, last_name').order('last_name'),
      supabase.from('entities').select('id, name').order('name'),
    ]).then(([usersRes, entitiesRes]) => {
      if (usersRes.data) {
        setUsers(
          (usersRes.data as unknown as { id: string; first_name: string | null; last_name: string | null }[]).map(
            (u) => ({ id: u.id, full_name: [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown' })
          )
        )
      }
      if (entitiesRes.data) setEntities(entitiesRes.data as unknown as { id: string; name: string }[])
    })
  }, [])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  // ---- Stage change handler (kanban drag) ----
  const handleStageChange = useCallback(
    async (oppId: string, _fromStage: string, toStage: string) => {
      // Optimistic update
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, current_stage: toStage } : o))
      )

      try {
        const supabase = createClient()
        const { error } = await supabase
          .from('opportunities')
          .update({ current_stage: toStage, updated_at: new Date().toISOString() })
          .eq('id', oppId)

        if (error) throw error
        toast({ title: 'Stage Updated' })
      } catch {
        fetchOpportunities() // revert
        toast({
          title: 'Error',
          description: 'Failed to update stage.',
          variant: 'destructive',
        })
      }
    },
    [fetchOpportunities]
  )

  // ---- Active stages based on filter ----
  const activeType =
    filterType !== 'all' ? (filterType as OpportunityType) : 'scattered_lot'
  const activeStages = getStagesForType(activeType)

  // ---- Available stages for the filter dropdown ----
  const stageOptions = useMemo(() => {
    if (filterType !== 'all') {
      return getStagesForType(filterType as OpportunityType)
    }
    // If "all" types selected, return scattered_lot stages as the default set
    return getStagesForType('scattered_lot')
  }, [filterType])

  // ---- List view columns ----
  const listColumns: ColumnDef<Opportunity>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        cell: (row) => (
          <span className="font-medium">{row.name || row.address_street || 'Untitled'}</span>
        ),
      },
      {
        key: 'address_street',
        header: 'Address',
        sortable: true,
        cell: (row) => (
          <span className="text-sm">
            {row.address_street}
            {row.address_city ? `, ${row.address_city}` : ''}
          </span>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        sortable: true,
        cell: (row) => {
          const color = OPPORTUNITY_TYPE_COLORS[row.type] ?? '#6b7280'
          return (
            <Badge
              className="text-xs"
              style={{
                backgroundColor: `${color}15`,
                color,
                borderColor: `${color}30`,
              }}
            >
              {OPPORTUNITY_TYPE_LABELS[row.type] ?? row.type}
            </Badge>
          )
        },
      },
      {
        key: 'current_stage',
        header: 'Stage',
        sortable: true,
        cell: (row) => {
          const stage = getStageDefinition(row.type, row.current_stage)
          return (
            <Badge
              variant="outline"
              className="text-xs"
              style={
                stage
                  ? {
                      backgroundColor: `${stage.color}15`,
                      color: stage.color,
                      borderColor: `${stage.color}30`,
                    }
                  : {}
              }
            >
              {stage?.label ?? row.current_stage}
            </Badge>
          )
        },
      },
      {
        key: 'assigned_to',
        header: 'Assigned To',
        cell: (row) => (
          <span className="text-sm">
            {row.assigned_user?.full_name ?? '—'}
          </span>
        ),
      },
      {
        key: 'entity_id',
        header: 'Entity',
        cell: (row) => (
          <span className="text-sm">{row.entity?.name ?? '—'}</span>
        ),
      },
      {
        key: 'projected_sale_price',
        header: 'Projected Value',
        sortable: true,
        className: 'text-right',
        cell: (row) => (
          <span className="tabular-nums">
            {row.projected_sale_price
              ? formatCurrency(row.projected_sale_price)
              : row.projected_purchase_price
              ? formatCurrency(row.projected_purchase_price)
              : '—'}
          </span>
        ),
      },
      {
        key: 'updated_at',
        header: 'Days in Stage',
        sortable: true,
        className: 'text-center',
        cell: (row) => (
          <span className="text-sm tabular-nums">
            {daysInStage(row.updated_at)}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Created',
        sortable: true,
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.created_at, { short: true })}
          </span>
        ),
      },
    ],
    []
  )

  // ---- Analytics data ----
  const analyticsData = useMemo(() => {
    // Pipeline value by stage
    const byStage = activeStages.map((stage) => {
      const stageOpps = opportunities.filter((o) => o.current_stage === stage.id)
      return {
        name: stage.label,
        value: stageOpps.reduce(
          (sum, o) => sum + (o.projected_sale_price ?? o.projected_purchase_price ?? 0),
          0
        ),
        count: stageOpps.length,
        fill: stage.color,
      }
    })

    // By type
    const byType = (
      Object.keys(OPPORTUNITY_TYPE_LABELS) as OpportunityType[]
    ).map((type) => {
      const typeOpps = opportunities.filter((o) => o.type === type)
      return {
        name: OPPORTUNITY_TYPE_LABELS[type],
        value: typeOpps.length,
        fill: OPPORTUNITY_TYPE_COLORS[type],
      }
    }).filter((d) => d.value > 0)

    // Conversion rate
    const total = opportunities.length
    const closedWon = opportunities.filter(
      (o) => o.current_stage === 'closed_won'
    ).length
    const conversionRate = total > 0 ? (closedWon / total) * 100 : 0

    // Average days (simplified — based on days since last update)
    const avgDays =
      opportunities.length > 0
        ? Math.round(
            opportunities.reduce(
              (sum, o) => sum + daysInStage(o.created_at),
              0
            ) / opportunities.length
          )
        : 0

    // Monthly trend (last 6 months)
    const now = new Date()
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() - (5 - i) + 1,
        0
      )
      const monthOpps = opportunities.filter((o) => {
        const created = new Date(o.created_at)
        return created >= month && created <= monthEnd
      })
      return {
        name: month.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        count: monthOpps.length,
        value: monthOpps.reduce(
          (sum, o) => sum + (o.projected_sale_price ?? 0),
          0
        ),
      }
    })

    // Total pipeline value
    const totalPipeline = opportunities.reduce(
      (sum, o) => sum + (o.projected_sale_price ?? o.projected_purchase_price ?? 0),
      0
    )

    return {
      byStage,
      byType,
      conversionRate,
      avgDays,
      monthlyTrend,
      totalPipeline,
      total,
    }
  }, [opportunities, activeStages])

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            Manage your deal pipeline and track opportunities.
          </p>
        </div>
        <Link href="/opportunities/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Opportunity
          </Button>
        </Link>
      </div>

      {/* View toggle + Filters */}
      <div className="flex flex-col gap-4">
        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-1 w-fit">
          <Button
            variant={view === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('kanban')}
          >
            <LayoutGrid className="mr-1.5 h-4 w-4" />
            Kanban
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="mr-1.5 h-4 w-4" />
            List
          </Button>
          <Button
            variant={view === 'analytics' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('analytics')}
          >
            <BarChart3 className="mr-1.5 h-4 w-4" />
            Analytics
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(
                Object.entries(OPPORTUNITY_TYPE_LABELS) as [
                  OpportunityType,
                  string,
                ][]
              ).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stageOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterAssigned} onValueChange={setFilterAssigned}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search opportunities..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* KANBAN VIEW                                                        */}
      {/* ================================================================== */}
      {view === 'kanban' && (
        <PipelineKanban
          opportunities={opportunities}
          stages={activeStages}
          onStageChange={handleStageChange}
          isLoading={loading}
        />
      )}

      {/* ================================================================== */}
      {/* LIST VIEW                                                          */}
      {/* ================================================================== */}
      {view === 'list' && (
        <DataTable
          columns={listColumns as unknown as ColumnDef<Record<string, unknown>>[]}
          data={opportunities as unknown as Record<string, unknown>[]}
          onRowClick={(row) => router.push(`/opportunities/${(row as unknown as Opportunity).id}`)}
          isLoading={loading}
          emptyMessage="No opportunities found."
          pageSize={20}
        />
      )}

      {/* ================================================================== */}
      {/* ANALYTICS VIEW                                                     */}
      {/* ================================================================== */}
      {view === 'analytics' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Pipeline Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    formatCurrency(analyticsData.totalPipeline, { compact: true })
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.total} opportunities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Conversion Rate
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    `${analyticsData.conversionRate.toFixed(1)}%`
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Opportunities to projects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Avg Days to Close
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    `${analyticsData.avgDays} days`
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Average across all types
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Active Deals
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    opportunities.filter(
                      (o) =>
                        o.current_stage !== 'closed_won' && o.current_stage !== 'closed_lost'
                    ).length
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Excluding closed deals
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pipeline by stage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Pipeline Value by Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.byStage}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) =>
                          v >= 1_000_000
                            ? `$${(v / 1_000_000).toFixed(1)}M`
                            : `$${(v / 1_000).toFixed(0)}K`
                        }
                        className="text-muted-foreground"
                      />
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={((value: number) => formatCurrency(value)) as any}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {analyticsData.byStage.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* By type pie chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Opportunities by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : analyticsData.byType.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    No data to display
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.byType}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine
                      >
                        {analyticsData.byType.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Monthly trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Monthly Deal Flow Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) =>
                          v >= 1_000_000
                            ? `$${(v / 1_000_000).toFixed(1)}M`
                            : `$${(v / 1_000).toFixed(0)}K`
                        }
                        className="text-muted-foreground"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="count"
                        name="New Opportunities"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="value"
                        name="Pipeline Value"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
