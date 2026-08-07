"use server";

import { createClientServer } from "@/lib/supabase";
import { computeDayProfit, type ExtraExpense, type MaintenanceItem } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const DEFAULT_USER_ID = "default";

export type SaveEntryInput = {
  date: string;
  gross_amount: number | null;
  fee_percent: number | null;
  net_fare: number | null;
  gas_expense: number;
  alcohol_expense: number;
  maintenance_expense: number;
  maintenance_details: MaintenanceItem[];
  extra_expenses: ExtraExpense[];
};

export async function saveEntry(input: SaveEntryInput) {
  const supabase = createClientServer();

  const maintenanceDetails = (input.maintenance_details ?? [])
    .filter((item) => item.description.trim() !== "")
    .map((item) => ({
      description: item.description.trim(),
      value: Number(item.value) || 0,
    }));

  const row = {
    user_id: DEFAULT_USER_ID,
    date: input.date,
    gross_amount: input.gross_amount,
    fee_percent: input.fee_percent,
    net_fare: input.net_fare,
    gas_expense: input.gas_expense ?? 0,
    alcohol_expense: input.alcohol_expense ?? 0,
    maintenance_expense: maintenanceDetails.reduce((sum, item) => sum + item.value, 0),
    maintenance_details: maintenanceDetails,
    extra_expenses: input.extra_expenses ?? [],
  };

  const { error } = await supabase
    .from("daily_entries")
    .upsert(row, { onConflict: "user_id,date" });

  if (error) {
    return { success: false, error: error.message };
  }

  const monthProfit = await getMonthProfit(input.date);
  revalidatePath("/");
  revalidatePath("/relatorios");
  return { success: true, monthProfit };
}

export async function getMonthProfit(dateISO: string): Promise<number> {
  const supabase = createClientServer();
  const [y, m] = dateISO.split("-");
  const from = `${y}-${m}-01`;
  const last = new Date(Number(y), Number(m), 0).getDate();
  const to = `${y}-${m}-${String(last).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("user_id", DEFAULT_USER_ID)
    .gte("date", from)
    .lte("date", to);

  if (error || !data) return 0;

  return data.reduce((acc, entry) => acc + computeDayProfit(entry as any), 0);
}

export async function getEntriesInRange(from: string, to: string) {
  const supabase = createClientServer();
  const { data, error } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("user_id", DEFAULT_USER_ID)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}