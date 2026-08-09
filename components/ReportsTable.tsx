"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { computeFeeAmount, computeNetFare, formatBRL, formatDateBR, todayISO, toNumber, type DailyEntry } from "@/lib/utils";

type Props = { entries: DailyEntry[]; initialFrom: string; initialTo: string };
type Categories = { gas: boolean; alcohol: boolean; maintenance: boolean; extras: boolean };
const DEFAULT_CATEGORIES: Categories = { gas: true, alcohol: true, maintenance: true, extras: true };

function formatKm(value: number) { return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 }); }
function formatLiters(value: number) { return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatHours(value: number) { return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }); }
function formatKmPerLiter(value: number | null) { return value === null ? "—" : `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L`; }
function maintenanceTotal(e: DailyEntry) { const d = (e.maintenance_details || []).reduce((s, i) => s + toNumber(i.value), 0); return d > 0 ? d : Number(e.maintenance_expense || 0); }
function extrasTotal(e: DailyEntry) { return (e.extra_expenses || []).reduce((s, i) => s + toNumber(i.value), 0); }
function maintenanceDetails(e: DailyEntry) { return (e.maintenance_details || []).filter(i => toNumber(i.value) !== 0 || i.description).map(i => `${formatBRL(toNumber(i.value))} — ${i.description || "Item sem descrição"}`); }
function extrasDetails(e: DailyEntry) { return (e.extra_expenses || []).filter(i => toNumber(i.value) !== 0 || i.name).map(i => `${formatBRL(toNumber(i.value))} — ${i.name || "Item sem descrição"}`); }
function startOfWeekISO(dateISO: string) { const d = new Date(`${dateISO}T12:00:00`); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; d.setDate(d.getDate() + diff); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function endOfMonthISO(dateISO: string) { const [y, m] = dateISO.split("-").map(Number); const last = new Date(y, m, 0).getDate(); return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`; }
function DetailList({ items, total, emptyLabel }: { items: string[]; total: number; emptyLabel: string }) {
  return <div className="min-w-[170px] text-right">{items.length ? <div className="space-y-1 text-xs text-slate-600">{items.map((x, i) => <div key={`${x}-${i}`}>{x}</div>)}</div> : <div className="text-xs text-slate-400">{emptyLabel}</div>}<div className="mt-2 border-t border-slate-200 pt-1 font-semibold">Total: {formatBRL(total)}</div></div>;
}

export default function ReportsTable({ entries, initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [cats, setCats] = useState<Categories>(DEFAULT_CATEGORIES);
  const today = todayISO();
  const [year, month] = today.split("-");
  const monthStart = `${year}-${month}-01`;
  const weekStart = startOfWeekISO(today);
  const [activeShortcut, setActiveShortcut] = useState("month");

  const filtered = useMemo(() => entries.filter(e => e.date >= from && e.date <= to), [entries, from, to]);

  const values = (e: DailyEntry) => {
    const gross = Number(e.gross_amount ?? 0) || 0;
    const feePercent = Number(e.fee_percent ?? 0) || 0;
    const gas = cats.gas ? Math.max(0, Number(e.gas_expense) || 0) : 0;
    const alcohol = cats.alcohol ? Math.max(0, Number(e.alcohol_expense) || 0) : 0;
    const maintenance = cats.maintenance ? maintenanceTotal(e) : 0;
    const extras = cats.extras ? extrasTotal(e) : 0;
    const km = Math.max(0, Number(e.km_driven) || 0);
    const hours = Math.max(0, Number(e.hours_worked) || 0);
    const liters = Math.max(0, Number(e.gasoline_liters) || 0) + Math.max(0, Number(e.alcohol_liters) || 0);
    const fuel = gas + alcohol;
    const net = computeNetFare(e);
    const profit = net - gas - alcohol - maintenance - extras;
    return { gross, feePercent, feeAmount: computeFeeAmount(e), net, gas, alcohol, maintenance, extras, profit, km, hours, liters, fuel, kmPerLiter: liters > 0 ? km / liters : null };
  };

  const totals = useMemo(() => filtered.reduce((a, e) => {
    const v = values(e);
    for (const k of ["gross", "feeAmount", "net", "gas", "alcohol", "maintenance", "extras", "profit", "km", "hours", "liters", "fuel"] as const) a[k] += v[k];
    return a;
  }, { gross: 0, feeAmount: 0, net: 0, gas: 0, alcohol: 0, maintenance: 0, extras: 0, profit: 0, km: 0, hours: 0, liters: 0, fuel: 0 }), [filtered, cats]);

  const totalKmPerLiter = totals.liters > 0 ? totals.km / totals.liters : null;
  const totalCost = totals.gas + totals.alcohol + totals.maintenance + totals.extras;
  const costPerKm = totals.km > 0 ? totalCost / totals.km : null;
  const profitPerHour = totals.hours > 0 ? totals.profit / totals.hours : null;
  const todayHours = useMemo(() => filtered.filter(e => e.date === today).reduce((s, e) => s + Math.max(0, Number(e.hours_worked) || 0), 0), [filtered, today]);
  const weekHours = useMemo(() => filtered.filter(e => e.date >= weekStart && e.date <= today).reduce((s, e) => s + Math.max(0, Number(e.hours_worked) || 0), 0), [filtered, weekStart, today]);
  const monthHours = useMemo(() => filtered.filter(e => e.date >= monthStart && e.date <= today).reduce((s, e) => s + Math.max(0, Number(e.hours_worked) || 0), 0), [filtered, monthStart, today]);
  const hoursByDate = useMemo(() => { const map = new Map<string, number>(); for (const e of filtered) { const h = Math.max(0, Number(e.hours_worked) || 0); map.set(e.date, (map.get(e.date) || 0) + h); } return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])); }, [filtered]);
  const best = useMemo(() => filtered.reduce<DailyEntry | null>((bestEntry, e) => !bestEntry || values(e).profit > values(bestEntry).profit ? e : bestEntry, null), [filtered, cats]);
  const periodLabel = from === to ? `Período: ${formatDateBR(from)}` : `Período: ${formatDateBR(from)} a ${formatDateBR(to)}`;

  function applyShortcut(type: "today" | "week" | "month" | "custom") {
    setActiveShortcut(type);
    if (type === "today") { setFrom(today); setTo(today); }
    if (type === "week") { setFrom(weekStart); setTo(today); }
    if (type === "month") { setFrom(monthStart); setTo(endOfMonthISO(today)); }
  }

  const summaryText = useMemo(() => [
    `Relatório FaturApp — ${periodLabel}`,
    `Lucro líquido: ${formatBRL(totals.profit)}`,
    `Km rodados: ${formatKm(totals.km)} km`,
    `Horas trabalhadas: ${formatHours(totals.hours)} h`,
    `Custo total: ${formatBRL(totalCost)}`,
    `Custo médio: ${costPerKm === null ? "—" : `${formatBRL(costPerKm)}/km`}`,
    `Lucro por hora: ${profitPerHour === null ? "—" : `${formatBRL(profitPerHour)}/h`}`,
    ...(best ? [`${filtered.length === 1 ? "Resultado do dia" : "Melhor dia"}: ${formatDateBR(best.date)} — ${formatBRL(values(best).profit)}`] : []),
    ...(cats.maintenance ? [`Manutenção: ${formatBRL(totals.maintenance)}`] : []),
    ...(cats.extras ? [`Gastos extras: ${formatBRL(totals.extras)}`] : [])
  ].join("\n"), [periodLabel, totals, totalCost, costPerKm, profitPerHour, best, filtered.length, cats]);

  async function shareSummary() {
    if (navigator.share) await navigator.share({ title: "Relatório FaturApp", text: summaryText }).catch(() => undefined);
    else await navigator.clipboard?.writeText(summaryText);
  }
  async function copySummary() { await navigator.clipboard?.writeText(summaryText); }
  function openWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(summaryText)}`, "_blank"); }
  function openEmail() { window.location.href = `mailto:?subject=${encodeURIComponent("Relatório FaturApp")}&body=${encodeURIComponent(summaryText)}`; }
  function downloadPDF() {
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFontSize(16); doc.text("FaturApp — Relatório", 14, 15); doc.setFontSize(9); doc.text(periodLabel, 14, 22);
    doc.text(`Lucro líquido: ${formatBRL(totals.profit)}`, 14, 27); doc.text(`Km: ${formatKm(totals.km)} km`, 75, 27); doc.text(`Horas: ${formatHours(totals.hours)} h`, 130, 27); doc.text(`Custo médio: ${costPerKm === null ? "—" : formatBRL(costPerKm) + "/km"}`, 185, 27);
    const head = ["Data", "Horas", "Km", "Gasolina", "Álcool", "Combustível", "Bruto", "Taxa", "Líquida", "Manutenção", "Extras", "Lucro"];
    const body = filtered.map(e => { const v = values(e); const md = maintenanceDetails(e), ed = extrasDetails(e); return [formatDateBR(e.date), formatHours(v.hours) + " h", formatKm(v.km), formatBRL(v.gas), formatBRL(v.alcohol), formatBRL(v.fuel), v.gross > 0 ? formatBRL(v.gross) : "—", v.gross > 0 ? `${v.feePercent.toFixed(2)}%` : "—", formatBRL(v.net), md.length ? `${md.join("\n")}\nTOTAL: ${formatBRL(v.maintenance)}` : formatBRL(v.maintenance), ed.length ? `${ed.join("\n")}\nTOTAL: ${formatBRL(v.extras)}` : formatBRL(v.extras), formatBRL(v.profit)]; });
    body.push(["TOTAL", formatHours(totals.hours) + " h", formatKm(totals.km), formatBRL(totals.gas), formatBRL(totals.alcohol), formatBRL(totals.fuel), formatBRL(totals.gross), "", formatBRL(totals.net), `TOTAL: ${formatBRL(totals.maintenance)}`, `TOTAL: ${formatBRL(totals.extras)}`, formatBRL(totals.profit)]);
    autoTable(doc, { head: [head], body, startY: 34, theme: "grid", styles: { fontSize: 6, cellPadding: 1.5, valign: "middle" }, headStyles: { fontSize: 6, fontStyle: "bold" }, margin: { left: 6, right: 6 }, didParseCell: d => { if (d.row.index === body.length - 1) d.cell.styles.fontStyle = "bold"; } });
    doc.save(`FaturApp_Relatorio_${from}_${to}.pdf`);
  }

  const cat = (key: keyof Categories, label: string) => <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={cats[key]} onChange={e => setCats(c => ({ ...c, [key]: e.target.checked }))} />{label}</label>;

  return <div className="space-y-5">
    <section className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className="text-lg font-bold text-slate-800">Filtros do relatório</h2><p className="mt-1 text-sm text-slate-500">A página recalcula automaticamente ao mudar o período ou as categorias.</p></div>
        <div className="flex flex-wrap gap-2">
          {([["today", "Hoje"], ["week", "Esta semana"], ["month", "Este mês"], ["custom", "Personalizado"]] as const).map(([key, label]) => <button key={key} type="button" onClick={() => applyShortcut(key)} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${activeShortcut === key ? "bg-[#16a34a] text-white shadow-sm" : "border border-slate-300 bg-white text-slate-700 hover:border-[#16a34a] hover:text-[#16a34a]"}`}>{label}</button>)}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="label">Data inicial</label><input type="date" className="input" value={from} disabled={activeShortcut !== "custom"} onChange={e => { setActiveShortcut("custom"); setFrom(e.target.value); }} /></div><div><label className="label">Data final</label><input type="date" className="input" value={to} disabled={activeShortcut !== "custom"} onChange={e => { setActiveShortcut("custom"); setTo(e.target.value); }} /></div></div>
      <div className="mt-4"><p className="mb-2 text-sm font-semibold text-slate-700">Categorias de gastos</p><div className="flex flex-wrap gap-2">{cat("gas", "Gasolina")}{cat("alcohol", "Álcool")}{cat("maintenance", "Manutenção")}{cat("extras", "Gastos extras")}</div></div>
    </section>

    {!filtered.length ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm"><div className="mx-auto max-w-md"><p className="text-lg font-bold text-[#0f2d4a]">Nenhum lançamento neste período.</p><p className="mt-2 text-sm text-slate-600">Toque em “Lançar dia” para começar.</p></div></section> : <>
      <section className="rounded-xl border border-brand-200 bg-brand-50 p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-brand-700">HORAS TRABALHADAS</p><h2 className="mt-1 text-lg font-bold text-slate-900">Quanto tempo você trabalhou?</h2><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Hoje</p><p className="mt-1 text-xl font-bold text-slate-900">{formatHours(todayHours)} h</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Nesta semana</p><p className="mt-1 text-xl font-bold text-slate-900">{formatHours(weekHours)} h</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Neste mês</p><p className="mt-1 text-xl font-bold text-slate-900">{formatHours(monthHours)} h</p></div><div className="rounded-xl border border-brand-300 bg-white p-4"><p className="text-xs font-semibold text-brand-700">Período selecionado</p><p className="mt-1 text-xl font-bold text-slate-900">{formatHours(totals.hours)} h</p></div></div>{hoursByDate.length > 0 && <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-100"><tr><th className="px-4 py-3 text-left">Dia</th><th className="px-4 py-3 text-right">Horas trabalhadas</th></tr></thead><tbody>{hoursByDate.map(([date, hours]) => <tr key={date} className="border-t border-slate-200"><td className="px-4 py-3 font-medium">{formatDateBR(date)}</td><td className="px-4 py-3 text-right font-bold">{formatHours(hours)} h</td></tr>)}</tbody><tfoot className="bg-slate-50 font-bold"><tr className="border-t border-slate-200"><td className="px-4 py-3">TOTAL DO PERÍODO</td><td className="px-4 py-3 text-right">{formatHours(totals.hours)} h</td></tr></tfoot></table></div>}</section>

      <section className="rounded-2xl border border-[#0f2d4a] bg-[#0f2d4a] p-5 text-white shadow-xl"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">RESUMO DO PERÍODO</p><h2 className="mt-1 text-xl font-bold">{periodLabel}</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={shareSummary} className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">Compartilhar</button><button type="button" onClick={openWhatsApp} className="rounded-lg bg-[#16a34a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#15803d]">WhatsApp</button><button type="button" onClick={copySummary} className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">Copiar texto</button></div></div><div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">Lucro líquido</p><p className="mt-1 text-2xl font-bold">{formatBRL(totals.profit)}</p></div><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">Km rodados</p><p className="mt-1 text-2xl font-bold">{formatKm(totals.km)} km</p></div><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">{from === to ? "Resultado do dia" : "Melhor dia"}</p><p className="mt-1 text-xl font-bold">{best ? formatDateBR(best.date) : "—"}</p><p className="mt-1 text-sm text-emerald-300">{best ? formatBRL(values(best).profit) : "—"}</p></div><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-slate-300">Custo médio</p><p className="mt-1 text-2xl font-bold">{costPerKm === null ? "—" : `${formatBRL(costPerKm)}/km`}</p></div></div></section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4"><h2 className="text-lg font-bold text-slate-800">Detalhamento financeiro</h2><p className="text-sm text-slate-500">Receitas, combustível, manutenção, gastos extras e lucro do período selecionado.</p></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Receita líquida</p><p className="mt-1 text-xl font-bold">{formatBRL(totals.net)}</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Litros abastecidos</p><p className="mt-1 text-xl font-bold">{formatLiters(totals.liters)} L</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Consumo médio</p><p className="mt-1 text-xl font-bold">{formatKmPerLiter(totalKmPerLiter)}</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Lucro total</p><p className="mt-1 text-xl font-bold">{formatBRL(totals.profit)}</p></div></div><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-100"><tr><th className="px-4 py-3 text-left">Data</th><th className="px-4 py-3 text-right">Horas</th><th className="px-4 py-3 text-right">Km</th><th className="px-4 py-3 text-right">Combustível</th><th className="px-4 py-3 text-right">Receita</th>{cats.gas && <th className="px-4 py-3 text-right">Gasolina</th>}{cats.alcohol && <th className="px-4 py-3 text-right">Álcool</th>}{cats.maintenance && <th className="px-4 py-3 text-right">Manutenção</th>}{cats.extras && <th className="px-4 py-3 text-right">Gastos extras</th>}<th className="px-4 py-3 text-right">Lucro do dia</th></tr></thead><tbody>{filtered.map(e => { const v = values(e); return <tr key={e.id} className="border-t border-slate-200 align-top"><td className="px-4 py-3 font-medium whitespace-nowrap">{formatDateBR(e.date)}</td><td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatHours(v.hours)} h</td><td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatKm(v.km)} km</td><td className="px-4 py-3 text-right whitespace-nowrap"><div className="font-medium">{formatBRL(v.fuel)}</div><div className="text-xs text-slate-500">{formatLiters(v.liters)} L · {formatKmPerLiter(v.kmPerLiter)}</div></td><td className="px-4 py-3 text-right whitespace-nowrap"><div>Bruto: {v.gross > 0 ? formatBRL(v.gross) : "—"}</div><div className="text-xs text-slate-500">Taxa: {v.gross > 0 ? `${v.feePercent.toFixed(2)}%` : "—"}</div><div className="font-semibold">Líquida: {formatBRL(v.net)}</div></td>{cats.gas && <td className="px-4 py-3 text-right">{formatBRL(v.gas)}</td>}{cats.alcohol && <td className="px-4 py-3 text-right">{formatBRL(v.alcohol)}</td>}{cats.maintenance && <td className="px-4 py-3"><DetailList items={maintenanceDetails(e)} total={v.maintenance} emptyLabel="Sem manutenção" /></td>}{cats.extras && <td className="px-4 py-3"><DetailList items={extrasDetails(e)} total={v.extras} emptyLabel="Sem gastos extras" /></td>}<td className="px-4 py-3 text-right font-bold whitespace-nowrap">{formatBRL(v.profit)}</td></tr>; })}</tbody><tfoot className="bg-slate-50 font-bold"><tr className="border-t border-slate-200"><td className="px-4 py-3">TOTAIS</td><td className="px-4 py-3 text-right">{formatHours(totals.hours)} h</td><td className="px-4 py-3 text-right">{formatKm(totals.km)} km</td><td className="px-4 py-3 text-right">{formatBRL(totals.fuel)}<div className="text-xs font-normal text-slate-500">{formatLiters(totals.liters)} L</div></td><td className="px-4 py-3 text-right">{formatBRL(totals.net)}</td>{cats.gas && <td className="px-4 py-3 text-right">{formatBRL(totals.gas)}</td>}{cats.alcohol && <td className="px-4 py-3 text-right">{formatBRL(totals.alcohol)}</td>}{cats.maintenance && <td className="px-4 py-3 text-right">{formatBRL(totals.maintenance)}</td>}{cats.extras && <td className="px-4 py-3 text-right">{formatBRL(totals.extras)}</td>}<td className="px-4 py-3 text-right">{formatBRL(totals.profit)}</td></tr></tfoot></table></div></section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-lg font-bold text-slate-800">Ações de exportação</h2><p className="mt-1 text-sm text-slate-500">Todos os arquivos e mensagens usam somente os dados do período e categorias selecionados.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={downloadPDF} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">Baixar PDF</button><button type="button" onClick={openWhatsApp} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:border-[#16a34a] hover:text-[#16a34a]">Enviar por WhatsApp</button><button type="button" onClick={openEmail} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:border-[#16a34a] hover:text-[#16a34a]">Enviar por e-mail</button></div></section>
    </>}
  </div>;
}
