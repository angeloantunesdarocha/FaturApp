import { NextResponse, type NextRequest } from 'next/server'
import { createClientMiddleware } from '@/lib/supabase'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createClientMiddleware(request, response)

  // O getUser() valida a sessão no servidor e permite ao @supabase/ssr
  // renovar o token e persistir os cookies atualizados na resposta.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
