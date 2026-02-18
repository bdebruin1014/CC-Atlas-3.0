"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import {
  Upload, X, ChevronLeft, ChevronRight, Image as ImageIcon,
  Filter, Calendar, Building2, Loader2, Pencil, Check, Trash2,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog"
import { toast } from "@/lib/hooks/use-toast"
import {
  useConstructionPhotos,
  useUploadPhotos,
  useUpdatePhotoCaption,
  useDeletePhoto,
} from "@/lib/hooks/use-construction-photos"
import type { ConstructionPhoto, PhotoCategory } from "@/lib/supabase/types"

const CATEGORY_CONFIG: Record<PhotoCategory, { label: string; color: string }> = {
  progress: { label: "Progress", color: "bg-blue-100 text-blue-800" },
  inspection: { label: "Inspection", color: "bg-purple-100 text-purple-800" },
  issue: { label: "Issue", color: "bg-red-100 text-red-800" },
  completion: { label: "Completion", color: "bg-green-100 text-green-800" },
  before: { label: "Before", color: "bg-gray-100 text-gray-800" },
  after: { label: "After", color: "bg-emerald-100 text-emerald-800" },
  aerial: { label: "Aerial", color: "bg-sky-100 text-sky-800" },
  other: { label: "Other", color: "bg-yellow-100 text-yellow-800" },
}

interface PhotoGalleryProps {
  jobId: string
  unitId?: string
  units?: { id: string; unit_number: string | null }[]
}

export function PhotoGallery({ jobId, unitId, units = [] }: PhotoGalleryProps) {
  const { data: photos = [], isLoading } = useConstructionPhotos(jobId, unitId)
  const uploadMutation = useUploadPhotos()
  const captionMutation = useUpdatePhotoCaption()
  const deleteMutation = useDeletePhoto()

  const [categoryFilter, setCategoryFilter] = useState<PhotoCategory | "all">("all")
  const [unitFilter, setUnitFilter] = useState<string>("all")
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [editingCaption, setEditingCaption] = useState<string | null>(null)
  const [captionValue, setCaptionValue] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredPhotos = useMemo(() => {
    let result = [...photos]
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter)
    }
    if (unitFilter !== "all") {
      result = result.filter((p) => p.unit_id === unitFilter)
    }
    return result
  }, [photos, categoryFilter, unitFilter])

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"))
      if (files.length === 0) return
      try {
        await uploadMutation.mutateAsync({
          files,
          jobId,
          unitId,
        })
        toast({ title: `${files.length} photo${files.length > 1 ? "s" : ""} uploaded` })
      } catch {
        toast({ title: "Upload failed", variant: "destructive" })
      }
    },
    [uploadMutation, jobId, unitId]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleSaveCaption = async (photoId: string) => {
    try {
      await captionMutation.mutateAsync({ id: photoId, caption: captionValue })
      setEditingCaption(null)
    } catch {
      toast({ title: "Failed to save caption", variant: "destructive" })
    }
  }

  const handleDelete = async (photoId: string) => {
    try {
      await deleteMutation.mutateAsync({ id: photoId })
      if (lightboxIdx !== null) setLightboxIdx(null)
      toast({ title: "Photo deleted" })
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" })
    }
  }

  const lightboxPhoto = lightboxIdx !== null ? filteredPhotos[lightboxIdx] : null

  return (
    <div className="space-y-4">
      {/* Upload zone + filters bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload Photos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files)
            e.target.value = ""
          }}
        />

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as PhotoCategory | "all")}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!unitId && units.length > 0 && (
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.unit_number ?? u.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <span className="text-xs text-muted-foreground ml-2">
            {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Drag-and-drop zone */}
      <div
        className={cn(
          "rounded-lg border-2 border-dashed transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ImageIcon className="mb-2 h-10 w-10" />
            <p className="text-sm font-medium">
              {isDragging ? "Drop photos here" : "No photos yet"}
            </p>
            <p className="text-xs mt-1">
              Drag and drop or click Upload Photos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
            {filteredPhotos.map((photo, idx) => (
              <Card
                key={photo.id}
                className="group overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => setLightboxIdx(idx)}
              >
                <div className="relative aspect-[4/3] bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnail_url || photo.file_url}
                    alt={photo.caption || photo.file_name || "Photo"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {photo.category && (
                    <Badge
                      className={cn(
                        "absolute top-1.5 left-1.5 text-[10px]",
                        CATEGORY_CONFIG[photo.category]?.color ?? ""
                      )}
                    >
                      {CATEGORY_CONFIG[photo.category]?.label ?? photo.category}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-2">
                  {editingCaption === photo.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={captionValue}
                        onChange={(e) => setCaptionValue(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveCaption(photo.id)
                          if (e.key === "Escape") setEditingCaption(null)
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleSaveCaption(photo.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-xs truncate text-muted-foreground">
                        {photo.caption || photo.file_name || "Untitled"}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCaption(photo.id)
                          setCaptionValue(photo.caption || "")
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {photo.taken_date ? formatDate(photo.taken_date) : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog
        open={lightboxIdx !== null}
        onOpenChange={(open) => { if (!open) setLightboxIdx(null) }}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {lightboxPhoto && (
            <div className="relative">
              <div className="relative bg-black flex items-center justify-center min-h-[400px] max-h-[70vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightboxPhoto.file_url}
                  alt={lightboxPhoto.caption || "Photo"}
                  className="max-h-[70vh] max-w-full object-contain"
                />

                {/* Navigation */}
                {lightboxIdx !== null && lightboxIdx > 0 && (
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
                    onClick={() => setLightboxIdx(lightboxIdx - 1)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {lightboxIdx !== null && lightboxIdx < filteredPhotos.length - 1 && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
                    onClick={() => setLightboxIdx(lightboxIdx + 1)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}

                {/* Close */}
                <button
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                  onClick={() => setLightboxIdx(null)}
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Counter */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  {(lightboxIdx ?? 0) + 1} / {filteredPhotos.length}
                </div>
              </div>

              {/* Metadata footer */}
              <div className="flex items-center justify-between gap-4 p-4 bg-background">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {lightboxPhoto.caption || lightboxPhoto.file_name || "Untitled"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {lightboxPhoto.category && (
                      <Badge className={cn("text-[10px]", CATEGORY_CONFIG[lightboxPhoto.category]?.color ?? "")}>
                        {CATEGORY_CONFIG[lightboxPhoto.category]?.label}
                      </Badge>
                    )}
                    {lightboxPhoto.taken_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(lightboxPhoto.taken_date)}
                      </span>
                    )}
                    {lightboxPhoto.unit_id && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {units.find((u) => u.id === lightboxPhoto.unit_id)?.unit_number ?? "Unit"}
                      </span>
                    )}
                    {lightboxPhoto.file_size && (
                      <span>{(lightboxPhoto.file_size / 1024).toFixed(0)} KB</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => handleDelete(lightboxPhoto.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
