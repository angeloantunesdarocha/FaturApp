"use client";

import { useMemo, useState } from "react";
import { computeFuelCostPerKm, formatBRL, formatDateBR, toNumber, type DailyEntry } from "@/lib/utils";

type Props = { entries: DailyEntry[]; initialFrom: string; initialTo: string };

function moneyPerKm(value: number | null): string {
  return value === null ? "—" : `${formatBRL(value)} / km`;
}

function km(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export default function FuelMetricsReport({ entries, initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const filtered = useMemo(() => entries.filter((e) => e.date >= from && e.date <= to), [entries, from, to]);

  const rows = useMemo(() => filtered.map((entry) => {
    const distance = Math.max(0, Number(entry.km_driven) || 0);
    const gas = Math.max(0, Number(entry.gas_expense) || 0);
    const alcohol = Math.max(0, Number(entry.alcohol_expense) || 0);
    const total = gas + alcohol;
    return {
      entry,
      distance,
      gas,
      alcohol,
      total,
      gasPerKm: computeFuelCostPerKm(gas, distance),
      alcoholPerKm: computeFuelCostPerKm(alcohol, distance),
      totalPerKm: computeFuelCostPerKm(total, distance),
    };
  }), [filtered]);

  const totals = useMemo(() => rows.reduce((acc, row) => {
    acc.km += row.distance;
    acc.gas += row.gas;
    acc.alcohol += row.alcohol;
    acc.total += row.total;
    return acc;
  }, { km: 0, gas: 0, alcohol: 0, total: 0 }), [rows]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Quilometragem e custo de combustível</h2>
        <p className="text-xs text-slate-500 mt-1">O custo por km é calculado por combustível gasto ÷ km rodados. No período, o cálculo usa os totais, nunca uma média simples dos dias.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Data inicial</label><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">Data final</label><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Km rodados</p><p className="text-xl font-bold text-slate-800">{km(totals.km)} km</p></div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Gasolina</p><p className="text-xl font-bold text-slate-800">{formatBRL(totals.gas)}</p><p className="text-xs text-slate-500">{moneyPerKm(computeFuelCostPerKm(totals.gas, totals.km))}</p></div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Álcool</p><p className="text-xl font-bold text-slate-800">{formatBRL(totals.alcohol)}</p><p className="text-xs text-slate-500">{moneyPerKm(computeFuelCostPerKm(totals.alcohol, totals.km))}</p></div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Combustível total</p><p className="text-xl font-bold text-slate-800">{formatBRL(totals.total)}</p><p className="text-xs text-slate-500">{moneyPerKm(computeFuelCostPerKm(totals.total, totals.km))}</p></div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100"><tr>
            <th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-right">Km rodados</th><th className="px-3 py-2 text-right">Gasolina</th><th className="px-3 py-2 text-right">Gasolina/km</th><th className="px-3 py-2 text-right">Álcool</th><th className="px-3 py-2 text-right">Álcool/km</th><th className="px-3 py-2 text-right">Total combustível</th><th className="px-3 py-2 text-right">Total/km</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Nenhum lançamento no período.</td></tr> : rows.map((row) => <tr key={row.entry.id} className="border-t border-slate-200">
              <td className="px-3 py-2">{formatDateBR(row.entry.date)}</td><td className="px-3 py-2 text-right">{km(row.distance)} km</td><td className="px-3 py-2 text-right">{formatBRL(row.gas)}</td><td className="px-3 py-2 text-right">{moneyPerKm(row.gasPerKm)}</td><td className="px-3 py-2 text-right">{formatBRL(row.alcohol)}</td><td className="px-3 py-2 text-right">{moneyPerKm(row.alcoholPerKm)}</td><td className="px-3 py-2 text-right">{formatBRL(row.total)}</td><td className="px-3 py-2 text-right font-semibold">{moneyPerKm(row.totalPerKm)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
        <strong>Regra do cálculo:</strong> Km rodados = km final − km inicial. Gasto por km = valor abastecido ÷ km rodados. O total do período = soma dos km e dos valores abastecidos; portanto, custo total por km = gasto total ÷ km total.
      </div>
    </section>
  );
}
