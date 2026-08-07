"use client";

import { useState, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  computeDayProfit,
  computeNetFare,
  formatBRL,
  formatDateBR,
  toNumber,
  type DailyEntry,
} from "@/lib/utils";

type Props = {
  entries: DailyEntry[];
  initialFrom: string;
  initialTo: string;
};

type Categories = {
  gas: boolean;
  alcohol: boolean;
  maintenance: boolean;
  extras: boolean;
};

export default function ReportsTable({
  entries,
  initialFrom,
  initialTo,
}: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [cats, setCats] = useState<Categories>({
    gas: true,
    alcohol: true,
    maintenance: true,
    extras: true,
  });

  // Filtra entradas pelo intervalo atual
  const filtered = useMemo(() => {
    return entries.filter((e) => e.date >= from && e.date <= to);
  }, [entries, from, to]);

  // Totais do período
  const totals = useMemo(() => {
    let net = 0, gas = 0, alcohol = 0, maintenance = 0, extras = 0, profit = 0;
    filtered.forEach((e) => {
      net += computeNetFare(e);
      gas += Number(e.gas_expense || 0);
      alcohol += Number(e.alcohol_expense || 0);
      maintenance += Number(e.maintenance_expense || 0);
      extras += (e.extra_expenses || []).reduce(
        (acc, x) => acc + toNumber(x.value),
        0
      );
      profit += computeDayProfit(e);
    });
    return { net, gas, alcohol, maintenance, extras, profit };
  }, [filtered]);

  // Monta texto do resumo
  const summaryText = useMemo(() => {
    const lines = [
      `Relatório de ${formatDateBR(from)} a ${formatDateBR(to)}`,
      `Receita líquida: ${formatBRL(totals.net)}`,
    ];
    if (cats.gas) lines.push(`Gasolina: ${formatBRL(totals.gas)}`);
    if (cats.alcohol) lines.push(`Álcool: ${formatBRL(totals.alcohol)}`);
    if (cats.maintenance) lines.push(`Manutenção: ${formatBRL(totals.maintenance)}`);
    if (cats.extras) lines.push(`Extras: ${formatBRL(totals.extras)}`);
    lines.push(`Lucro total: ${formatBRL(totals.profit)}`);
    return lines.join("\n");
  }, [from, to, totals, cats]);

  function openWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    window.open(url, "_blank");
  }

  function openEmail() {
    const subject = "Relatório FaturApp";
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summaryText)}`;
    window.location.href = mailto;
  }

function downloadPDF() {
  const doc = new jsPDF("landscape");

  doc.setFontSize(16);
  doc.text("FaturApp - Relatório Financeiro", 14, 15);

  doc.setFontSize(10);
  doc.text(
    `Período: ${formatDateBR(from)} até ${formatDateBR(to)}`,
    14,
    22
  );

  const rows = filtered.map((e) => {
    const extrasSum = (e.extra_expenses || []).reduce(
      (acc, x) => acc + toNumber(x.value),
      0
    );

    return [
      formatDateBR(e.date),
      formatBRL(computeNetFare(e)),
      formatBRL(Number(e.gas_expense || 0)),
      formatBRL(Number(e.alcohol_expense || 0)),
      formatBRL(Number(e.maintenance_expense || 0)),
      formatBRL(extrasSum),
      formatBRL(computeDayProfit(e)),
    ];
  });

  rows.push([
    "TOTAL",
    formatBRL(totals.net),
    formatBRL(totals.gas),
    formatBRL(totals.alcohol),
    formatBRL(totals.maintenance),
    formatBRL(totals.extras),
    formatBRL(totals.profit),
  ]);

  autoTable(doc, {
    head: [[
      "Data",
      "Receita Líquida",
      "Gasolina",
      "Álcool",
      "Manutenção",
      "Extras",
      "Lucro do Dia",
    ]],
    body: rows,
    startY: 30,
  });

  doc.save(`FaturApp_Relatorio_${from}_${to}.pdf`);
}
  function downloadCSV() {
    const header = [
      "Data",
      "Receita líquida",
      "Gasolina",
      "Álcool",
      "Manutenção",
      "Extras",
      "Lucro do dia",
    ];
    const rows = filtered.map((e) => {
      const netFare = computeNetFare(e);
      const extrasSum = (e.extra_expenses || []).reduce(
        (acc, x) => acc + toNumber(x.value),
        0
      );
      return [
        formatDateBR(e.date),
        netFare.toFixed(2),
        Number(e.gas_expense || 0).toFixed(2),
        Number(e.alcohol_expense || 0).toFixed(2),
        Number(e.maintenance_expense || 0).toFixed(2),
        extrasSum.toFixed(2),
        computeDayProfit(e).toFixed(2),
      ];
    });

    const csvLines = [
      header.join(";"),
      ...rows.map((r) => r.join(";")),
      // Linha de totais
      [
        "TOTAIS",
        totals.net.toFixed(2),
        totals.gas.toFixed(2),
        totals.alcohol.toFixed(2),
        totals.maintenance.toFixed(2),
        totals.extras.toFixed(2),
        totals.profit.toFixed(2),
      ].join(";"),
    ];

    // BOM UTF-8 para abrir corretamente no Excel
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-faturapp-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Período</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data inicial</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Data final</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 pt-2">
          Categorias de gastos
        </h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cats.gas}
              onChange={(e) => setCats({ ...cats, gas: e.target.checked })}
            />
            Gasolina
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cats.alcohol}
              onChange={(e) => setCats({ ...cats, alcohol: e.target.checked })}
            />
            Álcool
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cats.maintenance}
              onChange={(e) => setCats({ ...cats, maintenance: e.target.checked })}
            />
            Manutenção
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cats.extras}
              onChange={(e) => setCats({ ...cats, extras: e.target.checked })}
            />
            Gastos extras
          </label>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-right">Receita líquida</th>
              <th className="px-3 py-2 text-right">Gasolina</th>
              <th className="px-3 py-2 text-right">Álcool</th>
              <th className="px-3 py-2 text-right">Manutenção</th>
              <th className="px-3 py-2 text-right">Extras</th>
              <th className="px-3 py-2 text-right">Lucro do dia</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  Nenhum lançamento no período.
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const extrasSum = (e.extra_expenses || []).reduce(
                  (acc, x) => acc + toNumber(x.value),
                  0
                );
                const profit = computeDayProfit(e);
                return (
                  <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">{formatDateBR(e.date)}</td>
                    <td className="px-3 py-2 text-right">{formatBRL(computeNetFare(e))}</td>
                    <td className="px-3 py-2 text-right">{formatBRL(Number(e.gas_expense || 0))}</td>
                    <td className="px-3 py-2 text-right">{formatBRL(Number(e.alcohol_expense || 0))}</td>
                    <td className="px-3 py-2 text-right">{formatBRL(Number(e.maintenance_expense || 0))}</td>
                    <td className="px-3 py-2 text-right">{formatBRL(extrasSum)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${profit >= 0 ? "text-brand-700" : "text-red-600"}`}>
                      {formatBRL(profit)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-semibold">
            <tr className="border-t-2 border-slate-300">
              <td className="px-3 py-2">TOTAIS</td>
              <td className="px-3 py-2 text-right">{formatBRL(totals.net)}</td>
              <td className="px-3 py-2 text-right">{formatBRL(totals.gas)}</td>
              <td className="px-3 py-2 text-right">{formatBRL(totals.alcohol)}</td>
              <td className="px-3 py-2 text-right">{formatBRL(totals.maintenance)}</td>
              <td className="px-3 py-2 text-right">{formatBRL(totals.extras)}</td>
              <td className="px-3 py-2 text-right text-brand-700">
                {formatBRL(totals.profit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Botões de ação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={openWhatsApp} className="btn bg-[#25D366] text-white hover:bg-[#1ebe57]">
          💬 Enviar por WhatsApp
        </button>
        <button onClick={openEmail} className="btn bg-sky-600 text-white hover:bg-sky-700">
          ✉️ Enviar por E-mail
        </button>
        <button onClick={downloadPDF} className="btn btn-secondary">
  📄 Baixar relatório (PDF)
</button>

<button onClick={downloadCSV} className="btn btn-secondary">
  📊 Baixar relatório (CSV)
</button>
      </div>
    </div>
  );
}