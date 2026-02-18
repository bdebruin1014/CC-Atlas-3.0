"use client"

import * as React from "react"
import { useState, useCallback, useRef } from "react"
import {
  Upload,
  X,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/format"
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  status: "pending" | "uploading" | "complete" | "error"
  progress: number
  url?: string
  error?: string
}

export interface DocumentUploaderProps {
  recordType: string
  recordId: string
  onUpload?: (files: { name: string; url: string; size: number; type: string }[]) => void
  acceptedTypes?: string[]
  maxSizeMB?: number
  maxFiles?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/msword",
  "application/vnd.ms-excel",
]

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return FileImage
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return FileSpreadsheet
  if (type.includes("pdf") || type.includes("word") || type.includes("document"))
    return FileText
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ---------------------------------------------------------------------------
// DocumentUploader
// ---------------------------------------------------------------------------

export function DocumentUploader({
  recordType,
  recordId,
  onUpload,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSizeMB = 25,
  maxFiles = 10,
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // ---- Validate a file ----
  const validateFile = useCallback(
    (file: globalThis.File): string | null => {
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        return `File type "${file.type || "unknown"}" is not accepted.`
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `File exceeds the ${maxSizeMB}MB size limit.`
      }
      return null
    },
    [acceptedTypes, maxSizeMB]
  )

  // ---- Upload a single file to Supabase Storage ----
  const uploadFile = useCallback(
    async (uploadFile: UploadedFile, rawFile: globalThis.File) => {
      const supabase = createClient()
      const filePath = `${recordType}/${recordId}/${Date.now()}-${rawFile.name}`

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "uploading" as const, progress: 10 } : f
        )
      )

      // Simulate progress increments (Supabase JS doesn't provide progress events for storage)
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === uploadFile.id && f.status === "uploading") {
              return { ...f, progress: Math.min(f.progress + 15, 85) }
            }
            return f
          })
        )
      }, 300)

      try {
        const { data, error } = await supabase.storage
          .from("documents")
          .upload(filePath, rawFile, {
            cacheControl: "3600",
            upsert: false,
          })

        clearInterval(progressInterval)

        if (error) throw error

        const {
          data: { publicUrl },
        } = supabase.storage.from("documents").getPublicUrl(data.path)

        // Save document metadata to database
        await supabase.from("documents").insert({
          record_type: recordType,
          record_id: recordId,
          file_name: rawFile.name,
          file_path: data.path,
          file_size: rawFile.size,
          file_type: rawFile.type,
          url: publicUrl,
        } as any)

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "complete" as const, progress: 100, url: publicUrl }
              : f
          )
        )

        return { name: rawFile.name, url: publicUrl, size: rawFile.size, type: rawFile.type }
      } catch (err) {
        clearInterval(progressInterval)
        const message = err instanceof Error ? err.message : "Upload failed"
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "error" as const, progress: 0, error: message }
              : f
          )
        )
        return null
      }
    },
    [recordType, recordId]
  )

  // ---- Process selected files ----
  const processFiles = useCallback(
    async (rawFiles: globalThis.File[]) => {
      const remainingSlots = maxFiles - files.length
      const filesToProcess = rawFiles.slice(0, remainingSlots)

      const newFiles: UploadedFile[] = []
      const validPairs: { uploadFile: UploadedFile; rawFile: globalThis.File }[] = []

      for (const rawFile of filesToProcess) {
        const error = validateFile(rawFile)
        const uploadedFile: UploadedFile = {
          id: generateId(),
          name: rawFile.name,
          size: rawFile.size,
          type: rawFile.type,
          status: error ? "error" : "pending",
          progress: 0,
          error: error ?? undefined,
        }
        newFiles.push(uploadedFile)
        if (!error) validPairs.push({ uploadFile: uploadedFile, rawFile })
      }

      setFiles((prev) => [...prev, ...newFiles])

      // Upload valid files
      const results = await Promise.all(
        validPairs.map(({ uploadFile: uf, rawFile }) => uploadFile(uf, rawFile))
      )

      const completed = results.filter(
        (r): r is { name: string; url: string; size: number; type: string } => r !== null
      )
      if (completed.length > 0) {
        onUpload?.(completed)
      }
    },
    [files.length, maxFiles, validateFile, uploadFile, onUpload]
  )

  // ---- Remove file from list ----
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }, [])

  // ---- Drag and drop ----
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      dragCounterRef.current = 0
      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length > 0) processFiles(droppedFiles)
    },
    [processFiles]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files ? Array.from(e.target.files) : []
      if (selected.length > 0) processFiles(selected)
      // Reset input so the same file can be selected again
      if (inputRef.current) inputRef.current.value = ""
    },
    [processFiles]
  )

  const acceptAttr = acceptedTypes.length > 0 ? acceptedTypes.join(",") : undefined

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors",
          isDragOver && "border-primary bg-primary/5",
          files.length >= maxFiles && "cursor-not-allowed opacity-50"
        )}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragOver ? "Drop files here" : "Drag & drop files here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Max {maxSizeMB}MB per file | Up to {maxFiles} files
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptAttr}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={files.length >= maxFiles}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.type)
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
              >
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                    {file.status === "error" && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {file.error}
                      </span>
                    )}
                    {file.status === "complete" && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Uploaded
                      </span>
                    )}
                    {file.status === "uploading" && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading...
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {file.status === "uploading" && (
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
