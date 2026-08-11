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
    <div className={`fixed inset-x-0 top-0 z-[60] w-full px-1.5 pt-[env(safe-area-inset-top)] ${className}`} style={{ isolation: "isolate" }}>
      <div className={`mx-auto w-full max-w-3xl overflow-hidden rounded-b-xl border shadow-md shadow-slate-900/10 backdrop-blur-xl ${styles.shell}`}>
        <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="flex min-h-[50px] w-full items-center gap-1.5 px-2 py-1.5 text-left sm:min-h-[54px] sm:gap-3 sm:px-4">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles.soft} text-sm`} aria-hidden="true">{styles.icon}</div>
          <div className="min-w-0 flex-1">
            <div className={`truncate text-[8px] font-bold uppercase tracking-[0.06em] ${styles.accent}`}>{styles.label}</div>
            <div className="mt-0.5 flex items-baseline gap-1"><strong className={`text-base font-black leading-none sm:text-lg ${styles.accent}`}>{brl(profit)}</strong><span className="text-[9px] font-medium text-slate-500">lucro</span></div>
          </div>
          <div className="shrink-0 text-right"><span className="block text-[7px] font-semibold uppercase tracking-wider text-slate-400">Margem</span><strong className={`text-xs ${styles.accent}`}>{decimal(margin)}%</strong></div>
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
        </button>

        {expanded && (
          <div className={`border-t border-slate-200/60 px-1.5 pb-2 pt-1.5 ${styles.soft}`}>
            <div className="grid grid-cols-2 gap-1">
              <Metric label="Valor bruto" value={brl(gross)} />
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
  return (
    <div className="min-w-0 rounded-md border border-white/80 bg-white/75 px-1.5 py-1">
      <span className="block truncate text-[7px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <strong className="block truncate text-[10px] font-bold leading-tight text-slate-700">{value}</strong>
    </div>
  );
}
