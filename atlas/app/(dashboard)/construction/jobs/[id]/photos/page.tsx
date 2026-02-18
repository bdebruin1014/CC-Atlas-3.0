"use client"

import { PhotoGallery } from "@/components/construction/photo-gallery"
import { useJobContext } from "../layout"

export default function PhotosPage() {
  const { job, units, jobId } = useJobContext()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Photos</h2>
        <p className="text-sm text-muted-foreground">
          Construction progress photos for {job.name}
        </p>
      </div>
      <PhotoGallery
        jobId={jobId}
        units={units.map((u) => ({ id: u.id, unit_number: u.unit_number }))}
      />
    </div>
  )
}
