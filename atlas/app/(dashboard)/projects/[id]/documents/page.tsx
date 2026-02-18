"use client"

import { FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ProjectDocumentsPage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-semibold">Documents</h3>
        <p className="text-xs text-muted-foreground">
          Project documents will be managed here.
        </p>
      </CardContent>
    </Card>
  )
}
