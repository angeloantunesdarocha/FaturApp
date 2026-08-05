"use server";

import { createClientServer } from "@/lib/supabase";
import { computeDayProfit, type ExtraExpense } from "@/lib/utils";
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
  extra_expenses: ExtraExpense[];
};

export async function saveEntry(input: SaveEntryInput) {
  const supabase = createClientServer();

  // Monta row a ser inserida
  const row = {
    user_id: DEFAULT_USER_ID,
    date: input.date,
    gross_amount: input.gross_amount,
    fee_percent: input.fee_percent,
    net_fare: input.net_fare,
    gas_expense: input.gas_expense ?? 0,
    alcohol_expense: input.alcohol_expense ?? 0,
    maintenance_expense: input.maintenance_expense ?? 0,
    extra_expenses: input.extra_expenses ?? [],
  };

  // UPSERT por (user_id, date) — atualiza se já existir lançamento naquele dia
  const { error } = await supabase
    .from("daily_entries")
    .upsert(row, { onConflict: "user_id,date" });

  if (error) {
    return { success: false, error: error.message };
  }

  // Calcula lucro total do mês da data salva
  const monthProfit = await getMonthProfit(input.date);
  revalidatePath("/");
  return { success: true, monthProfit };
}

// Retorna lucro total do mês ao qual a data pertence
export async function getMonthProfit(dateISO: string): Promise<number> {
  const supabase = createClientServer();
  const [y, m] = dateISO.split("-");
  const from = `${y}-${m}-01`;
  // último dia do mês
  const last = new Date(Number(y), Number(m), 0).getDate();
  const to = `${y}-${m}-${String(last).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("user_id", DEFAULT_USER_ID)
    .gte("date", from)
    .lte("date", to);

  if (error || !data) return 0;

  return data.reduce((acc, entry) => {
    return acc + computeDayProfit(entry as any);
  }, 0);
}

// Busca registros em intervalo de datas
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