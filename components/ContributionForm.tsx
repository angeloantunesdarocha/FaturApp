"use client";

import { useEffect, useState } from "react";

type Contribution = {
  amount: number;
  currency: string;
  status: string;
  provider_status: string;
  payer_email: string;
  next_payment_at: string | null;
};

const presets = [5, 10, 20, 30];

export default function ContributionForm({ returned }: { returned: boolean }) {
  const [amount, setAmount] = useState("10");
  const [payerEmail, setPayerEmail] = useState("");
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadStatus() {
    const response = await fetch("/api/contributions/status", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    setContribution(payload.contribution || null);
  }

  useEffect(() => { void loadStatus(); }, []);

  async function startCheckout(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/contributions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, payerEmail }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error || "Não foi possível iniciar o pagamento.");
        return;
      }
      window.location.assign(payload.checkoutUrl);
    } catch {
      setStatus("Não foi possível conectar ao pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelContribution() {
    if (!window.confirm("Cancelar a contribuição mensal do FaturApp?")) return;
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/contributions/cancel", { method: "DELETE" });
      const payload = await response.json();
      setStatus(response.ok ? "Contribuição cancelada." : payload.error || "Não foi possível cancelar.");
      if (response.ok) await loadStatus();
    } catch {
      setStatus("Não foi possível cancelar agora.");
    } finally {
      setLoading(false);
    }
  }

  const active = contribution && ["pending", "active", "past_due", "paused"].includes(contribution.status);

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <div className="text-center">
        <p className="text-xs font-extrabold uppercase tracking-[.16em] text-emerald-600">Apoio voluntário</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0f2d4a] sm:text-4xl">Ajude a manter o FaturApp gratuito</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
          Se o FaturApp ajuda você a entender o seu lucro real, escolha uma contribuição mensal no valor que considerar justo.
        </p>
      </div>

      {returned && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Você voltou do Mercado Pago. O status será atualizado assim que a confirmação chegar.</div>}

      {active ? (
        <div className="mt-8 space-y-4 rounded-2xl bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">Sua contribuição mensal</p>
              <p className="mt-1 text-3xl font-black text-[#123B63]">R$ {Number(contribution.amount).toFixed(2).replace(".", ",")}</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-700">{contribution.status === "active" ? "Ativa" : "Aguardando confirmação"}</span>
          </div>
          <p className="text-sm text-slate-600">Cobraremos mensalmente no meio de pagamento autorizado. Você pode cancelar quando quiser.</p>
          <button type="button" onClick={cancelContribution} disabled={loading} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">Cancelar contribuição</button>
        </div>
      ) : (
        <form onSubmit={startCheckout} className="mt-8 space-y-6">
          <fieldset>
            <legend className="text-sm font-bold text-[#0f2d4a]">Escolha o valor mensal</legend>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {presets.map((preset) => (
                <button key={preset} type="button" onClick={() => setAmount(String(preset))} className={"rounded-2xl border px-4 py-3 text-base font-extrabold transition " + (amount === String(preset) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-[#123B63] hover:border-emerald-300")}>R$ {preset}</button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-semibold text-[#0f2d4a]" htmlFor="custom-amount">Outro valor</label>
            <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
              <span className="text-sm font-bold text-slate-500">R$</span>
              <input id="custom-amount" value={amount} onChange={(event) => setAmount(event.target.value.replace(",", ".").replace(/[^0-9.]/g, ""))} inputMode="decimal" min="3" max="500" step="0.01" required className="w-full border-0 bg-transparent px-2 py-3 text-slate-900 outline-none" />
            </div>
            <p className="mt-1 text-xs text-slate-500">Mínimo de R$ 3 e máximo de R$ 500 por mês.</p>
          </fieldset>

          <div>
            <label className="block text-sm font-semibold text-[#0f2d4a]" htmlFor="payer-email">E-mail para o Mercado Pago</label>
            <input id="payer-email" type="email" value={payerEmail} onChange={(event) => setPayerEmail(event.target.value)} placeholder="seuemail@exemplo.com" required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            <p className="mt-1 text-xs text-slate-500">Usado para identificar a autorização de cobrança recorrente.</p>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-emerald-500 px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60">{loading ? "Abrindo Mercado Pago…" : "Contribuir mensalmente →"}</button>
          <p className="text-center text-xs leading-5 text-slate-500">A contribuição é opcional, recorrente e cancelável quando quiser. O FaturApp continua gratuito sem ela.</p>
        </form>
      )}

      {status && <p className="mt-5 text-center text-sm font-semibold text-slate-700" role="status">{status}</p>}
    </section>
  );
}