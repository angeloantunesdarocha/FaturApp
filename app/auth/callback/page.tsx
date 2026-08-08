"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientBrowser } from "@/lib/supabase";
import { loginWithGoogle } from "@/app/actions";

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function finish() {
      const code = params.get("code");
      if (!code) {
        setError("Não foi possível concluir o acesso com Google.");
        return;
      }
      const supabase = createClientBrowser();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError("Não foi possível validar sua conta Google. Tente novamente.");
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError("Não foi possível concluir sua sessão Google.");
        return;
      }
      const result = await loginWithGoogle(accessToken);
      if (cancelled) return;
      if (!result.success) {
        setError(result.error || "Não foi possível criar sua conta com Google.");
        await supabase.auth.signOut();
        return;
      }
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    }
    finish();
    return () => { cancelled = true; };
  }, [params, router]);

  return <main className="min-h-[60vh] flex items-center justify-center px-4">
    <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center space-y-4">
      {error ? <><h1 className="text-xl font-bold text-slate-900">Não foi possível entrar</h1><p className="text-sm text-slate-600">{error}</p><a href="/login" className="btn btn-primary inline-flex">Voltar para o login</a></> : <><h1 className="text-xl font-bold text-slate-900">Entrando com Google...</h1><p className="text-sm text-slate-600">Estamos preparando sua conta no FaturApp.</p></>}
    </div>
  </main>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center">
            <p className="text-sm text-slate-600">Carregando…</p>
          </div>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
