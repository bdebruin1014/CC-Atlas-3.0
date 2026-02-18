"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ContactAssignment {
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
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function OpportunityContactsPage() {
  const { id } = useParams()
  const [contacts, setContacts] = useState<ContactAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from("contact_assignments")
        .select(
          "id, contact_id, role_on_record, contact:contacts(id, first_name, last_name, company, email, phone)"
        )
        .eq("record_type", "opportunity")
        .eq("record_id", id)

      setContacts((data as unknown as ContactAssignment[]) ?? [])
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
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
    <div className="space-y-3">
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
                {[ca.role_on_record, ca.contact.company].filter(Boolean).join(" - ")}
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
