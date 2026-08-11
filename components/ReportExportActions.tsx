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

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

type Props = { entries: DailyEntry[]; from: string; to: string };

type DetailItem = { description: string; value: number };

type Row = {
  entry:             DailyEntry;
  gross:             number;
  feePercent:        number;
  feeAmount:         number;
  net:               number;
  costs:             number;
  profit:            number;
  km:                number;
  hours:             number;
  profitKm:          number | null;
  maintenance:       DetailItem[];
  extras:            DetailItem[];
  maintenanceTotal:  number;
  extrasTotal:       number;
};

type Totals = {
  gross:       number;
  fee:         number;
  net:         number;
  costs:       number;
  profit:      number;
  km:          number;
  hours:       number;
  maintenance: number;
  extras:      number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const money  = (n: number | null) => n === null ? "—" : formatBRL(n);
const nfmt   = (n: number, digits = 1) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const safe   = (n: number) => (isNaN(n) || !isFinite(n) ? 0 : n);

function details(items: unknown[] | undefined | null): DetailItem[] {
  return (items || [])
    .map((item: any) => ({
      description: String(
        ("description" in item ? item.description : item.name) ||
        "Gasto sem descrição"
      ),
      value: toNumber(item.value),
    }))
    .filter((item) => item.value > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cálculo de totais consolidados (9 somatórias)
// ─────────────────────────────────────────────────────────────────────────────

function calcTotals(rows: Row[]): Totals {
  return rows.reduce<Totals>(
    (acc, r) => ({
      gross:       acc.gross       + safe(r.gross),
      fee:         acc.fee         + safe(r.feeAmount),
      net:         acc.net         + safe(r.net),
      costs:       acc.costs       + safe(r.costs),
      profit:      acc.profit      + safe(r.profit),
      km:          acc.km          + safe(r.km),
      hours:       acc.hours       + safe(r.hours),
      maintenance: acc.maintenance + safe(r.maintenanceTotal),
      extras:      acc.extras      + safe(r.extrasTotal),
    }),
    { gross: 0, fee: 0, net: 0, costs: 0, profit: 0, km: 0, hours: 0, maintenance: 0, extras: 0 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Geração do PDF com footer de totais em todas as tabelas
// ─────────────────────────────────────────────────────────────────────────────

function makePdf(rows: Row[], from: string, to: string): jsPDF {
  const t            = calcTotals(rows);
  const profitKmAvg  = t.km > 0 ? t.profit / t.km : null;

  const doc = new jsPDF("landscape", "mm", "a4");

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("FaturApp — Relatório Completo", 14, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Período: ${formatDateBR(from)} até ${formatDateBR(to)}   ·   ${rows.length} dia(s) analisado(s)`,
    14, 21
  );

  // ── Tabela principal — com linha de TOTAIS no rodapé ──────────────────────
  autoTable(doc, {
    head: [[
      "Data", "Horas", "Km", "Receita Bruta",
      "Taxa App", "Valor Taxa", "Receita Líquida",
      "Custos", "Lucro Líquido", "Lucro/km",
    ]],
    body: rows.map((r) => [
      formatDateBR(r.entry.date),
      `${nfmt(r.hours)} h`,
      `${nfmt(r.km, 0)} km`,
      formatBRL(r.gross),
      `${r.feePercent.toFixed(2)}%`,
      formatBRL(r.feeAmount),
      formatBRL(r.net),
      formatBRL(r.costs),
      formatBRL(r.profit),
      money(r.profitKm),
    ]),
    // ── RODAPÉ COM AS 9 SOMATÓRIAS ──────────────────────────────────────────
    foot: [[
      "TOTAL",
      `${nfmt(t.hours)} h`,
      `${nfmt(t.km, 0)} km`,
      formatBRL(t.gross),
      "—",
      formatBRL(t.fee),
      formatBRL(t.net),
      formatBRL(t.costs),
      formatBRL(t.profit),
      money(profitKmAvg),
    ]],
    startY:    27,
    theme:     "striped",
    showFoot:  "lastPage",
    styles:    { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
    headStyles: {
      fontSize:   7,
      fontStyle:  "bold",
      fillColor:  [15, 45, 74],   // azul FaturApp
      textColor:  [255, 255, 255],
    },
    footStyles: {
      fontSize:   7,
      fontStyle:  "bold",
      fillColor:  [22, 101, 52],  // verde escuro
      textColor:  [255, 255, 255],
    },
    columnStyles: {
      3: { halign: "right" }, 5: { halign: "right" },
      6: { halign: "right" }, 7: { halign: "right" },
      8: { halign: "right" }, 9: { halign: "right" },
    },
  });

  let y = (doc as any).lastAutoTable.finalY + 8;

  // ── Seção de detalhamento (Manutenção / Extras) com rodapé de total ───────
  const addDetailSection = (
    title: string,
    list:  { date: string; description: string; value: number }[]
  ) => {
    if (!list.length) return;
    if (y > 175) { doc.addPage(); y = 15; }

    const sectionTotal = list.reduce((s, x) => s + safe(x.value), 0);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, y);
    y += 4;

    autoTable(doc, {
      head:     [["Data", "Descrição", "Valor"]],
      body:     list.map((x) => [formatDateBR(x.date), x.description, formatBRL(x.value)]),
      foot:     [["", "TOTAL", formatBRL(sectionTotal)]],
      startY:   y,
      theme:    "grid",
      showFoot: "lastPage",
      styles:   { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [15, 45, 74],
        textColor: [255, 255, 255],
      },
      footStyles: {
        fontStyle:  "bold",
        fillColor:  [22, 101, 52],
        textColor:  [255, 255, 255],
      },
      columnStyles: { 2: { halign: "right" } },
    });

    y = (doc as any).lastAutoTable.finalY + 7;
  };

  const allMaintenance = rows.flatMap((r) =>
    r.maintenance.map((x) => ({ ...x, date: r.entry.date }))
  );
  const allExtras = rows.flatMap((r) =>
    r.extras.map((x) => ({ ...x, date: r.entry.date }))
  );

  addDetailSection("Manutenção — Detalhamento", allMaintenance);
  addDetailSection("Gastos Extras — Detalhamento", allExtras);

  doc.setFont("helvetica", "normal");
  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Texto formatado para WhatsApp e E-mail — com todas as 9 somatórias
// ─────────────────────────────────────────────────────────────────────────────

function makeText(rows: Row[], from: string, to: string): string {
  const t           = calcTotals(rows);
  const profitKmAvg = t.km > 0 ? t.profit / t.km : null;
  const period =
    from === to
      ? formatDateBR(from)
      : `${formatDateBR(from)} até ${formatDateBR(to)}`;

  const sep  = "━━━━━━━━━━━━━━━━━━━━━━";
  const lines: string[] = [
    "🚗 *FaturApp — Relatório Completo*",
    `📅 Período: ${period}`,
    `📊 ${rows.length} dia(s) analisado(s)`,
    "",
    sep,
    "📋 *LANÇAMENTOS DIÁRIOS*",
    sep,
    "",
  ];

  // Lançamentos individuais
  rows.forEach((r) => {
    lines.push(`📆 *${formatDateBR(r.entry.date)}*`);
    lines.push(`⏱ Horas: ${nfmt(r.hours)} h   🛣 Km: ${nfmt(r.km, 0)} km`);
    lines.push(`💰 Receita bruta: ${formatBRL(r.gross)}`);
    lines.push(`💸 Taxa do app: ${r.feePercent.toFixed(2)}% → ${formatBRL(r.feeAmount)}`);
    lines.push(`✅ Receita líquida: ${formatBRL(r.net)}`);
    lines.push(`🔧 Custos: ${formatBRL(r.costs)}`);
    lines.push(`📈 *Lucro líquido: ${formatBRL(r.profit)}*`);
    if (r.profitKm !== null) lines.push(`📍 Lucro/km: ${money(r.profitKm)}`);
    if (r.maintenance.length) {
      lines.push(
        `🔩 Manutenção: ${r.maintenance
          .map((x) => `${x.description} (${formatBRL(x.value)})`)
          .join("; ")}`
      );
    }
    if (r.extras.length) {
      lines.push(
        `📦 Extras: ${r.extras
          .map((x) => `${x.description} (${formatBRL(x.value)})`)
          .join("; ")}`
      );
    }
    lines.push("");
  });

  // ── BLOCO DE TOTAIS — 9 somatórias ────────────────────────────────────────
  lines.push(sep);
  lines.push("📊 *TOTAIS DO PERÍODO*");
  lines.push(sep);
  lines.push(`⏱  Total de horas:            *${nfmt(t.hours)} h*`);
  lines.push(`🛣  Total de km:                *${nfmt(t.km, 0)} km*`);
  lines.push(`💰  Receita bruta total:        *${formatBRL(t.gross)}*`);
  lines.push(`💸  Total de taxas (app):       *${formatBRL(t.fee)}*`);
  lines.push(`✅  Receita líquida total:      *${formatBRL(t.net)}*`);
  lines.push(`🔩  Total de manutenção:        *${formatBRL(t.maintenance)}*`);
  lines.push(`📦  Total de gastos extras:     *${formatBRL(t.extras)}*`);
  lines.push(`🔴  Total de custos:            *${formatBRL(t.costs)}*`);
  lines.push(`🟢  *Lucro líquido total:       ${formatBRL(t.profit)}*`);
  if (profitKmAvg !== null) {
    lines.push(`📍  Lucro médio por km:         *${money(profitKmAvg)}*`);
  }

  // ── Manutenção detalhada ───────────────────────────────────────────────────
  const allMaintenance = rows.flatMap((r) =>
    r.maintenance.map((x) => ({ ...x, date: r.entry.date }))
  );
  if (allMaintenance.length) {
    lines.push("");
    lines.push(sep);
    lines.push("🔩 *MANUTENÇÃO — DETALHAMENTO*");
    lines.push(sep);
    allMaintenance.forEach((x) =>
      lines.push(`${formatDateBR(x.date)}  |  ${x.description}  |  ${formatBRL(x.value)}`)
    );
    lines.push(`*Total manutenção: ${formatBRL(t.maintenance)}*`);
  }

  // ── Gastos extras detalhados ───────────────────────────────────────────────
  const allExtras = rows.flatMap((r) =>
    r.extras.map((x) => ({ ...x, date: r.entry.date }))
  );
  if (allExtras.length) {
    lines.push("");
    lines.push(sep);
    lines.push("📦 *GASTOS EXTRAS — DETALHAMENTO*");
    lines.push(sep);
    allExtras.forEach((x) =>
      lines.push(`${formatDateBR(x.date)}  |  ${x.description}  |  ${formatBRL(x.value)}`)
    );
    lines.push(`*Total gastos extras: ${formatBRL(t.extras)}*`);
  }

  lines.push("");
  lines.push(`_Gerado pelo FaturApp_ 🚗`);

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportExportActions({ entries, from, to }: Props) {
  const [busy, setBusy] = useState(false);

  const rows = useMemo<Row[]>(
    () =>
      entries
        .filter((e) => e.date >= from && e.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((entry) => {
          const gross      = Math.max(0, Number(entry.gross_amount)    || 0);
          const feePercent = Math.max(0, Number(entry.fee_percent)     || 0);
          const feeAmount  = computeFeeAmount(entry);
          const net        = computeNetFare(entry);
          const maint      = details(entry.maintenance_details);
          const extr       = details(entry.extra_expenses);
          const gas        = Math.max(0, Number(entry.gas_expense)     || 0);
          const alcohol    = Math.max(0, Number(entry.alcohol_expense) || 0);
          const maintenanceTotal =
            maint.reduce((s, x) => s + x.value, 0) ||
            Math.max(0, Number(entry.maintenance_expense) || 0);
          const extrasTotal = extr.reduce((s, x) => s + x.value, 0);
          const costs  = gas + alcohol + maintenanceTotal + extrasTotal;
          const km     = Math.max(0, Number(entry.km_driven)    || 0);
          const hours  = Math.max(0, Number(entry.hours_worked) || 0);
          const profit = net - costs;
          return {
            entry, gross, feePercent, feeAmount, net, costs, profit,
            km, hours,
            profitKm:        km ? profit / km : null,
            maintenance:     maint,
            extras:          extr,
            maintenanceTotal,
            extrasTotal,
          };
        }),
    [entries, from, to]
  );

  const text = useMemo(() => makeText(rows, from, to), [rows, from, to]);

  async function emailPdf() {
    setBusy(true);
    try {
      const doc  = makePdf(rows, from, to);
      const blob = doc.output("blob");
      const file = new File(
        [blob],
        `FaturApp_Relatorio_${from}_${to}.pdf`,
        { type: "application/pdf" }
      );
      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        await navigator.share({
          title: "Relatório FaturApp",
          text:  `Relatório de ${formatDateBR(from)} até ${formatDateBR(to)}`,
          files: [file],
        });
        return;
      }
      // Fallback: baixa o PDF e abre e-mail com o resumo completo no corpo
      doc.save(file.name);
      window.location.href = `mailto:?subject=${encodeURIComponent(
        "Relatório FaturApp"
      )}&body=${encodeURIComponent(text)}`;
    } finally {
      setBusy(false);
    }
  }

  function downloadPdf() {
    makePdf(rows, from, to).save(
      `FaturApp_Relatorio_Completo_${from}_${to}.pdf`
    );
  }

  function whatsapp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
            Exportar relatório
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
            Relatório completo do período
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            PDF com rodapé de totais, tabela completa para WhatsApp ou PDF por e-mail.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!rows.length}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40"
          >
            Baixar PDF
          </button>
          <button
            type="button"
            onClick={whatsapp}
            disabled={!rows.length}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800 disabled:opacity-40"
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={emailPdf}
            disabled={!rows.length || busy}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800 disabled:opacity-40"
          >
            {busy ? "Preparando PDF…" : "E-mail (PDF)"}
          </button>
        </div>
      </div>
    </section>
  );
}
