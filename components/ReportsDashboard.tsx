"use client";

import { useMemo, useState, type ReactNode } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { computeFeeAmount, computeFuelLiters, computeNetFare, formatBRL, formatDateBR, hojeBrasilia, toNumber, type DailyEntry } from "@/lib/utils";

type Props = { entries: DailyEntry[]; initialFrom: string; initialTo: string };
type CategoryKey = "gas" | "alcohol" | "maintenance" | "extras";
type Categories = Record<CategoryKey, boolean>;
type DetailCategory = "maintenance" | "extras";
type DetailItem = { date: string; description: string; value: number };

autoTable;

const DEFAULT_CATEGORIES: Categories = { gas: true, alcohol: true, maintenance: true, extras: true };
const money = (n: number | null) => n === null ? "—" : formatBRL(n);
const num = (n: number, max = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: max });
const hours = (n: number) => num(n, 1);
const dateLabel = (iso: string) => formatDateBR(iso);

function startOfWeek(dateISO: string) {
  const d = new Date(`${dateISO}T12:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function endOfMonth(dateISO: string) {
  const [y, m] = dateISO.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

function Icon({ name, size = 20 }: { name: "trend" | "km" | "clock" | "money" | "fuel" | "wrench" | "plus" | "filter" | "download" | "share" | "mail" | "close" | "chevron" | "target" | "list"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<string, ReactNode> = {
    trend: <><path d="M3 17l6-6 4 4 7-8" /><path d="M15 7h5v5" /></>,
    km: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
    money: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
    fuel: <><path d="M6 20V5a2 2 0 012-2h7v17" /><path d="M6 8h9" /><path d="M15 7l3 3v7a2 2 0 004 0v-6l-2-2" /></>,
    wrench: <path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4l-2.1 2.1-2-2 2.1-2.1z" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
    share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="M8 11l8-5M8 13l8 5" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
    close: <><path d="M6 6l12 12M18 6L6 18" /></>,
    chevron: <path d="M6 9l6 6 6-6" />,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2M22 12h-2M12 22v-2M2 12h2" /></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function MetricCard({ title, value, icon, tone, detail }: { title: string; value: string; icon: "trend" | "km" | "clock" | "money"; tone: "green" | "blue" | "orange" | "gray"; detail: string }) {
  const tones = { green: "border-emerald-100 bg-emerald-50/60 text-emerald-700", blue: "border-blue-100 bg-blue-50/60 text-blue-700", orange: "border-orange-100 bg-orange-50/60 text-orange-700", gray: "border-slate-200 bg-white text-slate-700" };
  return <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}><span className="flex items-center justify-between"><span className="rounded-xl bg-white/80 p-2"><Icon name={icon} size={19} /></span><span className="text-xs font-medium opacity-70">Período</span></span><span className="mt-4 block text-xs font-semibold uppercase tracking-wide opacity-75">{title}</span><strong className="mt-1 block text-2xl font-extrabold tracking-tight text-slate-900">{value}</strong><span className="mt-1 block text-xs text-slate-500">{detail}</span></div>;
}

export default function ReportsDashboard({ entries, initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [categories, setCategories] = useState<Categories>(DEFAULT_CATEGORIES);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [sort, setSort] = useState<"date" | "profit" | "km" | "hours">("date");
  const [detailCategory, setDetailCategory] = useState<DetailCategory | null>(null);

  const filtered = useMemo(() => entries.filter(e => e.date >= from && e.date <= to), [entries, from, to]);

  const calc = (e: DailyEntry) => {
    const gross = Math.max(0, Number(e.gross_amount) || 0);
    const feePercent = Math.max(0, Number(e.fee_percent) || 0);
    const feeAmount = computeFeeAmount(e);
    const net = computeNetFare(e);
    const gas = categories.gas ? Math.max(0, Number(e.gas_expense) || 0) : 0;
    const alcohol = categories.alcohol ? Math.max(0, Number(e.alcohol_expense) || 0) : 0;
    const maintenance = categories.maintenance ? ((e.maintenance_details || []).reduce((s, i) => s + toNumber(i.value), 0) || Math.max(0, Number(e.maintenance_expense) || 0)) : 0;
    const extras = categories.extras ? (e.extra_expenses || []).reduce((s, i) => s + toNumber(i.value), 0) : 0;
    const km = Math.max(0, Number(e.km_driven) || 0);
    const h = Math.max(0, Number(e.hours_worked) || 0);
    const costs = gas + alcohol + maintenance + extras;
    return { gross, feePercent, feeAmount, net, gas, alcohol, maintenance, extras, km, hours: h, costs, profit: net - costs, fuelLiters: computeFuelLiters(e) };
  };

  const totals = useMemo(() => {
    return filtered.reduce((acc, entry) => {
      const v = calc(entry);
      acc.gross += v.gross;
      acc.feeAmount += v.feeAmount;
      acc.net += v.net;
      acc.gas += v.gas;
      acc.alcohol += v.alcohol;
      acc.maintenance += v.maintenance;
      acc.extras += v.extras;
      acc.km += v.km;
      acc.hours += v.hours;
      acc.costs += v.costs;
      acc.profit += v.profit;
      acc.fuelLiters += v.fuelLiters;
      return acc;
    }, { gross: 0, feeAmount: 0, net: 0, gas: 0, alcohol: 0, maintenance: 0, extras: 0, km: 0, hours: 0, costs: 0, profit: 0, fuelLiters: 0 });
  }, [filtered, categories]);

  const rows = useMemo(() => filtered.map(e => ({ e, v: calc(e) })).sort((a, b) => {
    if (sort === "profit") return b.v.profit - a.v.profit;
    if (sort === "km") return b.v.km - a.v.km;
    if (sort === "hours") return b.v.hours - a.v.hours;
    return b.e.date.localeCompare(a.e.date);
  }), [filtered, categories, sort]);

  const hoursByDate = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => map.set(e.date, (map.get(e.date) || 0) + Math.max(0, Number(e.hours_worked) || 0)));
    return Array.from(map.entries()).filter(([, value]) => value > 0).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const detailItems = useMemo<DetailItem[]>(() => {
    if (!detailCategory) return [];
    return filtered.flatMap(e => {
      const source = detailCategory === "maintenance" ? (e.maintenance_details || []) : (e.extra_expenses || []);
      return source.map(item => ({ date: e.date, description: String(("description" in item ? item.description : item.name) || "Gasto sem descrição"), value: toNumber(item.value) }));
    }).filter(item => item.value > 0).sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered, detailCategory]);

  const periodLabel = from === to ? dateLabel(from) : `${dateLabel(from)} — ${dateLabel(to)}`;
  const profitPerKm = totals.km ? totals.profit / totals.km : null;
  const profitPerHour = totals.hours ? totals.profit / totals.hours : null;

  function setQuick(kind: "today" | "week" | "month") {
    const today = hojeBrasilia();
    if (kind === "today") { setFrom(today); setTo(today); }
    if (kind === "week") { setFrom(startOfWeek(today)); setTo(today); }
    if (kind === "month") { setFrom(`${today.slice(0, 7)}-01`); setTo(endOfMonth(today)); }
  }

  const summaryText = [
    "FaturApp — Relatório",
    `Período: ${periodLabel}`,
    `Receita bruta: ${formatBRL(totals.gross)}`,
    `Taxas dos aplicativos: ${formatBRL(totals.feeAmount)}`,
    `Receita líquida: ${formatBRL(totals.net)}`,
    `Custos: ${formatBRL(totals.costs)}`,
    `Lucro líquido: ${formatBRL(totals.profit)}`,
    `Km: ${num(totals.km, 0)} km`,
    `Horas: ${hours(totals.hours)} h`,
    `R$/km: ${money(profitPerKm)}`,
    `R$/h: ${money(profitPerHour)}`,
  ].join("\n");

  function share() {
    if (navigator.share) navigator.share({ title: "Relatório FaturApp", text: summaryText }).catch(() => undefined);
    else navigator.clipboard?.writeText(summaryText);
  }

  function whatsapp() { window.open(`https://wa.me/?text=${encodeURIComponent(summaryText)}`, "_blank", "noopener,noreferrer"); }
  function email() { window.location.href = `mailto:?subject=${encodeURIComponent("Relatório FaturApp")}&body=${encodeURIComponent(summaryText)}`; }

  function pdf() {
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFontSize(18);
    doc.text("FaturApp — Relatório", 14, 14);
    doc.setFontSize(9);
    doc.text(`Período: ${periodLabel} | Receita bruta: ${formatBRL(totals.gross)} | Taxas: ${formatBRL(totals.feeAmount)} | Receita líquida: ${formatBRL(totals.net)} | Lucro: ${formatBRL(totals.profit)}`, 14, 21);
    autoTable(doc, {
      head: [["Data", "Horas", "Km", "Receita bruta", "Taxa", "Valor taxa", "Receita líquida", "Custos", "Lucro", "Lucro/km"]],
      body: rows.map(r => [dateLabel(r.e.date), `${hours(r.v.hours)} h`, `${num(r.v.km, 0)} km`, formatBRL(r.v.gross), r.v.gross > 0 ? `${r.v.feePercent.toFixed(2)}%` : "—", formatBRL(r.v.feeAmount), formatBRL(r.v.net), formatBRL(r.v.costs), formatBRL(r.v.profit), money(r.v.km ? r.v.profit / r.v.km : null)]),
      startY: 27,
      theme: "striped",
      styles: { fontSize: 7 },
    });
    doc.save(`FaturApp_${from}_${to}.pdf`);
  }

  return <div className="space-y-5 pb-24">
    <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Visão financeira</p><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Relatórios</h1><p className="mt-1 text-sm text-slate-500">Uma visão clara do que realmente sobrou no período.</p></div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{periodLabel}</span>
    </header>

    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-bold text-slate-600">De<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800" /></label>
        <label className="text-xs font-bold text-slate-600">Até<input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800" /></label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2"><button type="button" onClick={() => setQuick("today")} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Hoje</button><button type="button" onClick={() => setQuick("week")} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Semana</button><button type="button" onClick={() => setQuick("month")} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Mês</button><button type="button" onClick={() => setFiltersOpen(v => !v)} className="ml-auto inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Icon name="filter" size={15} /> Filtros</button></div>
      </div>
      {filtersOpen && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">{(["gas", "alcohol", "maintenance", "extras"] as CategoryKey[]).map(key => <label key={key} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={categories[key]} onChange={e => setCategories(c => ({ ...c, [key]: e.target.checked }))} />{key === "gas" ? "Gasolina" : key === "alcohol" ? "Álcool" : key === "maintenance" ? "Manutenção" : "Extras"}</label>)}</div>}
    </section>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Lucro líquido" value={formatBRL(totals.profit)} icon="trend" tone="green" detail="Receita líquida menos custos" />
      <MetricCard title="Receita líquida" value={formatBRL(totals.net)} icon="money" tone="blue" detail={`Taxas dos apps: ${formatBRL(totals.feeAmount)}`} />
      <MetricCard title="Quilômetros" value={`${num(totals.km, 0)} km`} icon="km" tone="gray" detail={`Lucro/km: ${money(profitPerKm)}`} />
      <MetricCard title="Horas trabalhadas" value={`${hours(totals.hours)} h`} icon="clock" tone="orange" detail={`Lucro/h: ${money(profitPerHour)}`} />
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Resumo</p><h2 className="text-xl font-extrabold text-slate-900">Receitas, taxas e custos</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={share} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><Icon name="share" size={15} /> Compartilhar</button><button type="button" onClick={whatsapp} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">WhatsApp</button><button type="button" onClick={email} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><Icon name="mail" size={15} /> E-mail</button><button type="button" onClick={pdf} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Icon name="download" size={15} /> PDF</button></div></div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Receita bruta</p><strong className="mt-1 block text-lg text-slate-900">{formatBRL(totals.gross)}</strong></div><div className="rounded-2xl bg-red-50 p-4"><p className="text-xs text-red-600">Taxas dos apps</p><strong className="mt-1 block text-lg text-red-700">− {formatBRL(totals.feeAmount)}</strong></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Custos</p><strong className="mt-1 block text-lg text-slate-900">{formatBRL(totals.costs)}</strong></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Lucro líquido</p><strong className="mt-1 block text-lg text-emerald-700">{formatBRL(totals.profit)}</strong></div></div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Detalhamento</p><h2 className="text-xl font-extrabold text-slate-900">Dias do período</h2><p className="mt-1 text-sm text-slate-500">A taxa do aplicativo aparece e é contabilizada em cada lançamento.</p></div><select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><option value="date">Mais recentes</option><option value="profit">Maior lucro</option><option value="km">Mais km</option><option value="hours">Mais horas</option></select></div>
      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}><table className="min-w-[1050px] w-full text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 text-left">Data</th><th className="px-4 py-3 text-right">Horas</th><th className="px-4 py-3 text-right">Km</th><th className="px-4 py-3 text-right">Receita bruta</th><th className="px-4 py-3 text-right">Taxa</th><th className="px-4 py-3 text-right">Valor da taxa</th><th className="px-4 py-3 text-right">Receita líquida</th><th className="px-4 py-3 text-right">Custos</th><th className="px-4 py-3 text-right">Lucro líquido</th><th className="px-4 py-3 text-right">Lucro/km</th></tr></thead><tbody>{rows.map(row => <tr key={row.e.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-800">{dateLabel(row.e.date)}</td><td className="px-4 py-3 text-right">{hours(row.v.hours)} h</td><td className="px-4 py-3 text-right">{num(row.v.km, 0)} km</td><td className="px-4 py-3 text-right">{formatBRL(row.v.gross)}</td><td className="px-4 py-3 text-right">{row.v.gross > 0 ? `${row.v.feePercent.toFixed(2)}%` : "—"}</td><td className="px-4 py-3 text-right font-semibold text-red-600">{row.v.gross > 0 ? `− ${formatBRL(row.v.feeAmount)}` : "—"}</td><td className="px-4 py-3 text-right">{formatBRL(row.v.net)}</td><td className="px-4 py-3 text-right">{formatBRL(row.v.costs)}</td><td className={`px-4 py-3 text-right font-bold ${row.v.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatBRL(row.v.profit)}</td><td className="px-4 py-3 text-right">{money(row.v.km ? row.v.profit / row.v.km : null)}</td></tr>)}</tbody><tfoot className="bg-slate-50 font-bold"><tr className="border-t border-slate-200"><td className="px-4 py-3">TOTAL</td><td className="px-4 py-3 text-right">{hours(totals.hours)} h</td><td className="px-4 py-3 text-right">{num(totals.km, 0)} km</td><td className="px-4 py-3 text-right">{formatBRL(totals.gross)}</td><td className="px-4 py-3 text-right">—</td><td className="px-4 py-3 text-right text-red-700">− {formatBRL(totals.feeAmount)}</td><td className="px-4 py-3 text-right">{formatBRL(totals.net)}</td><td className="px-4 py-3 text-right">{formatBRL(totals.costs)}</td><td className="px-4 py-3 text-right text-emerald-700">{formatBRL(totals.profit)}</td><td className="px-4 py-3 text-right">{money(profitPerKm)}</td></tr></tfoot></table></div>
      {rows.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Nenhum lançamento encontrado no período selecionado.</div>}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Controle de jornada</p><h2 className="text-xl font-extrabold text-slate-900">Horas trabalhadas</h2></div><button type="button" onClick={() => setHoursOpen(v => !v)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">{hoursOpen ? "Ocultar" : "Ver detalhes"}</button></div>{hoursOpen && <div className="mt-4 space-y-2">{hoursByDate.length ? hoursByDate.map(([date, value]) => <div key={date} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="font-semibold text-slate-700">{dateLabel(date)}</span><strong>{hours(value)} h</strong></div>) : <p className="text-sm text-slate-500">Nenhum registro de horas no período.</p>}</div>}</section>

    <section className="grid gap-4 md:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Combustível</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Consumo no período</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Litros</p><strong className="mt-1 block text-lg">{num(totals.fuelLiters, 2)} L</strong></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Gasto</p><strong className="mt-1 block text-lg">{formatBRL(totals.gas + totals.alcohol)}</strong></div></div></div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Despesas detalhadas</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Manutenção e extras</h2><div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => setDetailCategory("maintenance")} className="rounded-2xl bg-slate-50 p-4 text-left"><p className="text-xs text-slate-500">Manutenção</p><strong className="mt-1 block text-lg">{formatBRL(totals.maintenance)}</strong><span className="mt-1 block text-xs text-emerald-600">Ver detalhes</span></button><button type="button" onClick={() => setDetailCategory("extras")} className="rounded-2xl bg-slate-50 p-4 text-left"><p className="text-xs text-slate-500">Extras</p><strong className="mt-1 block text-lg">{formatBRL(totals.extras)}</strong><span className="mt-1 block text-xs text-emerald-600">Ver detalhes</span></button></div></div></section>

    {detailCategory && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true"><div className="max-h-[80vh] w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Detalhamento</p><h3 className="text-xl font-extrabold text-slate-900">{detailCategory === "maintenance" ? "Manutenção" : "Extras"}</h3></div><button type="button" onClick={() => setDetailCategory(null)} className="rounded-xl border border-slate-200 p-2"><Icon name="close" size={18} /></button></div><div className="max-h-[60vh] overflow-y-auto p-5">{detailItems.length ? <div className="space-y-2">{detailItems.map((item, index) => <div key={`${item.date}-${item.description}-${index}`} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3"><div><p className="text-xs font-semibold text-slate-400">{dateLabel(item.date)}</p><p className="text-sm font-semibold text-slate-800">{item.description}</p></div><strong>{formatBRL(item.value)}</strong></div>)}</div> : <p className="text-sm text-slate-500">Nenhum lançamento detalhado no período.</p>}</div></div></div>}
  </div>;
}
