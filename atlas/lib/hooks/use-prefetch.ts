import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function usePrefetchOpportunity() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['opportunities', 'detail', id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('opportunities')
          .select('*')
          .eq('id', id)
          .single()
        if (error) throw error
        return data
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}

export function usePrefetchProject() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['projects', 'detail', id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            owner_entity:entities!projects_owner_entity_id_fkey(id, name),
            builder_entity:entities!projects_builder_entity_id_fkey(id, name)
          `)
          .eq('id', id)
          .single()
        if (error) throw error
        return data
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}

export function usePrefetchJob() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['jobs', 'detail', id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single()
        if (error) throw error
        return data
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}

export function usePrefetchContact() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['contacts', 'detail', id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contacts')
          .select('*, contact_types(*)')
          .eq('id', id)
          .single()
        if (error) throw error
        return data
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}

export function usePrefetchListing() {
  const queryClient = useQueryClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['disposition', 'listings', id],
      queryFn: async () => {
        const res = await fetch(`/api/disposition/listings/${id}`)
        if (!res.ok) throw new Error('Failed to prefetch listing')
        const { data } = await res.json()
        return data
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}
