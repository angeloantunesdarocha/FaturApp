import { createClient } from '@supabase/supabase-js'

// Configuração pública do projeto FaturApp.
// As variáveis da Vercel continuam sendo aceitas quando válidas; o fallback
// evita que uma chave antiga/inválida em um ambiente Preview interrompa o login.
const SUPABASE_URL = 'https://lfevnehtomzktlicajcx.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xWKZMSatiw8X54ZqQm0LuQ_hiiLTD0k'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
const supabaseKey = SUPABASE_PUBLISHABLE_KEY

// Cliente para Client Components
export function createClientBrowser() {
  return createClient(supabaseUrl, supabaseKey)
}

// Cliente para Server Components / Server Actions
export function createClientServer() {
  return createClient(supabaseUrl, supabaseKey)
}
