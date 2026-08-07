export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : Number(v);
  return isNaN(n) ? 0 : n;
}

export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export type ExtraExpense = { name: string; value: number };
export type MaintenanceItem = { description: string; value: number };

export type DailyEntry = {
  id: string;
  date: string;
  gross_amount: number | null;
  fee_percent: number | null;
  net_fare: number | null;
  gas_expense: number;
  alcohol_expense: number;
  maintenance_expense: number;
  maintenance_details?: MaintenanceItem[];
  extra_expenses: ExtraExpense[];
};

export function computeNetFare(entry: {
  gross_amount: number | null;
  fee_percent: number | null;
  net_fare: number | null;
}): number {
  // Quando bruto e taxa existem, eles são a fonte de verdade.
  // Assim um net_fare antigo/incorreto não interfere no cálculo.
  if (entry.gross_amount !== null && entry.gross_amount !== undefined) {
    const gross = Number(entry.gross_amount) || 0;
    const fee = Number(entry.fee_percent ?? 0) || 0;
    return gross * (1 - fee / 100);
  }

  // No modo "valor já líquido", usa o valor informado diretamente.
  return Number(entry.net_fare ?? 0) || 0;
}

export function computeDayProfit(entry: DailyEntry): number {
  const netFare = computeNetFare(entry);
  const extrasSum = (entry.extra_expenses || []).reduce(
    (acc, e) => acc + toNumber(e.value),
    0
  );
  const totalExpenses =
    Number(entry.gas_expense || 0) +
    Number(entry.alcohol_expense || 0) +
    Number(entry.maintenance_expense || 0) +
    extrasSum;
  return netFare - totalExpenses;
}
