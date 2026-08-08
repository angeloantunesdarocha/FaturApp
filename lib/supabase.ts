import { createClient } from '@supabase/supabase-js'

// Cliente para Client Components
export function createClientBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Cliente compartilhado para Client Components que precisam de uma instância
// estável do Supabase Auth (por exemplo, o callback OAuth).
export const supabase = createClientBrowser()

// Cliente para Server Components / Server Actions
export function createClientServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
