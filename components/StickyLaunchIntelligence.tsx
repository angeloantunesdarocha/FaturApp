"use client";

import { useEffect, useMemo, useState } from "react";
import { formatBRL } from "@/lib/utils";

type Props = {
  profit: number;
  costs: number;
  revenue: number;
  gross?: number;
  km?: number;
  hours?: number;
  feeAmount?: number;
  profitPerKm?: number;
  profitPerHour?: number;
  fuelSpent?: number;
  maintenance?: number;
  extras?: number;
  fuelRemainingValue?: number;
  className?: string;
  active?: boolean;
};

const brl = (value: number, dashWhenZero = false) => dashWhenZero && !value ? "—" : formatBRL(Number.isFinite(value) ? value : 0);
const decimal = (value: number) => (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type Tone = "neutral" | "profit" | "tight" | "loss";

export default function StickyLaunchIntelligence({
  profit, costs, revenue, gross = 0, km = 0, hours = 0, feeAmount = 0,
  profitPerKm, profitPerHour, fuelSpent = 0, maintenance = 0, extras = 0,
  fuelRemainingValue = 0, className = "", active = true,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasInput = gross > 0 || revenue > 0 || km > 0 || hours > 0 || feeAmount > 0 || fuelSpent > 0 || maintenance > 0 || extras > 0;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const tone: Tone = !hasInput ? "neutral" : profit > 0 && margin >= 40 ? "profit" : profit > 0 ? "tight" : "loss";
  const kmValue = profitPerKm ?? (km > 0 ? profit / km : 0);
  const hourValue = profitPerHour ?? (hours > 0 ? profit / hours : 0);

  const copy = useMemo(() => ({
    neutral: { emoji: "🧮", label: "Aguardando dados", message: "Preencha os campos e veja seu lucro em tempo real", shell: "border-slate-200 bg-white/95", accent: "text-slate-700", line: "bg-slate-300" },
    profit: { emoji: "😊", label: "RESULTADO POSITIVO", message: "Dia lucrativo! 👍", shell: "border-green-200 bg-white/95", accent: "text-[#16a34a]", line: "bg-[#16a34a]" },
    tight: { emoji: "😐", label: "RESULTADO NO LIMITE", message: "Dia apertado — atenção nos custos", shell: "border-amber-200 bg-white/95", accent: "text-[#f59e0b]", line: "bg-[#f59e0b]" },
    loss: { emoji: "😞", label: "PREJUÍZO", message: "Você está pagando pra trabalhar", shell: "border-red-200 bg-white/95", accent: "text-[#dc2626]", line: "bg-[#dc2626]" },
  }[tone]), [tone]);

  useEffect(() => {
    if (!expanded) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [expanded]);

  if (!active) return null;

  const metrics = [
    ["Valor bruto", brl(gross, true)], ["Taxa do app", brl(feeAmount, true)], ["Km rodados", km ? `${decimal(km)} km` : "—"],
    ["Valor por KM", brl(kmValue, true)], ["Horas trabalhadas", hours ? `${decimal(hours)} h` : "—"], ["Valor por hora", brl(hourValue, true)],
    ["Combustível", brl(fuelSpent, true)], ["Manutenção", brl(maintenance, true)], ["Gastos extras", brl(extras, true)], ["Saldo no tanque", brl(fuelRemainingValue, true)],
  ];

  return (
    <>
      {expanded && <button aria-label="Fechar resumo" onClick={() => setExpanded(false)} className="fixed inset-0 z-[59] bg-slate-950/15 backdrop-blur-[1px] md:hidden" />}
      <div className={`fixed inset-x-0 bottom-0 z-[60] w-full px-2 pb-[max(6px,env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:w-[330px] md:px-0 md:pb-0 ${className}`}>
        <div className={`mx-auto w-full overflow-hidden rounded-t-2xl border shadow-xl shadow-slate-900/15 backdrop-blur-xl transition-colors duration-300 md:rounded-2xl ${copy.shell}`}>
          <div className={`h-0.5 w-full ${copy.line} transition-colors duration-300`} />
          <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="flex h-[60px] w-full items-center gap-2 px-3 text-left md:h-auto md:min-h-[72px] md:px-3.5 md:py-2.5">
            <span className="shrink-0 text-lg" aria-hidden="true">{copy.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[8px] font-bold uppercase tracking-wide ${copy.accent}`}>{copy.label}</span>
              <span aria-live="polite" className={`mt-0.5 block truncate text-base font-black leading-none transition-all duration-200 ${copy.accent}`}>{brl(profit, true)} <span className="text-[9px] font-semibold text-slate-400">líquido</span></span>
              <span className="mt-0.5 block truncate text-[8px] text-slate-500">{copy.message}</span>
            </span>
            <span className="shrink-0 text-right"><span className="block text-[7px] uppercase tracking-wide text-slate-400">Margem</span><strong className={`text-[11px] ${copy.accent}`}>{hasInput ? `${decimal(margin)}%` : "—"}</strong></span>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true">⌃</span>
          </button>

          {expanded && <div className={`border-t border-slate-200/70 px-2 pb-2 pt-1.5 md:px-2.5 ${copy.shell}`}>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="space-y-1 border-r border-slate-300/40 pr-1.5">
                {metrics.slice(0, 5).map(([label, value]) => <Metric key={label} label={label} value={value} />)}
              </div>
              <div className="space-y-1 pl-0">
                {metrics.slice(5).map(([label, value]) => <Metric key={label} label={label} value={value} />)}
              </div>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200/80" aria-label={`Margem de ${Math.max(0, Math.min(100, margin))}%`}>
              <div className={`h-full rounded-full transition-all duration-300 ${copy.line}`} style={{ width: `${Math.max(0, Math.min(100, margin))}%` }} />
            </div>
          </div>}
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-md border border-white/90 bg-slate-50/80 px-1.5 py-1 md:px-2">
    <span className="block truncate text-[9px] font-medium leading-tight text-slate-500">{label}</span>
    <strong className="block truncate text-[11px] font-semibold leading-tight text-slate-700 md:text-xs">{value}</strong>
  </div>;
}
