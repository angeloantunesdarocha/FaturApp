import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Callback do Google OAuth via Supabase.
 *
 * O login é iniciado no navegador com createBrowserClient. O cliente SSR
 * mantém o code_verifier em cookie, permitindo que o servidor troque o code
 * OAuth pelo usuário sem depender de localStorage.
 * Depois da troca, o FaturApp cria sua sessão própria e redireciona para /.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/";

  const forwardedProto = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? requestUrl.host;
  const origin = `${forwardedProto}://${forwardedHost}`;

  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";

  const loginError = (error: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, origin));

  if (!code) return loginError("oauth_missing_code");

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {
              // Em Route Handler, a resposta explícita abaixo recebe o cookie
              // da sessão própria do FaturApp. O Supabase cookie é apenas o
              // mecanismo de transporte do PKCE nesta etapa.
            }
          },
        },
      }
    );

    // 1. Troca segura do authorization code usando o code_verifier salvo pelo
    // createBrowserClient no cookie do navegador.
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData?.user) {
      console.error("OAuth exchangeCode error:", sessionError);
      return loginError("oauth_exchange_failed");
    }

    const email = sessionData.user.email ?? "";
    const googleId = sessionData.user.id;

    if (!email) return loginError("oauth_no_email");

    // 2. Localiza/cria o usuário do FaturApp e gera a sessão própria.
    const { data: authData, error: authError } = await supabase.rpc("app_google_auth", {
      p_email: email,
      p_google_id: googleId,
    });

    const sessionToken = authData?.[0]?.session_token;

    if (authError || !sessionToken) {
      console.error("app_google_auth RPC error:", authError);
      return loginError("oauth_auth_failed");
    }

    // 3. O cookie customizado e o redirect são enviados na mesma resposta.
    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.set("faturapp_session", String(sessionToken), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");

    return response;
  } catch (err) {
    console.error("Google OAuth callback unexpected error:", err);
    return loginError("oauth_unexpected");
  }
}
