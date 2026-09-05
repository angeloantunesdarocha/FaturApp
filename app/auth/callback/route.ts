import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { trustedAppOrigin, safeAuthPath } from "@/lib/auth-redirect";
import { configuredSupabaseUrl, configuredSupabaseKey } from "@/lib/supabase";

/**
 * Callback do Google OAuth via Supabase.
 * Cria a sessão customizada do FaturApp e retorna ao Dashboard no mesmo
 * domínio que iniciou o fluxo OAuth.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/";

  const origin = trustedAppOrigin(request.url);
  const next = safeAuthPath(requestedNext, origin);

  const loginError = (error: string, detail?: string) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", error);
    if (detail) url.searchParams.set("detail", detail.slice(0, 80));
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  };

  if (!code) return loginError("oauth_missing_code");

  try {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(new URL(next, origin));
    const supabase = createServerClient(
      configuredSupabaseUrl,
      configuredSupabaseKey,
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
      return loginError("oauth_exchange_failed", sessionError?.code ?? "unknown");
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
      return loginError("oauth_auth_failed", authError?.code ?? "rpc_error");
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
