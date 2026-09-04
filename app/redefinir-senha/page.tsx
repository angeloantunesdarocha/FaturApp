"use client";

import { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabase";

function validPassword(password: string) {
  return password.length >= 6 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [login, setLogin] = useState("");
  const [status, setStatus] = useState("Carregando sua recuperação segura…");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClientBrowser();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        setStatus("Este link expirou ou já foi utilizado. Solicite um novo link de recuperação.");
        return;
      }
      const { data: identity } = await supabase.rpc("app_get_recovery_identity");
      setLogin(identity?.[0]?.login ?? "");
      setReady(true);
      setStatus("");
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validPassword(password)) {
      setStatus("A senha precisa ter no mínimo 6 caracteres, uma letra maiúscula, um número e um caractere especial.");
      return;
    }
    if (password !== confirmation) {
      setStatus("As senhas não conferem.");
      return;
    }
    setLoading(true);
    const supabase = createClientBrowser();
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      setLoading(false);
      setStatus("Não foi possível atualizar a senha. Solicite um novo link e tente novamente.");
      return;
    }
    const { error } = await supabase.rpc("app_sync_recovered_password", { p_password: password });
    setLoading(false);
    if (error) {
      setStatus("O link foi aceito, mas não encontramos uma conta do FaturApp vinculada a este e-mail.");
      return;
    }
    window.location.href = "/?recovered=1";
  }

  return (
    <main className="min-h-[70vh] py-8 sm:py-12">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-600">Acesso recuperado</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#123B63]">Crie uma nova senha</h1>
        <p className="mt-3 leading-7 text-slate-600">Escolha uma senha nova para voltar a acompanhar seu lucro real.</p>
        {login && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Seu login é: <strong>{login}</strong></p>}
        {ready ? <form onSubmit={submit} className="mt-6 space-y-4">
          <div><label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-[#123B63]">Nova senha</label><input id="new-password" type="password" required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input py-3" /></div>
          <div><label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-[#123B63]">Confirme a nova senha</label><input id="confirm-password" type="password" required autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="input py-3" /></div>
          <button type="submit" disabled={loading} className="btn w-full bg-[#10B981] py-3 font-bold text-white hover:bg-[#059669]">{loading ? "Salvando…" : "Salvar nova senha"}</button>
        </form> : <p className="mt-6 rounded-xl bg-slate-50 p-4 text-center text-sm leading-6 text-slate-600">{status}</p>}
        {ready && status && <p role="status" className="mt-4 text-center text-sm text-red-600">{status}</p>}
      </div>
    </main>
  );
}
