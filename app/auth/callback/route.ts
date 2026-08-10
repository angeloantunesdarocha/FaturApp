import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Rota de callback para Google OAuth via Supabase.
 *
 * Fluxo:
 *  1. Supabase redireciona aqui com ?code=... após autenticação Google
 *  2. Trocamos o code pela sessão Supabase (PKCE)
 *  3. Pegamos email + id do usuário Google
 *  4. Chamamos app_google_auth RPC → cria/localiza user no sistema customizado
 *  5. Gravamos o cookie faturapp_session e redirecionamos para /
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // URL base dinâmica: funciona em dev, preview e produção
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (request.headers.get("x-forwarded-proto") ?? "https") + "://" + request.headers.get("host");

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_missing_code`);
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Trocar code por sessão Supabase (PKCE)
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData?.user) {
      console.error("OAuth exchangeCode error:", sessionError);
      return NextResponse.redirect(`${baseUrl}/login?error=oauth_exchange_failed`);
    }

    const googleId = sessionData.user.id;
    const email    = sessionData.user.email ?? "";

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/login?error=oauth_no_email`);
    }

    // 2. Autenticar/registrar no sistema de auth customizado (app_users / app_sessions)
    const { data: authData, error: authError } = await supabase.rpc("app_google_auth", {
      p_email:     email,
      p_google_id: googleId,
    });

    if (authError || !authData?.[0]?.session_token) {
      console.error("app_google_auth RPC error:", authError);
      return NextResponse.redirect(`${baseUrl}/login?error=oauth_auth_failed`);
    }

    const sessionToken: string = String(authData[0].session_token);

    // 3. Gravar cookie de sessão e redirecionar
    const response = NextResponse.redirect(`${baseUrl}${next}`);
    response.cookies.set("faturapp_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
      path:     "/",
      maxAge:   60 * 60 * 24 * 30, // 30 dias
    });

    return response;
  } catch (err) {
    console.error("Google OAuth callback unexpected error:", err);
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_unexpected`);
  }
}
