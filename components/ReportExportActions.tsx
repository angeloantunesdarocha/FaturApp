"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  computeFeeAmount,
  computeNetFare,
  formatBRL,
  formatDateBR,
  toNumber,
  type DailyEntry,
} from "@/lib/utils";

type Props = { entries: DailyEntry[]; from: string; to: string };
type DetailItem = { description: string; value: number };
type RevenueDetail = {
  app: string;
  gross: number;
  feePercent: number;
  feeAmount: number;
  net: number;
};

type Row = {
  entry: DailyEntry;
  gross: number;
  feePercent: number;
  feeAmount: number;
  net: number;
  costs: number;
  profit: number;
  km: number;
  hours: number;
  profitKm: number | null;
  maintenance: DetailItem[];
  extras: DetailItem[];
  maintenanceTotal: number;
  extrasTotal: number;
  fuelTotal: number;
  revenueDetails: RevenueDetail[];
};

type Totals = {
  gross: number;
  fee: number;
  net: number;
  costs: number;
  profit: number;
  km: number;
  hours: number;
  maintenance: number;
  extras: number;
  fuel: number;
};

const money = (n: number | null) => n === null ? "—" : formatBRL(n);
const nfmt = (n: number, digits = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const safe = (n: number) => Number.isFinite(n) ? n : 0;

function details(items: unknown[] | undefined | null): DetailItem[] {
  return (items || [])
    .map((item: any) => ({
      description: String(("description" in item ? item.description : item.name) || "Gasto sem descrição"),
      value: toNumber(item.value),
    }))
    .filter((item) => item.value > 0);
}

function revenueDetails(entry: DailyEntry): RevenueDetail[] {
  const items = entry.revenue_details || [];
  if (items.length) {
    return items
      .map((item) => ({
        app: item.app === "Outro" ? (item.nomeAppPersonalizado || "Outro") : item.app,
        gross: Math.max(0, Number(item.bruto) || 0),
        feePercent: Math.max(0, Number(item.taxa) || 0),
        feeAmount: Math.max(0, Number(item.taxaValor) || ((Number(item.bruto) || 0) * (Number(item.taxa) || 0) / 100)),
        net: Math.max(0, Number(item.liquido) || 0),
      }))
      .filter((item) => item.gross > 0 || item.net > 0 || item.feeAmount > 0);
  }

  const gross = Math.max(0, Number(entry.gross_amount) || 0);
  const feePercent = Math.max(0, Number(entry.fee_percent) || 0);
  const feeAmount = computeFeeAmount(entry);
  const net = computeNetFare(entry);
  if (gross <= 0 && net <= 0) return [];
  return [{ app: "Indefinido", gross, feePercent, feeAmount, net }];
}

function calcTotals(rows: Row[]): Totals {
  return rows.reduce<Totals>((acc, r) => ({
    gross: acc.gross + safe(r.gross),
    fee: acc.fee + safe(r.feeAmount),
    net: acc.net + safe(r.net),
    costs: acc.costs + safe(r.costs),
    profit: acc.profit + safe(r.profit),
    km: acc.km + safe(r.km),
    hours: acc.hours + safe(r.hours),
    maintenance: acc.maintenance + safe(r.maintenanceTotal),
    extras: acc.extras + safe(r.extrasTotal),
    fuel: acc.fuel + safe(r.fuelTotal),
  }), { gross: 0, fee: 0, net: 0, costs: 0, profit: 0, km: 0, hours: 0, maintenance: 0, extras: 0, fuel: 0 });
}

function makePdf(rows: Row[], from: string, to: string): jsPDF {
  const t = calcTotals(rows);
  const profitKmAvg = t.km > 0 ? t.profit / t.km : null;
  const doc = new jsPDF("landscape", "mm", "a4");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("FaturApp — Relatório Completo", 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${formatDateBR(from)} até ${formatDateBR(to)}   ·   ${rows.length} dia(s) analisado(s)`, 14, 21);

  // Resumo do dia: sem taxa única, pois agora cada aplicativo pode ter sua própria taxa.
  autoTable(doc, {
    head: [["Data", "Horas", "Km", "Receita Bruta Total", "Receita Líquida Total", "Custos Totais", "Lucro Líquido", "Lucro/km"]],
    body: rows.map((r) => [
      formatDateBR(r.entry.date),
      `${nfmt(r.hours)} h`,
      `${nfmt(r.km, 0)} km`,
      formatBRL(r.gross),
      formatBRL(r.net),
      formatBRL(r.costs),
      formatBRL(r.profit),
      money(r.profitKm),
    ]),
    foot: [[
      { content: "TOTAL", styles: { halign: "left" } },
      { content: `${nfmt(t.hours)} h`, styles: { halign: "right" } },
      { content: `${nfmt(t.km, 0)} km`, styles: { halign: "right" } },
      { content: formatBRL(t.gross), styles: { halign: "right" } },
      { content: formatBRL(t.net), styles: { halign: "right" } },
      { content: formatBRL(t.costs), styles: { halign: "right" } },
      { content: formatBRL(t.profit), styles: { halign: "right" } },
      { content: money(profitKmAvg), styles: { halign: "right" } },
    ]],
    startY: 27,
    theme: "striped",
    showFoot: "lastPage",
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fontSize: 7, fontStyle: "bold", fillColor: [15, 45, 74], textColor: [255, 255, 255], halign: "center" },
    footStyles: { fontSize: 7, fontStyle: "bold", fillColor: [22, 101, 52], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 25, halign: "left" },
      1: { cellWidth: 20, halign: "right" },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 34, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
      6: { cellWidth: 32, halign: "right" },
      7: { cellWidth: 27, halign: "right" },
    },
  });

  let y = (doc as any).lastAutoTable.finalY + 8;

  const ensureSpace = (height = 35) => {
    if (y > 190 - height) { doc.addPage(); y = 15; }
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(25);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, y);
    y += 4;
  };

  // Detalhamento de receitas por aplicativo.
  const revenueRows = rows.flatMap((r) => r.revenueDetails.map((x) => ({ ...x, date: r.entry.date })));
  if (revenueRows.length) {
    addSectionTitle("Detalhamento de Receitas por Aplicativo");
    autoTable(doc, {
      head: [["Data", "Nome do App", "Receita Bruta", "Taxa (%)", "Desconto da Taxa (R$)", "Receita Líquida"]],
      body: revenueRows.map((x) => [formatDateBR(x.date), x.app, formatBRL(x.gross), `${x.feePercent.toFixed(2)}%`, formatBRL(x.feeAmount), formatBRL(x.net)]),
      foot: [[
        { content: "TOTAL", styles: { halign: "left" } },
        { content: "", styles: { halign: "left" } },
        { content: formatBRL(t.gross), styles: { halign: "right" } },
        { content: "", styles: { halign: "center" } },
        { content: formatBRL(t.fee), styles: { halign: "right" } },
        { content: formatBRL(t.net), styles: { halign: "right" } },
      ]],
      startY: y,
      theme: "grid",
      showFoot: "lastPage",
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [15, 45, 74], textColor: [255, 255, 255], halign: "center" },
      footStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 25, halign: "left" },
        1: { halign: "left" },
        2: { cellWidth: 32, halign: "right" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 38, halign: "right" },
        5: { cellWidth: 34, halign: "right" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 7;
  }

  // Combustível: separa gasolina e álcool e usa os litros efetivamente registrados.
  const fuelRows = rows.flatMap((r) => {
    const result: { date: string; type: string; liters: number; value: number }[] = [];
    const gasLiters = Math.max(0, Number(r.entry.gasoline_liters) || 0);
    const alcoholLiters = Math.max(0, Number(r.entry.alcohol_liters) || 0);
    const gasValue = Math.max(0, Number(r.entry.gas_expense) || 0);
    const alcoholValue = Math.max(0, Number(r.entry.alcohol_expense) || 0);
    if (gasLiters > 0 || gasValue > 0) result.push({ date: r.entry.date, type: "Gasolina", liters: gasLiters, value: gasValue });
    if (alcoholLiters > 0 || alcoholValue > 0) result.push({ date: r.entry.date, type: "Álcool", liters: alcoholLiters, value: alcoholValue });
    return result;
  });

  if (fuelRows.length) {
    addSectionTitle("Combustível");
    autoTable(doc, {
      head: [["Data", "Tipo de Combustível", "Litros Abastecidos", "Valor Gasto (R$)"]],
      body: fuelRows.map((x) => [formatDateBR(x.date), x.type, `${nfmt(x.liters, 3)} L`, formatBRL(x.value)]),
      foot: [[
        { content: "TOTAL", styles: { halign: "left" } },
        { content: "", styles: { halign: "left" } },
        { content: `${nfmt(fuelRows.reduce((s, x) => s + x.liters, 0), 3)} L`, styles: { halign: "right" } },
        { content: formatBRL(t.fuel), styles: { halign: "right" } },
      ]],
      startY: y,
      theme: "grid",
      showFoot: "lastPage",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 45, 74], textColor: [255, 255, 255], halign: "center" },
      footStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 30, halign: "left" },
        1: { halign: "left" },
        2: { cellWidth: 45, halign: "right" },
        3: { cellWidth: 45, halign: "right" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 7;
  }

  const addDetailSection = (title: string, list: { date: string; description: string; value: number }[]) => {
    if (!list.length) return;
    addSectionTitle(title);
    const sectionTotal = list.reduce((s, x) => s + safe(x.value), 0);
    autoTable(doc, {
      head: [["Data", "Descrição", "Valor"]],
      body: list.map((x) => [formatDateBR(x.date), x.description, formatBRL(x.value)]),
      foot: [[
        { content: "", styles: { halign: "left" } },
        { content: "TOTAL", styles: { halign: "right", fontStyle: "bold" } },
        { content: formatBRL(sectionTotal), styles: { halign: "right", fontStyle: "bold" } },
      ]],
      startY: y,
      theme: "grid",
      showFoot: "lastPage",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 45, 74], textColor: [255, 255, 255], halign: "center" },
      footStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 28, halign: "left" }, 1: { halign: "left" }, 2: { cellWidth: 35, halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 7;
  };

  const allMaintenance = rows.flatMap((r) => r.maintenance.map((x) => ({ ...x, date: r.entry.date })));
  const allExtras = rows.flatMap((r) => r.extras.map((x) => ({ ...x, date: r.entry.date })));
  addDetailSection("Manutenção — Detalhamento", allMaintenance);
  addDetailSection("Gastos Extras — Detalhamento", allExtras);

  // Validação visual/financeira: custos = combustível + manutenção + extras.
  const detailCosts = t.fuel + t.maintenance + t.extras;
  if (Math.abs(detailCosts - t.costs) > 0.005) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`Atenção: detalhamento de custos (${formatBRL(detailCosts)}) diverge do total (${formatBRL(t.costs)}).`, 14, Math.min(y, 195));
  }

  doc.setFont("helvetica", "normal");
  return doc;
}

function makeText(rows: Row[], from: string, to: string): string {
  const t = calcTotals(rows);
  const profitKmAvg = t.km > 0 ? t.profit / t.km : null;
  const period = from === to ? formatDateBR(from) : `${formatDateBR(from)} até ${formatDateBR(to)}`;
  const sep = "━━━━━━━━━━━━━━━━━━━━━━";
  const lines: string[] = ["🚗 *FaturApp — Relatório Completo*", `📅 Período: ${period}`, `📊 ${rows.length} dia(s) analisado(s)`, "", sep, "📋 *LANÇAMENTOS DIÁRIOS*", sep, ""];

  rows.forEach((r) => {
    lines.push(`📆 *${formatDateBR(r.entry.date)}*`);
    lines.push(`⏱ Horas: ${nfmt(r.hours)} h   🛣 Km: ${nfmt(r.km, 0)} km`);
    lines.push(`💰 Receita bruta: ${formatBRL(r.gross)}`);
    r.revenueDetails.forEach((x) => lines.push(`   • ${x.app}: ${formatBRL(x.gross)} − ${x.feePercent.toFixed(2)}% (${formatBRL(x.feeAmount)}) = ${formatBRL(x.net)}`));
    lines.push(`✅ Receita líquida: ${formatBRL(r.net)}`);
    lines.push(`🔧 Custos: ${formatBRL(r.costs)}`);
    lines.push(`📈 *Lucro líquido: ${formatBRL(r.profit)}*`);
    if (r.profitKm !== null) lines.push(`📍 Lucro/km: ${money(r.profitKm)}`);
    if (r.maintenance.length) lines.push(`🔩 Manutenção: ${r.maintenance.map((x) => `${x.description} (${formatBRL(x.value)})`).join("; ")}`);
    if (r.extras.length) lines.push(`📦 Extras: ${r.extras.map((x) => `${x.description} (${formatBRL(x.value)})`).join("; ")}`);
    if (r.fuelTotal > 0) lines.push(`⛽ Combustível: ${formatBRL(r.fuelTotal)}`);
    lines.push("");
  });

  lines.push(sep, "📊 *TOTAIS DO PERÍODO*", sep);
  lines.push(`⏱ Total de horas: *${nfmt(t.hours)} h*`);
  lines.push(`🛣 Total de km: *${nfmt(t.km, 0)} km*`);
  lines.push(`💰 Receita bruta total: *${formatBRL(t.gross)}*`);
  lines.push(`💸 Total de taxas (app): *${formatBRL(t.fee)}*`);
  lines.push(`✅ Receita líquida total: *${formatBRL(t.net)}*`);
  lines.push(`⛽ Total de combustível: *${formatBRL(t.fuel)}*`);
  lines.push(`🔩 Total de manutenção: *${formatBRL(t.maintenance)}*`);
  lines.push(`📦 Total de gastos extras: *${formatBRL(t.extras)}*`);
  lines.push(`🔴 Total de custos: *${formatBRL(t.costs)}*`);
  lines.push(`🟢 *Lucro líquido total: ${formatBRL(t.profit)}*`);
  if (profitKmAvg !== null) lines.push(`📍 Lucro médio por km: *${money(profitKmAvg)}*`);

  const allMaintenance = rows.flatMap((r) => r.maintenance.map((x) => ({ ...x, date: r.entry.date })));
  if (allMaintenance.length) {
    lines.push("", sep, "🔩 *MANUTENÇÃO — DETALHAMENTO*", sep);
    allMaintenance.forEach((x) => lines.push(`${formatDateBR(x.date)} | ${x.description} | ${formatBRL(x.value)}`));
  }
  const allExtras = rows.flatMap((r) => r.extras.map((x) => ({ ...x, date: r.entry.date })));
  if (allExtras.length) {
    lines.push("", sep, "📦 *GASTOS EXTRAS — DETALHAMENTO*", sep);
    allExtras.forEach((x) => lines.push(`${formatDateBR(x.date)} | ${x.description} | ${formatBRL(x.value)}`));
  }
  lines.push("", "_Gerado pelo FaturApp_ 🚗");
  return lines.join("\n");
}

export default function ReportExportActions({ entries, from, to }: Props) {
  const [busy, setBusy] = useState(false);
  const rows = useMemo<Row[]>(() => entries.filter((e) => e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date)).map((entry) => {
    const revenue = revenueDetails(entry);
    const gross = revenue.length ? revenue.reduce((s, x) => s + x.gross, 0) : Math.max(0, Number(entry.gross_amount) || 0);
    const feeAmount = revenue.length ? revenue.reduce((s, x) => s + x.feeAmount, 0) : computeFeeAmount(entry);
    const feePercent = gross > 0 ? (feeAmount / gross) * 100 : 0;
    const net = revenue.length ? revenue.reduce((s, x) => s + x.net, 0) : computeNetFare(entry);
    const maint = details(entry.maintenance_details);
    const extr = details(entry.extra_expenses);
    const gas = Math.max(0, Number(entry.gas_expense) || 0);
    const alcohol = Math.max(0, Number(entry.alcohol_expense) || 0);
    const maintenanceTotal = maint.reduce((s, x) => s + x.value, 0) || Math.max(0, Number(entry.maintenance_expense) || 0);
    const extrasTotal = extr.reduce((s, x) => s + x.value, 0);
    const fuelTotal = gas + alcohol;
    const costs = fuelTotal + maintenanceTotal + extrasTotal;
    const km = Math.max(0, Number(entry.km_driven) || 0);
    const hours = Math.max(0, Number(entry.hours_worked) || 0);
    const profit = net - costs;
    return { entry, gross, feePercent, feeAmount, net, costs, profit, km, hours, profitKm: km ? profit / km : null, maintenance: maint, extras: extr, maintenanceTotal, extrasTotal, fuelTotal, revenueDetails: revenue };
  }), [entries, from, to]);

  const text = useMemo(() => makeText(rows, from, to), [rows, from, to]);

  async function emailPdf() {
    setBusy(true);
    try {
      const doc = makePdf(rows, from, to);
      const blob = doc.output("blob");
      const file = new File([blob], `FaturApp_Relatorio_${from}_${to}.pdf`, { type: "application/pdf" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: "Relatório FaturApp", text: `Relatório de ${formatDateBR(from)} até ${formatDateBR(to)}`, files: [file] });
        return;
      }
      doc.save(file.name);
      window.location.href = `mailto:?subject=${encodeURIComponent("Relatório FaturApp")}&body=${encodeURIComponent(text)}`;
    } finally { setBusy(false); }
  }

  function downloadPdf() { makePdf(rows, from, to).save(`FaturApp_Relatorio_Completo_${from}_${to}.pdf`); }
  function whatsapp() { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Exportar relatório</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">Relatório completo do período</h2>
          <p className="mt-1 text-sm text-slate-500">PDF com detalhamento por aplicativo, combustível, manutenção e gastos extras.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" onClick={downloadPdf} disabled={!rows.length} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40">Baixar PDF</button>
          <button type="button" onClick={whatsapp} disabled={!rows.length} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800 disabled:opacity-40">WhatsApp</button>
          <button type="button" onClick={emailPdf} disabled={!rows.length || busy} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800 disabled:opacity-40">{busy ? "Preparando PDF…" : "E-mail (PDF)"}</button>
        </div>
      </div>
    </section>
  );
}
