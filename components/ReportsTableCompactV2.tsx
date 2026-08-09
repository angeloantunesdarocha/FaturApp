"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { computeNetFare, formatBRL, formatDateBR, todayISO, type DailyEntry } from "@/lib/utils";

type Props = { entries: DailyEntry[]; initialFrom: string; initialTo: string };
type Cats = { gas: boolean; alcohol: boolean; maintenance: boolean; extras: boolean };
const DEFAULT: Cats = { gas: true, alcohol: true, maintenance: true, extras: true };

const startWeek = (iso: string) => { const d = new Date(`${iso}T12:00:00`); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); return d.toISOString().slice(0,10); };
const endMonth = (iso: string) => { const [y,m] = iso.split("-").map(Number); return `${y}-${String(m).padStart(2,"0")}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`; };
const num = (v: unknown) => Math.max(0, Number(v) || 0);
const brl = (v: number) => formatBRL(v);
const km = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const hrs = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export default function ReportsTableCompactV2({ entries, initialFrom, initialTo }: Props) {
  const today = todayISO();
  const monthStart = `${today.slice(0,7)}-01`;
  const week = startWeek(today);
  const [from,setFrom] = useState(initialFrom);
  const [to,setTo] = useState(initialTo);
  const [cats,setCats] = useState<Cats>(DEFAULT);
  const [period,setPeriod] = useState("month");
  const [open,setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => { const fn=(e:MouseEvent)=>{if(panel.current && !panel.current.contains(e.target as Node)) setOpen(false)}; document.addEventListener("mousedown",fn); return()=>document.removeEventListener("mousedown",fn); },[]);

  const filtered = useMemo(()=>entries.filter(e=>e.date>=from&&e.date<=to),[entries,from,to]);
  const calc = (e:DailyEntry) => {
    const gas=cats.gas?num(e.gas_expense):0, alcohol=cats.alcohol?num(e.alcohol_expense):0;
    const maintenance=cats.maintenance?((e.maintenance_details||[]).reduce((s,i)=>s+num(i.value),0)||num(e.maintenance_expense)):0;
    const extras=cats.extras?(e.extra_expenses||[]).reduce((s,i)=>s+num(i.value),0):0;
    const net=computeNetFare(e), k=num(e.km_driven), h=num(e.hours_worked);
    return { net, gas, alcohol, maintenance, extras, fuel:gas+alcohol, km:k, hours:h, profit:net-gas-alcohol-maintenance-extras };
  };
  const total=useMemo(()=>filtered.reduce((a,e)=>{const v=calc(e); Object.keys(v).forEach(k=>{if(k!=="net"||true)a[k as keyof typeof a]+=v[k as keyof typeof v]}); return a;},{net:0,gas:0,alcohol:0,maintenance:0,extras:0,fuel:0,km:0,hours:0,profit:0}),[filtered,cats]);
  const cost=total.gas+total.alcohol+total.maintenance+total.extras;
  const costKm=total.km?cost/total.km:null;
  const best=useMemo(()=>filtered.reduce<DailyEntry|null>((b,e)=>!b||calc(e).profit>calc(b).profit?e:b,null),[filtered,cats]);
  const label=from===to?`Período: ${formatDateBR(from)}`:`Período: ${formatDateBR(from)} a ${formatDateBR(to)}`;
  const active=Object.values(cats).filter(Boolean).length;
  const summary=useMemo(()=>[
    `Relatório FaturApp — ${label}`,
    `Lucro líquido: ${brl(total.profit)}`,
    `Km rodados: ${km(total.km)} km`,
    `Horas trabalhadas: ${hrs(total.hours)} h`,
    `Custo total: ${brl(cost)}`,
    `Custo médio: ${costKm===null?"—":brl(costKm)+"/km"}`,
    ...(best?[`${filtered.length===1?"Resultado do dia":"Melhor dia"}: ${formatDateBR(best.date)} — ${brl(calc(best).profit)}`]:[])
  ].join("\n"),[label,total,cost,costKm,best,filtered.length]);

  const choose=(p:"today"|"week"|"month"|"custom")=>{setPeriod(p); if(p==="today"){setFrom(today);setTo(today);setOpen(false)} if(p==="week"){setFrom(week);setTo(today);setOpen(false)} if(p==="month"){setFrom(monthStart);setTo(endMonth(today));setOpen(false)} if(p==="custom")setOpen(true)};
  const cat=(key:keyof Cats,text:string)=><button type="button" aria-pressed={cats[key]} onClick={()=>setCats(c=>({...c,[key]:!c[key]}))} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${cats[key]?"border-[#16a34a] bg-green-50 text-[#15803d]":"border-slate-300 bg-white text-slate-600"}`}>{cats[key]?"✓ ":""}{text}</button>;
  const chip=(key:"today"|"week"|"month"|"custom",text:string)=><button type="button" onClick={()=>choose(key)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${period===key?"bg-[#16a34a] text-white":"border border-slate-300 bg-white text-slate-700"}`}>{text}</button>;
  const share=async()=>{if(navigator.share) await navigator.share({title:"Relatório FaturApp",text:summary}).catch(()=>{}); else await navigator.clipboard?.writeText(summary)};
  const whatsapp=()=>window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`,"_blank");
  const email=()=>{window.location.href=`mailto:?subject=${encodeURIComponent("Relatório FaturApp")}&body=${encodeURIComponent(summary)}`};
  const copy=()=>void navigator.clipboard?.writeText(summary);
  const pdf=()=>{const doc=new jsPDF("landscape","mm","a4");doc.setFontSize(16);doc.text("FaturApp — Relatório",14,15);doc.setFontSize(9);doc.text(label,14,22);doc.text(`Lucro líquido: ${brl(total.profit)}`,14,27);doc.text(`Km: ${km(total.km)} km`,75,27);doc.text(`Horas: ${hrs(total.hours)} h`,130,27);const body=filtered.map(e=>{const v=calc(e);return[formatDateBR(e.date),hrs(v.hours)+" h",km(v.km)+" km",brl(v.fuel),brl(v.net),brl(v.gas),brl(v.alcohol),brl(v.maintenance),brl(v.extras),brl(v.profit)]});body.push(["TOTAL",hrs(total.hours)+" h",km(total.km)+" km",brl(total.fuel),brl(total.net),brl(total.gas),brl(total.alcohol),brl(total.maintenance),brl(total.extras),brl(total.profit)]);autoTable(doc,{head:[["Data","Horas","Km","Combustível","Receita","Gasolina","Álcool","Manutenção","Extras","Lucro"]],body,startY:34,theme:"grid",styles:{fontSize:7},didParseCell:d=>{if(d.row.index===body.length-1)d.cell.styles.fontStyle="bold"}});doc.save(`FaturApp_Relatorio_${from}_${to}.pdf`)};

  return <div className="space-y-5">
    <div ref={panel} className="sticky top-0 z-30 -mx-1 sm:mx-0">
      <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex min-h-[48px] items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">{chip("today","Hoje")}{chip("week","Esta semana")}{chip("month","Este mês")}{chip("custom","Personalizado")}</div>
          <button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="report-filter-panel" className="shrink-0 rounded-lg border border-[#0f2d4a] px-3 py-2 text-sm font-semibold text-[#0f2d4a]">☷ Filtros <span className="ml-1 rounded-full bg-[#16a34a] px-1.5 py-0.5 text-xs text-white">{active}</span></button>
          <span className="hidden shrink-0 text-sm font-bold text-[#16a34a] sm:inline">{brl(total.profit)}</span>
        </div>
        {open&&<div id="report-filter-panel" className="mt-2 border-t border-slate-200 pt-3 shadow-lg"><div className="space-y-3">
          {period==="custom"&&<div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="label">Data inicial</label><input type="date" className="input" value={from} onChange={e=>{setPeriod("custom");setFrom(e.target.value)}}/></div><div><label className="label">Data final</label><input type="date" className="input" value={to} onChange={e=>{setPeriod("custom");setTo(e.target.value)}}/></div></div>}
          <div><p className="mb-2 text-sm font-semibold text-[#0f2d4a]">Categorias de gastos</p><div className="flex gap-2 overflow-x-auto">{cat("gas","Gasolina")}{cat("alcohol","Álcool")}{cat("maintenance","Manutenção")}{cat("extras","Gastos extras")}</div></div>
        </div></div>}
      </div>
    </div>

    {!filtered.length?<section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm"><p className="text-lg font-bold text-[#0f2d4a]">Nenhum lançamento neste período.</p><p className="mt-2 text-sm text-slate-600">Toque em “Lançar dia” para começar.</p></section>:<>
      <section className="rounded-xl border border-brand-200 bg-brand-50 p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-brand-700">HORAS TRABALHADAS</p><h2 className="mt-1 text-lg font-bold">Quanto tempo você trabalhou?</h2><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">Hoje</p><p className="mt-1 text-xl font-bold">{hrs(filtered.filter(e=>e.date===today).reduce((s,e)=>s+num(e.hours_worked),0))} h</p></div><div className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">Nesta semana</p><p className="mt-1 text-xl font-bold">{hrs(filtered.filter(e=>e.date>=week&&e.date<=today).reduce((s,e)=>s+num(e.hours_worked),0))} h</p></div><div className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">Neste mês</p><p className="mt-1 text-xl font-bold">{hrs(filtered.filter(e=>e.date>=monthStart&&e.date<=today).reduce((s,e)=>s+num(e.hours_worked),0))} h</p></div><div className="rounded-xl border border-brand-300 bg-white p-4"><p className="text-xs font-semibold text-brand-700">Período selecionado</p><p className="mt-1 text-xl font-bold">{hrs(total.hours)} h</p></div></div></section>
      <section className="rounded-2xl bg-[#0f2d4a] p-5 text-white shadow-xl"><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">RESUMO DO PERÍODO</p><h2 className="mt-1 text-xl font-bold">{label}</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={share} className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold">Compartilhar</button><button type="button" onClick={whatsapp} className="rounded-lg bg-[#16a34a] px-3 py-2 text-sm font-semibold">WhatsApp</button><button type="button" onClick={copy} className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold">Copiar texto</button></div></div><div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">Lucro líquido</p><p className="mt-1 text-2xl font-bold">{brl(total.profit)}</p></div><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">Km rodados</p><p className="mt-1 text-2xl font-bold">{km(total.km)} km</p></div><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">{from===to?"Resultado do dia":"Melhor dia"}</p><p className="mt-1 text-xl font-bold">{best?formatDateBR(best.date):"—"}</p><p className="mt-1 text-sm text-emerald-300">{best?brl(calc(best).profit):"—"}</p></div><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">Custo médio</p><p className="mt-1 text-2xl font-bold">{costKm===null?"—":brl(costKm)+"/km"}</p></div></div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-lg font-bold text-slate-800">Detalhamento financeiro</h2><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Receita líquida</p><p className="mt-1 text-xl font-bold">{brl(total.net)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Combustível</p><p className="mt-1 text-xl font-bold">{brl(total.fuel)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Custo total</p><p className="mt-1 text-xl font-bold">{brl(cost)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Lucro total</p><p className="mt-1 text-xl font-bold">{brl(total.profit)}</p></div></div><div className="mt-4 hidden overflow-x-auto rounded-xl border md:block"><table className="min-w-full text-sm"><thead className="bg-slate-100"><tr><th className="px-3 py-3 text-left">Data</th><th className="px-3 py-3 text-right">Horas</th><th className="px-3 py-3 text-right">Km</th><th className="px-3 py-3 text-right">Receita</th>{cats.gas&&<th className="px-3 py-3 text-right">Gasolina</th>}{cats.alcohol&&<th className="px-3 py-3 text-right">Álcool</th>}{cats.maintenance&&<th className="px-3 py-3 text-right">Manutenção</th>}{cats.extras&&<th className="px-3 py-3 text-right">Extras</th>}<th className="px-3 py-3 text-right">Lucro</th></tr></thead><tbody>{filtered.map(e=>{const v=calc(e);return <tr key={e.id} className="border-t"><td className="px-3 py-3 font-medium">{formatDateBR(e.date)}</td><td className="px-3 py-3 text-right">{hrs(v.hours)} h</td><td className="px-3 py-3 text-right">{km(v.km)} km</td><td className="px-3 py-3 text-right">{brl(v.net)}</td>{cats.gas&&<td className="px-3 py-3 text-right">{brl(v.gas)}</td>}{cats.alcohol&&<td className="px-3 py-3 text-right">{brl(v.alcohol)}</td>}{cats.maintenance&&<td className="px-3 py-3 text-right">{brl(v.maintenance)}</td>}{cats.extras&&<td className="px-3 py-3 text-right">{brl(v.extras)}</td>}<td className="px-3 py-3 text-right font-bold">{brl(v.profit)}</td></tr>})}</tbody><tfoot className="bg-slate-50 font-bold"><tr><td className="px-3 py-3">TOTAL</td><td className="px-3 py-3 text-right">{hrs(total.hours)} h</td><td className="px-3 py-3 text-right">{km(total.km)} km</td><td className="px-3 py-3 text-right">{brl(total.net)}</td>{cats.gas&&<td className="px-3 py-3 text-right">{brl(total.gas)}</td>}{cats.alcohol&&<td className="px-3 py-3 text-right">{brl(total.alcohol)}</td>}{cats.maintenance&&<td className="px-3 py-3 text-right">{brl(total.maintenance)}</td>}{cats.extras&&<td className="px-3 py-3 text-right">{brl(total.extras)}</td>}<td className="px-3 py-3 text-right">{brl(total.profit)}</td></tr></tfoot></table></div><div className="mt-4 space-y-3 md:hidden">{filtered.map(e=>{const v=calc(e);return <article key={e.id} className="rounded-xl border p-4"><div className="flex justify-between"><strong className="text-[#0f2d4a]">{formatDateBR(e.date)}</strong><strong className="text-[#16a34a]">{brl(v.profit)}</strong></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><span>Km: <b>{km(v.km)}</b></span><span>Horas: <b>{hrs(v.hours)} h</b></span><span>Receita: <b>{brl(v.net)}</b></span><span>Combustível: <b>{brl(v.fuel)}</b></span>{cats.gas&&<span>Gasolina: <b>{brl(v.gas)}</b></span>}{cats.alcohol&&<span>Álcool: <b>{brl(v.alcohol)}</b></span>}{cats.maintenance&&<span>Manutenção: <b>{brl(v.maintenance)}</b></span>}{cats.extras&&<span>Extras: <b>{brl(v.extras)}</b></span>}</div></article>})}</div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-lg font-bold text-slate-800">Ações de exportação</h2><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={pdf} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Baixar PDF</button><button type="button" onClick={whatsapp} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Enviar por WhatsApp</button><button type="button" onClick={email} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Enviar por e-mail</button></div></section>
    </>}
  </div>;
}
