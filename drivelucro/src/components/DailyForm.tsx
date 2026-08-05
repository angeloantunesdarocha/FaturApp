'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DailyEntry, ExtraExpense, formatCurrency, calculateNetFare, calculateDailyProfit, getMonthStartEnd } from '@/lib/utils';

export default function DailyForm() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [revenueMode, setRevenueMode] = useState<'gross' | 'net'>('gross');
  const [grossAmount, setGrossAmount] = useState<string>('');
  const [feePercent, setFeePercent] = useState<string>('25');
  const [netFare, setNetFare] = useState<number>(0);
  const [gasExpense, setGasExpense] = useState<string>('');
  const [alcoholExpense, setAlcoholExpense] = useState<string>('');
  const [maintenanceExpense, setMaintenanceExpense] = useState<string>('');
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpense[]>([]);
  const [monthlyProfit, setMonthlyProfit] = useState<number>(0);
  const [dailyProfit, setDailyProfit] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Calculate net fare when gross amount or fee changes
  useEffect(() => {
    if (revenueMode === 'gross' && grossAmount && feePercent) {
      const calculated = calculateNetFare(parseFloat(grossAmount), parseFloat(feePercent));
      setNetFare(calculated);
    } else if (revenueMode === 'net' && grossAmount) {
      setNetFare(parseFloat(grossAmount));
    } else {
      setNetFare(0);
    }
  }, [revenueMode, grossAmount, feePercent]);

  // Calculate daily profit
  useEffect(() => {
    const totalExpenses = 
      parseFloat(gasExpense || '0') + 
      parseFloat(alcoholExpense || '0') + 
      parseFloat(maintenanceExpense || '0') + 
      extraExpenses.reduce((sum, exp) => sum + exp.value, 0);
    setDailyProfit(netFare - totalExpenses);
  }, [netFare, gasExpense, alcoholExpense, maintenanceExpense, extraExpenses]);

  // Fetch monthly profit
  useEffect(() => {
    fetchMonthlyProfit(date);
  }, [date]);

  const fetchMonthlyProfit = async (selectedDate: string) => {
    const { start, end } = getMonthStartEnd(selectedDate);
    
    try {
      const { data, error } = await supabase
        .from('daily_entries')
        .select('*')
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      const total = data?.reduce((sum, entry) => sum + calculateDailyProfit(entry as DailyEntry), 0) || 0;
      setMonthlyProfit(total);
    } catch (error) {
      console.error('Error fetching monthly profit:', error);
    }
  };

  const addExtraExpense = () => {
    if (extraExpenses.length < 5) {
      setExtraExpenses([...extraExpenses, { name: '', value: 0 }]);
    }
  };

  const removeExtraExpense = (index: number) => {
    setExtraExpenses(extraExpenses.filter((_, i) => i !== index));
  };

  const updateExtraExpense = (index: number, field: keyof ExtraExpense, value: string) => {
    const updated = [...extraExpenses];
    if (field === 'value') {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setExtraExpenses(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const entryData = {
        date,
        gross_amount: revenueMode === 'gross' ? parseFloat(grossAmount) || null : null,
        fee_percent: revenueMode === 'gross' ? parseFloat(feePercent) || null : null,
        net_fare: netFare || null,
        gas_expense: parseFloat(gasExpense) || 0,
        alcohol_expense: parseFloat(alcoholExpense) || 0,
        maintenance_expense: parseFloat(maintenanceExpense) || 0,
        extra_expenses: extraExpenses.filter(exp => exp.name.trim() !== ''),
      };

      // Check if entry exists for this date
      const { data: existing } = await supabase
        .from('daily_entries')
        .select('id')
        .eq('date', date)
        .single();

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('daily_entries')
          .update(entryData)
          .eq('date', date);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('daily_entries')
          .insert(entryData);
        error = insertError;
      }

      if (error) throw error;

      setMessage({ type: 'success', text: 'Lançamento salvo com sucesso!' });
      
      // Reset form
      setGrossAmount('');
      setGasExpense('');
      setAlcoholExpense('');
      setMaintenanceExpense('');
      setExtraExpenses([]);
      
      // Refresh monthly profit
      fetchMonthlyProfit(date);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao salvar: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-800">Lançamento Diário</h2>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          />
        </div>

        {/* Revenue Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Modo de Receita</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={revenueMode === 'gross'}
                onChange={() => setRevenueMode('gross')}
                className="mr-2"
              />
              Valor com taxa
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={revenueMode === 'net'}
                onChange={() => setRevenueMode('net')}
                className="mr-2"
              />
              Valor já líquido
            </label>
          </div>
        </div>

        {/* Revenue Fields */}
        {revenueMode === 'gross' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor bruto (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={grossAmount}
                onChange={(e) => setGrossAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taxa do app (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor líquido recebido (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Calculated Net Fare Display */}
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Valor líquido da corrida</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(netFare)}</p>
        </div>

        {/* Expenses */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gasolina (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={gasExpense}
              onChange={(e) => setGasExpense(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Álcool (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={alcoholExpense}
              onChange={(e) => setAlcoholExpense(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manutenção (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={maintenanceExpense}
              onChange={(e) => setMaintenanceExpense(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Extra Expenses */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gastos Extras</label>
          {extraExpenses.map((expense, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Nome do gasto"
                value={expense.name}
                onChange={(e) => updateExtraExpense(index, 'name', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor"
                value={expense.value || ''}
                onChange={(e) => updateExtraExpense(index, 'value', e.target.value)}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => removeExtraExpense(index)}
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          ))}
          {extraExpenses.length < 5 && (
            <button
              type="button"
              onClick={addExtraExpense}
              className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              + Adicionar gasto extra
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Lucro líquido do dia:</span>
            <span className={`font-bold ${dailyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(dailyProfit)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Lucro líquido do mês:</span>
            <span className={`font-bold ${monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(monthlyProfit)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Salvando...' : 'Salvar Lançamento'}
        </button>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}
