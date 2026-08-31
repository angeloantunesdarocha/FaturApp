import type { DayLaunchInput } from "./day-calculation.ts";

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

export const FATURAPP_TIME_ZONE = "America/Sao_Paulo";

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

export function formatDateTimeBrasilia(value: string | Date): { date: string; time: string } {
  const date = typeof value === "string" ? new Date(value) : value;
  return {
    date: new Intl.DateTimeFormat("pt-BR", { timeZone: FATURAPP_TIME_ZONE }).format(date),
    time: new Intl.DateTimeFormat("pt-BR", { timeZone: FATURAPP_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(date),
  };
}

export function startOfWeekBrasilia(dateISO = hojeBrasilia()): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekDay = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (weekDay === 0 ? -6 : 1 - weekDay));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function startOfMonthBrasilia(dateISO = hojeBrasilia()): string {
  return `${dateISO.slice(0, 7)}-01`;
}

export type ExtraExpense = { name: string; value: number };
export type MaintenanceItem = { description: string; value: number };

export type DailyEntry = {
  id: string;
  created_at?: string;
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
  fuel_price_per_liter_current?: number;
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
  isolated_fuel_expense?: number;
  launch_details?: DayLaunchInput[];
  reopen_history?: Array<{ at: string }>;
  fuel_remaining_liters?: number;
  fuel_remaining_value?: number;
};
