"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { computeFeeAmount, computeNetFare, formatBRL, formatDateBR, toNumber, type DailyEntry } from "@/lib/utils";

type Props = { entries: DailyEntry[]; from: string; to: string };
type Row = { entry: DailyEntry; gross: number; feePercent: number; feeAmount: number; net: number; costs: number; profit: number; km: number; hours: number; profitKm: number | null; maintenance: { description: string; value: number }[]; extras: { description: string; value: number }[] };

const money = (n: number | null) => n === null ? "—" : formatBRL(n);
const nfmt = (n: number, digits = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
function details(items: any[] | undefined) { return (items || []).map(item => ({ description: String(("description" in item ? item.description : item.name) || "Gasto sem descrição"), value: toNumber(item.value) })).filter(item => item.value > 0); }

function makePdf(rows: Row[], from: string, to: string) {
  const totals = rows.reduce((a, r) => ({ gross: a.gross + r.gross, fee: a.fee + r.feeAmount, net: a.net + r.net, costs: a.costs + r.costs, profit: a.profit + r.profit, km: a.km + r.km, hours: a.hours + r.hours }), { gross: 0, fee: 0, net: 0, costs: 0, profit: 0, km: 0, hours: 0 });
  const doc = new jsPDF("landscape", "mm", "a4");
  doc.setFontSize(18); doc.text("FaturApp — Relatório completo", 14, 14);
  doc.setFontSize(9); doc.text(`Período: ${formatDateBR(from)} até ${formatDateBR(to)}`, 14, 21);
  doc.text(`Receita bruta: ${formatBRL(totals.gross)}   Taxas: ${formatBRL(totals.fee)}   Receita líquida: ${formatBRL(totals.net)}   Custos: ${formatBRL(totals.costs)}   Lucro líquido: ${formatBRL(totals.profit)}`, 14, 27);
  autoTable(doc, { head: [["Data", "Horas", "Km", "Receita bruta", "Taxa app", "Valor taxa", "Receita líquida", "Custos", "Lucro líquido", "Lucro/km"]], body: rows.map(r => [formatDateBR(r.entry.date), `${nfmt(r.hours)} h`, `${nfmt(r.km, 0)} km`, formatBRL(r.gross), `${r.feePercent.toFixed(2)}%`, formatBRL(r.feeAmount), formatBRL(r.net), formatBRL(r.costs), formatBRL(r.profit), money(r.profitKm)]), startY: 33, theme: "striped", styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fontSize: 7, fontStyle: "bold" } });
  let y = (doc as any).lastAutoTable.finalY + 8;
  const addDetails = (title: string, list: { date: string; description: string; value: number }[]) => {
    if (!list.length) return;
    if (y > 185) { doc.addPage(); y = 15; }
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(title, 14, y); y += 3;
    autoTable(doc, { head: [["Data", "Descrição", "Valor"]], body: list.map(x => [formatDateBR(x.date), x.description, formatBRL(x.value)]), startY: y + 2, theme: "grid", styles: { fontSize: 8, cellPadding: 2 } });
    y = (doc as any).lastAutoTable.finalY + 7;
  };
  addDetails("Manutenção — detalhamento", rows.flatMap(r => r.maintenance.map(x => ({ ...x, date: r.entry.date }))));
  addDetails("Gastos extras — detalhamento", rows.flatMap(r => r.extras.map(x => ({ ...x, date: r.entry.date }))));
  doc.setFont("helvetica", "normal");
  return doc;
}

export default function ReportExportActions({ entries, from, to }: Props) {
  const [busy, setBusy] = useState(false);
  const rows = useMemo<Row[]>(() => entries.filter(e => e.date >= from && e.date <= to).map(entry => {
    const gross = Math.max(0, Number(entry.gross_amount) || 0); const feePercent = Math.max(0, Number(entry.fee_percent) || 0); const feeAmount = computeFeeAmount(entry); const net = computeNetFare(entry);
    const maintenance = details(entry.maintenance_details); const extras = details(entry.extra_expenses); const gas = Math.max(0, Number(entry.gas_expense) || 0); const alcohol = Math.max(0, Number(entry.alcohol_expense) || 0);
    const maintenanceValue = maintenance.reduce((s, x) => s + x.value, 0) || Math.max(0, Number(entry.maintenance_expense) || 0); const extrasValue = extras.reduce((s, x) => s + x.value, 0); const costs = gas + alcohol + maintenanceValue + extrasValue;
    const km = Math.max(0, Number(entry.km_driven) || 0); const hours = Math.max(0, Number(entry.hours_worked) || 0); const profit = net - costs;
    return { entry, gross, feePercent, feeAmount, net, costs, profit, km, hours, profitKm: km ? profit / km : null, maintenance, extras };
  }), [entries, from, to]);
  const text = useMemo(() => { const lines = ["*FaturApp — Relatório completo*", `Período: ${formatDateBR(from)} até ${formatDateBR(to)}`, ""]; rows.forEach(r => { lines.push(`*${formatDateBR(r.entry.date)}*`); lines.push(`Horas: ${nfmt(r.hours)} h | Km: ${nfmt(r.km, 0)} km`); lines.push(`Receita bruta: ${formatBRL(r.gross)}`); lines.push(`Taxa do app: ${r.feePercent.toFixed(2)}% | Valor da taxa: ${formatBRL(r.feeAmount)}`); lines.push(`Receita líquida: ${formatBRL(r.net)} | Custos: ${formatBRL(r.costs)}`); lines.push(`Lucro líquido: ${formatBRL(r.profit)} | Lucro/km: ${money(r.profitKm)}`); if (r.maintenance.length) lines.push(`Manutenção: ${r.maintenance.map(x => `${x.description} (${formatBRL(x.value)})`).join("; ")}`); if (r.extras.length) lines.push(`Extras: ${r.extras.map(x => `${x.description} (${formatBRL(x.value)})`).join("; ")}`); lines.push(""); }); return lines.join("\n"); }, [rows, from, to]);
  async function emailPdf() { setBusy(true); try { const doc = makePdf(rows, from, to); const blob = doc.output("blob"); const file = new File([blob], `FaturApp_Relatorio_${from}_${to}.pdf`, { type: "application/pdf" }); if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) { await navigator.share({ title: "Relatório FaturApp", text: `Relatório de ${formatDateBR(from)} até ${formatDateBR(to)}`, files: [file] }); return; } doc.save(file.name); window.location.href = `mailto:?subject=${encodeURIComponent("Relatório FaturApp")}&body=${encodeURIComponent("O relatório em PDF foi baixado. Anexe o arquivo PDF a este e-mail.")}`; } finally { setBusy(false); } }
  function downloadPdf() { makePdf(rows, from, to).save(`FaturApp_Relatorio_Completo_${from}_${to}.pdf`); }
  function whatsapp() { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); }
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Exportar relatório</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Relatório completo do período</h2><p className="mt-1 text-sm text-slate-500">PDF, tabela detalhada para WhatsApp ou PDF para envio por e-mail.</p></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><button type="button" onClick={downloadPdf} disabled={!rows.length} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40">Baixar PDF</button><button type="button" onClick={whatsapp} disabled={!rows.length} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800 disabled:opacity-40">WhatsApp</button><button type="button" onClick={emailPdf} disabled={!rows.length || busy} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800 disabled:opacity-40">{busy ? "Preparando PDF…" : "E-mail (PDF)"}</button></div></div></section>;
}
