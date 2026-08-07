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
    e.preventDefault();
    setStatus("Processando...");
    const result = isRegister ? await registerUser(login, password) : await loginUser(login, password);
    if (!result.success) {
      setStatus(`❌ ${result.error}`);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isRegister ? "Criar conta" : "Entrar no FaturApp"}</h1>
        <p className="text-sm text-slate-600 mt-1">{isRegister ? "Cadastre seu próprio login para usar o aplicativo." : "Informe seu login e senha para continuar."}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Login</label>
          <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Nome ou endereço de e-mail" required maxLength={120} />
          <p className="text-xs text-slate-500 mt-1">Pode usar nome, nomes com espaços ou e-mail. Maiúsculas e minúsculas são aceitas.</p>
        </div>
        <div>
          <label className="label">Senha</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="input pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-slate-800"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          {isRegister && <p className="text-xs text-slate-500 mt-1">A senha deve ter no mínimo 4 caracteres, incluindo pelo menos 1 letra maiúscula, 1 número e 1 caractere especial.</p>}
        </div>
        <button type="submit" className="btn btn-primary w-full">{isRegister ? "Criar conta" : "Entrar"}</button>
      </form>

      {status && <p className="text-sm text-center text-slate-600">{status}</p>}

      <div className="text-center text-sm">
        {isRegister ? <a className="text-brand-700 font-semibold" href="/login">Já tenho uma conta</a> : <a className="text-brand-700 font-semibold" href="/cadastro">Criar uma conta</a>}
      </div>
    </div>
  );
}
