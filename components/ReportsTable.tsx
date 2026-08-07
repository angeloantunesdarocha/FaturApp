"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  computeFeeAmount,
  computeFuelCostPerKm,
  computeNetFare,
  formatBRL,
  formatDateBR,
  todayISO,
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

const DEFAULT_CATEGORIES: Categories = {
  gas: true,
  alcohol: true,
  maintenance: true,
  extras: true,
};

function formatKm(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatLiters(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatKmPerLiter(value: number | null): string {
  return value === null
    ? "—"
    : `${value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} km/L`;
}

function maintenanceTotal(entry: DailyEntry): number {
  const details = (entry.maintenance_details || []).reduce(
    (sum, item) => sum + toNumber(item.value),
    0,
  );
  return details > 0 ? details : Number(entry.maintenance_expense || 0);
}

function extrasTotal(entry: DailyEntry): number {
  return (entry.extra_expenses || []).reduce(
    (sum, item) => sum + toNumber(item.value),
    0,
  );
}

function maintenanceDetails(entry: DailyEntry): string[] {
  return (entry.maintenance_details || [])
    .filter((item) => toNumber(item.value) !== 0 || item.description)
    .map(
      (item) =>
        `${formatBRL(toNumber(item.value))} — ${item.description || "Item sem descrição"}`,
    );
}

function extrasDetails(entry: DailyEntry): string[] {
  return (entry.extra_expenses || [])
    .filter((item) => toNumber(item.value) !== 0 || item.name)
    .map(
      (item) =>
        `${formatBRL(toNumber(item.value))} — ${item.name || "Item sem descrição"}`,
    );
}

function DetailList({
  items,
  total,
  emptyLabel,
}: {
  items: string[];
  total: number;
  emptyLabel: string;
}) {
  return (
    <div className="min-w-[170px] text-right">
      {items.length > 0 ? (
        <div className="space-y-1 text-xs text-slate-600">
          {items.map((item, index) => (
            <div key={`${item}-${index}`} className="leading-4">
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-400">{emptyLabel}</div>
      )}
      <div className="mt-2 border-t border-slate-200 pt-1 font-semibold text-slate-800">
        Total: {formatBRL(total)}
      </div>
    </div>
  );
}

export default function ReportsTable({ entries, initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [cats, setCats] = useState<Categories>(DEFAULT_CATEGORIES);

  const today = todayISO();
  const [currentYear, currentMonth] = today.split("-");
  const monthStart = `${currentYear}-${currentMonth}-01`;

  const filtered = useMemo(
    () => entries.filter((entry) => entry.date >= from && entry.date <= to),
    [entries, from, to],
  );

  const monthToDate = useMemo(
    () => entries.filter((entry) => entry.date >= monthStart && entry.date <= today),
    [entries, monthStart, today],
  );

  const calculateValues = (entry: DailyEntry) => {
    const gross = Number(entry.gross_amount ?? 0) || 0;
    const feePercent = Number(entry.fee_percent ?? 0) || 0;
    const feeAmount = computeFeeAmount(entry);
    const net = computeNetFare(entry);
    const gas = cats.gas ? Math.max(0, Number(entry.gas_expense) || 0) : 0;
    const alcohol = cats.alcohol
      ? Math.max(0, Number(entry.alcohol_expense) || 0)
      : 0;
    const maintenance = cats.maintenance ? maintenanceTotal(entry) : 0;
    const extras = cats.extras ? extrasTotal(entry) : 0;
    const km = Math.max(0, Number(entry.km_driven) || 0);
    const liters =
      Math.max(0, Number(entry.gasoline_liters) || 0) +
      Math.max(0, Number(entry.alcohol_liters) || 0);
    const fuelCost =
      Math.max(0, Number(entry.gas_expense) || 0) +
      Math.max(0, Number(entry.alcohol_expense) || 0);
    const kmPerLiter = liters > 0 ? km / liters : null;
    const profit = net - gas - alcohol - maintenance - extras;

    return {
      gross,
      feePercent,
      feeAmount,
      net,
      gas,
      alcohol,
      maintenance,
      extras,
      profit,
      km,
      liters,
      fuelCost,
      kmPerLiter,
    };
  };

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, entry) => {
          const value = calculateValues(entry);
          acc.gross += value.gross;
          acc.feeAmount += value.feeAmount;
          acc.net += value.net;
          acc.gas += value.gas;
          acc.alcohol += value.alcohol;
          acc.maintenance += value.maintenance;
          acc.extras += value.extras;
          acc.profit += value.profit;
          acc.km += value.km;
          acc.liters += value.liters;
          acc.fuelCost += value.fuelCost;
          return acc;
        },
        {
          gross: 0,
          feeAmount: 0,
          net: 0,
          gas: 0,
          alcohol: 0,
          maintenance: 0,
          extras: 0,
          profit: 0,
          km: 0,
          liters: 0,
          fuelCost: 0,
        },
      ),
    [filtered, cats],
  );

  const monthKm = useMemo(
    () => monthToDate.reduce((sum, entry) => sum + Math.max(0, Number(entry.km_driven) || 0), 0),
    [monthToDate],
  );

  const dailyRows = useMemo(() => {
    const grouped = new Map<
      string,
      { date: string; km: number; gas: number; alcohol: number; fuel: number }
    >();

    filtered.forEach((entry) => {
      const current = grouped.get(entry.date) || {
        date: entry.date,
        km: 0,
        gas: 0,
        alcohol: 0,
        fuel: 0,
      };
      current.km += Math.max(0, Number(entry.km_driven) || 0);
      current.gas += Math.max(0, Number(entry.gas_expense) || 0);
      current.alcohol += Math.max(0, Number(entry.alcohol_expense) || 0);
      current.fuel +=
        Math.max(0, Number(entry.gas_expense) || 0) +
        Math.max(0, Number(entry.alcohol_expense) || 0);
      grouped.set(entry.date, current);
    });

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const totalKmPerLiter = totals.liters > 0 ? totals.km / totals.liters : null;

  const summaryText = useMemo(() => {
    const lines = [
      `Relatório FaturApp — ${formatDateBR(from)} a ${formatDateBR(to)}`,
      `Km no período: ${formatKm(totals.km)} km`,
      `Km no mês até hoje: ${formatKm(monthKm)} km`,
      `Gasolina: ${formatBRL(totals.gas)}`,
      `Álcool: ${formatBRL(totals.alcohol)}`,
      `Combustível total: ${formatBRL(totals.fuelCost)}`,
      `Litros: ${formatLiters(totals.liters)} L`,
      `Consumo médio: ${formatKmPerLiter(totalKmPerLiter)}`,
      `Receita líquida: ${formatBRL(totals.net)}`,
      `Lucro total: ${formatBRL(totals.profit)}`,
    ];
    if (cats.maintenance) lines.push(`Manutenção: ${formatBRL(totals.maintenance)}`);
    if (cats.extras) lines.push(`Gastos extras: ${formatBRL(totals.extras)}`);
    return lines.join("\n");
  }, [from, to, totals, monthKm, totalKmPerLiter, cats]);

  function openWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(summaryText)}`, "_blank");
  }

  function openEmail() {
    window.location.href = `mailto:?subject=${encodeURIComponent("Relatório FaturApp")}&body=${encodeURIComponent(summaryText)}`;
  }

  function downloadCSV() {
    const headers = [
      "Data",
      "Km rodados",
      "Gasolina",
      "Álcool",
      "Combustível total",
      "Receita bruta",
      "Taxa",
      "Receita líquida",
      "Manutenção",
      "Gastos extras",
      "Lucro do dia",
    ];
    const rows = filtered.map((entry) => {
      const value = calculateValues(entry);
      return [
        formatDateBR(entry.date),
        formatKm(value.km),
        value.gas.toFixed(2),
        value.alcohol.toFixed(2),
        value.fuelCost.toFixed(2),
        value.gross.toFixed(2),
        value.feePercent.toFixed(2),
        value.net.toFixed(2),
        value.maintenance.toFixed(2),
        value.extras.toFixed(2),
        value.profit.toFixed(2),
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FaturApp_Relatorio_${from}_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFontSize(16);
    doc.text("FaturApp — Relatório", 14, 15);
    doc.setFontSize(9);
    doc.text(`Período: ${formatDateBR(from)} até ${formatDateBR(to)}`, 14, 22);
    doc.text(`Km no período: ${formatKm(totals.km)} km`, 14, 27);
    doc.text(`Km no mês até hoje: ${formatKm(monthKm)} km`, 75, 27);
    doc.text(`Combustível: ${formatBRL(totals.fuelCost)}`, 155, 27);
    doc.text(`Consumo: ${formatKmPerLiter(totalKmPerLiter)}`, 225, 27);

    const head = [
      "Data",
      "Km",
      "Gasolina",
      "Álcool",
      "Combustível",
      "Bruto",
      "Taxa",
      "Líquida",
      "Manutenção",
      "Extras",
      "Lucro",
    ];
    const body = filtered.map((entry) => {
      const value = calculateValues(entry);
      const maintenance = maintenanceDetails(entry);
      const extras = extrasDetails(entry);
      return [
        formatDateBR(entry.date),
        formatKm(value.km),
        formatBRL(value.gas),
        formatBRL(value.alcohol),
        formatBRL(value.fuelCost),
        value.gross > 0 ? formatBRL(value.gross) : "—",
        value.gross > 0 ? `${value.feePercent.toFixed(2)}%` : "—",
        formatBRL(value.net),
        maintenance.length
          ? `${maintenance.join("\n")}\nTOTAL: ${formatBRL(value.maintenance)}`
          : formatBRL(value.maintenance),
        extras.length
          ? `${extras.join("\n")}\nTOTAL: ${formatBRL(value.extras)}`
          : formatBRL(value.extras),
        formatBRL(value.profit),
      ];
    });

    body.push([
      "TOTAL",
      formatKm(totals.km),
      formatBRL(totals.gas),
      formatBRL(totals.alcohol),
      formatBRL(totals.fuelCost),
      formatBRL(totals.gross),
      "",
      formatBRL(totals.net),
      `TOTAL: ${formatBRL(totals.maintenance)}`,
      `TOTAL: ${formatBRL(totals.extras)}`,
      formatBRL(totals.profit),
    ]);

    autoTable(doc, {
      head: [head],
      body,
      startY: 33,
      theme: "grid",
      styles: { fontSize: 6, cellPadding: 1.5, valign: "middle" },
      headStyles: { fontSize: 6, fontStyle: "bold" },
      margin: { left: 6, right: 6 },
      didParseCell: (data) => {
        if (data.row.index === body.length - 1) data.cell.styles.fontStyle = "bold";
      },
    });
    doc.save(`FaturApp_Relatorio_${from}_${to}.pdf`);
  }

  const categoryButton = (key: keyof Categories, label: string) => (
    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
      <input
        type="checkbox"
        checked={cats[key]}
        onChange={(event) => setCats((current) => ({ ...current, [key]: event.target.checked }))}
      />
      {label}
    </label>
  );

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-slate-800">Filtros do relatório</h2>
          <p className="text-sm text-slate-500">
            Escolha o período e as categorias de gastos que deseja visualizar. Os dados de quilometragem são mantidos separados dos filtros de gastos.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Data inicial</label>
            <input type="date" className="input" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div>
            <label className="label">Data final</label>
            <input type="date" className="input" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-slate-700">Categorias de gastos</p>
          <div className="flex flex-wrap gap-2">
            {categoryButton("gas", "Gasolina")}
            {categoryButton("alcohol", "Álcool")}
            {categoryButton("maintenance", "Manutenção")}
            {categoryButton("extras", "Gastos extras")}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800">Quilometragem e combustível</h2>
          <p className="text-sm text-slate-500">
            Veja quantos quilômetros foram rodados em cada dia selecionado e o total acumulado no mês até hoje.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Km no período selecionado</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{formatKm(totals.km)} km</p>
            <p className="mt-1 text-xs text-slate-500">Soma dos km de todos os lançamentos do período.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Km no mês até hoje</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{formatKm(monthKm)} km</p>
            <p className="mt-1 text-xs text-slate-500">Soma de todos os lançamentos do mês corrente até hoje.</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Gasolina</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{formatBRL(totals.gas)}</p>
            <p className="mt-1 text-xs text-slate-500">Gasto total com gasolina no período.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Álcool</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{formatBRL(totals.alcohol)}</p>
            <p className="mt-1 text-xs text-slate-500">Gasto total com álcool no período.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Combustível total</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{formatBRL(totals.fuelCost)}</p>
            <p className="mt-1 text-xs text-slate-500">Gasolina + álcool.</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Dia</th>
                <th className="px-4 py-3 text-right font-semibold">Km rodados</th>
                <th className="px-4 py-3 text-right font-semibold">Gasolina</th>
                <th className="px-4 py-3 text-right font-semibold">Álcool</th>
                <th className="px-4 py-3 text-right font-semibold">Combustível total</th>
                <th className="px-4 py-3 text-right font-semibold">Custo combustível/km</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhum lançamento no período.</td>
                </tr>
              ) : (
                dailyRows.map((row) => (
                  <tr key={row.date} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{formatDateBR(row.date)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatKm(row.km)} km</td>
                    <td className="px-4 py-3 text-right">{formatBRL(row.gas)}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(row.alcohol)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatBRL(row.fuel)}</td>
                    <td className="px-4 py-3 text-right">{computeFuelCostPerKm(row.fuel, row.km) === null ? "—" : `${formatBRL(computeFuelCostPerKm(row.fuel, row.km) || 0)} / km`}</td>
                  </tr>
                ))
              )}
            </tbody>
            {dailyRows.length > 0 && (
              <tfoot className="bg-slate-50 font-bold text-slate-800">
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">TOTAL DO PERÍODO</td>
                  <td className="px-4 py-3 text-right">{formatKm(totals.km)} km</td>
                  <td className="px-4 py-3 text-right">{formatBRL(totals.gas)}</td>
                  <td className="px-4 py-3 text-right">{formatBRL(totals.alcohol)}</td>
                  <td className="px-4 py-3 text-right">{formatBRL(totals.fuelCost)}</td>
                  <td className="px-4 py-3 text-right">{computeFuelCostPerKm(totals.fuelCost, totals.km) === null ? "—" : `${formatBRL(computeFuelCostPerKm(totals.fuelCost, totals.km) || 0)} / km`}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800">Resumo financeiro</h2>
          <p className="text-sm text-slate-500">Confira receitas, gastos e lucro do período. As descrições de manutenção e gastos extras permanecem visíveis em cada lançamento.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Receita líquida</p><p className="mt-1 text-xl font-bold text-slate-800">{formatBRL(totals.net)}</p></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Combustível</p><p className="mt-1 text-xl font-bold text-slate-800">{formatBRL(totals.fuelCost)}</p><p className="mt-1 text-xs text-slate-500">Gasolina + álcool</p></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Litros abastecidos</p><p className="mt-1 text-xl font-bold text-slate-800">{formatLiters(totals.liters)} L</p></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Consumo médio</p><p className="mt-1 text-xl font-bold text-slate-800">{formatKmPerLiter(totalKmPerLiter)}</p><p className="mt-1 text-xs text-slate-500">Km total ÷ litros totais</p></div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Data</th>
                <th className="px-4 py-3 text-right font-semibold">Km</th>
                <th className="px-4 py-3 text-right font-semibold">Combustível</th>
                <th className="px-4 py-3 text-right font-semibold">Receita</th>
                {cats.gas && <th className="px-4 py-3 text-right font-semibold">Gasolina</th>}
                {cats.alcohol && <th className="px-4 py-3 text-right font-semibold">Álcool</th>}
                {cats.maintenance && <th className="px-4 py-3 text-right font-semibold">Manutenção</th>}
                {cats.extras && <th className="px-4 py-3 text-right font-semibold">Gastos extras</th>}
                <th className="px-4 py-3 text-right font-semibold">Lucro do dia</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5 + Number(cats.gas) + Number(cats.alcohol) + Number(cats.maintenance) + Number(cats.extras)} className="px-4 py-8 text-center text-slate-500">Nenhum lançamento no período.</td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  const value = calculateValues(entry);
                  return (
                    <tr key={entry.id} className="border-t border-slate-200 align-top hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{formatDateBR(entry.date)}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatKm(value.km)} km</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="font-medium">{formatBRL(value.fuelCost)}</div>
                        <div className="text-xs text-slate-500">{formatLiters(value.liters)} L</div>
                        <div className="text-xs text-slate-500">{formatKmPerLiter(value.kmPerLiter)}</div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div>Bruto: {value.gross > 0 ? formatBRL(value.gross) : "—"}</div>
                        <div className="text-xs text-slate-500">Taxa: {value.gross > 0 ? `${value.feePercent.toFixed(2)}%` : "—"}</div>
                        <div className="font-semibold">Líquida: {formatBRL(value.net)}</div>
                      </td>
                      {cats.gas && <td className="px-4 py-3 text-right whitespace-nowrap">{formatBRL(value.gas)}</td>}
                      {cats.alcohol && <td className="px-4 py-3 text-right whitespace-nowrap">{formatBRL(value.alcohol)}</td>}
                      {cats.maintenance && <td className="px-4 py-3"><DetailList items={maintenanceDetails(entry)} total={value.maintenance} emptyLabel="Sem manutenção" /></td>}
                      {cats.extras && <td className="px-4 py-3"><DetailList items={extrasDetails(entry)} total={value.extras} emptyLabel="Sem gastos extras" /></td>}
                      <td className="px-4 py-3 text-right font-bold whitespace-nowrap">{formatBRL(value.profit)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50 font-bold text-slate-800">
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3">TOTAIS</td>
                  <td className="px-4 py-3 text-right">{formatKm(totals.km)} km</td>
                  <td className="px-4 py-3 text-right">{formatBRL(totals.fuelCost)}<div className="text-xs font-normal text-slate-500">{formatLiters(totals.liters)} L</div></td>
                  <td className="px-4 py-3 text-right">{formatBRL(totals.net)}<div className="text-xs font-normal text-slate-500">Bruta: {formatBRL(totals.gross)}</div></td>
                  {cats.gas && <td className="px-4 py-3 text-right">{formatBRL(totals.gas)}</td>}
                  {cats.alcohol && <td className="px-4 py-3 text-right">{formatBRL(totals.alcohol)}</td>}
                  {cats.maintenance && <td className="px-4 py-3 text-right">{formatBRL(totals.maintenance)}</td>}
                  {cats.extras && <td className="px-4 py-3 text-right">{formatBRL(totals.extras)}</td>}
                  <td className="px-4 py-3 text-right">{formatBRL(totals.profit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={downloadPDF} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Baixar PDF</button>
          <button type="button" onClick={downloadCSV} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Baixar CSV</button>
          <button type="button" onClick={openWhatsApp} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Enviar por WhatsApp</button>
          <button type="button" onClick={openEmail} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Enviar por e-mail</button>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <strong>Como os cálculos funcionam:</strong> km rodados = km final − km inicial; custo de combustível por km = valor gasto com combustível ÷ km rodados; consumo médio = km totais ÷ litros totais. Para manutenção e gastos extras, cada descrição permanece vinculada ao respectivo valor e o total é calculado pela soma dos itens.
        </div>
      </section>
    </div>
  );
}
