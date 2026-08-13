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
  revenue_details?: Array<{
    id: string;
    app: "Uber" | "99" | "inDrive" | "Indefinido" | "Outro";
    nomeAppPersonalizado: string;
    bruto: number;
    taxa: number;
    taxaValor: number;
    liquido: number;
  }>;
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
  fuel_consumption_km_per_liter?: number;
  fuel_consumed_liters?: number;
  fuel_consumed_cost?: number;
  fuel_remaining_liters?: number;
  fuel_remaining_value?: number;
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

/** Receita multi-app é a fonte de verdade quando revenue_details existe. */
export function computeRevenueTotals(entry: Pick<DailyEntry, "gross_amount" | "fee_percent" | "net_fare" | "revenue_details">) {
  const details = entry.revenue_details || [];
  if (details.length > 0) {
    return details.reduce((acc, item) => {
      const bruto = Math.max(0, Number(item.bruto) || 0);
      const taxa = Math.max(0, Number(item.taxa) || 0);
      const rawFee = Number(item.taxaValor);
      const taxaValor = Number.isFinite(rawFee) ? Math.max(0, rawFee) : Math.round(bruto * (taxa / 100) * 100) / 100;
      const rawNet = Number(item.liquido);
      const liquido = Number.isFinite(rawNet) ? Math.max(0, rawNet) : Math.max(0, Math.round((bruto - taxaValor) * 100) / 100);
      return { gross: acc.gross + bruto, fee: acc.fee + taxaValor, net: acc.net + liquido };
    }, { gross: 0, fee: 0, net: 0 });
  }
  return { gross: Math.max(0, Number(entry.gross_amount) || 0), fee: Math.max(0, computeFeeAmount(entry)), net: Math.max(0, computeNetFare(entry)) };
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

export function computeDayProfit(entry: Pick<DailyEntry, "gross_amount" | "fee_percent" | "net_fare" | "revenue_details" | "gas_expense" | "alcohol_expense" | "maintenance_expense" | "maintenance_details" | "extra_expenses">): number {
  const { net } = computeRevenueTotals(entry);
  const maintenanceDetails = (entry.maintenance_details || []).reduce((sum, item) => sum + toNumber(item.value), 0);
  const maintenance = maintenanceDetails > 0 ? maintenanceDetails : Math.max(0, Number(entry.maintenance_expense) || 0);
  const extras = (entry.extra_expenses || []).reduce((sum, item) => sum + toNumber(item.value), 0);
  const fuel = Math.max(0, Number(entry.gas_expense) || 0) + Math.max(0, Number(entry.alcohol_expense) || 0);
  return net - fuel - maintenance - extras;
}
