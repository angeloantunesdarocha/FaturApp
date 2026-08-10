"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  computeFuelLiters,
  computeNetFare,
  formatBRL,
  formatDateBR,
  toNumber,
  type DailyEntry,
} from "@/lib/utils";

type Props = { entries: DailyEntry[]; initialFrom: string; initialTo: string };
type CategoryKey = "gas" | "alcohol" | "maintenance" | "extras";
type Categories = Record<CategoryKey, boolean>;
type DetailCategory = "maintenance" | "extras";
type DetailItem = { date: string; description: string; value: number };
const DEFAULT_CATEGORIES: Categories = { gas: true, alcohol: true, maintenance: true, extras: true };

const money = (n: number | null) => n === null ? "—" : formatBRL(n);
const number = (n: number, max = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: max });
const hours = (n: number) => number(n, 1);
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
  const paths: Record<string, React.ReactNode> = {
    trend: <><path d="M3 17l6-6 4 4 7-8"/><path d="M15 7h5v5"/></>,
    km: <><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></>,
    clock: <><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></>,
    money: <><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></>,
    fuel: <><path d="M6 20V5a2 2 0 012-2h7v17"/><path d="M6 8h9"/><path d="M15 7l3 3v7a2 2 0 004 0v-6l-2-2"/></>,
    wrench: <><path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4l-2.1 2.1-2-2 2.1-2.1z"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></>,
    share: <><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 11l8-5M8 13l8 5"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>,
    close: <><path d="M6 6l12 12M18 6L6 18"/></>,
    chevron: <path d="M6 9l6 6 6-6"/>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M22 12h-2M12 22v-2M2 12h2"/></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function MetricCard({ title, value, icon, tone, detail }: { title: string; value: string; icon: Parameters<typeof Icon>[0]["name"]; tone: "green" | "blue" | "orange" | "gray"; detail: string }) {
  const tones = { green: "border-emerald-100 bg-emerald-50/60 text-emerald-700", blue: "border-blue-100 bg-blue-50/60 text-blue-700", orange: "border-orange-100 bg-orange-50/60 text-orange-700", gray: "border-slate-200 bg-white text-slate-700" };
  return <button type="button" className={`group rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${tones[tone]}`}>
    <span className="flex items-center justify-between"><span className="rounded-xl bg-white/80 p-2"><Icon name={icon} size={19} /></span><span className="text-xs font-medium opacity-70">Detalhes</span></span>
    <span className="mt-4 block text-xs font-semibold uppercase tracking-wide opacity-75">{title}</span>
    <strong className="mt-1 block text-2xl font-extrabold tracking-tight text-slate-900">{value}</strong>
    <span className="mt-1 block text-xs text-slate-500">{detail}</span>
  </button>;
}

/**
 * BarChart — Lucro por dia
 *
 * CORREÇÃO DE SCROLL:
 * - Wrapper externo com overflow-x-auto é o container de scroll.
 * - Inner flex usa min-w-max para forçar largura natural (não encolhe).
 * - Cada barra usa w-[34px] shrink-0 (sem flex-1, que impedia o overflow).
 */
function BarChart({ data }: { data: { date: string; value: number }[] }) {
  const max = Math.max(...data.map(x => x.value), 1);
  return (
    <div
      className="overflow-x-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
      aria-label="Gráfico de lucro diário"
    >
      <div className="flex h-44 min-w-max items-end gap-2 pb-6 pt-3">
        {data.map((item, i) => {
          const height = Math.max(4, Math.abs(item.value) / max * 125);
          const positive = item.value >= 0;
          return (
            <div
              key={`${item.date}-${i}`}
              className="flex w-[34px] shrink-0 flex-col items-center justify-end gap-1"
              title={`${dateLabel(item.date)}: ${formatBRL(item.value)}`}
            >
              <span className="text-[9px] font-semibold text-slate-500">
                {formatBRL(item.value).replace("R$", "")}
              </span>
              <div
                className={`w-full rounded-t-lg transition-all ${positive ? "bg-emerald-400" : "bg-red-300"}`}
                style={{ height }}
              />
              <span className="text-[9px] text-slate-400">{item.date.slice(8)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * CostDonut — Distribuição dos custos
 *
 * CORREÇÃO DE SCROLL:
 * - O componente em si permanece igual.
 * - O card pai envolve o CostDonut em overflow-x-auto + min-w-[260px]
 *   para garantir scroll horizontal no card quando a tela é muito pequena.
 */
function CostDonut({ costs, onDetails }: { costs: { gas: number; alcohol: number; maintenance: number; extras: number }; onDetails: (category: DetailCategory) => void }) {
  const total = costs.gas + costs.alcohol + costs.maintenance + costs.extras;
  const items = [
    { label: "Gasolina", value: costs.gas, color: "#3498db", detail: null },
    { label: "Álcool", value: costs.alcohol, color: "#2ecc71", detail: null },
    { label: "Manutenção", value: costs.maintenance, color: "#f39c12", detail: "maintenance" as DetailCategory },
    { label: "Extras", value: costs.extras, color: "#95a5a6", detail: "extras" as DetailCategory },
  ];
  let cursor = 0;
  const stops = items.map(item => {
    const start = cursor;
    cursor += total ? item.value / total * 360 : 0;
    return `${item.color} ${start}deg ${cursor}deg`;
  });
  return (
    <div className="flex items-center gap-5">
      <div
        className="grid h-36 w-36 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${stops.join(",")})` }}
      >
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-inner">
          <span className="text-[10px] uppercase text-slate-400">Custos</span>
          <strong className="text-sm text-slate-800">{formatBRL(total)}</strong>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
              {item.label}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <strong className="text-slate-800">{formatBRL(item.value)}</strong>
              {item.detail && (
                <button
                  type="button"
                  onClick={() => onDetails(item.detail!)}
                  aria-label={`Ver detalhes de ${item.label}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-1.5 py-1 text-[10px] font-bold text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Icon name="list" size={13}/>Detalhes
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <div className="grid h-44 place-items-center text-sm text-slate-400">Sem dados suficientes.</div>;
  const max = Math.max(...data.map(x => x.value), 1);
  const min = Math.min(...data.map(x => x.value), 0);
  const range = Math.max(max - min, 1);
  const points = data.map((x, i) => `${(i / Math.max(data.length - 1, 1)) * 100},${145 - ((x.value - min) / range) * 125}`).join(" ");
  return (
    <div className="h-44">
      <svg viewBox="0 0 100 155" preserveAspectRatio="none" className="h-36 w-full overflow-visible" role="img" aria-label="Evolução do lucro mensal">
        <polyline points={points} fill="none" stroke="#2ecc71" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        {data.map((x, i) => {
          const [px, py] = points.split(" ")[i].split(",");
          return <circle key={i} cx={px} cy={py} r="2" fill="#2ecc71" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400">
        {data.map(x => <span key={x.label}>{x.label}</span>)}
      </div>
    </div>
  );
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
    const net = computeNetFare(e);
    const gas = categories.gas ? Math.max(0, Number(e.gas_expense) || 0) : 0;
    const alcohol = categories.alcohol ? Math.max(0, Number(e.alcohol_expense) || 0) : 0;
    const maintenance = categories.maintenance
      ? ((e.maintenance_details || []).reduce((s, i) => s + toNumber(i.value), 0) || Number(e.maintenance_expense || 0))
      : 0;
    const extras = categories.extras ? (e.extra_expenses || []).reduce((s, i) => s + toNumber(i.value), 0) : 0;
    const km = Math.max(0, Number(e.km_driven) || 0);
    const h = Math.max(0, Number(e.hours_worked) || 0);
    return { net, gas, alcohol, maintenance, extras, km, hours: h, costs: gas + alcohol + maintenance + extras, profit: net - gas - alcohol - maintenance - extras, fuelLiters: computeFuelLiters(e) };
  };

  const totals = useMemo(() => filtered.reduce((a, e) => {
    const v = calc(e);
    Object.keys(a).forEach(k => { (a as any)[k] += (v as any)[k]; });
    return a;
  }, { net: 0, gas: 0, alcohol: 0, maintenance: 0, extras: 0, km: 0, hours: 0, costs: 0, profit: 0, fuelLiters: 0 }), [filtered, categories]);

  const profitPerKm = totals.km ? totals.profit / totals.km : null;
  const profitPerHour = totals.hours ? totals.profit / totals.hours : null;
  const costPerKm = totals.km ? totals.costs / totals.km : null;

  const rows = useMemo(() => filtered.map(e => ({ e, v: calc(e) })).sort((a, b) =>
    sort === "date" ? b.e.date.localeCompare(a.e.date) :
    sort === "profit" ? b.v.profit - a.v.profit :
    sort === "km" ? b.v.km - a.v.km :
    b.v.hours - a.v.hours
  ), [filtered, categories, sort]);

  const hoursByDate = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => map.set(e.date, (map.get(e.date) || 0) + Math.max(0, Number(e.hours_worked) || 0)));
    return Array.from(map.entries()).filter(([, h]) => h > 0).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const daily = useMemo(() => rows.slice().reverse().map(r => ({ date: r.e.date, value: r.v.profit })), [rows]);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => {
      const key = e.date.slice(0, 7);
      map.set(key, (map.get(key) || 0) + calc(e).profit);
    });
    return Array.from(map.entries()).sort().map(([key, value]) => ({ label: key.slice(5), value }));
  }, [filtered, categories]);

  const detailItems = useMemo<DetailItem[]>(() => {
    if (!detailCategory) return [];
    return filtered.flatMap(e => {
      const source = detailCategory === "maintenance" ? (e.maintenance_details || []) : (e.extra_expenses || []);
      return source.map(item => ({
        date: e.date,
        description: String(("description" in item ? item.description : item.name) || "Gasto sem descrição"),
        value: toNumber(item.value),
      }));
    }).filter(item => item.value > 0).sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered, detailCategory]);

  const activeCount = Object.values(categories).filter(Boolean).length;
  const periodLabel = from === to ? dateLabel(from) : `${dateLabel(from)} — ${dateLabel(to)}`;

  function setQuick(kind: "today" | "week" | "month") {
    const today = new Date().toISOString().slice(0, 10);
    if (kind === "today") { setFrom(today); setTo(today); }
    if (kind === "week") { setFrom(startOfWeek(today)); setTo(today); }
    if (kind === "month") { setFrom(`${today.slice(0, 7)}-01`); setTo(endOfMonth(today)); }
  }

  const detailedItemsText = (category: DetailCategory) => {
    const items = filtered.flatMap(e => {
      const source = category === "maintenance" ? (e.maintenance_details || []) : (e.extra_expenses || []);
      return source.map(item => ({
        date: e.date,
        description: String(("description" in item ? item.description : item.name) || "Gasto sem descrição"),
        value: toNumber(item.value),
      })).filter(item => item.value > 0);
    }).sort((a, b) => b.date.localeCompare(a.date));
    if (!items.length) return `${category === "maintenance" ? "Manutenção" : "Extras"}: nenhum lançamento detalhado`;
    return `${category === "maintenance" ? "Manutenção" : "Extras"}:\n` + items.map(item => `- ${dateLabel(item.date)} — ${item.description}: ${formatBRL(item.value)}`).join("\n");
  };

  const summaryText = [
    `FaturApp — Relatório`,
    `Período: ${periodLabel}`,
    `Lucro líquido: ${formatBRL(totals.profit)}`,
    `Receita líquida: ${formatBRL(totals.net)}`,
    `Custos: ${formatBRL(totals.costs)}`,
    `Km: ${number(totals.km, 0)} km`,
    `Horas: ${hours(totals.hours)} h`,
    `R$/km: ${money(profitPerKm)}`,
    `R$/h: ${money(profitPerHour)}`,
    ``,
    detailedItemsText("maintenance"),
    ``,
    detailedItemsText("extras"),
  ].join("\n");

  function share() { if (navigator.share) navigator.share({ title: "Relatório FaturApp", text: summaryText }).catch(() => {}); else navigator.clipboard?.writeText(summaryText); }
  function whatsapp() { window.open(`https://wa.me/?text=${encodeURIComponent(summaryText)}`, "_blank"); }
  function email() { window.location.href = `mailto:?subject=${encodeURIComponent("Relatório FaturApp")}&body=${encodeURIComponent(summaryText)}`; }
  function pdf() {
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFontSize(18); doc.text("FaturApp — Dashboard de Relatórios", 14, 14);
    doc.setFontSize(9); doc.text(`Período: ${periodLabel} | Lucro: ${formatBRL(totals.profit)} | R$/km: ${money(profitPerKm)} | R$/h: ${money(profitPerHour)}`, 14, 21);
    autoTable(doc, { head: [["Data", "Horas", "Km", "Receita", "Custo", "Lucro", "Lucro/km"]], body: rows.map(r => [dateLabel(r.e.date), `${hours(r.v.hours)} h`, `${number(r.v.km, 0)} km`, formatBRL(r.v.net), formatBRL(r.v.costs), formatBRL(r.v.profit), money(r.v.km ? r.v.profit / r.v.km : null)]), startY: 27, theme: "striped", styles: { fontSize: 8 }, headStyles: { fillColor: [52, 152, 219] } });
    const detailRows: string[][] = [];
    filtered.forEach(e => {
      (e.maintenance_details || []).forEach(item => detailRows.push(["Manutenção", dateLabel(e.date), String(item.description || "Gasto sem descrição"), formatBRL(toNumber(item.value))]));
      (e.extra_expenses || []).forEach(item => detailRows.push(["Extras", dateLabel(e.date), String(item.name || "Gasto sem descrição"), formatBRL(toNumber(item.value))]));
    });
    const nextY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 27) + 10;
    doc.setFontSize(12); doc.text("Detalhamento de Manutenção e Gastos Extras", 14, nextY);
    autoTable(doc, { head: [["Categoria", "Data", "Descrição", "Valor"]], body: detailRows.length ? detailRows : [["—", "—", "Nenhum lançamento encontrado", "R$ 0,00"]], startY: nextY + 4, theme: "striped", styles: { fontSize: 8 }, headStyles: { fillColor: [52, 152, 219] } });
    doc.save(`FaturApp_${from}_${to}.pdf`);
  }

  return (
    <div className="space-y-5 pb-24">
      {/* ── CABEÇALHO ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Visão financeira</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Relatórios</h1>
          <p className="mt-1 text-sm text-slate-500">Uma visão clara do que realmente sobrou no período.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{periodLabel}</span>
      </header>

      {/* ── FILTROS ───────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Filtros e período</h2>
            <p className="text-xs text-slate-500">Atualização automática</p>
          </div>
          <button type="button" onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Icon name="filter" size={17}/>Filtros <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{activeCount}</span>
          </button>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setQuick("today")} className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50">Hoje</button>
          <button onClick={() => setQuick("week")} className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50">Esta semana</button>
          <button onClick={() => setQuick("month")} className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50">Este mês</button>
          <button onClick={() => setFiltersOpen(true)} className="whitespace-nowrap rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm">Personalizado</button>
        </div>
        {filtersOpen && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="report-from" className="mb-1 block text-xs font-semibold text-slate-600">Data inicial</label>
                <input id="report-from" type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"/>
              </div>
              <div>
                <label htmlFor="report-to" className="mb-1 block text-xs font-semibold text-slate-600">Data final</label>
                <input id="report-to" type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"/>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {([["gas", "Gasolina"], ["alcohol", "Álcool"], ["maintenance", "Manutenção"], ["extras", "Gastos extras"]] as [CategoryKey, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setCategories(c => ({ ...c, [key]: !c[key] }))} aria-pressed={categories[key]} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${categories[key] ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-500"}`}>
                  {categories[key] ? "✓ " : ""}{label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── SEM DADOS ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon name="plus"/></div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">Nenhum lançamento neste período</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Ajuste o período ou toque em "Lançar dia" para começar.</p>
        </section>
      ) : (
        <>
          {/* ── CARDS DE MÉTRICAS ──────────────────────────────────────── */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <MetricCard title="Lucro líquido" value={formatBRL(totals.profit)} icon="trend" tone="green" detail="O que realmente sobrou" />
            <MetricCard title="R$/km" value={money(profitPerKm)} icon="km" tone="blue" detail="Lucro por quilômetro" />
            <MetricCard title="R$/h" value={money(profitPerHour)} icon="clock" tone="orange" detail={`${hours(totals.hours)} h no período`} />
            <MetricCard title="Km rodados" value={`${number(totals.km, 0)} km`} icon="km" tone="blue" detail="Distância do período" />
            <MetricCard title="Horas" value={`${hours(totals.hours)} h`} icon="clock" tone="gray" detail="Somente horas registradas" />
          </section>

          {/* ── LUCRO POR DIA + DISTRIBUIÇÃO DOS CUSTOS ───────────────── */}
          {/*
            min-w-0 nos filhos do grid é essencial: sem isso o grid pode
            expandir além do viewport causando scroll horizontal na página.
          */}
          <section className="grid gap-4 lg:grid-cols-3">

            {/* Lucro por dia — scroll horizontal DENTRO do card */}
            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">Lucro por dia</h2>
                  <p className="text-xs text-slate-500">Onde seu resultado está acontecendo</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{rows.length} dias</span>
              </div>
              {/* BarChart já tem overflow-x-auto internamente */}
              <BarChart data={daily} />
            </div>

            {/* Distribuição dos custos — scroll horizontal DENTRO do card */}
            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">Distribuição dos custos</h2>
              <p className="text-xs text-slate-500">Combustível, manutenção e extras</p>
              {/*
                overflow-x-auto aqui garante que o donut + legenda possam
                scrollar horizontalmente em telas muito pequenas,
                sem vazar pra fora do card ou da página.
                min-w-[260px] é o mínimo para o layout do donut fazer sentido.
              */}
              <div className="mt-4 overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                <div style={{ minWidth: "260px" }}>
                  <CostDonut costs={totals} onDetails={setDetailCategory}/>
                </div>
              </div>
            </div>
          </section>

          {/* ── EVOLUÇÃO MENSAL + CUSTO POR KM ────────────────────────── */}
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">Evolução mensal</h2>
                  <p className="text-xs text-slate-500">Lucro acumulado por mês dentro do período</p>
                </div>
              </div>
              <div className="mt-3"><LineChart data={monthly}/></div>
            </div>
            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><Icon name="target" size={18}/><h2 className="font-bold text-slate-900">Custo por km</h2></div>
              <p className="mt-1 text-xs text-slate-500">Quanto custa cada quilômetro</p>
              <div className="mt-5">
                <strong className="text-3xl font-extrabold text-slate-900">{money(costPerKm)}</strong>
                <span className="ml-1 text-sm text-slate-500">/km</span>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Combustível</span><strong>{money(totals.gas + totals.alcohol)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Manutenção</span><strong>{money(totals.maintenance)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Extras</span><strong>{money(totals.extras)}</strong></div>
              </div>
              <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Meta sugerida: defina seu limite de custo/km no próximo passo para acompanhar evolução.</div>
            </div>
          </section>

          {/* ── HORAS TRABALHADAS ─────────────────────────────────────── */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Horas trabalhadas</h2>
                <p className="text-xs text-slate-500">Somente dias com horas registradas.</p>
              </div>
              <button onClick={() => setHoursOpen(v => !v)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                {hoursOpen ? "Ocultar detalhes" : "Ver detalhes"}<Icon name="chevron" size={15}/>
              </button>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total do período</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">{hours(totals.hours)} h</p>
            </div>
            {hoursOpen && (
              <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {hoursByDate.map(([date, h]) => (
                  <div key={date} className="flex justify-between px-4 py-3 text-sm">
                    <span>{dateLabel(date)}</span>
                    <strong>{hours(h)} h</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── TABELA — DIAS DO PERÍODO ───────────────────────────────── */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Dias do período</h2>
                <p className="text-xs text-slate-500">Toque nos cabeçalhos para ordenar.</p>
              </div>
              <div className="flex gap-2">
                <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  <option value="date">Mais recentes</option>
                  <option value="profit">Maior lucro</option>
                  <option value="km">Mais km</option>
                  <option value="hours">Mais horas</option>
                </select>
              </div>
            </div>
            {/* overflow-x-auto aqui já existia e está correto */}
            <div className="mt-4 overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
              <table className="min-w-[760px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-3 text-left">Data</th>
                    <th className="px-3 py-3 text-right">Horas</th>
                    <th className="px-3 py-3 text-right">Km</th>
                    <th className="px-3 py-3 text-right">Receita</th>
                    <th className="px-3 py-3 text-right">Custo</th>
                    <th className="px-3 py-3 text-right">Lucro</th>
                    <th className="px-3 py-3 text-right">Lucro/km</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.e.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                      <td className="px-3 py-3 font-semibold text-slate-800">{dateLabel(r.e.date)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{hours(r.v.hours)} h</td>
                      <td className="px-3 py-3 text-right text-slate-600">{number(r.v.km, 0)}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{formatBRL(r.v.net)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{formatBRL(r.v.costs)}</td>
                      <td className={`px-3 py-3 text-right font-bold ${r.v.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatBRL(r.v.profit)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-700">{money(r.v.km ? r.v.profit / r.v.km : null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ── MODAL DE DETALHES (Manutenção / Extras) ───────────────────── */}
      {detailCategory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
          <div className="max-h-[85vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="detail-modal-title" className="text-lg font-bold text-slate-900">
                  {detailCategory === "maintenance" ? "Detalhes de Manutenção" : "Detalhes de Gastos Extras"}
                </h2>
                <p className="text-xs text-slate-500">Período: {periodLabel}</p>
              </div>
              <button type="button" onClick={() => setDetailCategory(null)} aria-label="Fechar detalhes" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
                <Icon name="close" size={20}/>
              </button>
            </div>
            {/* overflow-y-auto para scroll vertical no modal */}
            <div className="max-h-[65vh] overflow-y-auto p-5">
              {detailItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">Nenhum lançamento encontrado</div>
              ) : (
                /* overflow-x-auto para scroll horizontal nos detalhes dentro do modal */
                <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                  <div className="overflow-hidden rounded-2xl border border-slate-200" style={{ minWidth: "340px" }}>
                    <div className="grid grid-cols-[92px_1fr_auto] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <span>Data</span><span>Descrição</span><span>Valor</span>
                    </div>
                    {detailItems.map((item, index) => (
                      <div key={`${item.date}-${item.description}-${index}`} className="grid grid-cols-[92px_1fr_auto] gap-3 border-t border-slate-100 px-4 py-3 text-sm">
                        <span className="text-slate-500">{dateLabel(item.date)}</span>
                        <span className="min-w-0 break-words font-medium text-slate-700">{item.description}</span>
                        <strong className="text-right text-slate-900">{formatBRL(item.value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 p-4">
              <button type="button" onClick={() => setDetailCategory(null)} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAB DE EXPORTAÇÃO ─────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="fixed bottom-5 right-5 z-40">
          <div className="group relative">
            <button type="button" aria-label="Abrir ações de exportação" className="grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-white shadow-2xl ring-4 ring-white transition hover:scale-105">
              <Icon name="download" size={22}/>
            </button>
            <div className="absolute bottom-16 right-0 hidden w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl group-hover:block">
              <button onClick={pdf} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="download" size={17}/>Baixar PDF</button>
              <button onClick={whatsapp} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">WhatsApp</button>
              <button onClick={email} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="mail" size={17}/>E-mail</button>
              <button onClick={share} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="share" size={17}/>Compartilhar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
