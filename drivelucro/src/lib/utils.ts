export interface ExtraExpense {
  name: string;
  value: number;
}

export interface DailyEntry {
  id: string;
  created_at: string;
  date: string;
  gross_amount: number | null;
  fee_percent: number | null;
  net_fare: number | null;
  gas_expense: number;
  alcohol_expense: number;
  maintenance_expense: number;
  extra_expenses: ExtraExpense[];
}

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
};

export const calculateNetFare = (grossAmount: number, feePercent: number): number => {
  return grossAmount * (1 - feePercent / 100);
};

export const calculateDailyProfit = (entry: DailyEntry): number => {
  const netRevenue = entry.net_fare ?? 0;
  const totalExpenses = 
    entry.gas_expense + 
    entry.alcohol_expense + 
    entry.maintenance_expense + 
    entry.extra_expenses.reduce((sum, exp) => sum + exp.value, 0);
  return netRevenue - totalExpenses;
};

export const getMonthStartEnd = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
};
