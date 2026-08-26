import { calculateFuelLiters, calculatePerUnit } from "@/lib/calculations";

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

const FATURAPP_TIME_ZONE = "America/Sao_Paulo";

/**
 * Retorna a data atual no fuso oficial do FaturApp.
 * O formato ISO é mantido para uso seguro em inputs date e filtros.
 */
export function hojeBrasilia(): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FATURAPP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Compatibilidade com chamadas existentes; use hojeBrasilia() em código novo. */
export function todayISO(): string {
  return hojeBrasilia();
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
    app: "Uber" | "99" | "inDrive" | "Outro";
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
  manutencao_itens?: MaintenanceItem[];
  extra_expenses: ExtraExpense[];
  extras_itens?: ExtraExpense[];
  fuel_consumption_km_per_liter?: number;
  fuel_consumed_liters?: number;
  fuel_consumed_cost?: number;
};

export function computeFeeAmount(entry: { gross_amount: number | null; fee_percent: number | null }): number {
  if (entry.gross_amount === null || entry.gross_amount === undefined) return 0;
  const gross = Number(entry.gross_amount) || 0;
  const fee = Number(entry.fee_percent ?? 0) || 0;
  return gross * (fee / 100);
}

export function computeNetFare(entry: {
  gross_amount: number | null;
  fee_percent: number | null;
  net_fare: number | null;
  revenue_details?: Array<{ liquido?: number | null }>;
}): number {
  const details = entry.revenue_details || [];
  if (details.length) {
    return details.reduce((sum, item) => sum + Math.max(0, Number(item.liquido) || 0), 0);
  }
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
  return calculateFuelLiters(amount, pricePerLiter);
}

export function computeFuelCostPerKm(expense: number, km: number): number | null {
  return calculatePerUnit(expense, km);
}

export function computeFuelCostForProfit(entry: Pick<DailyEntry, "gas_expense" | "alcohol_expense"> & Partial<Pick<DailyEntry, "fuel_consumed_cost" | "fuel_consumption_km_per_liter">>): number {
  // O lucro líquido segue a regra financeira do app: combustível comprado
  // no dia é despesa. O custo exato do combustível consumido para a distância
  // continua disponível em fuel_consumed_cost como uma métrica operacional.
  return computeFuelCost(entry);
}

export function computeDayProfit(entry: Pick<DailyEntry, "gross_amount" | "fee_percent" | "net_fare" | "gas_expense" | "alcohol_expense" | "maintenance_expense" | "maintenance_details" | "extra_expenses"> & Partial<Pick<DailyEntry, "revenue_details" | "fuel_consumed_cost" | "fuel_consumption_km_per_liter" | "manutencao_itens" | "extras_itens">>): number {
  const net = computeNetFare(entry);
  const maintenanceItems = entry.maintenance_details?.length ? entry.maintenance_details : (entry.manutencao_itens || []);
  const extraItems = entry.extra_expenses?.length ? entry.extra_expenses : (entry.extras_itens || []);
  const maintenance = maintenanceItems.reduce((sum, item) => sum + toNumber(item.value), 0) || Number(entry.maintenance_expense || 0);
  const extras = extraItems.reduce((sum, item) => sum + toNumber(item.value), 0);
  return net - computeFuelCostForProfit(entry) - maintenance - extras;
}
