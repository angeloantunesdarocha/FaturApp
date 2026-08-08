"use client";

import { useState } from "react";
import { saveRecoveryEmail } from "@/app/actions";

export default function RecoveryEmailNotice() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Salvando...");
    const result = await saveRecoveryEmail(email);
    if (!result.success) {
      setStatus(`❌ ${result.error}`);
      return;
    }
    setSaved(true);
    setStatus("🟢 E-mail cadastrado com sucesso. Agora você poderá recuperar seu login ou senha se perder o acesso.");
  }

  if (saved) {
    return <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-slate-700" role="status"><p className="font-semibold text-brand-800">E-mail de recuperação cadastrado</p><p className="mt-1">Agora você poderá recuperar seu login ou senha futuramente caso perca o acesso à plataforma.</p></div>;
  }

  return <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3" aria-labelledby="recovery-email-title">
    <div>
      <h2 id="recovery-email-title" className="font-semibold text-slate-900">Cadastre seu e-mail pessoal para recuperação</h2>
      <p className="text-sm text-slate-700 mt-1">Seu e-mail será usado somente para ajudar você a recuperar seu login ou criar uma nova senha caso perca o acesso à plataforma.</p>
    </div>
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
      <input type="email" className="input flex-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex: seuemail@gmail.com" required autoComplete="email" maxLength={254} aria-label="E-mail pessoal para recuperação" />
      <button type="submit" className="btn btn-primary whitespace-nowrap">Cadastrar e-mail</button>
    </form>
    {status && <p className="text-sm text-slate-700" role="status">{status}</p>}
  </section>;
}
