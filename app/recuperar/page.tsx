"use client";

import { useState } from "react";
import { requestPasswordRecovery } from "@/app/actions";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    const result = await requestPasswordRecovery(email);
    setLoading(false);
    if (!result.success) {
      setStatus(`❌ ${result.error}`);
      return;
    }
    setStatus("Se o e-mail estiver cadastrado, enviaremos um link seguro para recuperar seu acesso. Verifique também a caixa de spam.");
  }

  return (
    <main className="min-h-[70vh] py-8 sm:py-12">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-600">Recuperar acesso</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#123B63]">Esqueceu seu login ou senha?</h1>
          <p className="mt-3 leading-7 text-slate-600">Informe o e-mail usado no FaturApp. Enviaremos um link para recuperar sua conta com segurança.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="recovery-email" className="mb-1.5 block text-sm font-semibold text-[#123B63]">E-mail da conta</label>
            <input id="recovery-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seuemail@exemplo.com" className="input py-3 text-slate-900 placeholder:text-slate-400" />
          </div>
          <button type="submit" disabled={loading} className="btn w-full bg-[#10B981] py-3 font-bold text-white hover:bg-[#059669]">{loading ? "Enviando…" : "Enviar link de recuperação"}</button>
        </form>
        {status && <p role="status" className="mt-5 rounded-xl bg-slate-50 p-4 text-center text-sm leading-6 text-slate-600">{status}</p>}
        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm"><a href="/login" className="font-semibold text-[#168A4A] hover:underline">Voltar para o login</a></div>
      </div>
    </main>
  );
}
