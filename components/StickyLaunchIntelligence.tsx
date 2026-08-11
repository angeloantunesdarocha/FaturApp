"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/utils";

type Props = {
  profit: number;
  costs: number;
  revenue: number;
  gross?: number;
  km?: number;
  consumptionKmPerLiter?: number;
  fuelCostPerKm?: number;
  fuelConsumedLiters?: number;
  fuelSpent?: number;
  fuelRemainingLiters?: number;
  fuelRemainingValue?: number;
  maintenance?: number;
  extras?: number;
  netRevenue?: number;
  className?: string;
  active?: boolean;
};

const brl = (value: number) => formatBRL(Number.isFinite(value) ? value : 0);
const decimal = (value: number, digits = 1) => (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default function StickyLaunchIntelligence({
  profit,
  costs,
  revenue,
  km = 0,
  fuelCostPerKm = 0,
  fuelSpent = 0,
  netRevenue = revenue,
  className = "",
  active = true,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!active) return null;

  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const state = profit < 0 ? "loss" : profit > 0 && margin < 10 ? "tight" : "profit";

  const styles = {
    profit: {
      shell: "border-emerald-200/70 bg-white/90",
      accent: "text-emerald-700",
      soft: "bg-emerald-50/90",
      icon: "😊",
      label: "Está sobrando",
    },
    tight: {
      shell: "border-amber-200/80 bg-white/92",
      accent: "text-amber-700",
      soft: "bg-amber-50/90",
      icon: "😟",
      label: "Margem apertada",
    },
    loss: {
      shell: "border-red-200/80 bg-white/92",
      accent: "text-red-700",
      soft: "bg-red-50/90",
      icon: "😔",
      label: "Hoje está no prejuízo",
    },
  }[state];

  return (
    <div
      className={`fixed inset-x-0 top-0 z-[60] w-full px-2 pt-[env(safe-area-inset-top)] ${className}`}
      style={{ isolation: "isolate" }}
    >
      <div className={`mx-auto w-full max-w-3xl overflow-hidden rounded-b-2xl border shadow-lg shadow-slate-900/10 backdrop-blur-xl ${styles.shell}`}>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex min-h-[58px] w-full items-center gap-3 px-3 py-2 text-left sm:px-4"
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.soft} text-lg`} aria-hidden="true">
            {styles.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className={`truncate text-[10px] font-bold uppercase tracking-[0.08em] ${styles.accent}`}>{styles.label}</span>
              <span className="hidden text-[10px] text-slate-400 sm:inline">• em tempo real</span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <strong className={`text-lg font-black leading-none sm:text-xl ${styles.accent}`}>{brl(profit)}</strong>
              <span className="text-[11px] font-medium text-slate-500">lucro líquido</span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">Margem</span>
            <strong className={`text-sm ${styles.accent}`}>{decimal(margin)}%</strong>
          </div>

          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
        </button>

        {expanded && (
          <div className={`border-t border-slate-200/70 px-3 pb-3 pt-2 ${styles.soft}`}>
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Receita líquida" value={brl(netRevenue)} />
              <Metric label="Custos" value={brl(costs)} />
              <Metric label="Km rodados" value={`${decimal(km)} km`} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
              <span>Combustível: <b className="text-slate-700">{brl(fuelSpent)}</b></span>
              <span className="text-right">Custo/km: <b className="text-slate-700">{brl(fuelCostPerKm)}</b></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/80 bg-white/70 px-2.5 py-2">
      <span className="block truncate text-[9px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <strong className="mt-0.5 block truncate text-xs font-bold text-slate-700">{value}</strong>
    </div>
  );
}
