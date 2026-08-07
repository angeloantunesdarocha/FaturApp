"use client";

import { useState, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
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

function getMaintenanceTotal(entry: DailyEntry): number {
  const stored = Number(entry.maintenance_expense || 0);
  const details = (entry.maintenance_details || []).reduce(
    (sum, item) => sum + toNumber(item.value),
    0
  );

  // Os detalhes são a fonte de verdade quando existirem. O fallback cobre
  // lançamentos antigos que tenham apenas maintenance_expense salvo.
  return details > 0 ? details : stored;
}

function getExtrasTotal(entry: DailyEntry): number {
  return (entry.extra_expenses || []).reduce(
    (sum, item) => sum + toNumber(item.value),
    0
  );
}

export default function ReportsTable({ entries, initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [cats, setCats] = useState<Categories>({
    gas: true,
    alcohol: true,
    maintenance: true,
    extras: true,
  });

  const filtered = useMemo(
    () => entries.filter((e) => e.date >= from && e.date <= to),
    [entries, from, to]
  );

  const calculateValues = (e: DailyEntry) => {
    const gas = cats.gas ? Number(e.gas_expense || 0) : 0;
    const alcohol = cats.alcohol ? Number(e.alcohol_expense || 0) : 0;
    const maintenance = cats.maintenance ? getMaintenanceTotal(e) : 0;
    const extras = cats.extras ? getExtrasTotal(e) : 0;
    const net = computeNetFare(e);
    const profit = net - gas - alcohol - maintenance - extras;

    return { net, gas, alcohol, maintenance, extras, profit };
  };

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, e) => {
        const v = calculateValues(e);
        acc.net += v.net;
        acc.gas += v.gas;
        acc.alcohol += v.alcohol;
        acc.maintenance += v.maintenance;
        acc.extras += v.extras;
        acc.profit += v.profit;
        return acc;
      },
      { net: 0, gas: 0, alcohol: 0, maintenance: 0, extras: 0, profit: 0 }
    );
  }, [filtered, cats]);

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
    window.open(
      `https://wa.me/?text=${encodeURIComponent(summaryText)}`,
      "_blank"
    );
  }

  function openEmail() {
    const subject = "Relatório FaturApp";
    window.location.href =
      `mailto:?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(summaryText)}`;
  }

  function downloadPDF() {
    const doc = new jsPDF("landscape", "mm", "a4");

    doc.setFontSize(16);
    doc.text("FaturApp - Relatório Financeiro", 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${formatDateBR(from)} até ${formatDateBR(to)}`, 14, 22);

    const head = ["Data", "Receita Líquida"];
    if (cats.gas) head.push("Gasolina");
    if (cats.alcohol) head.push("Álcool");
    if (cats.maintenance) head.push("Manutenção");
    if (cats.extras) head.push("Extras");
    head.push("Lucro do Dia");

    const body = filtered.map((e) => {
      const v = calculateValues(e);
      const row: string[] = [formatDateBR(e.date), formatBRL(v.net)];
      if (cats.gas) row.push(formatBRL(v.gas));
      if (cats.alcohol) row.push(formatBRL(v.alcohol));
      if (cats.maintenance) {
        const details = (e.maintenance_details || [])
          .map((m) => `${formatBRL(toNumber(m.value))} - ${m.description}`)
          .join("\n");
        row.push(details ? `${formatBRL(v.maintenance)}\n${details}` : formatBRL(v.maintenance));
      }
      if (cats.extras) {
        const details = (e.extra_expenses || [])
          .map((x) => `${formatBRL(toNumber(x.value))} - ${x.name}`)
          .join("\n");
        row.push(details ? `${formatBRL(v.extras)}\n${details}` : formatBRL(v.extras));
      }
      row.push(formatBRL(v.profit));
      return row;
    });

    const totalRow: string[] = ["TOTAL", formatBRL(totals.net)];
    if (cats.gas) totalRow.push(formatBRL(totals.gas));
    if (cats.alcohol) totalRow.push(formatBRL(totals.alcohol));
    if (cats.maintenance) totalRow.push(formatBRL(totals.maintenance));
    if (cats.extras) totalRow.push(formatBRL(totals.extras));
    totalRow.push(formatBRL(totals.profit));
    body.push(totalRow);

    autoTable(doc, {
      head: [head],
      body,
      startY: 30,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 2,
        valign: "middle",
      },
      headStyles: {
        fontSize: 7,
        fontStyle: "bold",
      },
      footStyles: {
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 22 },
      },
      didParseCell: (data) => {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 10, right: 10 },
    });

    doc.save(`FaturApp_Relatorio_${from}_${to}.pdf`);
  }

  return (
    <div className="space-y-4">
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

        <h3 className="text-sm font-semibold text-slate-700 pt-2">Categorias de gastos</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={cats.gas} onChange={(e) => setCats({ ...cats, gas: e.target.checked })} />
            Gasolina
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={cats.alcohol} onChange={(e) => setCats({ ...cats, alcohol: e.target.checked })} />
            Álcool
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={cats.maintenance} onChange={(e) => setCats({ ...cats, maintenance: e.target.checked })} />
            Manutenção
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={cats.extras} onChange={(e) => setCats({ ...cats, extras: e.target.checked })} />
            Gastos extras
          </label>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm border-collapse border border-slate-300">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="border border-slate-200 px-3 py-2 text-left">Data</th>
              <th className="border border-slate-200 px-3 py-2 text-right">Receita líquida</th>
              {cats.gas && <th className="border border-slate-200 px-3 py-2 text-right">Gasolina</th>}
              {cats.alcohol && <th className="border border-slate-200 px-3 py-2 text-right">Álcool</th>}
              {cats.maintenance && <th className="border border-slate-200 px-3 py-2 text-right">Manutenção</th>}
              {cats.extras && <th className="border border-slate-200 px-3 py-2 text-right">Extras</th>}
              <th className="border border-slate-200 px-3 py-2 text-right">Lucro do dia</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={2 + Number(cats.gas) + Number(cats.alcohol) + Number(cats.maintenance) + Number(cats.extras) + 1} className="border border-slate-200 px-3 py-6 text-center text-slate-500">
                  Nenhum lançamento no período.
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const v = calculateValues(e);
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="border border-slate-200 px-3 py-2">{formatDateBR(e.date)}</td>
                    <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(v.net)}</td>
                    {cats.gas && <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(v.gas)}</td>}
                    {cats.alcohol && <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(v.alcohol)}</td>}
                    {cats.maintenance && (
                      <td className="border border-slate-200 px-3 py-2 text-right">
                        <div className="font-medium">{formatBRL(v.maintenance)}</div>
                        {(e.maintenance_details || []).map((m, i) => (
                          <div key={i} className="text-xs text-slate-500 whitespace-nowrap">
                            {formatBRL(toNumber(m.value))} - {m.description}
                          </div>
                        ))}
                      </td>
                    )}
                    {cats.extras && (
                      <td className="border border-slate-200 px-3 py-2 text-right">
                        <div className="font-medium">{formatBRL(v.extras)}</div>
                        {(e.extra_expenses || []).map((x, i) => (
                          <div key={i} className="text-xs text-slate-500 whitespace-nowrap">
                            {formatBRL(toNumber(x.value))} - {x.name}
                          </div>
                        ))}
                      </td>
                    )}
                    <td className={`border border-slate-200 px-3 py-2 text-right font-semibold ${v.profit >= 0 ? "text-brand-700" : "text-red-600"}`}>
                      {formatBRL(v.profit)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-semibold">
            <tr>
              <td className="border border-slate-200 px-3 py-2">TOTAIS</td>
              <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(totals.net)}</td>
              {cats.gas && <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(totals.gas)}</td>}
              {cats.alcohol && <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(totals.alcohol)}</td>}
              {cats.maintenance && <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(totals.maintenance)}</td>}
              {cats.extras && <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(totals.extras)}</td>}
              <td className="border border-slate-200 px-3 py-2 text-right text-brand-700">{formatBRL(totals.profit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={openWhatsApp} className="btn bg-[#25D366] text-white hover:bg-[#1ebe57]">💬 Enviar por WhatsApp</button>
        <button onClick={openEmail} className="btn bg-sky-600 text-white hover:bg-sky-700">✉️ Enviar por E-mail</button>
        <button onClick={downloadPDF} className="btn btn-secondary">📄 Baixar relatório (PDF)</button>
      </div>
    </div>
  );
}
