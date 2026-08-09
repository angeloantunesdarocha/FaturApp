"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  computeDayProfit,
  computeFuelCost,
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

function Icon({ name, size = 20 }: { name: "trend" | "km" | "clock" | "money" | "fuel" | "wrench" | "plus" | "filter" | "download" | "share" | "mail" | "close" | "chevron" | "target"; size?: number }) {
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

function BarChart({ data }: { data: { date: string; value: number }[] }) {
  const max = Math.max(...data.map(x => x.value), 1);
  return <div className="flex h-44 items-end gap-2 overflow-x-auto pb-6 pt-3" aria-label="Gráfico de lucro diário">
    {data.map((item, i) => { const height = Math.max(4, Math.abs(item.value) / max * 125); const positive = item.value >= 0; return <div key={`${item.date}-${i}`} className="flex min-w-[34px] flex-1 flex-col items-center justify-end gap-1" title={`${dateLabel(item.date)}: ${formatBRL(item.value)}`}><span className="text-[9px] font-semibold text-slate-500">{formatBRL(item.value).replace("R$", "")}</span><div className={`w-full max-w-8 rounded-t-lg transition-all ${positive ? "bg-emerald-400" : "bg-red-300"}`} style={{ height }} /><span className="text-[9px] text-slate-400">{item.date.slice(8)}</span></div>; })}
  </div>;
}

function CostDonut({ costs }: { costs: { gas: number; alcohol: number; maintenance: number; extras: number } }) {
  const total = costs.gas + costs.alcohol + costs.maintenance + costs.extras;
  const items = [{ label: "Gasolina", value: costs.gas, color: "#3498db" }, { label: "Álcool", value: costs.alcohol, color: "#2ecc71" }, { label: "Manutenção", value: costs.maintenance, color: "#f39c12" }, { label: "Extras", value: costs.extras, color: "#95a5a6" }];
  let cursor = 0;
  const stops = items.map(item => { const start = cursor; cursor += total ? item.value / total * 360 : 0; return `${item.color} ${start}deg ${cursor}deg`; });
  return <div className="flex items-center gap-5"><div className="grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${stops.join(",")})` }}><div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-inner"><span className="text-[10px] uppercase text-slate-400">Custos</span><strong className="text-sm text-slate-800">{formatBRL(total)}</strong></div></div><div className="min-w-0 space-y-2">{items.map(item => <div key={item.label} className="flex items-center justify-between gap-4 text-xs"><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.label}</span><strong className="text-slate-800">{formatBRL(item.value)}</strong></div>)}</div></div>;
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <div className="grid h-44 place-items-center text-sm text-slate-400">Sem dados suficientes.</div>;
  const max = Math.max(...data.map(x => x.value), 1); const min = Math.min(...data.map(x => x.value), 0); const range = Math.max(max - min, 1);
  const points = data.map((x, i) => `${(i / Math.max(data.length - 1, 1)) * 100},${145 - ((x.value - min) / range) * 125}`).join(" ");
  return <div className="h-44"><svg viewBox="0 0 100 155" preserveAspectRatio="none" className="h-36 w-full overflow-visible" role="img" aria-label="Evolução do lucro mensal"><polyline points={points} fill="none" stroke="#2ecc71" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />{data.map((x,i)=>{const [px,py]=points.split(" ")[i].split(",");return <circle key={i} cx={px} cy={py} r="2" fill="#2ecc71" />;})}</svg><div className="flex justify-between text-[10px] text-slate-400">{data.map(x=><span key={x.label}>{x.label}</span>)}</div></div>;
}

export default function ReportsDashboard({ entries, initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom); const [to, setTo] = useState(initialTo); const [categories, setCategories] = useState<Categories>(DEFAULT_CATEGORIES); const [filtersOpen, setFiltersOpen] = useState(false); const [hoursOpen, setHoursOpen] = useState(false); const [sort, setSort] = useState<"date" | "profit" | "km" | "hours">("date");
  const filtered = useMemo(() => entries.filter(e => e.date >= from && e.date <= to), [entries, from, to]);
  const calc = (e: DailyEntry) => { const net = computeNetFare(e); const gas = categories.gas ? Math.max(0, Number(e.gas_expense) || 0) : 0; const alcohol = categories.alcohol ? Math.max(0, Number(e.alcohol_expense) || 0) : 0; const maintenance = categories.maintenance ? ((e.maintenance_details || []).reduce((s,i)=>s+toNumber(i.value),0) || Number(e.maintenance_expense || 0)) : 0; const extras = categories.extras ? (e.extra_expenses || []).reduce((s,i)=>s+toNumber(i.value),0) : 0; const km = Math.max(0, Number(e.km_driven) || 0); const h = Math.max(0, Number(e.hours_worked) || 0); return { net, gas, alcohol, maintenance, extras, km, hours: h, costs: gas + alcohol + maintenance + extras, profit: net - gas - alcohol - maintenance - extras, fuelLiters: computeFuelLiters(e) }; };
  const totals = useMemo(() => filtered.reduce((a,e)=>{const v=calc(e); Object.keys(a).forEach(k=>{(a as any)[k]+=(v as any)[k]}); return a;},{net:0,gas:0,alcohol:0,maintenance:0,extras:0,km:0,hours:0,costs:0,profit:0,fuelLiters:0}), [filtered,categories]);
  const profitPerKm = totals.km ? totals.profit / totals.km : null; const profitPerHour = totals.hours ? totals.profit / totals.hours : null; const costPerKm = totals.km ? totals.costs / totals.km : null;
  const rows = useMemo(()=>filtered.map(e=>({e,v:calc(e)})).sort((a,b)=>sort==="date"?b.e.date.localeCompare(a.e.date):sort==="profit"?b.v.profit-a.v.profit:sort==="km"?b.v.km-a.v.km:b.v.hours-a.v.hours),[filtered,categories,sort]);
  const best = rows.reduce<{e:DailyEntry;v:ReturnType<typeof calc>}|null>((b,r)=>!b||r.v.profit>b.v.profit?r:b,null);
  const hoursByDate = useMemo(()=>{const map=new Map<string,number>();filtered.forEach(e=>map.set(e.date,(map.get(e.date)||0)+Math.max(0,Number(e.hours_worked)||0)));return [...map.entries()].filter(([,h])=>h>0).sort((a,b)=>b[0].localeCompare(a[0]));},[filtered]);
  const daily = useMemo(()=>rows.slice().reverse().map(r=>({date:r.e.date,value:r.v.profit})),[rows]);
  const monthly = useMemo(()=>{const map=new Map<string,number>();filtered.forEach(e=>{const key=e.date.slice(0,7);map.set(key,(map.get(key)||0)+calc(e).profit);});return [...map.entries()].sort().map(([key,value])=>({label:key.slice(5),value}));},[filtered,categories]);
  const activeCount = Object.values(categories).filter(Boolean).length;
  const periodLabel = from===to ? dateLabel(from) : `${dateLabel(from)} — ${dateLabel(to)}`;

  function setQuick(kind: "today"|"week"|"month") { const today = new Date().toISOString().slice(0,10); if(kind==="today"){setFrom(today);setTo(today);} if(kind==="week"){setFrom(startOfWeek(today));setTo(today);} if(kind==="month"){setFrom(`${today.slice(0,7)}-01`);setTo(endOfMonth(today));} }
  const summaryText = [`FaturApp — Relatório`, `Período: ${periodLabel}`, `Lucro líquido: ${formatBRL(totals.profit)}`, `Receita líquida: ${formatBRL(totals.net)}`, `Custos: ${formatBRL(totals.costs)}`, `Km: ${number(totals.km,0)} km`, `Horas: ${hours(totals.hours)} h`, `R$/km: ${money(profitPerKm)}`, `R$/h: ${money(profitPerHour)}`].join("\n");
  function share(){ if(navigator.share) navigator.share({title:"Relatório FaturApp",text:summaryText}).catch(()=>{}); else navigator.clipboard?.writeText(summaryText); }
  function whatsapp(){window.open(`https://wa.me/?text=${encodeURIComponent(summaryText)}`,"_blank");}
  function email(){window.location.href=`mailto:?subject=${encodeURIComponent("Relatório FaturApp")}&body=${encodeURIComponent(summaryText)}`;}
  function pdf(){const doc=new jsPDF("landscape","mm","a4");doc.setFontSize(18);doc.text("FaturApp — Dashboard de Relatórios",14,14);doc.setFontSize(9);doc.text(`Período: ${periodLabel} | Lucro: ${formatBRL(totals.profit)} | R$/km: ${money(profitPerKm)} | R$/h: ${money(profitPerHour)}`,14,21);autoTable(doc,{head:[["Data","Horas","Km","Receita","Custo","Lucro","Lucro/km"]],body:rows.map(r=>[dateLabel(r.e.date),`${hours(r.v.hours)} h`,`${number(r.v.km,0)} km`,formatBRL(r.v.net),formatBRL(r.v.costs),formatBRL(r.v.profit),money(r.v.km?r.v.profit/r.v.km:null)]),startY:27,theme:"striped",styles:{fontSize:8},headStyles:{fillColor:[52,152,219]}});doc.save(`FaturApp_${from}_${to}.pdf`);}

  return <div className="space-y-5 pb-24">
    <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Visão financeira</p><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Relatórios</h1><p className="mt-1 text-sm text-slate-500">Uma visão clara do que realmente sobrou no período.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{periodLabel}</span></header>

    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-bold text-slate-900">Filtros e período</h2><p className="text-xs text-slate-500">Atualização automática</p></div><button type="button" onClick={()=>setFiltersOpen(v=>!v)} aria-expanded={filtersOpen} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="filter" size={17}/>Filtros <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{activeCount}</span></button></div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1"><button onClick={()=>setQuick("today")} className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50">Hoje</button><button onClick={()=>setQuick("week")} className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50">Esta semana</button><button onClick={()=>setQuick("month")} className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50">Este mês</button><button onClick={()=>setFiltersOpen(true)} className="whitespace-nowrap rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm">Personalizado</button></div>
      {filtersOpen && <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor="report-from" className="mb-1 block text-xs font-semibold text-slate-600">Data inicial</label><input id="report-from" type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"/></div><div><label htmlFor="report-to" className="mb-1 block text-xs font-semibold text-slate-600">Data final</label><input id="report-to" type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"/></div></div><div className="mt-4 flex flex-wrap gap-2">{([['gas','Gasolina'],['alcohol','Álcool'],['maintenance','Manutenção'],['extras','Gastos extras']] as [CategoryKey,string][]).map(([key,label])=><button key={key} onClick={()=>setCategories(c=>({...c,[key]:!c[key]}))} aria-pressed={categories[key]} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${categories[key]?"border-emerald-300 bg-emerald-50 text-emerald-800":"border-slate-300 bg-white text-slate-500"}`}>{categories[key]?"✓ ":""}{label}</button>)}</div></div>}
    </section>

    {filtered.length===0 ? <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon name="plus"/></div><h2 className="mt-4 text-xl font-bold text-slate-900">Nenhum lançamento neste período</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Ajuste o período ou toque em “Lançar dia” para começar.</p></section> : <>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard title="Lucro líquido" value={formatBRL(totals.profit)} icon="trend" tone="green" detail="O que realmente sobrou" />
        <MetricCard title="R$/km" value={money(profitPerKm)} icon="km" tone="blue" detail="Lucro por quilômetro" />
        <MetricCard title="R$/h" value={money(profitPerHour)} icon="clock" tone="orange" detail={`${hours(totals.hours)} h no período`} />
        <MetricCard title="Km rodados" value={`${number(totals.km,0)} km`} icon="km" tone="blue" detail="Distância do período" />
        <MetricCard title="Horas" value={`${hours(totals.hours)} h`} icon="clock" tone="gray" detail="Somente horas registradas" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Lucro por dia</h2><p className="text-xs text-slate-500">Onde seu resultado está acontecendo</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{rows.length} dias</span></div><BarChart data={daily} /></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Distribuição dos custos</h2><p className="text-xs text-slate-500">Combustível, manutenção e extras</p><div className="mt-4"><CostDonut costs={totals}/></div></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Evolução mensal</h2><p className="text-xs text-slate-500">Lucro acumulado por mês dentro do período</p></div></div><div className="mt-3"><LineChart data={monthly}/></div></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Icon name="target" size={18}/><h2 className="font-bold text-slate-900">Custo por km</h2></div><p className="mt-1 text-xs text-slate-500">Quanto custa cada quilômetro</p><div className="mt-5"><strong className="text-3xl font-extrabold text-slate-900">{money(costPerKm)}</strong><span className="ml-1 text-sm text-slate-500">/km</span></div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Combustível</span><strong>{money(totals.gas+totals.alcohol)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Manutenção</span><strong>{money(totals.maintenance)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Extras</span><strong>{money(totals.extras)}</strong></div></div><div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Meta sugerida: defina seu limite de custo/km no próximo passo para acompanhar evolução.</div></div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold text-slate-900">Horas trabalhadas</h2><p className="text-xs text-slate-500">Somente dias com horas registradas.</p></div><button onClick={()=>setHoursOpen(v=>!v)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">{hoursOpen?"Ocultar detalhes":"Ver detalhes"}<Icon name="chevron" size={15}/></button></div><div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total do período</p><p className="mt-1 text-3xl font-extrabold text-slate-900">{hours(totals.hours)} h</p></div>{hoursOpen&&<div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">{hoursByDate.map(([date,h])=><div key={date} className="flex justify-between px-4 py-3 text-sm"><span>{dateLabel(date)}</span><strong>{hours(h)} h</strong></div>)}</div>}</section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold text-slate-900">Dias do período</h2><p className="text-xs text-slate-500">Toque nos cabeçalhos para ordenar.</p></div><div className="flex gap-2"><select value={sort} onChange={e=>setSort(e.target.value as typeof sort)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><option value="date">Mais recentes</option><option value="profit">Maior lucro</option><option value="km">Mais km</option><option value="hours">Mais horas</option></select></div></div><div className="mt-4 overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3 text-left">Data</th><th className="px-3 py-3 text-right">Horas</th><th className="px-3 py-3 text-right">Km</th><th className="px-3 py-3 text-right">Receita</th><th className="px-3 py-3 text-right">Custo</th><th className="px-3 py-3 text-right">Lucro</th><th className="px-3 py-3 text-right">Lucro/km</th></tr></thead><tbody>{rows.map(r=><tr key={r.e.id} className="border-b border-slate-100 transition hover:bg-slate-50"><td className="px-3 py-3 font-semibold text-slate-800">{dateLabel(r.e.date)}</td><td className="px-3 py-3 text-right text-slate-600">{hours(r.v.hours)} h</td><td className="px-3 py-3 text-right text-slate-600">{number(r.v.km,0)}</td><td className="px-3 py-3 text-right text-slate-700">{formatBRL(r.v.net)}</td><td className="px-3 py-3 text-right text-slate-600">{formatBRL(r.v.costs)}</td><td className={`px-3 py-3 text-right font-bold ${r.v.profit>=0?"text-emerald-600":"text-red-600"}`}>{formatBRL(r.v.profit)}</td><td className="px-3 py-3 text-right font-semibold text-slate-700">{money(r.v.km?r.v.profit/r.v.km:null)}</td></tr>)}</tbody></table></div></section>
    </>}

    {filtered.length>0 && <div className="fixed bottom-5 right-5 z-40"><div className="group relative"><button type="button" aria-label="Abrir ações de exportação" className="grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-white shadow-2xl ring-4 ring-white transition hover:scale-105"><Icon name="download" size={22}/></button><div className="absolute bottom-16 right-0 hidden w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl group-hover:block"><button onClick={pdf} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="download" size={17}/>Baixar PDF</button><button onClick={whatsapp} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">WhatsApp</button><button onClick={email} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="mail" size={17}/>E-mail</button><button onClick={share} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="share" size={17}/>Compartilhar</button></div></div></div>}
  </div>;
}
