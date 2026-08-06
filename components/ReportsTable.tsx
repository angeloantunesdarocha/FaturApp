"use client";

import { useState, useMemo } from "react";
import {
  computeDayProfit,
  computeNetFare,
  formatBRL,
  formatDateBR,
  toNumber,
  type DailyEntry,
} from "@/lib/utils";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

// Estende o tipo DailyEntry para incluir campos adicionais da tabela
type ExtendedDailyEntry = DailyEntry & {
  gross_amount?: number | null;
  fee_percent?: number | null;
  net_fare?: number | null;
  payment_type?: string;
  description?: string;
  category?: string;
};

const columnHelper = createColumnHelper<ExtendedDailyEntry>();

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

  // Totais do período - Cálculo Preliminar (bruto)
  const preliminaryTotal = useMemo(() => {
    return filtered.reduce((acc, e) => {
      return acc + Number(e.gross_amount || 0);
    }, 0);
  }, [filtered]);

  // Totais do período - Cálculo Final (líquido)
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
      `Cálculo Preliminar (Bruto): ${formatBRL(preliminaryTotal)}`,
      `Receita líquida: ${formatBRL(totals.net)}`,
    ];
    if (cats.gas) lines.push(`Gasolina: ${formatBRL(totals.gas)}`);
    if (cats.alcohol) lines.push(`Álcool: ${formatBRL(totals.alcohol)}`);
    if (cats.maintenance) lines.push(`Manutenção: ${formatBRL(totals.maintenance)}`);
    if (cats.extras) lines.push(`Extras: ${formatBRL(totals.extras)}`);
    lines.push(`Lucro total: ${formatBRL(totals.profit)}`);
    return lines.join("\n");
  }, [from, to, totals, cats, preliminaryTotal]);

  // Funções de exportação e compartilhamento
  function openWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    window.open(url, "_blank");
  }

  function openEmail() {
    const subject = "Relatório FaturApp";
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summaryText)}`;
    window.location.href = mailto;
  }

  function downloadCSV() {
    const header = [
      "Data",
      "Descrição",
      "Categoria",
      "Valor Bruto",
      "Taxa (%)",
      "Receita líquida",
      "Tipo Pagamento",
      "Gasolina",
      "Álcool",
      "Manutenção",
      "Extras",
      "Lucro do dia",
    ];
    const rows = filtered.map((e) => {
      const entry = e as ExtendedDailyEntry;
      const netFare = computeNetFare(e);
      const extrasSum = (e.extra_expenses || []).reduce(
        (acc, x) => acc + toNumber(x.value),
        0
      );
      return [
        formatDateBR(e.date),
        entry.description || "",
        entry.category || "",
        Number(e.gross_amount || 0).toFixed(2),
        Number(e.fee_percent || 0).toFixed(2),
        netFare.toFixed(2),
        entry.payment_type || "",
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
        "",
        "",
        preliminaryTotal.toFixed(2),
        "",
        totals.net.toFixed(2),
        "",
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

  function downloadXLSX() {
    const header = [
      "Data",
      "Descrição",
      "Categoria",
      "Valor Bruto",
      "Taxa (%)",
      "Receita Líquida",
      "Tipo Pagamento",
      "Gasolina",
      "Álcool",
      "Manutenção",
      "Extras",
      "Lucro do Dia",
    ];
    const rows = filtered.map((e) => {
      const netFare = computeNetFare(e);
      const extrasSum = (e.extra_expenses || []).reduce(
        (acc, x) => acc + toNumber(x.value),
        0
      );
      return [
        e.date,
        e.description || "",
        e.category || "",
        Number(e.gross_amount || 0),
        Number(e.fee_percent || 0),
        netFare,
        e.payment_type || "",
        Number(e.gas_expense || 0),
        Number(e.alcohol_expense || 0),
        Number(e.maintenance_expense || 0),
        extrasSum,
        computeDayProfit(e),
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");

    // Adicionar linha de totais
    const totalsRow = [
      "TOTAIS",
      "",
      "",
      preliminaryTotal,
      "",
      totals.net,
      "",
      totals.gas,
      totals.alcohol,
      totals.maintenance,
      totals.extras,
      totals.profit,
    ];
    XLSX.utils.sheet_add_aoa(ws, [totalsRow], { origin: -1 });

    XLSX.writeFile(wb, `relatorio-faturapp-${from}_${to}.xlsx`);
  }

  function downloadPDF() {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(14);
    doc.text(`Relatório FaturApp - ${formatDateBR(from)} a ${formatDateBR(to)}`, 14, 15);
    
    // Totais
    doc.setFontSize(10);
    doc.text(`Cálculo Preliminar (Bruto): ${formatBRL(preliminaryTotal)}`, 14, 25);
    doc.text(`Cálculo Final (Líquido): ${formatBRL(totals.profit)}`, 14, 32);
    
    // Tabela
    const tableColumn = [
      "Data",
      "Descrição",
      "Categoria",
      "Valor Bruto",
      "Taxa %",
      "Rec. Líquida",
      "Pagamento",
      "Gasolina",
      "Álcool",
      "Manut.",
      "Extras",
      "Lucro",
    ];
    const tableRows = filtered.map((e) => {
      const netFare = computeNetFare(e);
      const extrasSum = (e.extra_expenses || []).reduce(
        (acc, x) => acc + toNumber(x.value),
        0
      );
      return [
        formatDateBR(e.date),
        e.description || "-",
        e.category || "-",
        Number(e.gross_amount || 0).toFixed(2),
        Number(e.fee_percent || 0).toFixed(2),
        netFare.toFixed(2),
        e.payment_type || "-",
        Number(e.gas_expense || 0).toFixed(2),
        Number(e.alcohol_expense || 0).toFixed(2),
        Number(e.maintenance_expense || 0).toFixed(2),
        extrasSum.toFixed(2),
        computeDayProfit(e).toFixed(2),
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1 },
      foot: [
        [
          "TOTAIS",
          "",
          "",
          preliminaryTotal.toFixed(2),
          "",
          totals.net.toFixed(2),
          "",
          totals.gas.toFixed(2),
          totals.alcohol.toFixed(2),
          totals.maintenance.toFixed(2),
          totals.extras.toFixed(2),
          totals.profit.toFixed(2),
        ],
      ],
    });

    doc.save(`relatorio-faturapp-${from}_${to}.pdf`);
  }

  // Configuração das colunas da tabela React Table
  const columns = useMemo(
    () => [
      columnHelper.accessor("date", {
        header: "Data",
        cell: (info) => formatDateBR(info.getValue()),
      }),
      columnHelper.accessor((row) => row.description || "-", {
        id: "description",
        header: "Descrição",
      }),
      columnHelper.accessor((row) => row.category || "-", {
        id: "category",
        header: "Categoria",
      }),
      columnHelper.accessor("gross_amount", {
        header: "Valor Bruto",
        cell: (info) => formatBRL(Number(info.getValue() || 0)),
      }),
      columnHelper.accessor("fee_percent", {
        header: "Taxa (%)",
        cell: (info) => `${Number(info.getValue() || 0).toFixed(2)}%`,
      }),
      columnHelper.accessor((row) => computeNetFare(row), {
        id: "net_fare",
        header: "Receita Líquida",
        cell: (info) => formatBRL(info.getValue()),
      }),
      columnHelper.accessor((row) => row.payment_type || "-", {
        id: "payment_type",
        header: "Tipo Pagamento",
      }),
      columnHelper.accessor("gas_expense", {
        header: "Gasolina",
        cell: (info) => formatBRL(Number(info.getValue() || 0)),
      }),
      columnHelper.accessor("alcohol_expense", {
        header: "Álcool",
        cell: (info) => formatBRL(Number(info.getValue() || 0)),
      }),
      columnHelper.accessor("maintenance_expense", {
        header: "Manutenção",
        cell: (info) => formatBRL(Number(info.getValue() || 0)),
      }),
      columnHelper.accessor(
        (row) =>
          (row.extra_expenses || []).reduce(
            (acc, x) => acc + toNumber(x.value),
            0
          ),
        {
          id: "extra_expenses",
          header: "Extras",
          cell: (info) => formatBRL(info.getValue()),
        }
      ),
      columnHelper.accessor((row) => computeDayProfit(row), {
        id: "profit",
        header: "Lucro do Dia",
        cell: (info) => {
          const value = info.getValue();
          return (
            <span
              className={`font-semibold ${
                value >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatBRL(value)}
            </span>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Botões de ação */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={openWhatsApp}
          className="px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#1ebe57] transition-colors text-sm font-medium"
        >
          💬 WhatsApp
        </button>
        <button
          onClick={openEmail}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-medium"
        >
          ✉️ E-mail
        </button>
        <button
          onClick={downloadXLSX}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          📊 Baixar Excel (.xlsx)
        </button>
        <button
          onClick={downloadPDF}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          📄 Baixar PDF
        </button>
        <button
          onClick={downloadCSV}
          className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          ⬇️ Baixar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Período</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data inicial</label>
            <input
              type="date"
              className="input w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Data final</label>
            <input
              type="date"
              className="input w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Gasolina
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cats.alcohol}
              onChange={(e) => setCats({ ...cats, alcohol: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Álcool
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cats.maintenance}
              onChange={(e) => setCats({ ...cats, maintenance: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Manutenção
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cats.extras}
              onChange={(e) => setCats({ ...cats, extras: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Gastos extras
          </label>
        </div>
      </div>

      {/* Cálculos Preliminar e Final */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
            Cálculo Preliminar
          </p>
          <p className="text-2xl font-bold text-blue-700">
            {formatBRL(preliminaryTotal)}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Soma bruta de todos os lançamentos
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">
            Cálculo Final
          </p>
          <p className="text-2xl font-bold text-green-700">
            {formatBRL(totals.profit)}
          </p>
          <p className="text-xs text-green-600 mt-1">
            Resultado líquido após descontos
          </p>
        </div>
      </div>

      {/* Tabela Detalhada */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-3 text-left font-semibold border-b border-slate-200 whitespace-nowrap"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    Nenhum lançamento no período.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 border-b border-slate-50">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé com paginação */}
        {table.getPageCount() > 1 && (
          <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 text-sm bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-600">
              Página {table.getState().pagination.pageIndex + 1} de{" "}
              {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 text-sm bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {/* Totais Gerais */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Resumo do Período
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Receita Líquida</p>
            <p className="font-semibold text-slate-900">{formatBRL(totals.net)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Gasolina</p>
            <p className="font-semibold text-slate-900">{formatBRL(totals.gas)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Álcool</p>
            <p className="font-semibold text-slate-900">{formatBRL(totals.alcohol)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Manutenção</p>
            <p className="font-semibold text-slate-900">{formatBRL(totals.maintenance)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Extras</p>
            <p className="font-semibold text-slate-900">{formatBRL(totals.extras)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Lucro Total</p>
            <p className="font-semibold text-green-600">{formatBRL(totals.profit)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

