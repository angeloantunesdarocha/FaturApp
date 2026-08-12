import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias.')
}

const configuredSupabaseUrl = supabaseUrl
const configuredSupabaseKey = supabaseKey

// Cliente para Client Components
export function createClientBrowser() {
  return createBrowserClient(configuredSupabaseUrl, configuredSupabaseKey, {
    auth: { flowType: 'pkce' },
  })
}

// Cliente para Server Components / Server Actions
export function createClientServer() {
  return createClient(configuredSupabaseUrl, configuredSupabaseKey)
}
