"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateDay, calculateDaysFromEntries, sumPeriod, type DaySummary } from "@/lib/day-calculation";
import { loadLocalDayLaunches } from "@/lib/day-storage";
import { formatBRL, formatDateBR, hojeBrasilia, startOfMonthBrasilia, startOfWeekBrasilia, type DailyEntry } from "@/lib/utils";
import ReportExportActions from "./ReportExportActions";

type Props = { entries: DailyEntry[]; initialFrom: string; initialTo: string; userId: string };
type Sort = "recent" | "profit" | "km" | "hours" | "loss";

const number = (value: number, digits = 1) => value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const perUnit = (value: number, suffix: string) => `${formatBRL(value)}${suffix}`;

export default function ReportsDashboardPremium({ entries, initialFrom, initialTo, userId }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [sort, setSort] = useState<Sort>("recent");
  const [localDays, setLocalDays] = useState<Record<string, DaySummary>>({});
  const databaseDays = useMemo(() => calculateDaysFromEntries(entries), [entries]);

  useEffect(() => {
    const overrides: Record<string, DaySummary> = {};
    for (const day of databaseDays) {
      const launches = loadLocalDayLaunches(userId, day.date);
      if (launches.length) overrides[day.date] = calculateDay(launches);
    }
    setLocalDays(overrides);
  }, [databaseDays, userId]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, [router]);

  const days = useMemo(() => databaseDays.map((day) => localDays[day.date] ?? day), [databaseDays, localDays]);
  const rows = useMemo(() => days
    .filter((day) => day.date >= from && day.date <= to)
    .sort((a, b) => sort === "profit"
      ? b.profit - a.profit
      : sort === "km"
        ? b.km - a.km
        : sort === "hours"
          ? b.hours - a.hours
          : sort === "loss"
            ? a.profit - b.profit
            : b.date.localeCompare(a.date)), [days, from, to, sort]);
  const totals = useMemo(() => sumPeriod(rows), [rows]);
  const maxProfit = Math.max(...rows.map((day) => Math.abs(day.profit)), 1);

  function today() { const value = hojeBrasilia(); setFrom(value); setTo(value); }
  function thisWeek() { const value = hojeBrasilia(); setFrom(startOfWeekBrasilia(value)); setTo(value); }
  function thisMonth() { const value = hojeBrasilia(); setFrom(startOfMonthBrasilia(value)); setTo(value); }

  return <div className="space-y-4 pb-24">
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <label className="text-xs font-bold text-slate-500">De<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-semibold" /></label>
      <label className="text-xs font-bold text-slate-500">Até<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-semibold" /></label>
      <button type="button" onClick={today} className="self-end rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50">Hoje</button>
      <button type="button" onClick={thisWeek} className="self-end rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50">Esta semana</button>
      <button type="button" onClick={thisMonth} className="self-end rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50">Este mês</button>
      <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="self-end rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"><option value="recent">Mais recentes</option><option value="profit">Maior lucro</option><option value="km">Mais km</option><option value="hours">Mais horas</option><option value="loss">Maior prejuízo</option></select>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className={`rounded-2xl border p-5 ${totals.profit >= 0 ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}><p className="text-xs font-bold uppercase tracking-wide text-slate-600">Lucro líquido</p><p className={`mt-2 text-3xl font-black ${totals.profit >= 0 ? "text-emerald-800" : "text-rose-800"}`}>{formatBRL(totals.profit)}</p><p className="mt-1 text-xs text-slate-600">Margem {number(totals.marginPercent, 1)}%</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Receitas</p><p className="mt-2 text-3xl font-black text-slate-900">{formatBRL(totals.revenueNet)}</p><p className="mt-1 text-xs text-slate-500">Bruta {formatBRL(totals.revenueGross)} · Taxas {formatBRL(totals.fees)}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total de gastos</p><p className="mt-2 text-3xl font-black text-slate-900">{formatBRL(totals.totalOutflows)}</p><p className="mt-1 text-xs text-slate-500">Inclui taxas e custos operacionais</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Operação</p><p className="mt-2 text-3xl font-black text-slate-900">{number(totals.km, 1)} km</p><p className="mt-1 text-xs text-slate-500">{number(totals.hours, 1)} h · {perUnit(totals.profitPerHour, "/h")}</p></div>
    </section>

    {rows.length > 0 && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-600">Performance diária</p><h2 className="mt-1 text-xl font-black text-slate-900">Lucro total por dia</h2></div><span className="text-xs font-semibold text-slate-400">{rows.length} dia(s)</span></div><div className="mt-4 flex h-64 items-end gap-2 overflow-x-auto pb-2 pt-8">{rows.slice().reverse().map((day) => <div key={day.date} title={`${formatDateBR(day.date)} · ${formatBRL(day.profit)}`} className="flex min-w-[52px] flex-1 flex-col items-center justify-end gap-1"><span className="whitespace-nowrap text-[8px] font-bold leading-none text-slate-600">{formatBRL(day.profit)}</span><span className={`w-full max-w-12 rounded-t-xl ${day.profit >= 0 ? "bg-emerald-400" : "bg-rose-400"}`} style={{ height: `${Math.max(8, Math.round(Math.abs(day.profit) / maxProfit * 155))}px` }} /><span className="text-[9px] font-semibold text-slate-400">{formatDateBR(day.date).slice(0, 5)}</span></div>)}</div></section>}

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-600">Balanço consolidado</p><h2 className="mt-1 text-2xl font-black text-slate-900">Total por dia</h2><p className="mt-1 text-sm text-slate-500">Cada linha representa o balanço completo do dia, nunca um lançamento isolado.</p></div>
      {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr>{["Data", "Lucro líquido", "Total de gastos", "Receita bruta", "Receita líquida", "Taxas", "Km", "Horas", "Lucro/km", "Lucro/h"].map((heading) => <th key={heading} className="px-4 py-3 text-right first:text-left">{heading}</th>)}</tr></thead><tbody>{rows.map((day) => <tr key={day.date} className="border-t border-slate-100"><td className="px-4 py-4 font-bold text-slate-800">{formatDateBR(day.date)}</td><td className={`px-4 py-4 text-right font-black ${day.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatBRL(day.profit)}</td><td className="px-4 py-4 text-right">{formatBRL(day.totalOutflows)}</td><td className="px-4 py-4 text-right">{formatBRL(day.revenueGross)}</td><td className="px-4 py-4 text-right">{formatBRL(day.revenueNet)}</td><td className="px-4 py-4 text-right">{formatBRL(day.fees)}</td><td className="px-4 py-4 text-right">{number(day.km, 1)}</td><td className="px-4 py-4 text-right">{number(day.hours, 1)} h</td><td className="px-4 py-4 text-right">{perUnit(day.profitPerKm, "/km")}</td><td className="px-4 py-4 text-right">{perUnit(day.profitPerHour, "/h")}</td></tr>)}</tbody><tfoot className="bg-emerald-50 font-black"><tr><td className="px-4 py-4">TOTAL</td><td className="px-4 py-4 text-right text-emerald-700">{formatBRL(totals.profit)}</td><td className="px-4 py-4 text-right">{formatBRL(totals.totalOutflows)}</td><td className="px-4 py-4 text-right">{formatBRL(totals.revenueGross)}</td><td className="px-4 py-4 text-right">{formatBRL(totals.revenueNet)}</td><td className="px-4 py-4 text-right">{formatBRL(totals.fees)}</td><td className="px-4 py-4 text-right">{number(totals.km, 1)}</td><td className="px-4 py-4 text-right">{number(totals.hours, 1)} h</td><td className="px-4 py-4 text-right">{perUnit(totals.profitPerKm, "/km")}</td><td className="px-4 py-4 text-right">{perUnit(totals.profitPerHour, "/h")}</td></tr></tfoot></table></div> : <div className="p-12 text-center"><p className="text-lg font-black text-slate-800">Nenhum dia fechado neste período</p><p className="mt-1 text-sm text-slate-500">Escolha outro intervalo para visualizar seus resultados.</p></div>}
    </section>

    <ReportExportActions days={rows} from={from} to={to} />
  </div>;
}
