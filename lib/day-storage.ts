import { createRevenueItem, type RevenueAppName, type RevenueItem } from "./revenue.ts";
import type { DayLaunchInput, DayFuelPurchase } from "./day-calculation.ts";

type StoredSegment = { start?: string; end?: string };
type StoredDraft = {
  date?: string;
  mode?: "withFee" | "net" | null;
  netFare?: number;
  netApp?: RevenueAppName | "";
  netCustomApp?: string;
  revenueItems?: RevenueItem[];
  netRevenueItems?: RevenueItem[];
  gas?: number;
  alcohol?: number;
  gasPrice?: number;
  alcoholPrice?: number;
  fuelPurchases?: DayFuelPurchase[];
  fuelType?: "gasoline" | "ethanol";
  fullTank?: boolean;
  kmInitial?: number;
  kmFinal?: number;
  fuelConsumption?: number;
  hoursSegments?: StoredSegment[];
  maintenanceItems?: Array<{ description?: string; value?: number }>;
  extras?: Array<{ name?: string; value?: number }>;
};

type StoredRecord = { id?: string; number?: number; date?: string; createdAt?: string; draft?: StoredDraft };

const value = (raw: unknown) => {
  const parsed = Number(raw ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export function scopedStorageKey(userId: string, key: string) {
  return `faturapp:user:${userId}:${key}`;
}

function hoursFromSegments(segments: StoredSegment[] = []) {
  return segments.reduce((total, segment) => {
    if (!segment.start || !segment.end) return total;
    const [startHour, startMinute] = segment.start.split(":").map(Number);
    const [endHour, endMinute] = segment.end.split(":").map(Number);
    let minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    if (minutes < 0) minutes += 1440;
    return total + minutes / 60;
  }, 0);
}

export function dayLaunchFromStoredRecord(rawRecord: StoredRecord, fallbackDate: string): DayLaunchInput | null {
  const draft = rawRecord?.draft;
  if (!draft) return null;
  const revenueItems = (draft.revenueItems ?? []).filter((item) => value(item.bruto) > 0);
  const netItems = (draft.netRevenueItems ?? []).filter((item) => value(item.bruto) > 0);
  if (draft.mode === "net" && value(draft.netFare) > 0) {
    netItems.push({
      ...createRevenueItem(),
      id: `${rawRecord.id || "local"}-net`,
      app: draft.netApp ?? "",
      nomeAppPersonalizado: draft.netApp === "Outro" ? String(draft.netCustomApp || "") : "",
      bruto: value(draft.netFare),
      taxa: 0,
    });
  }
  const fuelPurchases: DayFuelPurchase[] = [
    ...(value(draft.gas) > 0 ? [{ id: `${rawRecord.id || "local"}-gas`, type: "gasoline" as const, amount: value(draft.gas), pricePerLiter: value(draft.gasPrice), createdAt: rawRecord.createdAt }] : []),
    ...(value(draft.alcohol) > 0 ? [{ id: `${rawRecord.id || "local"}-alcohol`, type: "alcohol" as const, amount: value(draft.alcohol), pricePerLiter: value(draft.alcoholPrice), createdAt: rawRecord.createdAt }] : []),
    ...(draft.fuelPurchases ?? []).map((item) => ({ ...item, createdAt: item.createdAt || rawRecord.createdAt })),
  ];
  return {
    id: rawRecord.id,
    number: rawRecord.number,
    date: draft.date || rawRecord.date || fallbackDate,
    createdAt: rawRecord.createdAt,
    revenueItems: [...revenueItems, ...netItems],
    hoursWorked: hoursFromSegments(draft.hoursSegments),
    kmInitial: value(draft.kmInitial),
    kmFinal: value(draft.kmFinal),
    fuelPurchases,
    fuelType: draft.fuelType ?? "gasoline",
    fullTank: Boolean(draft.fullTank),
    consumptionKmL: value(draft.fuelConsumption),
    maintenanceItems: (draft.maintenanceItems ?? []).map((item) => ({ description: String(item.description || ""), value: value(item.value) })),
    extraItems: (draft.extras ?? []).map((item) => ({ name: String(item.name || ""), value: value(item.value) })),
  };
}

export function loadLocalDayLaunches(userId: string, date: string): DayLaunchInput[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(scopedStorageKey(userId, `lancamentos-dia:${date}`));
    if (!raw) return [];
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) return [];
    return records.map((record) => dayLaunchFromStoredRecord(record, date)).filter((launch): launch is DayLaunchInput => Boolean(launch));
  } catch {
    return [];
  }
}
