export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

export type DailyEntry = {
  id: string;
  date: string;
  gross_amount: number | null;
  fee_percent: number | null;
  net_fare: number | null;
  description?: string;
  category?: string;
  payment_type?: string;
  gas_expense: number;
  alcohol_expense: number;
  maintenance_expense: number;
  extra_expenses: ExtraExpense[];
};

export function computeNetFare(entry: {
  gross_amount: number | null;
  fee_percent: number | null;
  net_fare: number | null;
}): number {
  if (entry.net_fare !== null && entry.net_fare !== undefined) {
    return Number(entry.net_fare);
  }
  const gross = Number(entry.gross_amount ?? 0);
  const fee = Number(entry.fee_percent ?? 0);
  return gross * (1 - fee / 100);
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