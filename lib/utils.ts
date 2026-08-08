export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const value = String(v).trim();
  if (!value) return 0;
  const normalized = /^\d{1,3}(\.\d{3})+$/.test(value) ? value.replace(/\./g, "") : value.replace(/,/g, ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
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
  gasoline_price_per_liter: number;
  alcohol_price_per_liter: number;
  gasoline_liters: number;
  alcohol_liters: number;
  km_initial: number;
  km_final: number;
  km_driven: number;
  hours_worked: number;
  maintenance_expense: number;
  maintenance_details?: MaintenanceItem[];
  extra_expenses: ExtraExpense[];
};

export function computeFeeAmount(entry: { gross_amount: number | null; fee_percent: number | null }): number {
  if (entry.gross_amount === null || entry.gross_amount === undefined) return 0;
  const gross = Number(entry.gross_amount) || 0;
  const fee = Number(entry.fee_percent ?? 0) || 0;
  return gross * (fee / 100);
}

export function computeNetFare(entry: { gross_amount: number | null; fee_percent: number | null; net_fare: number | null }): number {
  if (entry.gross_amount !== null && entry.gross_amount !== undefined) {
    const gross = Number(entry.gross_amount) || 0;
    const fee = Number(entry.fee_percent ?? 0) || 0;
    return gross * (1 - fee / 100);
  }
  return Number(entry.net_fare ?? 0) || 0;
}

export function computeFuelCost(entry: Pick<DailyEntry, "gas_expense" | "alcohol_expense">): number {
  return Math.max(0, Number(entry.gas_expense) || 0) + Math.max(0, Number(entry.alcohol_expense) || 0);
}

export function computeFuelLiters(entry: Pick<DailyEntry, "gasoline_liters" | "alcohol_liters">): number {
  return Math.max(0, Number(entry.gasoline_liters) || 0) + Math.max(0, Number(entry.alcohol_liters) || 0);
}

export function computeLitersFromPurchase(amount: number, pricePerLiter: number): number {
  if (amount <= 0 || pricePerLiter <= 0) return 0;
  return amount / pricePerLiter;
}

export function computeFuelCostPerKm(expense: number, km: number): number | null {
  return km > 0 ? expense / km : null;
}

export function computeDayProfit(entry: Pick<DailyEntry, "gross_amount" | "fee_percent" | "net_fare" | "gas_expense" | "alcohol_expense" | "maintenance_expense" | "maintenance_details" | "extra_expenses">): number {
  const net = computeNetFare(entry);
  const maintenance = (entry.maintenance_details || []).reduce((sum, item) => sum + toNumber(item.value), 0) || Number(entry.maintenance_expense || 0);
  const extras = (entry.extra_expenses || []).reduce((sum, item) => sum + toNumber(item.value), 0);
  return net - Math.max(0, Number(entry.gas_expense) || 0) - Math.max(0, Number(entry.alcohol_expense) || 0) - maintenance - extras;
}
