"use client";

import { useState } from "react";
import { loginUser, registerUser } from "@/app/actions";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabase";

type Props = { mode: "login" | "register"; oauthError?: string };

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

function Divider() {
  return (
    <div className="my-1 flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="select-none text-xs font-medium text-slate-400">ou</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  showPassword,
  setShowPassword,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  autoComplete: string;
}) {
  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        className="input border-slate-400 py-3 pr-12 text-slate-900 placeholder:text-slate-400"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-slate-800"
        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
      >
        {showPassword ? "🙈" : "👁️"}
      </button>
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("Processando...");
    const result = isRegister
      ? await registerUser(login, password, email)
      : await loginUser(login, password);

    if (!result.success) {
      setStatus("❌ " + result.error);
      return;
    }

    if (isRegister) {
      const fbq = (window as typeof window & {
        fbq?: (...args: unknown[]) => void;
      }).fbq;
      fbq?.("track", "CompleteRegistration");
    }

    router.push("/");
    router.refresh();
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setStatus("");

    try {
      const supabase = createClientBrowser();
      const redirectTo = window.location.origin + "/auth/callback";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });

      if (error) {
        setStatus("❌ Erro ao iniciar login com Google. Tente novamente.");
        setGoogleLoading(false);
      }
    } catch {
      setStatus("❌ Erro inesperado. Tente novamente.");
      setGoogleLoading(false);
    }
  }

  if (isRegister) {
    return (
      <div className="mx-auto max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-600">Primeiro passo</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-[#0f2d4a]">Criar conta</h1>
          <p className="mt-3 text-base leading-7 text-slate-700">Cadastre seu próprio login para descobrir seu lucro de verdade.</p>
        </div>

        <button type="button" onClick={handleGoogleLogin} disabled={googleLoading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
          <GoogleIcon />{googleLoading ? "Redirecionando…" : "Continuar com Google"}
        </button>

        <Divider />

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0f2d4a]" htmlFor="login">Login</label>
            <input id="login" className="input border-slate-400 py-3 text-slate-900 placeholder:text-slate-400" value={login} onChange={(event) => setLogin(event.target.value)} placeholder="Nome ou endereço de e-mail" required maxLength={120} />
            <p className="mt-1 text-xs leading-5 text-slate-500">Pode usar nome, nomes com espaços ou e-mail.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0f2d4a]" htmlFor="recovery-email">E-mail de recuperação</label>
            <input id="recovery-email" type="email" className="input border-slate-400 py-3 text-slate-900 placeholder:text-slate-400" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seuemail@exemplo.com" required autoComplete="email" />
            <p className="mt-1 text-xs leading-5 text-slate-500">Usaremos este e-mail somente para recuperar seu acesso.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0f2d4a]">Senha</label>
            <PasswordField value={password} onChange={setPassword} showPassword={showPassword} setShowPassword={setShowPassword} autoComplete="new-password" />
            <p className="mt-1 text-xs leading-5 text-slate-500">A senha deve ter no mínimo 6 caracteres, incluindo 1 letra maiúscula, 1 número e 1 caractere especial.</p>
          </div>
          <button type="submit" className="btn btn-primary w-full">Criar conta</button>
        </form>

        {(status || oauthMessage) && <p className="text-center text-sm text-slate-600" role="status">{status || oauthMessage}</p>}
        <div className="text-center text-sm"><a className="font-semibold text-brand-700" href="/login">Já tenho uma conta</a></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,.22),transparent_34%),linear-gradient(135deg,#071c31_0%,#123b63_58%,#087443_100%)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="login-banner-viewport mb-5 border border-emerald-200/20 bg-white/10 py-3 shadow-lg backdrop-blur" aria-label="Como o FaturApp ajuda">
          <div className="login-banner-track text-xs font-bold uppercase tracking-[.13em] text-emerald-100">
            {[0, 1].map((sequence) => (
              <div key={sequence} className="login-banner-sequence" aria-hidden={sequence === 1}>
                <span>1 · Registre seu dia</span><span className="text-emerald-300">→</span>
                <span>2 · Desconte seus custos</span><span className="text-emerald-300">→</span>
                <span>3 · Descubra seu lucro real</span><span className="text-emerald-300">→</span>
              </div>
            ))}
          </div>
        </div>

        <section className="animate-fade-up rounded-[1.75rem] border border-white/50 bg-white p-6 shadow-2xl shadow-black/20 sm:p-9" aria-labelledby="login-form-title">
          <div className="mb-6 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Acesso seguro
            </div>
            <h1 id="login-form-title" className="mt-4 text-3xl font-extrabold tracking-tight text-[#0f2d4a]">Entrar no FaturApp</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Continue de onde parou e veja quanto sobrou de verdade no seu dia.</p>
          </div>

          <button type="button" onClick={handleGoogleLogin} disabled={googleLoading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/40 disabled:cursor-not-allowed disabled:opacity-60">
            {googleLoading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" /> : <GoogleIcon />}
            {googleLoading ? "Redirecionando para o Google…" : "Continuar com Google"}
          </button>

          <Divider />

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0f2d4a]" htmlFor="login">Login</label>
              <input id="login" className="input border-slate-400 py-3 text-slate-900 placeholder:text-slate-400" value={login} onChange={(event) => setLogin(event.target.value)} placeholder="Nome ou endereço de e-mail" required maxLength={120} />
              <p className="mt-1 text-xs leading-5 text-slate-500">Pode usar nome, nomes com espaços ou e-mail.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0f2d4a]" htmlFor="password">Senha</label>
              <PasswordField value={password} onChange={setPassword} showPassword={showPassword} setShowPassword={setShowPassword} autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-primary w-full transition-transform duration-200 hover:scale-[1.01]">Descobrir meu lucro real</button>
          </form>

          {(status || oauthMessage) && <p className="mt-4 text-center text-sm text-slate-600" role="status">{status || oauthMessage}</p>}

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <a className="mb-4 block text-sm font-semibold text-slate-600 transition-colors hover:text-[#123B63]" href="/recuperar">Esqueci meu login ou senha</a>
            <a className="text-[15px] font-semibold text-brand-700 transition-colors hover:text-brand-800" href="/cadastro">Criar conta grátis — leva 1 minuto</a>
          </div>
        </section>

        <p className="mt-5 text-center text-xs font-medium text-white/75">Seu lucro real fica organizado por dia, quilômetro e hora.</p>
      </div>
    </div>
  );
}
