"use client";

import { useMemo, useState } from "react";
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
const num = (value: number, digits = 2) => (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default function StickyLaunchIntelligence({
  profit, costs, revenue, gross = revenue, km = 0, consumptionKmPerLiter = 0,
  fuelCostPerKm = 0, fuelConsumedLiters = 0, fuelSpent = 0,
  fuelRemainingLiters = 0, fuelRemainingValue = 0, maintenance = 0,
  extras = 0, netRevenue = revenue, className = "", active = true,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const tone = profit < 0 ? "critical" : profit > 0 && margin >= 15 ? "positive" : "warning";

  const theme = {
    positive: { shell: "bg-emerald-950/95 border-emerald-400/40", glow: "shadow-emerald-950/40", accent: "text-emerald-300", icon: "↗", label: "Resultado positivo" },
    warning: { shell: "bg-amber-950/95 border-amber-300/40", glow: "shadow-amber-950/40", accent: "text-amber-200", icon: "→", label: "Atenção ao resultado" },
    critical: { shell: "bg-red-950/95 border-red-400/40", glow: "shadow-red-950/40", accent: "text-red-200", icon: "↘", label: "Prejuízo parcial" },
  }[tone];

  const summary = useMemo(() => `O valor bruto é ${brl(gross)}, você percorreu ${num(km, 1)} km, seu carro fez ${num(consumptionKmPerLiter, 1)} km/L. O custo por cada KM percorrido é ${brl(fuelCostPerKm)}. Você gastou ${brl(fuelSpent)} para percorrer os ${num(km, 1)} km do dia. Sobrou no tanque ${num(fuelRemainingLiters, 2)} Litros de combustível, que correspondem a ${brl(fuelRemainingValue)}. Você gastou ${brl(maintenance)} com manutenção e ${brl(extras)} com gastos extras. O valor líquido após as taxas do app é ${brl(netRevenue)}. O seu lucro líquido final até agora é de ${brl(profit)}.`, [gross, km, consumptionKmPerLiter, fuelCostPerKm, fuelSpent, fuelRemainingLiters, fuelRemainingValue, maintenance, extras, netRevenue, profit]);

  if (!active) return null;

  return (
    <div className={`fixed inset-x-0 top-0 z-50 w-full ${className}`}>
      <div className={`border-b ${theme.shell} ${theme.glow} shadow-2xl backdrop-blur-xl`}>
        <button type="button" onClick={() => setIsExpanded(v => !v)} aria-expanded={isExpanded} className="mx-auto flex min-h-[72px] w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 text-left text-white sm:px-6">
          <div className="min-w-0 flex-1"><div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${theme.accent}`}>{theme.label}</div><div className="mt-0.5 text-xl font-black leading-tight sm:text-2xl">{brl(profit)}</div></div>
          <div className="hidden text-right sm:block"><div className="text-[10px] uppercase tracking-wider text-white/50">Margem</div><div className={`font-bold ${theme.accent}`}>{num(margin, 1)}%</div></div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl transition-transform duration-300" style={{ transform: `rotate(${isExpanded ? 180 : 0}deg)` }}>{theme.icon}</div>
        </button>

        <div className={`mx-auto grid w-full max-w-4xl overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="border-t border-white/10 px-4 pb-4 pt-3 sm:px-6">
            <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Resumo inteligente</span><span className="text-[10px] text-white/40">Em tempo real</span></div>
            <p className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-white/90 shadow-inner sm:text-[15px]">{summary}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Mini label="Receita líquida" value={brl(netRevenue)} /><Mini label="Custos" value={brl(costs)} /><Mini label="Combustível" value={brl(fuelSpent)} /><Mini label="Margem" value={`${num(margin, 1)}%`} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"><span className="block text-[9px] uppercase tracking-wide text-white/45">{label}</span><strong className="mt-0.5 block text-xs text-white">{value}</strong></div>; }
