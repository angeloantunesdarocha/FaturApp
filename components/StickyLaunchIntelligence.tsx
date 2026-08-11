"use client";

import { useState } from "react";
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
  className?: string;
  active?: boolean;
};

const brl = (value: number) => formatBRL(Number.isFinite(value) ? value : 0);
const decimal = (value: number, digits = 1) => (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default function StickyLaunchIntelligence({
  profit,
  costs: _costs,
  revenue,
  gross = revenue,
  km = 0,
  hours = 0,
  feeAmount = 0,
  profitPerKm,
  profitPerHour,
  fuelSpent = 0,
  maintenance = 0,
  extras = 0,
  className = "",
  active = true,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!active) return null;

  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const state = profit < 0 ? "loss" : profit > 0 && margin < 10 ? "tight" : "profit";
  const kmValue = profitPerKm ?? (km > 0 ? profit / km : 0);
  const hourValue = profitPerHour ?? (hours > 0 ? profit / hours : 0);

  const styles = {
    profit: { shell: "border-emerald-200/70 bg-white/92", accent: "text-emerald-700", soft: "bg-emerald-50/90", icon: "😊", label: "Resultado positivo" },
    tight: { shell: "border-amber-200/80 bg-white/92", accent: "text-amber-700", soft: "bg-amber-50/90", icon: "😟", label: "Margem apertada" },
    loss: { shell: "border-red-200/80 bg-white/92", accent: "text-red-700", soft: "bg-red-50/90", icon: "😔", label: "Prejuízo no dia" },
  }[state];

  return (
    <div className={`fixed inset-x-0 top-0 z-[60] w-full px-2 pt-[env(safe-area-inset-top)] ${className}`} style={{ isolation: "isolate" }}>
      <div className={`mx-auto w-full max-w-3xl overflow-hidden rounded-b-2xl border shadow-lg shadow-slate-900/10 backdrop-blur-xl ${styles.shell}`}>
        <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="flex min-h-[58px] w-full items-center gap-2 px-2.5 py-2 text-left sm:gap-3 sm:px-4">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.soft} text-lg`} aria-hidden="true">{styles.icon}</div>
          <div className="min-w-0 flex-1">
            <div className={`truncate text-[9px] font-bold uppercase tracking-[0.08em] ${styles.accent}`}>{styles.label}</div>
            <div className="mt-0.5 flex items-baseline gap-1.5"><strong className={`text-lg font-black leading-none sm:text-xl ${styles.accent}`}>{brl(profit)}</strong><span className="text-[10px] font-medium text-slate-500">lucro líquido</span></div>
          </div>
          <div className="shrink-0 text-right"><span className="block text-[8px] font-semibold uppercase tracking-wider text-slate-400">Margem</span><strong className={`text-sm ${styles.accent}`}>{decimal(margin)}%</strong></div>
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
        </button>

        {expanded && (
          <div className={`border-t border-slate-200/70 px-2.5 pb-3 pt-2 ${styles.soft}`}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric label="Valor bruto recebido" value={brl(gross)} />
              <Metric label="Taxa do app" value={brl(feeAmount)} />
              <Metric label="Km rodados" value={`${decimal(km)} km`} />
              <Metric label="Valor por KM" value={brl(kmValue)} />
              <Metric label="Horas trabalhadas" value={`${decimal(hours)} h`} />
              <Metric label="Valor por hora" value={brl(hourValue)} />
              <Metric label="Manutenção" value={brl(maintenance)} />
              <Metric label="Gastos extras" value={brl(extras)} />
              <Metric label="Combustível" value={brl(fuelSpent)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-white/80 bg-white/75 px-2.5 py-2"><span className="block truncate text-[9px] font-medium uppercase tracking-wide text-slate-400">{label}</span><strong className="mt-0.5 block truncate text-xs font-bold text-slate-700">{value}</strong></div>;
}
