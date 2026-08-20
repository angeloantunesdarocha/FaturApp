"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Contribution = {
  amount: number;
  currency: string;
  status: string;
  provider_status: string;
  payer_email: string;
  next_payment_at: string | null;
  canceled_at: string | null;
};

const presets = [5, 10, 20, 30];
const CONTRIBUTION_STARTED_AT_KEY = "faturapp:contribution-started-at";
const CONTRIBUTION_REMINDER_DELAY_MS = 5 * 60 * 1000;
const OPEN_CONTRIBUTION_STATUSES = ["pending", "past_due", "paused"];
type NoticeTone = "warning" | "info" | "success" | "sad";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function statusLabel(status: string) {
  if (status === "active") return "Ativa";
  if (status === "canceled") return "Cancelada";
  if (status === "failed") return "Falhou";
  return "Aguardando confirmação";
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(value));
}

function LineIcon({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        {children}
      </svg>
    </span>
  );
}

export default function ContributionForm({ returned }: { returned: boolean }) {
  const [amount, setAmount] = useState("10");
  const [payerEmail, setPayerEmail] = useState("");
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; message: string } | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const previousStatusRef = useRef<string | null>(null);

  const showNotice = useCallback((tone: NoticeTone, message: string) => {
    setNotice({ tone, message });

    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 7000);
  }, []);

  const loadStatus = useCallback(async (announce = false) => {
    if (announce) setCheckingStatus(true);

    try {
      const response = await fetch("/api/contributions/status", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const nextContribution = payload.contribution || null;
      const previousStatus = previousStatusRef.current;
      const startedAt = Number(window.localStorage.getItem(CONTRIBUTION_STARTED_AT_KEY) || 0);

      setContribution(nextContribution);

      if (
        nextContribution?.status === "active" &&
        (startedAt > 0 || (previousStatus !== null && previousStatus !== "active"))
      ) {
        window.localStorage.removeItem(CONTRIBUTION_STARTED_AT_KEY);
        showNotice("success", "🎉 Obrigado por contribuir com o FaturApp! Sua contribuição foi confirmada com sucesso. 💚😊");
      } else if (announce && nextContribution && OPEN_CONTRIBUTION_STATUSES.includes(nextContribution.status)) {
        showNotice("info", "⏳ A contribuição ainda não foi finalizada. Ela continua em aberto, aguardando a confirmação do Mercado Pago.");
      }

      previousStatusRef.current = nextContribution?.status || null;
    } finally {
      if (announce) setCheckingStatus(false);
    }
  }, [showNotice]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!returned) return;

    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      void loadStatus();
      if (attempts >= 8) window.clearInterval(interval);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [loadStatus, returned]);

  useEffect(() => {
    if (!contribution || !OPEN_CONTRIBUTION_STATUSES.includes(contribution.status)) return;

    const startedAt = Number(window.localStorage.getItem(CONTRIBUTION_STARTED_AT_KEY) || 0);
    if (!startedAt) return;

    const remaining = Math.max(0, CONTRIBUTION_REMINDER_DELAY_MS - (Date.now() - startedAt));
    const timer = window.setTimeout(() => {
      window.localStorage.removeItem(CONTRIBUTION_STARTED_AT_KEY);
      showNotice("warning", "⏰ Sua contribuição ainda está pendente. Quando puder, volte ao Mercado Pago e finalize a confirmação. 💚");
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [contribution, showNotice]);

  async function startCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const normalizedAmount = Number(amount);
    const normalizedEmail = payerEmail.trim().toLowerCase();

    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 3 || normalizedAmount > 500) {
      setStatus("Escolha um valor mensal entre R$ 3 e R$ 500.");
      return;
    }

    if (!normalizedEmail) {
      setStatus("Informe um e-mail válido para o pagamento.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/contributions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: normalizedAmount, payerEmail: normalizedEmail }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setStatus(payload.error || "Não foi possível iniciar o pagamento.");
        setLoading(false);
        return;
      }

      if (typeof payload.checkoutUrl !== "string" || !payload.checkoutUrl) {
        setStatus("Não foi possível obter o link de pagamento. Tente novamente.");
        setLoading(false);
        return;
      }

      window.localStorage.setItem(CONTRIBUTION_STARTED_AT_KEY, String(Date.now()));
      window.location.assign(payload.checkoutUrl);
    } catch {
      setStatus("Não foi possível conectar ao pagamento. Tente novamente.");
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

      if (response.ok) {
        window.localStorage.removeItem(CONTRIBUTION_STARTED_AT_KEY);
        showNotice("sad", "😔 Sentiremos sua falta! A contribuição foi cancelada e o FaturApp continua disponível para você.");
        await loadStatus();
      }
    } catch {
      setStatus("Não foi possível cancelar agora.");
    } finally {
      setLoading(false);
    }
  }

  const active = contribution && ["pending", "active", "past_due", "paused"].includes(contribution.status);
  const nextPayment = formatDate(contribution?.next_payment_at || null);

  return (
    <section className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(18,59,99,0.12)]">
      {notice && (
        <div
          className={"fixed inset-x-4 top-4 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-2xl border px-4 py-4 text-sm font-semibold shadow-2xl backdrop-blur sm:inset-x-auto " + (
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : notice.tone === "sad"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : notice.tone === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-sky-200 bg-sky-50 text-sky-900"
          )}
          role="status"
          aria-live="polite"
        >
          <span className="flex-1 leading-6">{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-lg leading-none opacity-70 hover:opacity-100" aria-label="Fechar mensagem">×</button>
        </div>
      )}

      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b2d4f] via-[#123b63] to-[#087f69] px-6 py-10 text-white sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-200">Apoio voluntário</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Ajude a manter o FaturApp gratuito.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">
            Se o FaturApp ajuda você a entender o seu lucro real, escolha uma contribuição mensal no valor que considerar justo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-6 py-6 sm:grid-cols-3 sm:px-10">
        <div className="flex gap-3">
          <LineIcon><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m0-15c-2.5-1.4-5.5-.4-5.5 2 0 3.7 11 1.3 11 6 0 2.7-3.7 3.7-5.5 2" /></LineIcon>
          <div><p className="font-bold text-[#123B63]">Você escolhe</p><p className="mt-1 text-sm leading-5 text-slate-600">Valor mensal entre R$ 3 e R$ 500.</p></div>
        </div>
        <div className="flex gap-3">
          <LineIcon><rect x="3.5" y="5" width="17" height="14" rx="2" /><path strokeLinecap="round" d="M3.5 9h17M7 14h3" /></LineIcon>
          <div><p className="font-bold text-[#123B63]">Pagamento seguro</p><p className="mt-1 text-sm leading-5 text-slate-600">A autorização acontece no Mercado Pago.</p></div>
        </div>
        <div className="flex gap-3">
          <LineIcon><path strokeLinecap="round" strokeLinejoin="round" d="M5 12a7 7 0 0 1 12.4-4.4L19 9M19 5v4h-4M19 12a7 7 0 0 1-12.4 4.4L5 15M5 19v-4h4" /></LineIcon>
          <div><p className="font-bold text-[#123B63]">Cancele quando quiser</p><p className="mt-1 text-sm leading-5 text-slate-600">Sem compromisso e sem bloquear o uso do app.</p></div>
        </div>
      </div>

      <div className="px-6 py-7 sm:px-10 sm:py-9">
        {returned && (
          <div className="mb-6 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900" role="status">
            <span aria-hidden="true" className="font-bold text-emerald-600">✓</span>
            <span>Você voltou do Mercado Pago. Estamos consultando a confirmação automaticamente. Se necessário, use “Atualizar status”.</span>
          </div>
        )}

        {active ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">Sua contribuição mensal</p>
                <p className="mt-1 text-3xl font-black text-[#123B63]">{formatMoney(Number(contribution.amount))}</p>
                {nextPayment && <p className="mt-1 text-sm text-slate-600">Próxima cobrança: {nextPayment}</p>}
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800">
                {statusLabel(contribution.status)}
              </span>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-700">
              A contribuição é opcional e não libera funções extras. Ela ajuda a manter o FaturApp disponível para os motoristas.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => void loadStatus(true)} disabled={loading || checkingStatus} className="rounded-xl border border-[#123B63]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#123B63] transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
                {checkingStatus ? "Atualizando…" : "Atualizar status"}
              </button>
              <button type="button" onClick={cancelContribution} disabled={loading || checkingStatus} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60">
                Cancelar contribuição
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={startCheckout} className="space-y-6">
            <fieldset>
              <legend className="text-sm font-bold text-[#0f2d4a]">Escolha o valor mensal</legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {presets.map((preset) => (
                  <button key={preset} type="button" onClick={() => setAmount(String(preset))} aria-pressed={amount === String(preset)} className={"rounded-2xl border px-4 py-3 text-base font-extrabold transition focus:outline-none focus:ring-2 focus:ring-emerald-500/30 " + (amount === String(preset) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-[#123B63] hover:border-emerald-300")}>
                    {formatMoney(preset)}
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-sm font-semibold text-[#0f2d4a]" htmlFor="custom-amount">Outro valor</label>
              <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <span className="text-sm font-bold text-slate-500">R$</span>
                <input id="custom-amount" value={amount} onChange={(event) => setAmount(event.target.value.replace(",", ".").replace(/[^0-9.]/g, ""))} inputMode="decimal" min="3" max="500" step="0.01" required aria-describedby="amount-help" className="w-full border-0 bg-transparent px-2 py-3 text-slate-900 outline-none" />
              </div>
              <p id="amount-help" className="mt-1 text-xs text-slate-500">Mínimo de R$ 3 e máximo de R$ 500 por mês.</p>
            </fieldset>

            <div>
              <label className="block text-sm font-semibold text-[#0f2d4a]" htmlFor="payer-email">E-mail para o Mercado Pago</label>
              <input id="payer-email" type="email" value={payerEmail} onChange={(event) => setPayerEmail(event.target.value)} placeholder="seuemail@exemplo.com" autoComplete="email" required aria-describedby="email-help" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              <p id="email-help" className="mt-1 text-xs text-slate-500">Usado para identificar a autorização de cobrança recorrente.</p>
            </div>

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-emerald-500 px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:cursor-wait disabled:opacity-60">
              {loading ? "Abrindo pagamento seguro…" : "Continuar para Confirmar"}
            </button>
            <p className="text-center text-xs leading-5 text-slate-500">A contribuição é opcional, recorrente e cancelável quando quiser. O FaturApp continua gratuito sem ela.</p>
          </form>
        )}

        {status && <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-700" role="status">{status}</p>}
      </div>
    </section>
  );
}
