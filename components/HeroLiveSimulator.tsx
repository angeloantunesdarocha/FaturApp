"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/utils";

const fields = [
  ["gross", "Valor bruto (R$)", "280"],
  ["fee", "Taxas dos apps (%)", "25"],
  ["km", "Km rodados", "75"],
  ["price", "Combustível (R$/L)", "6"],
  ["consumption", "Consumo (km/L)", "10"],
  ["extras", "Manutenção e extras (R$)", "30"],
] as const;

export default function HeroLiveSimulator() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(([key, , value]) => [key, value])),
  );
  const [hours, setHours] = useState(10);
  const numbers = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)]));
  const invalidInput = Object.values(values).some(value => !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0)
    || numbers.fee > 100 || numbers.consumption <= 0 || (numbers.km > 0 && numbers.price <= 0);
  const net = numbers.gross * (1 - numbers.fee / 100);
  const fuel = numbers.consumption > 0 ? numbers.km / numbers.consumption * numbers.price : 0;
  const profit = net - fuel - numbers.extras;
  const invalid = invalidInput || ![net, fuel, profit, profit / hours, numbers.km > 0 ? profit / numbers.km : 0].every(Number.isFinite);

  return (
    <section id="simulacao" aria-labelledby="simulator-title" className="rounded-3xl border border-white/15 bg-[#0b2944] p-5 shadow-2xl shadow-black/20 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="simulator-title" className="text-lg font-bold text-white">Simulador ao vivo</h2>
        <span className="flex items-center gap-2 text-xs text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-400" />Sem cadastro</span>
      </div>
      <p className="mt-2 text-sm text-slate-300">Mexa nos números. Veja quanto sobra na hora.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {fields.map(([key, label]) => <label key={key} className="min-w-0 text-xs font-semibold text-slate-200">
          {label}
          <input type="number" inputMode="decimal" min={key === "consumption" ? "0.1" : "0"} max={key === "fee" ? "100" : undefined} step="0.01" value={values[key]} onChange={event => setValues(current => ({...current, [key]: event.target.value}))} className="mt-2 w-full min-w-0 rounded-xl border border-white/20 bg-[#071c31] px-3 py-2.5 text-base text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" />
        </label>)}
      </div>
      <label className="mt-5 block text-sm text-slate-200">Horas trabalhadas <strong className="float-right text-white">{hours} h</strong>
        <input type="range" min="1" max="16" value={hours} onChange={event => setHours(Number(event.target.value))} className="mt-3 w-full accent-emerald-400" />
      </label>
      <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-[#071c31] p-5" aria-live="polite" aria-atomic="true">
        {invalid ? <p className="text-sm text-amber-200">Preencha valores válidos: taxa entre 0 e 100%, consumo maior que zero e preço do combustível quando houver km.</p> : <>
          <p className="text-sm text-slate-300">Lucro real estimado</p>
          <p className={`mt-1 text-4xl font-black tracking-tight ${profit < 0 ? "text-red-300" : "text-emerald-300"}`}>{formatBRL(profit)}</p>
          <p className="mt-3 text-sm font-semibold text-white">{formatBRL(profit / hours)}/h <span className="mx-2 text-slate-500">·</span> {numbers.km > 0 ? `${formatBRL(profit / numbers.km)}/km` : "Por km: —"}</p>
          <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs text-slate-300">
            <div className="flex justify-between gap-2"><dt>Receita após taxas</dt><dd>{formatBRL(net)}</dd></div>
            <div className="flex justify-between gap-2"><dt>Combustível estimado</dt><dd>− {formatBRL(fuel)}</dd></div>
            <div className="flex justify-between gap-2"><dt>Manutenção e extras</dt><dd>− {formatBRL(numbers.extras)}</dd></div>
          </dl>
        </>}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">Exemplo editável, não um resultado de usuário. Estimativa com os custos informados e consumo do percurso.</p>
    </section>
  );
}
