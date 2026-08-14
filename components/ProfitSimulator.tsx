"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatBRL, toNumber } from "@/lib/utils";
import RevealOnScroll from "@/components/RevealOnScroll";

type NumericField = "gross" | "fee" | "km" | "gasPrice" | "consumption" | "hours";

type Simulation = {
  netRevenue: number;
  fuelCost: number;
  profit: number;
  profitPerKm: number | null;
  profitPerHour: number | null;
};

const initialValues: Record<NumericField, string> = {
  gross: "210",
  fee: "25",
  km: "120",
  gasPrice: "6,19",
  consumption: "10",
  hours: "8",
};

function calculate(values: Record<NumericField, string>): Simulation {
  const gross = toNumber(values.gross);
  const fee = Math.min(100, Math.max(0, toNumber(values.fee)));
  const km = Math.max(0, toNumber(values.km));
  const gasPrice = Math.max(0, toNumber(values.gasPrice));
  const consumption = Math.max(0, toNumber(values.consumption));
  const hours = Math.max(0, toNumber(values.hours));
  const netRevenue = gross * (1 - fee / 100);
  const fuelCost = km > 0 && consumption > 0 ? (km / consumption) * gasPrice : 0;
  const profit = netRevenue - fuelCost;

  return {
    netRevenue,
    fuelCost,
    profit,
    profitPerKm: km > 0 ? profit / km : null,
    profitPerHour: hours > 0 ? profit / hours : null,
  };
}

function isInvalid(values: Record<NumericField, string>) {
  const fee = toNumber(values.fee);
  const km = toNumber(values.km);
  const gasPrice = toNumber(values.gasPrice);
  const consumption = toNumber(values.consumption);

  if (fee > 100) return "A taxa média precisa estar entre 0% e 100%.";
  if (km > 0 && gasPrice <= 0) return "Informe o preço da gasolina para calcular o combustível.";
  if (km > 0 && consumption <= 0) return "Informe o consumo médio do veículo em km/L.";
  return "";
}

function AnimatedValue({ value }: { value: number }) {
  const [visibleValue, setVisibleValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const from = previousValue.current;
    const difference = value - from;
    const duration = 650;
    const startedAt = performance.now();
    let frame = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVisibleValue(from + difference * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    previousValue.current = value;

    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{formatBRL(visibleValue)}</>;
}

export default function ProfitSimulator() {
  const [values, setValues] = useState(initialValues);
  const [result, setResult] = useState<Simulation>(() => calculate(initialValues));
  const [status, setStatus] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const currentSimulation = useMemo(() => calculate(values), [values]);
  const invalidMessage = useMemo(() => isInvalid(values), [values]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function update(field: NumericField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setStatus("");
  }

  function handleCalculate() {
    if (invalidMessage) {
      setStatus(invalidMessage);
      return;
    }

    setIsCalculating(true);
    setStatus("");

    timeoutRef.current = window.setTimeout(() => {
      setResult(currentSimulation);
      setIsCalculating(false);
      setStatus("Cálculo atualizado.");
    }, 420);
  }

  const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  return (
    <section id="simulacao" className="bg-white px-4 py-14 text-[#123B63] sm:px-8 sm:py-20 lg:px-16">
      <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[.85fr_1.15fr]">
        <RevealOnScroll direction="left">
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-blue-700">
            Simulação interativa
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
            Faça uma conta rápida com os números do seu dia.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            Veja como taxas e combustível mudam o resultado antes de tomar a próxima decisão na rua.
          </p>

          <div className="mt-7 space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">1</span>
              <p>Informe o valor bruto e a taxa média descontada pelos aplicativos.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">2</span>
              <p>Adicione km, preço da gasolina e consumo médio do veículo.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">3</span>
              <p>Compare o que entrou com o custo estimado do percurso.</p>
            </div>
          </div>

          <p className="mt-7 text-xs leading-5 text-slate-500">
            Esta é uma simulação demonstrativa. No lançamento completo, o FaturApp também permite registrar manutenção e outras despesas do dia.
          </p>
        </RevealOnScroll>

        <RevealOnScroll direction="right" delay={100}>
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-xl shadow-slate-900/8 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-600">Seu cenário</p>
                <h3 className="mt-1 text-xl font-extrabold text-[#123B63]">Calcule agora</h3>
              </div>
              <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500 shadow-sm">Sem cadastro</span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">
                Valor bruto do dia
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                  <input aria-label="Valor bruto do dia" className={fieldClass + " pl-10"} inputMode="decimal" type="number" min="0" step="0.01" value={values.gross} onChange={(event) => update("gross", event.target.value)} />
                </div>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Taxa média dos apps
                <div className="relative">
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                  <input aria-label="Taxa média dos aplicativos" className={fieldClass + " pr-10"} inputMode="decimal" type="number" min="0" max="100" step="0.01" value={values.fee} onChange={(event) => update("fee", event.target.value)} />
                </div>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Km rodados
                <div className="relative">
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">km</span>
                  <input aria-label="Quilômetros rodados" className={fieldClass + " pr-12"} inputMode="decimal" type="number" min="0" step="0.1" value={values.km} onChange={(event) => update("km", event.target.value)} />
                </div>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Gasolina por litro
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                  <input aria-label="Preço da gasolina por litro" className={fieldClass + " pl-10"} inputMode="decimal" type="number" min="0" step="0.001" value={values.gasPrice} onChange={(event) => update("gasPrice", event.target.value)} />
                </div>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Consumo médio
                <div className="relative">
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">km/L</span>
                  <input aria-label="Consumo médio do veículo" className={fieldClass + " pr-14"} inputMode="decimal" type="number" min="0" step="0.1" value={values.consumption} onChange={(event) => update("consumption", event.target.value)} />
                </div>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Horas trabalhadas
                <div className="relative">
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">h</span>
                  <input aria-label="Horas trabalhadas" className={fieldClass + " pr-8"} inputMode="decimal" type="number" min="0" step="0.1" value={values.hours} onChange={(event) => update("hours", event.target.value)} />
                </div>
              </label>
            </div>

            {invalidMessage && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800" role="alert">{invalidMessage}</p>}

            <button type="button" onClick={handleCalculate} disabled={Boolean(invalidMessage) || isCalculating} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-500 px-5 text-base font-extrabold text-white shadow-lg shadow-emerald-700/20 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">
              {isCalculating ? "Calculando..." : "Calcular agora"}
            </button>

            <div className="mt-6 rounded-2xl bg-[#123B63] p-5 text-white sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-300">Resultado estimado</p>
                  <p className="mt-2 text-sm text-slate-300">Depois de taxas e combustível</p>
                </div>
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-slate-300">ao vivo</span>
              </div>
              <p className="mt-5 text-4xl font-black tracking-tight text-emerald-300 sm:text-5xl" aria-live="polite"><AnimatedValue value={result.profit} /></p>

              <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
                <div><p className="text-xs text-slate-400">Receita líquida</p><p className="mt-1 font-bold text-white">{formatBRL(result.netRevenue)}</p></div>
                <div><p className="text-xs text-slate-400">Combustível estimado</p><p className="mt-1 font-bold text-amber-200">− {formatBRL(result.fuelCost)}</p></div>
                <div><p className="text-xs text-slate-400">Por hora · por km</p><p className="mt-1 font-bold text-emerald-200">{result.profitPerHour === null ? "—" : formatBRL(result.profitPerHour)} · {result.profitPerKm === null ? "—" : formatBRL(result.profitPerKm)}</p></div>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-slate-500" aria-live="polite">{status || "Ajuste os números e veja como o resultado muda."}</p>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
