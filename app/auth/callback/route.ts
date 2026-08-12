import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Callback do Google OAuth via Supabase.
 * Cria a sessão customizada do FaturApp e retorna ao Dashboard no mesmo
 * domínio que iniciou o fluxo OAuth.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/";

  // Nunca usa NEXT_PUBLIC_APP_URL para o callback: em produção/preview ele
  // pode apontar para outro deployment e fazer o usuário perder o cookie.
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? requestUrl.host;
  const origin = `${forwardedProto}://${forwardedHost}`;

  // Aceita somente caminhos internos para evitar redirecionamento externo.
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/";

  const loginError = (error: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, origin));

  if (!code) return loginError("oauth_missing_code");

  try {
    const cookieStore = cookies();
    const response = NextResponse.redirect(new URL(next, origin));
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      }
    );

    // 1. Trocar o código OAuth pela sessão do Supabase.
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData?.user) {
      console.error("OAuth exchangeCode error:", {
        message: sessionError?.message,
        code: sessionError?.code,
        status: sessionError?.status,
      });
      return loginError("oauth_exchange_failed");
    }

    const email = sessionData.user.email ?? "";
    const googleId = sessionData.user.id;

    if (!email) return loginError("oauth_no_email");

    // 2. Criar/localizar a conta e gerar a sessão própria do FaturApp.
    const { data: authData, error: authError } = await supabase.rpc("app_google_auth", {
      p_email: email,
      p_google_id: googleId,
    });

    const sessionToken = authData?.[0]?.session_token;

    if (authError || !sessionToken) {
      console.error("app_google_auth RPC error:", authError);
      return loginError("oauth_auth_failed");
    }

    // 3. O cookie e o redirect saem na MESMA resposta HTTP. Isso evita que
    // o navegador chegue ao Dashboard antes de receber a sessão.
    response.cookies.set("faturapp_session", String(sessionToken), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
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
