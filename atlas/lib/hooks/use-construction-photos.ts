import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { ConstructionPhoto } from "@/lib/supabase/types"

const keys = {
  all: ["construction-photos"] as const,
  byJob: (jobId: string) => [...keys.all, "job", jobId] as const,
  byUnit: (unitId: string) => [...keys.all, "unit", unitId] as const,
}

export function useConstructionPhotos(jobId: string, unitId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: unitId ? keys.byUnit(unitId) : keys.byJob(jobId),
    queryFn: async () => {
      let query = supabase
        .from("construction_photos")
        .select("*")
        .eq("job_id", jobId)
        .order("taken_date", { ascending: false })

      if (unitId) {
        query = query.eq("unit_id", unitId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as ConstructionPhoto[]
    },
    enabled: !!jobId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData: unknown) => previousData,
  })
}

export function useUploadPhotos() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      files,
      jobId,
      unitId,
      milestoneId,
      category,
      organizationId,
    }: {
      files: File[]
      jobId: string
      unitId?: string
      milestoneId?: string
      category?: ConstructionPhoto["category"]
      organizationId?: string
    }) => {
      const results: ConstructionPhoto[] = []

      for (const file of files) {
        const ts = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
        const filePath = `construction-photos/${jobId}/${ts}-${safeName}`

        // Upload to storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from("construction-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (storageError) throw storageError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("construction-photos")
          .getPublicUrl(storageData.path)

        // Save metadata to DB
        const { data: photo, error: dbError } = await supabase
          .from("construction_photos")
          .insert({
            organization_id: organizationId ?? null,
            job_id: jobId,
            unit_id: unitId ?? null,
            milestone_id: milestoneId ?? null,
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            category: category ?? "progress",
            taken_date: new Date().toISOString().split("T")[0],
          })
          .select()
          .single()

        if (dbError) throw dbError
        results.push(photo as unknown as ConstructionPhoto)
      }

      return results
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useUpdatePhotoCaption() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, caption }: { id: string; caption: string }) => {
      const { data, error } = await supabase
        .from("construction_photos")
        .update({ caption })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as ConstructionPhoto
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useDeletePhoto() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("construction_photos")
        .delete()
        .eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}
