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
      <h1 className={isRegister ? "text-3xl font-extrabold leading-tight tracking-tight text-[#123B63]" : "text-4xl font-extrabold leading-[1.08] tracking-[-0.025em] text-[#123B63] sm:text-[2.75rem]"}>{isRegister ? "Criar conta" : "Você está lucrando ou pagando pra trabalhar?"}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{isRegister ? "Cadastre seu próprio login para descobrir seu lucro de verdade." : "O FaturApp mostra o lucro de verdade do motorista de app — por dia, por km e por hora."}</p>
      {!isRegister && <p className="mt-2 text-sm leading-6 text-slate-600">Entre para ver quanto sobrou de verdade no seu dia.</p>}
    </div>
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">Login</label><input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Nome ou endereço de e-mail" required maxLength={120} /><p className="mt-1 text-xs text-slate-500">Pode usar nome, nomes com espaços ou e-mail. Maiúsculas e minúsculas são aceitas.</p></div>
      <div><label className="label">Senha</label><div className="relative"><input type={showPassword ? "text" : "password"} className="input pr-12" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isRegister ? "new-password" : "current-password"}/><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-slate-800" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? "🙈" : "👁️"}</button></div>{isRegister && <p className="mt-1 text-xs text-slate-500">A senha deve ter no mínimo 4 caracteres, incluindo pelo menos 1 letra maiúscula, 1 número e 1 caractere especial.</p>}</div>
      <button type="submit" className="btn btn-primary w-full">{isRegister ? "Criar conta" : "Entrar"}</button>
    </form>
    {status && <p className="text-center text-sm text-slate-600">{status}</p>}
    <div className="text-center text-sm">{isRegister ? <a className="font-semibold text-brand-700" href="/login">Já tenho uma conta</a> : <><a className="font-semibold text-brand-700" href="/cadastro">Criar minha conta grátis</a><p className="mt-1 text-xs text-slate-500">Leva menos de 1 minuto.</p></>}</div>
  </div>;
}
