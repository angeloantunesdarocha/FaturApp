"use client";

import { useEffect, useState } from "react";
import { loginUser, registerUser, saveRecoveryEmail } from "@/app/actions";
import { createClientBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Props = { mode: "login" | "register" };
type LoginResult = { success: boolean; error?: string; needsRecoveryEmail?: boolean };

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [needsRecoveryEmail, setNeedsRecoveryEmail] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const isRegister = mode === "register";

  useEffect(() => {
    if (isRegister && login.includes("@") && !email) setEmail(login.trim().toLowerCase());
  }, [login, email, isRegister]);

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setStatus("Redirecionando para o Google...");
    const supabase = createClientBrowser();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setGoogleLoading(false);
      setStatus("❌ Não foi possível iniciar o acesso com Google. Tente novamente.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setStatus("Processando...");
    const result = (isRegister ? await registerUser(login, password, email) : await loginUser(login, password)) as LoginResult;
    if (!result.success) { setStatus(`❌ ${result.error}`); return; }
    if (!isRegister && result.needsRecoveryEmail) { setNeedsRecoveryEmail(true); setStatus(""); return; }
    router.push("/"); router.refresh();
  }

  async function saveEmailAfterLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Salvando...");
    const result = await saveRecoveryEmail(email);
    if (!result.success) { setStatus(`❌ ${result.error}`); return; }
    router.push("/"); router.refresh();
  }

  if (!isRegister && needsRecoveryEmail) {
    return <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
      <div><h1 className="text-2xl font-bold text-slate-900">Proteja seu acesso</h1><p className="text-sm text-slate-600 mt-2">Para sua segurança, cadastre seu e-mail pessoal para conseguir recuperar seu login ou senha futuramente caso perca o acesso à plataforma.</p></div>
      <form onSubmit={saveEmailAfterLogin} className="space-y-4">
        <div><label className="label">E-mail pessoal para recuperação</label><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex: seuemail@gmail.com" required maxLength={254} autoComplete="email" /><p className="text-xs text-slate-500 mt-1">Seu e-mail será usado somente para recuperar seu login ou criar uma nova senha.</p></div>
        <button type="submit" className="btn btn-primary w-full">Cadastrar e continuar</button>
      </form>
      {status && <p className="text-sm text-center text-slate-600" role="status">{status}</p>}
    </div>;
  }

  return <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{isRegister ? "Criar conta" : "Você está lucrando ou pagando pra trabalhar?"}</h1>
      <p className="text-sm text-slate-600 mt-2">{isRegister ? "Cadastre seu próprio login para descobrir seu lucro de verdade." : "O FaturApp mostra o lucro de verdade do motorista de app — por dia, por km e por hora."}</p>
      {!isRegister && <p className="text-sm text-slate-600 mt-2">Entre para ver quanto sobrou de verdade no seu dia.</p>}
    </div>

    <button type="button" onClick={signInWithGoogle} disabled={googleLoading} className="w-full min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60 flex items-center justify-center gap-3" aria-label="Continuar com Google">
      <span aria-hidden="true" className="text-lg font-bold">G</span>
      {googleLoading ? "Conectando ao Google..." : isRegister ? "Cadastrar com Google" : "Continuar com Google"}
    </button>
    <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>ou</span><span className="h-px flex-1 bg-slate-200" /></div>

    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">Login</label><input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Nome ou endereço de e-mail" required maxLength={120} /><p className="text-xs text-slate-500 mt-1">Pode usar nome, nomes com espaços ou e-mail. Maiúsculas e minúsculas são aceitas.</p></div>
      {isRegister && <div><label className="label">E-mail para recuperação</label><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex: seuemail@gmail.com" required maxLength={254} autoComplete="email" /><p className="text-xs text-slate-500 mt-1">Usaremos este e-mail somente para ajudar você a recuperar seu login ou criar uma nova senha se perder o acesso.</p></div>}
      <div><label className="label">Senha</label><div className="relative"><input type={showPassword ? "text" : "password"} className="input pr-12" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isRegister ? "new-password" : "current-password"}/><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-slate-800" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? "🙈" : "👁️"}</button></div>{isRegister && <p className="text-xs text-slate-500 mt-1">A senha deve ter no mínimo 4 caracteres, incluindo pelo menos 1 letra maiúscula, 1 número e 1 caractere especial.</p>}</div>
      <button type="submit" className="btn btn-primary w-full">{isRegister ? "Criar conta" : "Entrar"}</button>
    </form>
    {status && <p className="text-sm text-center text-slate-600" role="status">{status}</p>}
    <div className="text-center text-sm">{isRegister ? <a className="text-brand-700 font-semibold" href="/login">Já tenho uma conta</a> : <><a className="text-brand-700 font-semibold" href="/cadastro">Criar minha conta grátis</a><p className="mt-1 text-xs text-slate-500">Leva menos de 1 minuto.</p></>}</div>
  </div>;
}
