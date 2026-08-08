"use client";

import { useState } from "react";
import { loginUser, registerUser } from "@/app/actions";
import { useRouter } from "next/navigation";

type Props = { mode: "login" | "register" };

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const isRegister = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setStatus("Processando...");
    const result = isRegister ? await registerUser(login, password) : await loginUser(login, password);
    if (!result.success) { setStatus(`❌ ${result.error}`); return; }
    router.push("/"); router.refresh();
  }

  if (isRegister) {
    return <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-[#0f2d4a]">Criar conta</h1>
        <p className="mt-3 text-base leading-7 text-slate-700">Cadastre seu próprio login para descobrir seu lucro de verdade.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="mb-1 block text-sm font-semibold text-[#0f2d4a]">Login</label><input className="input border-slate-400 py-3 text-slate-900 placeholder:text-slate-400" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Nome ou endereço de e-mail" required maxLength={120} /><p className="mt-1 text-xs leading-5 text-slate-500">Pode usar nome, nomes com espaços ou e-mail. Maiúsculas e minúsculas são aceitas.</p></div>
        <div><label className="mb-1 block text-sm font-semibold text-[#0f2d4a]">Senha</label><div className="relative"><input type={showPassword ? "text" : "password"} className="input border-slate-400 py-3 pr-12 text-slate-900 placeholder:text-slate-400" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password"/><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-slate-800" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? "🙈" : "👁️"}</button></div><p className="mt-1 text-xs leading-5 text-slate-500">A senha deve ter no mínimo 4 caracteres, incluindo pelo menos 1 letra maiúscula, 1 número e 1 caractere especial.</p></div>
        <button type="submit" className="btn btn-primary w-full">Criar conta</button>
      </form>
      {status && <p className="text-center text-sm text-slate-600">{status}</p>}
      <div className="text-center text-sm"><a className="font-semibold text-brand-700" href="/login">Já tenho uma conta</a></div>
    </div>;
  }

  return <main className="min-h-screen overflow-hidden bg-gradient-to-br from-[#0f2d4a] via-[#123a5e] to-[#16a34a] px-4 py-8 sm:px-6 lg:py-12">
    <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
      <section className="text-white" aria-labelledby="login-hero-title">
        <div className="animate-fade-up">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">FaturApp</p>
          <h1 id="login-hero-title" className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">Você está lucrando ou pagando pra trabalhar?</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-100 sm:text-lg sm:leading-8">O FaturApp revela seu lucro de verdade — por dia, por km e por hora — em 30 segundos por dia.</p>
        </div>

        <div className="animate-fade-up mt-7 max-w-md rounded-2xl border border-white/10 bg-[#0f2d4a] p-5 shadow-2xl [animation-delay:150ms] sm:p-6">
          <div className="mb-5 flex items-center justify-between"><p className="text-sm font-semibold text-white">Hoje <span className="font-normal text-slate-300">• sábado</span></p><span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-300">exemplo</span></div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4"><span className="text-slate-300">Valor bruto</span><strong className="text-lg text-white">R$ 210,00</strong></div>
            <div className="flex items-center justify-between gap-4"><span className="text-slate-300">Taxas do app</span><strong className="text-lg text-red-300">− R$ 52,50</strong></div>
            <div className="border-t border-white/10 pt-4"><div className="flex items-end justify-between gap-4"><span className="font-semibold text-white">LUCRO REAL</span><strong className="text-3xl font-extrabold text-emerald-400">R$ 157,50</strong></div><p className="mt-2 text-right text-xs font-medium text-slate-300">R$ 19,69/hora • R$ 1,31/km</p></div>
          </div>
        </div>

        <div className="animate-fade-up mt-6 flex max-w-xl flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/90 [animation-delay:300ms] sm:text-sm">
          <span>🔒 Seus dados protegidos</span><span>✅ Grátis para começar</span><span>💳 Sem cartão</span>
        </div>
      </section>

      <section className="animate-fade-up rounded-2xl border border-white/40 bg-white p-6 shadow-xl [animation-delay:200ms] sm:p-8" aria-labelledby="login-form-title">
        <div className="mb-6"><h2 id="login-form-title" className="text-2xl font-extrabold tracking-tight text-[#0f2d4a]">Entrar no FaturApp</h2><p className="mt-2 text-sm leading-6 text-slate-600">Acesse sua conta e descubra quanto sobrou de verdade no seu dia.</p></div>
        <form onSubmit={submit} className="space-y-5">
          <div><label className="mb-1.5 block text-sm font-semibold text-[#0f2d4a]" htmlFor="login">Login</label><input id="login" className="input border-slate-400 py-3 text-slate-900 placeholder:text-slate-400" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Nome ou endereço de e-mail" required maxLength={120} /><p className="mt-1 text-xs leading-5 text-slate-500">Pode usar nome, nomes com espaços ou e-mail. Maiúsculas e minúsculas são aceitas.</p></div>
          <div><label className="mb-1.5 block text-sm font-semibold text-[#0f2d4a]" htmlFor="password">Senha</label><div className="relative"><input id="password" type={showPassword ? "text" : "password"} className="input border-slate-400 py-3 pr-12 text-slate-900 placeholder:text-slate-400" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"/><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-slate-800" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? "🙈" : "👁️"}</button></div></div>
          <button type="submit" className="btn btn-primary w-full transition-transform duration-200 hover:scale-[1.01]">Descobrir meu lucro real</button>
        </form>
        {status && <p className="mt-4 text-center text-sm text-slate-600" role="status">{status}</p>}
        <div className="mt-6 border-t border-slate-100 pt-5 text-center"><a className="text-[15px] font-semibold text-brand-700 hover:text-brand-800" href="/cadastro">Criar conta grátis — leva 1 minuto</a></div>
      </section>
    </div>
  </main>;
}
