import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

// O projeto de produção sofreu rotação/invalidação da chave anon configurada no Vercel.
// A publishable key é própria para uso público no frontend e no cliente Supabase.
// Mantemos um fallback público válido para que a aplicação continue funcionando
// mesmo antes da atualização das variáveis de ambiente do deployment.
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xWKZMSatiw8X54ZqQm0LuQ_hiiLTD0k'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL e uma chave Supabase válida são obrigatórias.')
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
