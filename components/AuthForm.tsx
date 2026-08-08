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

  return <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
    <div>
      <h1 className={isRegister ? "text-3xl font-extrabold leading-tight tracking-tight text-[#0f2d4a]" : "text-xl font-extrabold leading-tight tracking-tight text-[#0f2d4a] md:text-2xl"}>{isRegister ? "Criar conta" : "Você está lucrando ou pagando pra trabalhar?"}</h1>
      <p className="mt-3 text-base leading-7 text-slate-700">{isRegister ? "Cadastre seu próprio login para descobrir seu lucro de verdade." : "O FaturApp mostra o lucro de verdade do motorista de app — por dia, por km e por hora."}</p>
      {!isRegister && <p className="mt-2 text-base leading-7 text-slate-700">Entre para ver quanto sobrou de verdade no seu dia.</p>}
    </div>
    <form onSubmit={submit} className="space-y-4">
      <div><label className="mb-1 block text-sm font-semibold text-[#0f2d4a]">Login</label><input className="input border-slate-400 py-3 text-slate-900 placeholder:text-slate-400" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Nome ou endereço de e-mail" required maxLength={120} /><p className="mt-1 text-xs leading-5 text-slate-500">Pode usar nome, nomes com espaços ou e-mail. Maiúsculas e minúsculas são aceitas.</p></div>
      <div><label className="mb-1 block text-sm font-semibold text-[#0f2d4a]">Senha</label><div className="relative"><input type={showPassword ? "text" : "password"} className="input border-slate-400 py-3 pr-12 text-slate-900 placeholder:text-slate-400" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isRegister ? "new-password" : "current-password"}/><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-slate-800" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? "🙈" : "👁️"}</button></div>{isRegister && <p className="mt-1 text-xs leading-5 text-slate-500">A senha deve ter no mínimo 4 caracteres, incluindo pelo menos 1 letra maiúscula, 1 número e 1 caractere especial.</p>}</div>
      <button type="submit" className="btn btn-primary w-full">{isRegister ? "Criar conta" : "Entrar"}</button>
    </form>
    {status && <p className="text-center text-sm text-slate-600">{status}</p>}
    <div className="text-center text-sm">{isRegister ? <a className="font-semibold text-brand-700" href="/login">Já tenho uma conta</a> : <><a className="text-[15px] font-semibold text-brand-700 hover:text-brand-800" href="/cadastro">Criar minha conta grátis</a><p className="mt-1 text-xs text-slate-500">Leva menos de 1 minuto.</p></>}</div>
  </div>;
}
