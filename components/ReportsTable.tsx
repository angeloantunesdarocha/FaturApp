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

  // Calcula valores considerando apenas categorias selecionadas
  const calculateFilteredValues = (e: DailyEntry) => {
    const gasValue = cats.gas ? Number(e.gas_expense || 0) : 0;
    const alcoholValue = cats.alcohol ? Number(e.alcohol_expense || 0) : 0;
    const maintenanceValue = cats.maintenance ? Number(e.maintenance_expense || 0) : 0;
    const extrasValue = cats.extras 
      ? (e.extra_expenses || []).reduce((acc, x) => acc + toNumber(x.value), 0)
      : 0;
    
    const totalExpenses = gasValue + alcoholValue + maintenanceValue + extrasValue;
    const netFare = computeNetFare(e);
    const profit = netFare - totalExpenses;
    
    return { gasValue, alcoholValue, maintenanceValue, extrasValue, profit };
  };

  // Totais do período (considerando apenas categorias selecionadas)
  const totals = useMemo(() => {
    let net = 0, gas = 0, alcohol = 0, maintenance = 0, extras = 0, profit = 0;
    filtered.forEach((e) => {
      const values = calculateFilteredValues(e);
      net += computeNetFare(e);
      gas += values.gasValue;
      alcohol += values.alcoholValue;
      maintenance += values.maintenanceValue;
      extras += values.extrasValue;
      profit += values.profit;
    });
    return { net, gas, alcohol, maintenance, extras, profit };
  }, [filtered, cats]);

  // Monta texto do resumo com detalhamento dos extras
  const summaryText = useMemo(() => {
    const lines = [
      `Relatório de ${formatDateBR(from)} a ${formatDateBR(to)}`,
      `Receita líquida: ${formatBRL(totals.net)}`,
    ];
    if (cats.gas) lines.push(`Gasolina: ${formatBRL(totals.gas)}`);
    if (cats.alcohol) lines.push(`Álcool: ${formatBRL(totals.alcohol)}`);
    if (cats.maintenance) lines.push(`Manutenção: ${formatBRL(totals.maintenance)}`);
    
    if (cats.extras) {
      lines.push(`Extras: ${formatBRL(totals.extras)}`);
      // Adiciona detalhamento item por item de todos os dias filtrados
      filtered.forEach((e) => {
        const extraExpensesList = e.extra_expenses || [];
        if (extraExpensesList.length > 0) {
          extraExpensesList.forEach((x) => {
            lines.push(`  - ${formatDateBR(e.date)}: ${formatBRL(toNumber(x.value))} ${x.name}`);
          });
        }
      });
    }
    
    lines.push(`Lucro total: ${formatBRL(totals.profit)}`);
    return lines.join("\n");
  }, [from, to, totals, cats, filtered]);

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
      const values = calculateFilteredValues(e);
      const extraExpensesList = e.extra_expenses || [];
      
      let extrasText = formatBRL(values.extrasValue);
      if (cats.extras && extraExpensesList.length > 0) {
        const itemsDetail = extraExpensesList
          .map((x) => `${formatBRL(toNumber(x.value))} ${x.name}`)
          .join("\\n");
        extrasText = `${formatBRL(values.extrasValue)}\\n${itemsDetail}`;
      }

      return [
        formatDateBR(e.date),
        formatBRL(computeNetFare(e)),
        cats.gas ? formatBRL(values.gasValue) : "",
        cats.alcohol ? formatBRL(values.alcoholValue) : "",
        cats.maintenance ? formatBRL(values.maintenanceValue) : "",
        cats.extras ? extrasText : "",
        formatBRL(values.profit),
      ];
    });

    rows.push([
      "TOTAL",
      formatBRL(totals.net),
      cats.gas ? formatBRL(totals.gas) : "",
      cats.alcohol ? formatBRL(totals.alcohol) : "",
      cats.maintenance ? formatBRL(totals.maintenance) : "",
      cats.extras ? formatBRL(totals.extras) : "",
      formatBRL(totals.profit),
    ]);

    autoTable(doc, {
      head: [[
        "Data",
        "Receita Líquida",
        ...cats.gas ? ["Gasolina"] : [],
        ...cats.alcohol ? ["Álcool"] : [],
        ...cats.maintenance ? ["Manutenção"] : [],
        ...cats.extras ? ["Extras"] : [],
        "Lucro do Dia",
      ]],
      body: rows,
      startY: 30,
    });

    doc.save(`FaturApp_Relatorio_${from}_${to}.pdf`);
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
        <table className="min-w-full text-sm border-collapse border border-slate-300">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Data</th>
              <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Receita líquida</th>
              {cats.gas && (
                <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Gasolina</th>
              )}
              {cats.alcohol && (
                <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Álcool</th>
              )}
              {cats.maintenance && (
                <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Manutenção</th>
              )}
              {cats.extras && (
                <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Extras</th>
              )}
              <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Lucro do dia</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-slate-200 px-3 py-6 text-center text-slate-500">
                  Nenhum lançamento no período.
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const { gasValue, alcoholValue, maintenanceValue, extrasValue, profit } = calculateFilteredValues(e);
                const extraExpensesList = e.extra_expenses || [];
                const hasExtraDescription = cats.extras && extraExpensesList.length > 0;
                
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="border border-slate-200 px-3 py-2">{formatDateBR(e.date)}</td>
                    <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(computeNetFare(e))}</td>
                    {cats.gas && (
                      <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(gasValue)}</td>
                    )}
                    {cats.alcohol && (
                      <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(alcoholValue)}</td>
                    )}
                    {cats.maintenance && (
                      <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(maintenanceValue)}</td>
                    )}
                    {cats.extras && (
                      <td className="border border-slate-200 px-3 py-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-medium">{formatBRL(extrasValue)}</span>
                          {hasExtraDescription && (
                            <div className="text-xs text-slate-500 space-y-0.5">
                              {extraExpensesList.map((x, idx) => (
                                <div key={idx} className="whitespace-nowrap">
                                  {formatBRL(toNumber(x.value))} {x.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    <td className={`border border-slate-200 px-3 py-2 text-right font-semibold ${profit >= 0 ? "text-brand-700" : "text-red-600"}`}>
                      {formatBRL(profit)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-semibold">
            <tr className="border-t-2 border-slate-300">
              <td className="border border-slate-200 px-3 py-2">TOTAIS</td>
              <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(totals.net)}</td>
              {cats.gas && (
                <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(totals.gas)}</td>
              )}
              {cats.alcohol && (
                <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(totals.alcohol)}</td>
              )}
              {cats.maintenance && (
                <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(totals.maintenance)}</td>
              )}
              {cats.extras && (
                <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(totals.extras)}</td>
              )}
              <td className="border border-slate-200 px-3 py-2 text-right text-brand-700">
                {formatBRL(totals.profit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Botões de ação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={openWhatsApp} className="btn bg-[#25D366] text-white hover:bg-[#1ebe57]">
          💬 Enviar por WhatsApp
        </button>
        <button onClick={openEmail} className="btn bg-sky-600 text-white hover:bg-sky-700">
          ✉️ Enviar por E-mail
        </button>
        <button onClick={downloadPDF} className="btn btn-secondary">
          📄 Baixar relatório (PDF)
        </button>
      </div>
    </div>
  );
}