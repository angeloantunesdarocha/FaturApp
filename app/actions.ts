"use server";

import { createClientServer } from "@/lib/supabase";
import { clearSessionCookie, requireUser, setSessionCookie } from "@/lib/auth";
import { computeDayProfit, type ExtraExpense, type MaintenanceItem } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

function validatePassword(password: string) {
  return password.length >= 4 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export async function loginUser(login: string, password: string) {
  if (!login.trim() || !password) return { success: false, error: "Informe login e senha." };
  const supabase = createClientServer();
  const { data, error } = await supabase.rpc("app_login", { p_login: login, p_password: password });
  if (error || !data?.[0]) return { success: false, error: "Login ou senha incorretos." };
  setSessionCookie(data[0].session_token);
  return { success: true };
}

export async function registerUser(login: string, password: string) {
  const normalized = login.trim();
  if (!normalized) return { success: false, error: "Informe um login." };
  if (normalized.length > 120) return { success: false, error: "O login deve ter no máximo 120 caracteres." };
  if (!validatePassword(password)) {
    return { success: false, error: "A senha deve ter no mínimo 4 caracteres, uma letra maiúscula, um número e um caractere especial." };
  }

  const supabase = createClientServer();
  const { data, error } = await supabase.rpc("app_register", { p_login: normalized, p_password: password });
  if (error || !data?.[0]) return { success: false, error: error?.message || "Não foi possível cadastrar." };
  setSessionCookie(data[0].session_token);
  revalidatePath("/");
  revalidatePath("/relatorios");
  return { success: true, role: data[0].role };
}

export async function logoutUser() {
  const { cookies } = await import("next/headers");
  const token = cookies().get("faturapp_session")?.value;
  if (token) {
    const supabase = createClientServer();
    await supabase.rpc("app_logout", { p_token: token });
  }
  clearSessionCookie();
  redirect("/login");
}

export async function saveEntry(input: SaveEntryInput) {
  const user = await requireUser();
  const supabase = createClientServer();

  const maintenanceDetails = (input.maintenance_details ?? [])
    .filter((item) => item.description.trim() !== "")
    .map((item) => ({ description: item.description.trim(), value: Number(item.value) || 0 }));

  const row = {
    user_id: user.user_id,
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

  const { error } = await supabase.from("daily_entries").insert(row);
  if (error) return { success: false, error: error.message };

  const monthProfit = await getMonthProfit(input.date);
  revalidatePath("/");
  revalidatePath("/relatorios");
  return { success: true, monthProfit };
}

export async function getMonthProfit(dateISO: string): Promise<number> {
  const user = await requireUser();
  const supabase = createClientServer();
  const [y, m] = dateISO.split("-");
  const from = `${y}-${m}-01`;
  const last = new Date(Number(y), Number(m), 0).getDate();
  const to = `${y}-${m}-${String(last).padStart(2, "0")}`;

  const { data, error } = await supabase.from("daily_entries").select("*").eq("user_id", user.user_id).gte("date", from).lte("date", to);
  if (error || !data) return 0;
  return data.reduce((acc, entry) => acc + computeDayProfit(entry as any), 0);
}

export async function getEntriesInRange(from: string, to: string) {
  const user = await requireUser();
  const supabase = createClientServer();
  const { data, error } = await supabase.from("daily_entries").select("*").eq("user_id", user.user_id).gte("date", from).lte("date", to).order("date", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}
