"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { computeFeeAmount, computeNetFare, formatBRL, formatDateBR, todayISO, toNumber, type DailyEntry } from "@/lib/utils";

type Props = { entries: DailyEntry[]; initialFrom: string; initialTo: string };
type Categories = { gas: boolean; alcohol: boolean; maintenance: boolean; extras: boolean };
const DEFAULT_CATEGORIES: Categories = { gas: true, alcohol: true, maintenance: true, extras: true };

autoTable;

function km(v: number) { return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }); }
function liters(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function hours(v: number) { return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }); }
function weekStart(dateISO: string) { const d = new Date(`${dateISO}T12:00:00`); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function monthEnd(dateISO: string) { const [y,m] = dateISO.split("-").map(Number); return `${y}-${String(m).padStart(2,"0")}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`; }
function maintenance(e: DailyEntry) { const d=(e.maintenance_details||[]).reduce((s,i)=>s+toNumber(i.value),0); return d>0?d:Number(e.maintenance_expense||0); }
function extras(e: DailyEntry) { return (e.extra_expenses||[]).reduce((s,i)=>s+toNumber(i.value),0); }
function details(e: DailyEntry, kind: "maintenance"|"extras") { return kind === "maintenance" ? (e.maintenance_details||[]).filter(i=>toNumber(i.value)!==0||i.description).map(i=>`${formatBRL(toNumber(i.value))} — ${i.description||"Item sem descrição"}`) : (e.extra_expenses||[]).filter(i=>toNumber(i.value)!==0||i.name).map(i=>`${formatBRL(toNumber(i.value))} — ${i.name||"Item sem descrição"}`); }

export default function ReportsTableCompact({ entries, initialFrom, initialTo }: Props) {
  const today = todayISO();
  const [year, month] = today.split("-");
  const monthStart = `${year}-${month}-01`;
  const [from,setFrom] = useState(initialFrom);
  const [to,setTo] = useState(initialTo);
  const [cats,setCats] = useState<Categories>(DEFAULT_CATEGORIES);
  const [shortcut,setShortcut] = useState("month");
  const [panelOpen,setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const week = weekStart(today);

  useEffect(() => {
    function close(e: MouseEvent) { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setPanelOpen(false); }
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useMemo(() => entries.filter(e=>e.date>=from&&e.date<=to), [entries,from,to]);
  const value = (e: DailyEntry) => {
    const gas = cats.gas ? Math.max(0,Number(e.gas_expense)||0) : 0;
    const alcohol = cats.alcohol ? Math.max(0,Number(e.alcohol_expense)||0) : 0;
    const maint = cats.maintenance ? maintenance(e) : 0;
    const extra = cats.extras ? extras(e) : 0;
    const kmValue = Math.max(0,Number(e.km_driven)||0);
    const hourValue = Math.max(0,Number(e.hours_worked)||0);
    const fuelLiters = Math.max(0,Number(e.gasoline_liters)||0)+Math.max(0,Number(e.alcohol_liters)||0);
    const net = computeNetFare(e);
    return { gross:Number(e.gross_amount)||0, feePercent:Number(e.fee_percent)||0, feeAmount:computeFeeAmount(e), net, gas, alcohol, maint, extra, fuel:gas+alcohol, km:kmValue, hours:hourValue, liters:fuelLiters, profit:net-gas-alcohol-maint-extra, kmPerLiter:fuelLiters>0?kmValue/fuelLiters:null };
  };
  const totals = useMemo(()=>filtered.reduce((a,e)=>{const v=value(e); a.gross+=v.gross;a.feeAmount+=v.feeAmount;a.net+=v.net;a.gas+=v.gas;a.alcohol+=v.alcohol;a.maint+=v.maint;a.extra+=v.extra;a.fuel+=v.fuel;a.km+=v.km;a.hours+=v.hours;a.liters+=v.liters;a.profit+=v.profit;return a;},{gross:0,feeAmount:0,net:0,gas:0,alcohol:0,maint:0,extra:0,fuel:0,km:0,hours:0,liters:0,profit:0}),[filtered,cats]);
  const cost = totals.gas+totals.alcohol+totals.maint+totals.extra;
  const costKm = totals.km>0?cost/totals.km:null;
  const profitHour = totals.hours>0?totals.profit/totals.hours:null;
  const best = useMemo(()=>filtered.reduce<DailyEntry|null>((b,e)=>!b||value(e).profit>value(b).profit?e:b,null),[filtered,cats]);
  const periodLabel = from===to?`Período: ${formatDateBR(from)}`:`Período: ${formatDateBR(from)} a ${formatDateBR(to)}`;
  const activeCount = Object.values(cats).filter(Boolean).length;
  const periodShortcut = (key:"today"|"week"|"month"|"custom") => {
    setShortcut(key); if(key==="today"){setFrom(today);setTo(today);setPanelOpen(false);} if(key==="week"){setFrom(week);setTo(today);setPanelOpen(false);} if(key==="month"){setFrom(monthStart);setTo(monthEnd(today));setPanelOpen(false);} if(key==="custom") setPanelOpen(true);
  };
  const summary = useMemo(()=>[
    `Relatório FaturApp — ${periodLabel}`,
    `Lucro líquido: ${formatBRL(totals.profit)}`,
    `Km rodados: ${km(totals.km)} km`,
    `Horas trabalhadas: ${hours(totals.hours)} h`,
    `Custo total: ${formatBRL(cost)}`,
    `Custo médio: ${costKm===null?"—":`${formatBRL(costKm)}/km`}`,
    `Lucro por hora: ${profitHour===null?"—":`${formatBRL(profitHour)}/h`}`,
    ...(best?[`${filtered.length===1?"Resultado do dia":"Melhor dia"}: ${formatDateBR(best.date)} — ${formatBRL(value(best).profit)}`]:[])
  ].join("\n"),[periodLabel,totals,cost,costKm,profitHour,best,filtered.length]);

  async function share(){ if(navigator.share) await navigator.share({title:"Relatório FaturApp",text:summary}).catch(()=>undefined); else await navigator.clipboard?.writeText(summary); }
  function whatsapp(){window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`,"_blank");}
  function email(){window.location.href=`mailto:?subject=${encodeURIComponent("Relatório FaturApp")}&body=${encodeURIComponent(summary)}`;}
  function copy(){void navigator.clipboard?.writeText(summary);}
  function pdf(){
    const doc=new jsPDF("landscape","mm","a4"); doc.setFontSize(16);doc.text("FaturApp — Relatório",14,15);doc.setFontSize(9);doc.text(periodLabel,14,22);doc.text(`Lucro líquido: ${formatBRL(totals.profit)}`,14,27);doc.text(`Km: ${km(totals.km)} km`,75,27);doc.text(`Horas: ${hours(totals.hours)} h`,130,27);doc.text(`Custo médio: ${costKm===null?"—":formatBRL(costKm)+"/km"}`,185,27);
    const head=["Data","Horas","Km","Combustível","Receita","Gasolina","Álcool","Manutenção","Extras","Lucro"];
    const body=filtered.map(e=>{const v=value(e);return[formatDateBR(e.date),`${hours(v.hours)} h`,`${km(v.km)} km`,formatBRL(v.fuel),formatBRL(v.net),formatBRL(v.gas),formatBRL(v.alcohol),formatBRL(v.maint),formatBRL(v.extra),formatBRL(v.profit)]});
    body.push(["TOTAL",`${hours(totals.hours)} h`,`${km(totals.km)} km`,formatBRL(totals.fuel),formatBRL(totals.net),formatBRL(totals.gas),formatBRL(totals.alcohol),formatBRL(totals.maint),formatBRL(totals.extra),formatBRL(totals.profit)]);
    autoTable(doc,{head:[head],body,startY:34,theme:"grid",styles:{fontSize:7,cellPadding:1.5},headStyles:{fontSize:7,fontStyle:"bold"},didParseCell:d=>{if(d.row.index===body.length-1)d.cell.styles.fontStyle="bold";}});doc.save(`FaturApp_Relatorio_${from}_${to}.pdf`);
  }

  const chip=(key:keyof Categories,label:string)=><button type="button" aria-pressed={cats[key]} onClick={()=>setCats(c=>({...c,[key]:!c[key]}))} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${cats[key]?"border-[#16a34a] bg-green-50 text-[#15803d]":"border-slate-300 bg-white text-slate-600"}`}>{cats[key]?"✓ ":""}{label}</button>;
  const shortcut=(key:string,label:string)=><button type="button" onClick={()=>periodShortcut(key as any)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${shortcut===key?"bg-[#16a34a] text-white shadow-sm":"border border-slate-300 bg-white text-slate-700 hover:border-[#16a34a] hover:text-[#16a34a]"}`}>{label}</button>;

  return <div className="space-y-5">
    <div ref={panelRef} className="sticky top-0 z-30 -mx-1 sm:mx-0">
      <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex min-h-[48px] items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5">{shortcut("today","Hoje")}{shortcut("week","Esta semana")}{shortcut("month","Este mês")}{shortcut("custom","Personalizado")}</div>
          <button type="button" onClick={()=>setPanelOpen(v=>!v)} aria-expanded={panelOpen} aria-controls="report-filter-panel" className="shrink-0 rounded-lg border border-[#0f2d4a] bg-white px-3 py-2 text-sm font-semibold text-[#0f2d4a] shadow-sm hover:bg-slate-50">☷ Filtros <span className="ml-1 rounded-full bg-[#16a34a] px-1.5 py-0.5 text-xs text-white">{activeCount}</span></button>
          <span className="hidden shrink-0 text-sm font-bold text-[#16a34a] sm:inline">{formatBRL(totals.profit)}</span>
        </div>
        {panelOpen && <div id="report-filter-panel" className="mt-2 border-t border-slate-200 pt-3 shadow-lg">
          <div className="flex flex-col gap-3">
            {shortcut==="custom" && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="label">Data inicial</label><input type="date" className="input" value={from} onChange={e=>{setShortcut("custom");setFrom(e.target.value)}} /></div><div><label className="label">Data final</label><input type="date" className="input" value={to} onChange={e=>{setShortcut("custom");setTo(e.target.value)}} /></div></div>}
            <div><p className="mb-2 text-sm font-semibold text-[#0f2d4a]">Categorias de gastos</p><div className="flex gap-2 overflow-x-auto pb-1">{chip("gas","Gasolina")}{chip("alcohol","Álcool")}{chip("maintenance","Manutenção")}{chip("extras","Gastos extras")}</div></div>
          </div>
        </div>}
      </div>
    </div>

    {!filtered.length ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm"><p className="text-lg font-bold text-[#0f2d4a]">Nenhum lançamento neste período.</p><p className="mt-2 text-sm text-slate-600">Toque em “Lançar dia” para começar.</p></section> : <>
      <section className="rounded-xl border border-brand-200 bg-brand-50 p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-brand-700">HORAS TRABALHADAS</p><h2 className="mt-1 text-lg font-bold text-slate-900">Quanto tempo você trabalhou?</h2><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">Hoje</p><p className="mt-1 text-xl font-bold">{hours(filtered.filter(e=>e.date===today).reduce((s,e)=>s+Number(e.hours_worked||0),0))} h</p></div><div className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">Nesta semana</p><p className="mt-1 text-xl font-bold">{hours(filtered.filter(e=>e.date>=week&&e.date<=today).reduce((s,e)=>s+Number(e.hours_worked||0),0))} h</p></div><div className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">Neste mês</p><p className="mt-1 text-xl font-bold">{hours(filtered.filter(e=>e.date>=monthStart&&e.date<=today).reduce((s,e)=>s+Number(e.hours_worked||0),0))} h</p></div><div className="rounded-xl border border-brand-300 bg-white p-4"><p className="text-xs font-semibold text-brand-700">Período selecionado</p><p className="mt-1 text-xl font-bold">{hours(totals.hours)} h</p></div></div></section>

      <section className="rounded-2xl bg-[#0f2d4a] p-5 text-white shadow-xl"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">RESUMO DO PERÍODO</p><h2 className="mt-1 text-xl font-bold">{periodLabel}</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={share} className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold">Compartilhar</button><button type="button" onClick={whatsapp} className="rounded-lg bg-[#16a34a] px-3 py-2 text-sm font-semibold">WhatsApp</button><button type="button" onClick={copy} className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold">Copiar texto</button></div></div><div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">Lucro líquido</p><p className="mt-1 text-2xl font-bold">{formatBRL(totals.profit)}</p></div><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">Km rodados</p><p className="mt-1 text-2xl font-bold">{km(totals.km)} km</p></div><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">{from===to?"Resultado do dia":"Melhor dia"}</p><p className="mt-1 text-xl font-bold">{best?formatDateBR(best.date):"—"}</p><p className="mt-1 text-sm text-emerald-300">{best?formatBRL(value(best).profit):"—"}</p></div><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">Custo médio</p><p className="mt-1 text-2xl font-bold">{costKm===null?"—":`${formatBRL(costKm)}/km`}</p></div></div></section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-lg font-bold text-slate-800">Detalhamento financeiro</h2><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Receita líquida</p><p className="mt-1 text-xl font-bold">{formatBRL(totals.net)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Litros abastecidos</p><p className="mt-1 text-xl font-bold">{liters(totals.liters)} L</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Consumo médio</p><p className="mt-1 text-xl font-bold">{totals.liters>0?`${(totals.km/totals.liters).toLocaleString("pt-BR",{maximumFractionDigits:2})} km/L`:"—"}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Lucro total</p><p className="mt-1 text-xl font-bold">{formatBRL(totals.profit)}</p></div></div>
        <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 md:block"><table className="min-w-full text-sm"><thead className="bg-slate-100"><tr><th className="px-3 py-3 text-left">Data</th><th className="px-3 py-3 text-right">Horas</th><th className="px-3 py-3 text-right">Km</th><th className="px-3 py-3 text-right">Combustível</th><th className="px-3 py-3 text-right">Receita</th>{cats.gas&&<th className="px-3 py-3 text-right">Gasolina</th>}{cats.alcohol&&<th className="px-3 py-3 text-right">Álcool</th>}{cats.maintenance&&<th className="px-3 py-3 text-right">Manutenção</th>}{cats.extras&&<th className="px-3 py-3 text-right">Extras</th>}<th className="px-3 py-3 text-right">Lucro</th></tr></thead><tbody>{filtered.map(e=>{const v=value(e);return <tr key={e.id} className="border-t border-slate-200"><td className="px-3 py-3 font-medium">{formatDateBR(e.date)}</td><td className="px-3 py-3 text-right">{hours(v.hours)} h</td><td className="px-3 py-3 text-right">{km(v.km)} km</td><td className="px-3 py-3 text-right">{formatBRL(v.fuel)}<div className="text-xs text-slate-500">{liters(v.liters)} L</div></td><td className="px-3 py-3 text-right">{formatBRL(v.net)}</td>{cats.gas&&<td className="px-3 py-3 text-right">{formatBRL(v.gas)}</td>}{cats.alcohol&&<td className="px-3 py-3 text-right">{formatBRL(v.alcohol)}</td>}{cats.maintenance&&<td className="px-3 py-3 text-right">{formatBRL(v.maint)}</td>}{cats.extras&&<td className="px-3 py-3 text-right">{formatBRL(v.extra)}</td>}<td className="px-3 py-3 text-right font-bold">{formatBRL(v.profit)}</td></tr>})}</tbody><tfoot className="bg-slate-50 font-bold"><tr><td className="px-3 py-3">TOTAIS</td><td className="px-3 py-3 text-right">{hours(totals.hours)} h</td><td className="px-3 py-3 text-right">{km(totals.km)} km</td><td className="px-3 py-3 text-right">{formatBRL(totals.fuel)}</td><td className="px-3 py-3 text-right">{formatBRL(totals.net)}</td>{cats.gas&&<td className="px-3 py-3 text-right">{formatBRL(totals.gas)}</td>}{cats.alcohol&&<td className="px-3 py-3 text-right">{formatBRL(totals.alcohol)}</td>}{cats.maintenance&&<td className="px-3 py-3 text-right">{formatBRL(totals.maint)}</td>}{cats.extras&&<td className="px-3 py-3 text-right">{formatBRL(totals.extra)}</td>}<td className="px-3 py-3 text-right">{formatBRL(totals.profit)}</td></tr></tfoot></table></div>
        <div className="mt-4 space-y-3 md:hidden">{filtered.map(e=>{const v=value(e);return <article key={e.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><strong className="text-[#0f2d4a]">{formatDateBR(e.date)}</strong><strong className="text-[#16a34a]">{formatBRL(v.profit)}</strong></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><span>Km: <b>{km(v.km)}</b></span><span>Horas: <b>{hours(v.hours)} h</b></span><span>Receita: <b>{formatBRL(v.net)}</b></span><span>Combustível: <b>{formatBRL(v.fuel)}</b></span>{cats.gas&&<span>Gasolina: <b>{formatBRL(v.gas)}</b></span>}{cats.alcohol&&<span>Álcool: <b>{formatBRL(v.alcohol)}</b></span>}{cats.maintenance&&<span>Manutenção: <b>{formatBRL(v.maint)}</b></span>}{cats.extras&&<span>Extras: <b>{formatBRL(v.extra)}</b></span>}</div></article>})}</div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-lg font-bold text-slate-800">Ações de exportação</h2><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={pdf} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Baixar PDF</button><button type="button" onClick={whatsapp} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:border-[#16a34a] hover:text-[#16a34a]">Enviar por WhatsApp</button><button type="button" onClick={email} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:border-[#16a34a] hover:text-[#16a34a]">Enviar por e-mail</button></div></section>
    </>}
  </div>;
}
