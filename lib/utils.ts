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
  gasoline_price_per_liter: number;
  alcohol_price_per_liter: number;
  gasoline_liters: number;
  alcohol_liters: number;
  km_initial: number;
  km_final: number;
  km_driven: number;
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
  const value = Math.max(0, Number(amount) || 0);
  const price = Math.max(0, Number(pricePerLiter) || 0);
  return price > 0 ? value / price : 0;
}

export function computeFuelCostPerKm(cost: number, km: number): number | null {
  const totalCost = Math.max(0, Number(cost) || 0);
  const distance = Math.max(0, Number(km) || 0);
  return distance > 0 ? totalCost / distance : null;
}

export function computeKmPerLiter(entry: Pick<DailyEntry, "km_driven" | "gasoline_liters" | "alcohol_liters">): number | null {
  const km = Math.max(0, Number(entry.km_driven) || 0);
  const liters = computeFuelLiters(entry);
  if (liters <= 0) return null;
  return km / liters;
}

export function computeDayProfit(entry: DailyEntry): number {
  const netFare = computeNetFare(entry);
  const extrasSum = (entry.extra_expenses || []).reduce((acc, e) => acc + toNumber(e.value), 0);
  const totalExpenses = Number(entry.gas_expense || 0) + Number(entry.alcohol_expense || 0) + Number(entry.maintenance_expense || 0) + extrasSum;
  return netFare - totalExpenses;
}
