'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DailyEntry, ExtraExpense, formatCurrency, formatDate, calculateDailyProfit } from '@/lib/utils';

export default function ReportsPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [includeGas, setIncludeGas] = useState<boolean>(true);
  const [includeAlcohol, setIncludeAlcohol] = useState<boolean>(true);
  const [includeMaintenance, setIncludeMaintenance] = useState<boolean>(true);
  const [includeExtras, setIncludeExtras] = useState<boolean>(true);

  useEffect(() => {
    // Set default dates to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchEntries();
    }
  }, [startDate, endDate]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_entries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExtraExpensesTotal = (extraExpenses: ExtraExpense[]): number => {
    return extraExpenses.reduce((sum, exp) => sum + exp.value, 0);
  };

  const calculateTotals = () => {
    let totalNetFare = 0;
    let totalGas = 0;
    let totalAlcohol = 0;
    let totalMaintenance = 0;
    let totalExtras = 0;
    let totalProfit = 0;

    entries.forEach(entry => {
      totalNetFare += entry.net_fare || 0;
      totalGas += entry.gas_expense;
      totalAlcohol += entry.alcohol_expense;
      totalMaintenance += entry.maintenance_expense;
      totalExtras += getExtraExpensesTotal(entry.extra_expenses);
      totalProfit += calculateDailyProfit(entry);
    });

    return { totalNetFare, totalGas, totalAlcohol, totalMaintenance, totalExtras, totalProfit };
  };

  const generateReportText = (): string => {
    const totals = calculateTotals();
    const startFmt = formatDate(startDate);
    const endFmt = formatDate(endDate);

    let text = `Relatório de ${startFmt} a ${endFmt}\n\n`;
    text += `Receita líquida: ${formatCurrency(totals.totalNetFare)}\n`;
    
    if (includeGas) {
      text += `Gasolina: ${formatCurrency(totals.totalGas)}\n`;
    }
    if (includeAlcohol) {
      text += `Álcool: ${formatCurrency(totals.totalAlcohol)}\n`;
    }
    if (includeMaintenance) {
      text += `Manutenção: ${formatCurrency(totals.totalMaintenance)}\n`;
    }
    if (includeExtras) {
      text += `Extras: ${formatCurrency(totals.totalExtras)}\n`;
    }
    
    text += `\nLucro total: ${formatCurrency(totals.totalProfit)}`;
    
    return text;
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(generateReportText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Relatório DriveLucro');
    const body = encodeURIComponent(generateReportText());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleDownloadCSV = () => {
    const headers = ['Data', 'Receita Líquida', 'Gasolina', 'Álcool', 'Manutenção', 'Extras', 'Lucro do Dia'];
    const rows = entries.map(entry => [
      formatDate(entry.date),
      entry.net_fare?.toFixed(2) || '0.00',
      entry.gas_expense.toFixed(2),
      entry.alcohol_expense.toFixed(2),
      entry.maintenance_expense.toFixed(2),
      getExtraExpensesTotal(entry.extra_expenses).toFixed(2),
      calculateDailyProfit(entry).toFixed(2)
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${startDate}-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-800">Relatórios</h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Categorias de gastos</label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeGas}
                onChange={(e) => setIncludeGas(e.target.checked)}
                className="mr-2"
              />
              Gasolina
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeAlcohol}
                onChange={(e) => setIncludeAlcohol(e.target.checked)}
                className="mr-2"
              />
              Álcool
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeMaintenance}
                onChange={(e) => setIncludeMaintenance(e.target.checked)}
                className="mr-2"
              />
              Manutenção
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeExtras}
                onChange={(e) => setIncludeExtras(e.target.checked)}
                className="mr-2"
              />
              Gastos extras
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleWhatsApp}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Enviar por WhatsApp
          </button>
          <button
            onClick={handleEmail}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Enviar por E-mail
          </button>
          <button
            onClick={handleDownloadCSV}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Baixar relatório CSV
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Data</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Receita líquida</th>
                {includeGas && <th className="border border-gray-300 px-4 py-2 text-right">Gasolina</th>}
                {includeAlcohol && <th className="border border-gray-300 px-4 py-2 text-right">Álcool</th>}
                {includeMaintenance && <th className="border border-gray-300 px-4 py-2 text-right">Manutenção</th>}
                {includeExtras && <th className="border border-gray-300 px-4 py-2 text-right">Extras</th>}
                <th className="border border-gray-300 px-4 py-2 text-right">Lucro do dia</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    Nenhum registro encontrado no período.
                  </td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{formatDate(entry.date)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(entry.net_fare || 0)}</td>
                    {includeGas && <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(entry.gas_expense)}</td>}
                    {includeAlcohol && <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(entry.alcohol_expense)}</td>}
                    {includeMaintenance && <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(entry.maintenance_expense)}</td>}
                    {includeExtras && <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(getExtraExpensesTotal(entry.extra_expenses))}</td>}
                    <td className={`border border-gray-300 px-4 py-2 text-right font-medium ${calculateDailyProfit(entry) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(calculateDailyProfit(entry))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && entries.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="border border-gray-300 px-4 py-2">Totais</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(totals.totalNetFare)}</td>
                  {includeGas && <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(totals.totalGas)}</td>}
                  {includeAlcohol && <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(totals.totalAlcohol)}</td>}
                  {includeMaintenance && <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(totals.totalMaintenance)}</td>}
                  {includeExtras && <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(totals.totalExtras)}</td>}
                  <td className={`border border-gray-300 px-4 py-2 text-right ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totals.totalProfit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
