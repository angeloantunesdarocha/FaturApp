import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente para Client Components. O @supabase/ssr persiste o estado PKCE
// em cookies, evitando a perda do code verifier entre navegações.
export function createClientBrowser() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Cliente para Server Actions / Server Components.
// O armazenamento em cookies é compartilhado com o navegador.
export function createClientServer() {
  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components podem não permitir escrita de cookies.
          // O middleware faz o refresh e persiste a sessão quando necessário.
        }
      },
    },
  })
}

// Cliente usado exclusivamente pelo middleware, que recebe o cookie store
// diretamente do request/response do Next.js.
export function createClientMiddleware(request: NextRequest, response: NextResponse) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })
}
