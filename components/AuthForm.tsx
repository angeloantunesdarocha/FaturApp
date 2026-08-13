"use client";

import { useState } from "react";
import { loginUser, registerUser } from "@/app/actions";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabase";

type Props = { mode: "login" | "register"; oauthError?: string };

// SVG oficial do Google para o botão
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

// Separador visual "ou"
function Divider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-medium text-slate-400 select-none">ou</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

export default function AuthForm({ mode, oauthError }: Props) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const isRegister = mode === "register";
  const oauthMessage = oauthError
    ? "Não foi possível concluir o login com Google. Verifique a configuração OAuth e tente novamente."
    : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Processando...");
    const result = isRegister
      ? await registerUser(login, password, email)
      : await loginUser(login, password);
    if (!result.success) { setStatus(`❌ ${result.error}`); return; }
    router.push("/");
    router.refresh();
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setStatus("");
    try {
      const supabase = createClientBrowser();

      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setStatus("❌ Erro ao iniciar login com Google. Tente novamente.");
        setGoogleLoading(false);
      }
      // Se não houver erro, o browser será redirecionado para o Google — não chegará aqui
    } catch {
      setStatus("❌ Erro inesperado. Tente novamente.");
      setGoogleLoading(false);
    }
  }

  // ── TELA DE CADASTRO ──────────────────────────────────────────────────────
  if (isRegister) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-[#0f2d4a]">Criar conta</h1>
          <p className="mt-3 text-base leading-7 text-slate-700">Cadastre seu próprio login para descobrir seu lucro de verdade.</p>
        </div>

        {/* Botão Google no cadastro também */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecionando…" : "Continuar com Google"}
        </button>

        <Divider />

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0f2d4a]">Login</label>
            <input className="input border-slate-400 py-3 text-slate-900 placeholder:text-slate-400" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Nome ou endereço de e-mail" required maxLength={120} />
            <p className="mt-1 text-xs leading-5 text-slate-500">Pode usar nome, nomes com espaços ou e-mail. Maiúsculas e minúsculas são aceitas.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0f2d4a]" htmlFor="recovery-email">E-mail de recuperação</label>
            <input id="recovery-email" type="email" className="input border-slate-400 py-3 text-slate-900 placeholder:text-slate-400" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" required autoComplete="email" />
            <p className="mt-1 text-xs leading-5 text-slate-500">Usaremos este e-mail somente para recuperar seu acesso.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0f2d4a]">Senha</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} className="input border-slate-400 py-3 pr-12 text-slate-900 placeholder:text-slate-400" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password"/>
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-slate-800" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? "🙈" : "👁️"}</button>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">A senha deve ter no mínimo 4 caracteres, incluindo pelo menos 1 letra maiúscula, 1 número e 1 caractere especial.</p>
          </div>
          <button type="submit" className="btn btn-primary w-full">Criar conta</button>
        </form>

        {(status || oauthMessage) && <p className="text-center text-sm text-slate-600" role="status">{status || oauthMessage}</p>}
        <div className="text-center text-sm"><a className="font-semibold text-brand-700" href="/login">Já tenho uma conta</a></div>
      </div>
    );
  }

  // ── TELA DE LOGIN ─────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-[#0f2d4a] via-[#123a5e] to-[#16a34a] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">

        {/* ── Coluna esquerda: hero ── */}
        <section className="text-white" aria-labelledby="login-hero-title">
          <div className="animate-fade-up">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">FaturApp</p>
            <h1 id="login-hero-title" className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">Você está lucrando ou pagando pra trabalhar?</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-100 sm:text-lg sm:leading-8">O FaturApp revela seu lucro de verdade — por dia, por km e por hora — em 30 segundos por dia.</p>
          </div>

          <div className="animate-fade-up mt-7 max-w-md rounded-2xl border border-white/10 bg-[#0f2d4a] p-5 shadow-2xl [animation-delay:150ms] sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Hoje <span className="font-normal text-slate-300">• sábado</span></p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-300">exemplo</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4"><span className="text-slate-300">Valor bruto</span><strong className="text-lg text-white">R$ 210,00</strong></div>
              <div className="flex items-center justify-between gap-4"><span className="text-slate-300">Taxas do app</span><strong className="text-lg text-red-300">− R$ 52,50</strong></div>
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-end justify-between gap-4"><span className="font-semibold text-white">LUCRO REAL</span><strong className="text-3xl font-extrabold text-emerald-400">R$ 157,50</strong></div>
                <p className="mt-2 text-right text-xs font-medium text-slate-300">R$ 19,69/hora • R$ 1,31/km</p>
              </div>
            </div>
          </div>

          <div className="animate-fade-up mt-6 flex max-w-xl flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/90 [animation-delay:300ms] sm:text-sm">
            <span>🔒 Seus dados protegidos</span><span>✅ Grátis para começar</span><span>💳 Sem cartão</span>
          </div>
        </section>

        {/* ── Coluna direita: formulário de login ── */}
        <section
          className="animate-fade-up rounded-2xl border border-white/40 bg-white p-6 shadow-xl [animation-delay:200ms] sm:p-8"
          aria-labelledby="login-form-title"
        >
          <div className="mb-6">
            <h2 id="login-form-title" className="text-2xl font-extrabold tracking-tight text-[#0f2d4a]">Entrar no FaturApp</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Acesse sua conta e descubra quanto sobrou de verdade no seu dia.</p>
          </div>

          {/* ── Botão Continuar com Google ── */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/40 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            ) : (
              <GoogleIcon />
            )}
            {googleLoading ? "Redirecionando para o Google…" : "Continuar com Google"}
          </button>

          <Divider />

          {/* ── Formulário email/senha ── */}
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0f2d4a]" htmlFor="login">Login</label>
              <input id="login" className="input border-slate-400 py-3 text-slate-900 placeholder:text-slate-400" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Nome ou endereço de e-mail" required maxLength={120} />
              <p className="mt-1 text-xs leading-5 text-slate-500">Pode usar nome, nomes com espaços ou e-mail.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0f2d4a]" htmlFor="password">Senha</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} className="input border-slate-400 py-3 pr-12 text-slate-900 placeholder:text-slate-400" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"/>
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-slate-800" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? "🙈" : "👁️"}</button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full transition-transform duration-200 hover:scale-[1.01]">Descobrir meu lucro real</button>
          </form>

          {(status || oauthMessage) && <p className="mt-4 text-center text-sm text-slate-600" role="status">{status || oauthMessage}</p>}

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <a className="mb-4 block text-sm font-semibold text-slate-600 hover:text-[#123B63]" href="/recuperar">Esqueci meu login ou senha</a>
            <a className="text-[15px] font-semibold text-brand-700 hover:text-brand-800" href="/cadastro">Criar conta grátis — leva 1 minuto</a>
          </div>
        </section>

      </div>
    </main>
  );
}
