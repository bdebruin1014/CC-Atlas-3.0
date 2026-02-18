"use client"

import { use, useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  Phone,
  FileText,
  AlertCircle,
} from "lucide-react"
import { cn, formatCurrency, formatPercent, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import type {
  Investor,
  AccreditationStatus,
  CapitalCall,
  CapitalCallResponse,
  CapitalCallStatus,
} from "@/lib/types/accounting"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAccreditationBadge(status: AccreditationStatus) {
  switch (status) {
    case "accredited":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Accredited</Badge>
    case "non_accredited":
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100">Non-Accredited</Badge>
    case "qualified_purchaser":
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100">Qualified Purchaser</Badge>
    case "pending":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getCallStatusBadge(status: CapitalCallStatus) {
  switch (status) {
    case "draft": return <Badge variant="outline">Draft</Badge>
    case "issued": return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Issued</Badge>
    case "partially_funded": return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partially Funded</Badge>
    case "fully_funded": return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Fully Funded</Badge>
    case "cancelled": return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function InvestorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: entityId } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [investors, setInvestors] = useState<Investor[]>([])
  const [capitalCalls, setCapitalCalls] = useState<CapitalCall[]>([])
  const [entityName, setEntityName] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAddInvestor, setShowAddInvestor] = useState(false)
  const [showCapitalCall, setShowCapitalCall] = useState(false)
  const [expandedInvestor, setExpandedInvestor] = useState<string | null>(null)

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const supabase = createClient()

      const { data: entityData } = await supabase
        .from("entities")
        .select("name")
        .eq("id", entityId)
        .single()
      if (entityData) setEntityName(entityData.name)

      const { data: invData } = await supabase
        .from("investors")
        .select("*")
        .eq("entity_id", entityId)
        .order("ownership_percent", { ascending: false })
      if (invData) setInvestors(invData as unknown as Investor[])

      const { data: callData } = await supabase
        .from("capital_calls")
        .select("*, capital_call_responses(*)")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
      if (callData) {
        setCapitalCalls(
          callData.map((cc: any) => ({
            ...cc,
            responses: cc.capital_call_responses || [],
          })) as CapitalCall[]
        )
      }

      setLoading(false)
    }
    loadData()
  }, [entityId])

  // Totals
  const totalOwnership = investors.reduce((s, i) => s + i.ownership_percent, 0)
  const totalCommitment = investors.reduce((s, i) => s + i.capital_commitment, 0)
  const totalContributed = investors.reduce((s, i) => s + i.capital_contributed, 0)
  const totalRemaining = investors.reduce((s, i) => s + i.capital_remaining, 0)

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => router.push("/accounting")}
        >
          Accounting
        </button>
        <ChevronRight className="h-3 w-3" />
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => router.push("/accounting/entities")}
        >
          Entities
        </button>
        <ChevronRight className="h-3 w-3" />
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => router.push(`/accounting/entities/${entityId}`)}
        >
          {entityName || "Entity"}
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Investors</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investor Management</h1>
          <p className="text-sm text-muted-foreground">
            {entityName} - {investors.length} investor{investors.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCapitalCall(true)}>
            <Phone className="h-4 w-4" />
            Capital Call
          </Button>
          <Button onClick={() => setShowAddInvestor(true)}>
            <Plus className="h-4 w-4" />
            Add Investor
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Ownership</p>
            <p className={cn("text-2xl font-bold", Math.abs(totalOwnership - 100) > 0.01 && "text-amber-600")}>
              {formatPercent(totalOwnership)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Commitments</p>
            <p className="text-2xl font-bold">{formatCurrency(totalCommitment)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Contributed</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalContributed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Remaining to Call</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalRemaining)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Investor Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Investor Table
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : investors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No investors yet.</p>
              <Button onClick={() => setShowAddInvestor(true)}>
                <Plus className="h-4 w-4" />
                Add Investor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8" />
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ownership %</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Capital Commitment</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Contributed</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Remaining</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pref. Return</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Accreditation</th>
                  </tr>
                </thead>
                <tbody>
                  {investors.map((inv) => (
                    <>
                      <tr
                        key={inv.id}
                        className="border-b cursor-pointer transition-colors hover:bg-muted/30"
                        onClick={() => setExpandedInvestor(expandedInvestor === inv.id ? null : inv.id)}
                      >
                        <td className="px-4 py-3">
                          {expandedInvestor === inv.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">{inv.contact_name}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {formatPercent(inv.ownership_percent)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {formatCurrency(inv.capital_commitment, { decimals: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-green-600">
                          {formatCurrency(inv.capital_contributed, { decimals: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-600">
                          {formatCurrency(inv.capital_remaining, { decimals: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {formatPercent(inv.preferred_return_rate)}
                        </td>
                        <td className="px-4 py-3">
                          {getAccreditationBadge(inv.accreditation_status)}
                        </td>
                      </tr>
                      {/* Expanded Detail */}
                      {expandedInvestor === inv.id && (
                        <tr key={`${inv.id}-detail`}>
                          <td colSpan={8} className="px-8 py-4 bg-muted/20">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="text-sm">{inv.contact_email || "--"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Promote Structure</p>
                                <p className="text-sm">{inv.promote_structure || "--"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Accreditation Verified</p>
                                <p className="text-sm">{formatDate(inv.accreditation_verified_date)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Funding Progress</p>
                                <div className="mt-1">
                                  <Progress
                                    value={
                                      inv.capital_commitment > 0
                                        ? (inv.capital_contributed / inv.capital_commitment) * 100
                                        : 0
                                    }
                                  />
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {formatPercent(
                                      inv.capital_commitment > 0
                                        ? (inv.capital_contributed / inv.capital_commitment) * 100
                                        : 0,
                                      0
                                    )}{" "}
                                    funded
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Subscription Agreement</p>
                                {inv.subscription_agreement_url ? (
                                  <a
                                    href={inv.subscription_agreement_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    View
                                  </a>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Not uploaded</p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">W-9</p>
                                {inv.w9_url ? (
                                  <a
                                    href={inv.w9_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    View
                                  </a>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Not uploaded</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {/* Totals Row */}
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3">Total</td>
                    <td className={cn("px-4 py-3 text-right font-mono tabular-nums", Math.abs(totalOwnership - 100) > 0.01 && "text-amber-600")}>
                      {formatPercent(totalOwnership)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {formatCurrency(totalCommitment, { decimals: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-green-600">
                      {formatCurrency(totalContributed, { decimals: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-600">
                      {formatCurrency(totalRemaining, { decimals: 2 })}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capital Calls Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5" />
            Capital Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {capitalCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No capital calls issued.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Call #</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Purpose</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Due Date</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Responses</th>
                  </tr>
                </thead>
                <tbody>
                  {capitalCalls.map((cc) => {
                    const funded = cc.responses.filter((r) => r.status === "funded").length
                    const total = cc.responses.length
                    return (
                      <tr key={cc.id} className="border-b last:border-b-0">
                        <td className="px-4 py-2 font-mono text-xs">#{cc.call_number}</td>
                        <td className="px-4 py-2">{formatDate(cc.issued_date || cc.created_at)}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {formatCurrency(cc.total_amount, { decimals: 2 })}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate">
                          {cc.purpose}
                        </td>
                        <td className="px-4 py-2">{formatDate(cc.due_date)}</td>
                        <td className="px-4 py-2">{getCallStatusBadge(cc.status)}</td>
                        <td className="px-4 py-2 text-xs">
                          {funded}/{total} funded
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Investor Dialog */}
      <AddInvestorDialog
        open={showAddInvestor}
        onOpenChange={setShowAddInvestor}
        entityId={entityId}
        onSuccess={(inv) => {
          setShowAddInvestor(false)
          setInvestors((prev) => [...prev, inv])
          toast({ title: "Investor added", description: inv.contact_name })
        }}
      />

      {/* Capital Call Wizard */}
      <CapitalCallWizard
        open={showCapitalCall}
        onOpenChange={setShowCapitalCall}
        entityId={entityId}
        investors={investors}
        onSuccess={(cc) => {
          setShowCapitalCall(false)
          setCapitalCalls((prev) => [cc, ...prev])
          toast({ title: "Capital call issued" })
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Investor Dialog
// ---------------------------------------------------------------------------

function AddInvestorDialog({
  open,
  onOpenChange,
  entityId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  onSuccess: (investor: Investor) => void
}) {
  const [formData, setFormData] = useState({
    contact_name: "",
    contact_email: "",
    ownership_percent: "",
    capital_commitment: "",
    preferred_return_rate: "8",
    promote_structure: "",
    accreditation_status: "pending" as AccreditationStatus,
    accreditation_verified_date: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setFormData({
      contact_name: "",
      contact_email: "",
      ownership_percent: "",
      capital_commitment: "",
      preferred_return_rate: "8",
      promote_structure: "",
      accreditation_status: "pending",
      accreditation_verified_date: "",
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.contact_name.trim()) {
      setError("Investor name is required.")
      return
    }

    const ownership = parseFloat(formData.ownership_percent)
    const commitment = parseFloat(formData.capital_commitment)
    const prefRate = parseFloat(formData.preferred_return_rate)

    if (isNaN(ownership) || ownership <= 0 || ownership > 100) {
      setError("Ownership % must be between 0 and 100.")
      return
    }
    if (isNaN(commitment) || commitment <= 0) {
      setError("Capital commitment must be greater than 0.")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { data, error: dbError } = await supabase
      .from("investors")
      .insert({
        entity_id: entityId,
        contact_id: "",
        contact_name: formData.contact_name.trim(),
        contact_email: formData.contact_email.trim() || null,
        ownership_percent: ownership,
        capital_commitment: commitment,
        capital_contributed: 0,
        capital_remaining: commitment,
        preferred_return_rate: isNaN(prefRate) ? 8 : prefRate,
        promote_structure: formData.promote_structure.trim() || null,
        accreditation_status: formData.accreditation_status,
        accreditation_verified_date: formData.accreditation_verified_date || null,
        subscription_agreement_url: null,
        w9_url: null,
        status: "active",
      } as any)
      .select()
      .single()

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    if (data) {
      resetForm()
      onSuccess(data as unknown as Investor)
    }
    setSaving(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Investor</DialogTitle>
          <DialogDescription>
            Add a new investor to this entity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-name">Investor Name *</Label>
              <Input
                id="inv-name"
                value={formData.contact_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_name: e.target.value }))}
                placeholder="John Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-email">Email</Label>
              <Input
                id="inv-email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-own">Ownership % *</Label>
              <Input
                id="inv-own"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.ownership_percent}
                onChange={(e) => setFormData((prev) => ({ ...prev, ownership_percent: e.target.value }))}
                placeholder="25.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-commit">Capital Commitment *</Label>
              <Input
                id="inv-commit"
                type="number"
                step="0.01"
                min="0"
                value={formData.capital_commitment}
                onChange={(e) => setFormData((prev) => ({ ...prev, capital_commitment: e.target.value }))}
                placeholder="250000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-pref">Preferred Return Rate (%)</Label>
              <Input
                id="inv-pref"
                type="number"
                step="0.1"
                min="0"
                value={formData.preferred_return_rate}
                onChange={(e) => setFormData((prev) => ({ ...prev, preferred_return_rate: e.target.value }))}
                placeholder="8"
              />
            </div>
            <div className="space-y-2">
              <Label>Accreditation Status</Label>
              <Select
                value={formData.accreditation_status}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, accreditation_status: val as AccreditationStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accredited">Accredited</SelectItem>
                  <SelectItem value="non_accredited">Non-Accredited</SelectItem>
                  <SelectItem value="qualified_purchaser">Qualified Purchaser</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-verify">Verification Date</Label>
              <Input
                id="inv-verify"
                type="date"
                value={formData.accreditation_verified_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, accreditation_verified_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-promote">Promote/Carry Structure</Label>
            <Textarea
              id="inv-promote"
              value={formData.promote_structure}
              onChange={(e) => setFormData((prev) => ({ ...prev, promote_structure: e.target.value }))}
              placeholder="Describe promote structure..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Investor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Capital Call Wizard
// ---------------------------------------------------------------------------

function CapitalCallWizard({
  open,
  onOpenChange,
  entityId,
  investors,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  investors: Investor[]
  onSuccess: (capitalCall: CapitalCall) => void
}) {
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState("")
  const [purpose, setPurpose] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-split by ownership
  const splits = useMemo(() => {
    const total = parseFloat(amount)
    if (isNaN(total) || total <= 0) return []
    return investors.map((inv) => ({
      investor_id: inv.id,
      investor_name: inv.contact_name,
      ownership_percent: inv.ownership_percent,
      amount_due: Math.round(total * (inv.ownership_percent / 100) * 100) / 100,
    }))
  }, [amount, investors])

  const resetForm = () => {
    setStep(1)
    setAmount("")
    setPurpose("")
    setDueDate("")
    setError(null)
  }

  const handleIssue = async () => {
    setError(null)
    if (!amount || parseFloat(amount) <= 0) {
      setError("Amount must be greater than 0.")
      return
    }
    if (!purpose.trim()) {
      setError("Purpose is required.")
      return
    }
    if (!dueDate) {
      setError("Due date is required.")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { data: ccData, error: ccError } = await supabase
      .from("capital_calls")
      .insert({
        entity_id: entityId,
        call_number: 1,
        total_amount: parseFloat(amount),
        purpose: purpose.trim(),
        due_date: dueDate,
        status: "issued" as CapitalCallStatus,
        issued_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single()

    if (ccError) {
      setError(ccError.message)
      setSaving(false)
      return
    }

    // Create responses
    const responses = splits.map((s) => ({
      capital_call_id: ccData.id,
      investor_id: s.investor_id,
      investor_name: s.investor_name,
      amount_due: s.amount_due,
      amount_funded: 0,
      funded_date: null,
      status: "pending" as const,
    }))

    const { data: respData, error: respError } = await supabase
      .from("capital_call_responses")
      .insert(responses)
      .select()

    if (respError) {
      setError(respError.message)
      setSaving(false)
      return
    }

    const result: CapitalCall = {
      ...(ccData as any),
      responses: (respData || []) as CapitalCallResponse[],
    }

    resetForm()
    onSuccess(result)
    setSaving(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Capital Call - Step {step} of 3
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Enter the call amount and purpose."}
            {step === 2 && "Review the per-investor split."}
            {step === 3 && "Set the due date and issue the call."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cc-amount">Total Call Amount *</Label>
              <Input
                id="cc-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-purpose">Purpose *</Label>
              <Textarea
                id="cc-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Land acquisition funding, Phase I construction..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!amount || !purpose.trim()}>
                Next: Review Split
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Investor</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Ownership %</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount Due</th>
                  </tr>
                </thead>
                <tbody>
                  {splits.map((s) => (
                    <tr key={s.investor_id} className="border-b last:border-b-0">
                      <td className="px-4 py-2 font-medium">{s.investor_name}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">
                        {formatPercent(s.ownership_percent)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold">
                        {formatCurrency(s.amount_due, { decimals: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {formatPercent(splits.reduce((s, sp) => s + sp.ownership_percent, 0))}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {formatCurrency(splits.reduce((s, sp) => s + sp.amount_due, 0), { decimals: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next: Set Due Date</Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cc-due">Due Date *</Label>
              <Input
                id="cc-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-semibold">{formatCurrency(parseFloat(amount) || 0, { decimals: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purpose:</span>
                    <span className="font-medium max-w-[200px] text-right truncate">{purpose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Investors:</span>
                    <span className="font-medium">{splits.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className="font-medium">{dueDate ? formatDate(dueDate) : "--"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleIssue} disabled={saving || !dueDate}>
                {saving ? "Issuing..." : "Issue Capital Call"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
