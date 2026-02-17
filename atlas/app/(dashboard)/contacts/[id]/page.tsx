"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Building2,
  Tag,
  Clock,
  Link2,
  Save,
  X,
  MessageSquare,
  Plus,
  ExternalLink,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  useContact,
  useUpdateContact,
  getContactTypeLabel,
  ALL_CONTACT_TYPES,
} from "@/lib/hooks/use-contacts"
import type { Contact, ContactAssignment } from "@/lib/hooks/use-contacts"
import { createClient } from "@/lib/supabase/client"

interface ActivityEntry {
  id: string
  action: string
  description: string | null
  created_at: string
  user_id: string | null
  metadata: Record<string, unknown> | null
}

interface NoteEntry {
  id: string
  content: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  user_id: string | null
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const contactId = params.id as string

  const { contact, assignments, loading, error, refetch } =
    useContact(contactId)
  const updateContactMutation = useUpdateContact()

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Contact>>({})
  const [editTypes, setEditTypes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  const [notes, setNotes] = useState<NoteEntry[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  const [linkedRecords, setLinkedRecords] = useState<
    Record<string, Array<{ id: string; name: string; role: string | null }>>
  >({})
  const [linkedLoading, setLinkedLoading] = useState(false)

  useEffect(() => {
    if (contact) {
      setEditData({
        first_name: contact.first_name,
        last_name: contact.last_name,
        company: contact.company,
        email: contact.email,
        phone: contact.phone,
        secondary_phone: contact.secondary_phone,
        mailing_address_line1: contact.mailing_address_line1,
        mailing_address_line2: contact.mailing_address_line2,
        mailing_address_city: contact.mailing_address_city,
        mailing_address_state: contact.mailing_address_state,
        mailing_address_zip: contact.mailing_address_zip,
        notes: contact.notes,
        status: contact.status,
      })
      setEditTypes(contact.contact_types?.map((ct) => ct.type) || [])
    }
  }, [contact])

  const fetchActivities = useCallback(async () => {
    setActivitiesLoading(true)
    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from("activity_log")
        .select("*")
        .eq("record_type", "contact")
        .eq("record_id", contactId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError
      setActivities((data as ActivityEntry[]) || [])
    } catch {
      setActivities([])
    } finally {
      setActivitiesLoading(false)
    }
  }, [contactId])

  const fetchNotes = useCallback(async () => {
    setNotesLoading(true)
    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from("notes")
        .select("*")
        .eq("record_type", "contact")
        .eq("record_id", contactId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError
      setNotes((data as NoteEntry[]) || [])
    } catch {
      setNotes([])
    } finally {
      setNotesLoading(false)
    }
  }, [contactId])

  const fetchLinkedRecords = useCallback(async () => {
    if (assignments.length === 0) {
      setLinkedRecords({})
      return
    }
    setLinkedLoading(true)
    try {
      const supabase = createClient()
      const grouped: Record<
        string,
        Array<{ id: string; name: string; role: string | null }>
      > = {}

      for (const assignment of assignments) {
        const tableName =
          assignment.record_type === "opportunity"
            ? "opportunities"
            : assignment.record_type === "project"
              ? "projects"
              : assignment.record_type === "job"
                ? "jobs"
                : "entities"

        const { data } = await supabase
          .from(tableName)
          .select("id, name")
          .eq("id", assignment.record_id)
          .single()

        if (!grouped[assignment.record_type]) {
          grouped[assignment.record_type] = []
        }

        grouped[assignment.record_type].push({
          id: assignment.record_id,
          name: data?.name || "Unknown Record",
          role: assignment.role_on_record,
        })
      }

      setLinkedRecords(grouped)
    } catch {
      setLinkedRecords({})
    } finally {
      setLinkedLoading(false)
    }
  }, [assignments])

  useEffect(() => {
    if (contactId) {
      fetchActivities()
      fetchNotes()
    }
  }, [contactId, fetchActivities, fetchNotes])

  useEffect(() => {
    if (assignments.length > 0) {
      fetchLinkedRecords()
    }
  }, [assignments, fetchLinkedRecords])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateContactMutation.mutateAsync({
        id: contactId,
        updates: editData,
        types: editTypes,
      })

      await refetch()
      setIsEditing(false)
      toast({
        title: "Contact updated",
        description: "Changes have been saved successfully.",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error: insertError } = await supabase.from("notes").insert({
        record_type: "contact",
        record_id: contactId,
        user_id: user?.id || null,
        content: newNote.trim(),
        is_pinned: false,
      })

      if (insertError) throw insertError

      setNewNote("")
      await fetchNotes()
      toast({ title: "Note added" })
    } catch {
      toast({
        title: "Error",
        description: "Failed to add note.",
        variant: "destructive",
      })
    } finally {
      setAddingNote(false)
    }
  }

  const getRecordLink = (type: string, id: string) => {
    switch (type) {
      case "opportunity":
        return `/opportunities/${id}`
      case "project":
        return `/projects/${id}`
      case "job":
        return `/construction/jobs/${id}`
      case "entity":
        return `/accounting/entities/${id}`
      default:
        return "#"
    }
  }

  const recordTypeLabels: Record<string, string> = {
    opportunity: "Opportunities",
    project: "Projects",
    job: "Jobs",
    entity: "Entities",
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-1">Contact not found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {error || "The contact you are looking for does not exist."}
        </p>
        <Button variant="outline" onClick={() => router.push("/contacts")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Contacts
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/contacts")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Button>

      {/* Contact Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {contact.first_name[0]}
            {contact.last_name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {contact.first_name} {contact.last_name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {contact.company && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {contact.company}
                </span>
              )}
              <Badge
                className={cn(
                  "text-xs",
                  contact.status === "active"
                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                )}
              >
                {contact.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false)
                  setEditData({
                    first_name: contact.first_name,
                    last_name: contact.last_name,
                    company: contact.company,
                    email: contact.email,
                    phone: contact.phone,
                    secondary_phone: contact.secondary_phone,
                    mailing_address_line1: contact.mailing_address_line1,
                    mailing_address_line2: contact.mailing_address_line2,
                    mailing_address_city: contact.mailing_address_city,
                    mailing_address_state: contact.mailing_address_state,
                    mailing_address_zip: contact.mailing_address_zip,
                    notes: contact.notes,
                    status: contact.status,
                  })
                  setEditTypes(contact.contact_types?.map((ct) => ct.type) || [])
                }}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="linked">Linked Records</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">First Name</Label>
                        <Input
                          value={editData.first_name || ""}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              first_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Last Name</Label>
                        <Input
                          value={editData.last_name || ""}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              last_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Company</Label>
                      <Input
                        value={editData.company || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            company: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        value={editData.email || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Phone</Label>
                        <Input
                          value={editData.phone || ""}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Secondary Phone</Label>
                        <Input
                          value={editData.secondary_phone || ""}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              secondary_phone: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Address</Label>
                      <Input
                        value={editData.mailing_address_line1 || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            mailing_address_line1: e.target.value,
                          }))
                        }
                        placeholder="Street address"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">City</Label>
                        <Input
                          value={editData.mailing_address_city || ""}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              mailing_address_city: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">State</Label>
                        <Input
                          value={editData.mailing_address_state || ""}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              mailing_address_state: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">ZIP</Label>
                        <Input
                          value={editData.mailing_address_zip || ""}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              mailing_address_zip: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={editData.status === "active" ? "default" : "outline"}
                          onClick={() =>
                            setEditData((prev) => ({ ...prev, status: "active" }))
                          }
                        >
                          Active
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={editData.status === "inactive" ? "default" : "outline"}
                          onClick={() =>
                            setEditData((prev) => ({ ...prev, status: "inactive" }))
                          }
                        >
                          Inactive
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <InfoRow
                      icon={<Mail className="h-4 w-4" />}
                      label="Email"
                      value={contact.email}
                      isLink={!!contact.email}
                      href={contact.email ? `mailto:${contact.email}` : undefined}
                    />
                    <InfoRow
                      icon={<Phone className="h-4 w-4" />}
                      label="Phone"
                      value={contact.phone}
                      isLink={!!contact.phone}
                      href={contact.phone ? `tel:${contact.phone}` : undefined}
                    />
                    {contact.secondary_phone && (
                      <InfoRow
                        icon={<Phone className="h-4 w-4" />}
                        label="Secondary Phone"
                        value={contact.secondary_phone}
                        isLink
                        href={`tel:${contact.secondary_phone}`}
                      />
                    )}
                    <InfoRow
                      icon={<MapPin className="h-4 w-4" />}
                      label="Address"
                      value={formatAddress(contact)}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Types & Tags */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contact Types</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      {ALL_CONTACT_TYPES.map((ct) => (
                        <Badge
                          key={ct.value}
                          variant={
                            editTypes.includes(ct.value) ? "default" : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() =>
                            setEditTypes((prev) =>
                              prev.includes(ct.value)
                                ? prev.filter((t) => t !== ct.value)
                                : [...prev, ct.value]
                            )
                          }
                        >
                          {ct.label}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {contact.contact_types && contact.contact_types.length > 0 ? (
                        contact.contact_types.map((ct) => (
                          <Badge key={ct.id} variant="secondary">
                            {getContactTypeLabel(ct.type)}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No types assigned
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags && contact.tags.length > 0 ? (
                      contact.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No tags</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Notes Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="self-end"
                >
                  <Plus className="h-4 w-4" />
                  {addingNote ? "Adding..." : "Add"}
                </Button>
              </div>

              {/* Notes List */}
              {notesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notes yet. Add the first note above.
                </p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        "rounded-lg border p-3",
                        note.is_pinned && "border-primary/30 bg-primary/5"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(note.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {note.is_pinned && (
                          <span className="ml-2 text-primary font-medium">
                            Pinned
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Notes Field */}
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={editData.notes || ""}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Internal notes about this contact..."
                  rows={4}
                />
              </CardContent>
            </Card>
          )}

          {!isEditing && contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Linked Records Tab */}
        <TabsContent value="linked" className="space-y-6 mt-6">
          {linkedLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="h-6 w-32 animate-pulse rounded bg-muted mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : Object.keys(linkedRecords).length === 0 && assignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Link2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No linked records</h3>
                <p className="text-sm text-muted-foreground">
                  This contact is not linked to any opportunities, projects, jobs, or
                  entities.
                </p>
              </CardContent>
            </Card>
          ) : (
            ["opportunity", "project", "job", "entity"].map((type) => {
              const records = linkedRecords[type]
              if (!records || records.length === 0) return null

              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {recordTypeLabels[type]} ({records.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {records.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => router.push(getRecordLink(type, record.id))}
                        >
                          <div>
                            <p className="text-sm font-medium">{record.name}</p>
                            {record.role && (
                              <p className="text-xs text-muted-foreground">
                                Role: {record.role}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6 mt-6">
          {activitiesLoading ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : activities.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No activity yet</h3>
                <p className="text-sm text-muted-foreground">
                  Activity for this contact will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.action}</span>
                          {activity.description && (
                            <span className="text-muted-foreground">
                              {" "}
                              - {activity.description}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  isLink,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
  isLink?: boolean
  href?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value ? (
          isLink && href ? (
            <a
              href={href}
              className="text-sm font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {value}
            </a>
          ) : (
            <p className="text-sm font-medium">{value}</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">{"\u2014"}</p>
        )}
      </div>
    </div>
  )
}

function formatAddress(contact: Contact): string | null {
  const parts = [
    contact.mailing_address_line1,
    contact.mailing_address_line2,
    [
      contact.mailing_address_city,
      contact.mailing_address_state,
      contact.mailing_address_zip,
    ]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join("\n") : null
}
