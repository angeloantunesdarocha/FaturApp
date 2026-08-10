"use client";

import { useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { computeFeeAmount, computeNetFare, formatBRL, formatDateBR, type DailyEntry } from "@/lib/utils";

type Props = { entries: DailyEntry[]; from: string; to: string };

function expenseTotal(entry: DailyEntry) {
  const maintenance = (entry.maintenance_details || []).reduce((sum, item) => sum + Number(item.value || 0), 0) || Number(entry.maintenance_expense || 0);
  const extras = (entry.extra_expenses || []).reduce((sum, item) => sum + Number(item.value || 0), 0);
  return Math.max(0, Number(entry.gas_expense) || 0) + Math.max(0, Number(entry.alcohol_expense) || 0) + Math.max(0, maintenance) + Math.max(0, extras);
}

export default function FeeReportPanel({ entries, from, to }: Props) {
  const filtered = useMemo(() => entries.filter(entry => entry.date >= from && entry.date <= to), [entries, from, to]);
  const rows = useMemo(() => filtered.map(entry => {
    const gross = Math.max(0, Number(entry.gross_amount) || 0);
    const feePercent = Math.max(0, Number(entry.fee_percent) || 0);
    const feeAmount = computeFeeAmount(entry);
    const net = computeNetFare(entry);
    const expenses = expenseTotal(entry);
    return { entry, gross, feePercent, feeAmount, net, expenses, profit: net - expenses };
  }), [filtered]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    gross: acc.gross + row.gross,
    feeAmount: acc.feeAmount + row.feeAmount,
    net: acc.net + row.net,
    expenses: acc.expenses + row.expenses,
    profit: acc.profit + row.profit,
  }), { gross: 0, feeAmount: 0, net: 0, expenses: 0, profit: 0 }), [rows]);

  function downloadPDF() {
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFontSize(17);
    doc.text("FaturApp — Relatório financeiro completo", 14, 14);
    doc.setFontSize(9);
    doc.text(`Período: ${formatDateBR(from)} até ${formatDateBR(to)}`, 14, 21);
    doc.text(`Receita bruta: ${formatBRL(totals.gross)}`, 14, 27);
    doc.text(`Taxas dos aplicativos: ${formatBRL(totals.feeAmount)}`, 75, 27);
    doc.text(`Receita líquida: ${formatBRL(totals.net)}`, 150, 27);
    doc.text(`Lucro líquido: ${formatBRL(totals.profit)}`, 225, 27);

    const body = rows.map(row => [
      formatDateBR(row.entry.date),
      row.gross > 0 ? formatBRL(row.gross) : "—",
      row.gross > 0 ? `${row.feePercent.toFixed(2)}%` : "—",
      row.gross > 0 ? formatBRL(row.feeAmount) : "—",
      formatBRL(row.net),
      formatBRL(row.expenses),
      formatBRL(row.profit),
    ]);
    body.push(["TOTAL", formatBRL(totals.gross), "", formatBRL(totals.feeAmount), formatBRL(totals.net), formatBRL(totals.expenses), formatBRL(totals.profit)]);

    autoTable(doc, {
      head: [["Data", "Receita bruta", "Taxa", "Valor da taxa", "Receita líquida", "Despesas", "Lucro líquido"]],
      body,
      startY: 34,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fontSize: 8, fontStyle: "bold" },
      didParseCell: data => {
        if (data.row.index === body.length - 1) data.cell.styles.fontStyle = "bold";
      },
    });
    doc.save(`FaturApp_Relatorio_Completo_${from}_${to}.pdf`);
  }

  if (!filtered.length) return null;

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700">Taxa dos aplicativos</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">A taxa agora aparece e é contabilizada no relatório</h2>
          <p className="mt-1 text-sm text-slate-600">O valor da taxa é calculado sobre a receita bruta. A receita líquida já considera esse desconto, e o lucro é calculado a partir da receita líquida sem descontar a taxa novamente.</p>
        </div>
        <button type="button" onClick={downloadPDF} className="shrink-0 rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800">Baixar relatório completo</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Receita bruta</p><strong className="mt-1 block text-lg text-slate-900">{formatBRL(totals.gross)}</strong></div>
        <div className="rounded-2xl border border-red-200 bg-white p-4"><p className="text-xs text-red-600">Taxas dos apps</p><strong className="mt-1 block text-lg text-red-700">− {formatBRL(totals.feeAmount)}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Receita líquida</p><strong className="mt-1 block text-lg text-slate-900">{formatBRL(totals.net)}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Despesas</p><strong className="mt-1 block text-lg text-slate-900">{formatBRL(totals.expenses)}</strong></div>
        <div className="rounded-2xl border border-emerald-200 bg-white p-4"><p className="text-xs text-emerald-700">Lucro líquido</p><strong className="mt-1 block text-lg text-emerald-700">{formatBRL(totals.profit)}</strong></div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left">Data</th><th className="px-3 py-3 text-right">Receita bruta</th><th className="px-3 py-3 text-right">Taxa</th><th className="px-3 py-3 text-right">Valor da taxa</th><th className="px-3 py-3 text-right">Receita líquida</th><th className="px-3 py-3 text-right">Despesas</th><th className="px-3 py-3 text-right">Lucro líquido</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.entry.id} className="border-t border-slate-100">
                <td className="px-3 py-3 font-semibold text-slate-800">{formatDateBR(row.entry.date)}</td>
                <td className="px-3 py-3 text-right">{row.gross > 0 ? formatBRL(row.gross) : "—"}</td>
                <td className="px-3 py-3 text-right">{row.gross > 0 ? `${row.feePercent.toFixed(2)}%` : "—"}</td>
                <td className="px-3 py-3 text-right font-semibold text-red-600">{row.gross > 0 ? `− ${formatBRL(row.feeAmount)}` : "—"}</td>
                <td className="px-3 py-3 text-right">{formatBRL(row.net)}</td>
                <td className="px-3 py-3 text-right">{formatBRL(row.expenses)}</td>
                <td className={`px-3 py-3 text-right font-bold ${row.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatBRL(row.profit)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-bold">
            <tr className="border-t border-slate-200">
              <td className="px-3 py-3">TOTAL</td><td className="px-3 py-3 text-right">{formatBRL(totals.gross)}</td><td className="px-3 py-3 text-right">—</td><td className="px-3 py-3 text-right text-red-700">− {formatBRL(totals.feeAmount)}</td><td className="px-3 py-3 text-right">{formatBRL(totals.net)}</td><td className="px-3 py-3 text-right">{formatBRL(totals.expenses)}</td><td className="px-3 py-3 text-right text-emerald-700">{formatBRL(totals.profit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
