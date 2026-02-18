"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import {
  Search,
  Plus,
  X,
  Users,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProjectContacts } from "@/lib/hooks/use-projects"
import { useContacts } from "@/lib/hooks/use-contacts"
import { useDebounce } from "@/lib/hooks/use-debounce"

// ---------------------------------------------------------------------------
// Contacts Page
// ---------------------------------------------------------------------------

export default function ProjectContactsPage() {
  const params = useParams()
  const projectId = params.id as string

  const {
    contacts: projectContacts,
    loading,
    error,
    assignContact,
    removeContact,
    refetch,
  } = useProjectContacts(projectId)

  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [selectedContactId, setSelectedContactId] = useState("")
  const [role, setRole] = useState("")
  const [assigning, setAssigning] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 300)
  const { data: searchResults = [], isLoading: searching } = useContacts({
    search: debouncedSearch || undefined,
    status: "active",
  })

  const handleAssign = async () => {
    if (!selectedContactId || !role) return
    setAssigning(true)
    try {
      await assignContact(selectedContactId, role)
      setShowAssignDialog(false)
      setSearchInput("")
      setSelectedContactId("")
      setRole("")
    } catch {
      // error handled by mutation
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {projectContacts.length} contact{projectContacts.length !== 1 ? "s" : ""} assigned
        </h3>
        <Button size="sm" onClick={() => setShowAssignDialog(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Assign Contact
        </Button>
      </div>

      {projectContacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 text-sm font-semibold">No contacts assigned</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Assign contacts from the global directory to this project.
            </p>
            <Button size="sm" onClick={() => setShowAssignDialog(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Assign Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectContacts.map((pc) => (
                <TableRow key={pc.id}>
                  <TableCell className="font-medium">
                    {pc.first_name} {pc.last_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {pc.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pc.company ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pc.email ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pc.phone ?? "\u2014"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeContact(pc.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Assign Contact Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Contact</DialogTitle>
            <DialogDescription>
              Search the contact directory and assign a role on this project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Search Contact</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              {debouncedSearch && searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded border border-border">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                        selectedContactId === c.id && "bg-primary/10"
                      )}
                      onClick={() => setSelectedContactId(c.id)}
                    >
                      <span className="font-medium">
                        {c.first_name} {c.last_name}
                      </span>
                      {c.company && (
                        <span className="ml-2 text-muted-foreground">
                          {c.company}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {debouncedSearch && !searching && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground">No contacts found.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role on Project *</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. General Contractor, Architect, Lender"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedContactId || !role || assigning}
            >
              {assigning ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
