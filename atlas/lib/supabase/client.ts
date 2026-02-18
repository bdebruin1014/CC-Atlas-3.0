import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (typeof window !== 'undefined') {
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    console.warn('[ATLAS] NEXT_PUBLIC_SUPABASE_URL is not configured – Supabase calls will fail.')
  }
  if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-anon-key') {
    console.warn('[ATLAS] NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured – Supabase calls will fail.')
  }
}

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client
  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  return client
}
