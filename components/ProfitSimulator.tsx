"use client";

import { useState } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";
import { formatBRL } from "@/lib/utils";

type NumericField = "gross" | "fee" | "km" | "gasPrice" | "consumption";

type SimulatorValues = Record<NumericField, number> & {
  hours: number;
};

type Simulation = {
  netRevenue: number;
  fuelCost: number;
  profit: number;
  profitPerHour: number;
  profitPerKm: number | null;
  costPercentage: number | null;
  profitPercentage: number | null;
};

const INITIAL_VALUES: SimulatorValues = {
  gross: 350,
  fee: 25,
  km: 180,
  gasPrice: 5.89,
  consumption: 11,
  hours: 10,
};

const NUMBER_FIELDS: Array<{
  field: NumericField;
  label: string;
  prefix?: string;
  suffix?: string;
  min: number;
  max?: number;
  step: number;
}> = [
  { field: "gross", label: "Valor bruto do dia", prefix: "R$", min: 0, step: 0.01 },
  { field: "fee", label: "Taxa dos apps", suffix: "%", min: 0, max: 100, step: 0.1 },
  { field: "km", label: "Km rodados", suffix: "km", min: 0, step: 0.1 },
  { field: "gasPrice", label: "Gasolina", prefix: "R$", suffix: "/L", min: 0, step: 0.01 },
  { field: "consumption", label: "Consumo", suffix: "km/L", min: 0, step: 0.1 },
];

function calculate(values: SimulatorValues): Simulation {
  const gross = Math.max(0, values.gross);
  const fee = Math.min(100, Math.max(0, values.fee));
  const km = Math.max(0, values.km);
  const gasPrice = Math.max(0, values.gasPrice);
  const consumption = Math.max(0, values.consumption);
  const hours = Math.min(16, Math.max(1, values.hours));

  const netRevenue = gross - gross * (fee / 100);
  const fuelCost = km > 0 && consumption > 0 ? (km / consumption) * gasPrice : 0;
  const profit = netRevenue - fuelCost;

  return {
    netRevenue,
    fuelCost,
    profit,
    profitPerHour: profit / hours,
    profitPerKm: km > 0 ? profit / km : null,
    costPercentage: netRevenue > 0 ? (fuelCost / netRevenue) * 100 : null,
    profitPercentage: netRevenue > 0 ? (profit / netRevenue) * 100 : null,
  };
}

function formatPercentage(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function clampPercentage(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export default function ProfitSimulator() {
  const [values, setValues] = useState<SimulatorValues>(INITIAL_VALUES);
  const result = calculate(values);

  function updateNumber(field: NumericField, rawValue: string) {
    const value = rawValue === "" ? 0 : Number(rawValue);
    setValues((current) => ({
      ...current,
      [field]: Number.isFinite(value) ? value : 0,
    }));
  }

  function updateHours(rawValue: string) {
    const hours = Number(rawValue);
    setValues((current) => ({ ...current, hours }));
  }

  const hasNegativeProfit = result.profit < 0;
  const profitTone = hasNegativeProfit ? "text-rose-300" : "text-emerald-300";
  const profitBar = clampPercentage(result.profitPercentage);
  const costBar = clampPercentage(result.costPercentage);

  return (
    <section id="simulacao" className="relative isolate overflow-hidden bg-[#061827] px-4 py-14 text-white sm:px-8 sm:py-20 lg:px-16">
      <div className="pointer-events-none absolute -left-32 top-16 -z-10 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 -z-10 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

      <RevealOnScroll className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/10 bg-[#0a2237]/95 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.35)] sm:p-7 lg:p-9">
          <header className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.14em] text-emerald-200">
                  12.000+ motoristas
                </span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  Atualizando em tempo real
                </span>
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Simulador ao vivo</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Ajuste os números do seu dia e veja imediatamente quanto realmente sobra no seu bolso.
              </p>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-slate-300">
              Sem cadastro
            </span>
          </header>

          <div className="mt-7 grid gap-7 lg:grid-cols-[0.88fr_1.12fr] lg:gap-9">
            <div>
              <div className="grid gap-4 sm:grid-cols-2">
                {NUMBER_FIELDS.map(({ field, label, prefix, suffix, min, max, step }) => (
                  <label key={field} className="text-sm font-bold text-slate-200">
                    {label}
                    <div className="relative mt-2">
                      {prefix ? (
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                          {prefix}
                        </span>
                      ) : null}
                      <input
                        aria-label={label}
                        className={`min-h-12 w-full rounded-xl border border-white/10 bg-[#071c2e] px-3.5 text-base font-semibold text-white outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 ${prefix ? "pl-11" : ""} ${suffix ? "pr-14" : ""}`}
                        inputMode="decimal"
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        value={values[field]}
                        onChange={(event) => updateNumber(field, event.target.value)}
                      />
                      {suffix ? (
                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                          {suffix}
                        </span>
                      ) : null}
                    </div>
                  </label>
                ))}
              </div>

              <label className="mt-6 block text-sm font-bold text-slate-200">
                <span className="flex items-center justify-between gap-4">
                  <span>Horas trabalhadas</span>
                  <output htmlFor="simulator-hours" className="rounded-lg bg-emerald-300/10 px-2.5 py-1 text-sm font-extrabold text-emerald-200">
                    {values.hours} h
                  </output>
                </span>
                <input
                  id="simulator-hours"
                  aria-label="Horas trabalhadas"
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-400"
                  type="range"
                  min="1"
                  max="16"
                  step="1"
                  value={values.hours}
                  onChange={(event) => updateHours(event.target.value)}
                />
                <span className="mt-2 flex justify-between text-[11px] font-medium text-slate-500" aria-hidden="true">
                  <span>1 h</span>
                  <span>16 h</span>
                </span>
              </label>
            </div>

            <div className="rounded-2xl border border-emerald-300/15 bg-[#061827] p-5 shadow-inner shadow-black/20 sm:p-7">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-emerald-300">Lucro real estimado</p>
              <p className={`mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl ${profitTone}`} aria-live="polite" aria-atomic="true">
                {formatBRL(result.profit)}
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-300 sm:text-base">
                Por hora: <strong className="text-white">{formatBRL(result.profitPerHour)}</strong>
                <span className="mx-2 text-slate-600" aria-hidden="true">|</span>
                Por km: <strong className="text-white">{result.profitPerKm === null ? "—" : formatBRL(result.profitPerKm)}</strong>
              </p>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[.035] px-4 py-3">
                  <span className="text-sm text-slate-400">Receita líquida <span className="hidden sm:inline">(após taxas)</span></span>
                  <strong className="shrink-0 text-white">{formatBRL(result.netRevenue)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[.035] px-4 py-3">
                  <span className="text-sm text-slate-400">Combustível estimado</span>
                  <strong className="shrink-0 text-amber-200">− {formatBRL(result.fuelCost)}</strong>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold sm:text-sm">
                  <span className="text-amber-200">Custos: {formatPercentage(result.costPercentage)}</span>
                  <span className={hasNegativeProfit ? "text-rose-300" : "text-emerald-300"}>Lucro: {formatPercentage(result.profitPercentage)}</span>
                </div>
                <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-700" aria-hidden="true">
                  <span className="bg-amber-300 transition-[width] duration-300" style={{ width: `${costBar}%` }} />
                  <span className={`transition-[width] duration-300 ${hasNegativeProfit ? "bg-rose-400" : "bg-emerald-400"}`} style={{ width: `${profitBar}%` }} />
                </div>
              </div>
            </div>
          </div>

          <footer className="mt-7 rounded-2xl border border-sky-300/10 bg-gradient-to-r from-sky-400/10 to-emerald-300/10 px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-extrabold text-white">Seu dashboard, seu controle</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                No FaturApp, seus lançamentos viram insights automáticos para acompanhar lucro por hora, por km e o resultado real do dia.
              </p>
            </div>
            <span className="mt-3 inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-emerald-200 sm:mt-0">
              Resultado instantâneo <span aria-hidden="true">→</span>
            </span>
          </footer>
        </div>
      </RevealOnScroll>
    </section>
  );
}
