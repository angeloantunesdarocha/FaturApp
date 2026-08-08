"use server";

import { cookies } from "next/headers";
import { createClientServer } from "@/lib/supabase";
import { clearSessionCookie, requireUser, setSessionCookie } from "@/lib/auth";
import { type ExtraExpense, type MaintenanceItem } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SaveEntryInput = {
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
  maintenance_details: MaintenanceItem[];
  extra_expenses: ExtraExpense[];
};

function sessionToken() { return cookies().get("faturapp_session")?.value ?? null; }
function validatePassword(password: string) { return password.length >= 4 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password); }
function validateEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()); }

export async function loginUser(login: string, password: string) {
  if (!login.trim() || !password) return { success: false, error: "Informe login e senha." };
  const supabase = createClientServer();
  const { data, error } = await supabase.rpc("app_login", { p_login: login, p_password: password });
  if (error) { console.error("Erro Supabase login:", error); return { success: false, error: "Erro ao validar acesso. Tente novamente." }; }
  if (!data?.[0]) return { success: false, error: "Login ou senha incorretos." };
  setSessionCookie(data[0].session_token);
  return { success: true };
}

export async function registerUser(login: string, password: string, email: string) {
  const normalized = login.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalized) return { success: false, error: "Informe um login." };
  if (normalized.length > 120) return { success: false, error: "O login deve ter no máximo 120 caracteres." };
  if (!validateEmail(normalizedEmail)) return { success: false, error: "Informe um e-mail válido para recuperação." };
  if (!validatePassword(password)) return { success: false, error: "A senha deve ter no mínimo 4 caracteres, uma letra maiúscula, um número e um caractere especial." };
  const supabase = createClientServer();
  const { data, error } = await supabase.rpc("app_register_with_email", { p_login: normalized, p_password: password, p_email: normalizedEmail });
  if (error || !data?.[0]) return { success: false, error: error?.message || "Não foi possível cadastrar." };
  setSessionCookie(data[0].session_token);
  revalidatePath("/"); revalidatePath("/relatorios");
  return { success: true, role: data[0].role };
}

export async function saveRecoveryEmail(email: string) {
  const user = await requireUser();
  const normalizedEmail = email.trim().toLowerCase();
  if (!validateEmail(normalizedEmail)) return { success: false, error: "Informe um e-mail válido." };
  const token = sessionToken();
  if (!token) return { success: false, error: "Sessão inválida." };
  const { error } = await createClientServer().rpc("app_update_recovery_email", { p_token: token, p_email: normalizedEmail });
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true, email: normalizedEmail, login: user.login };
}

export async function logoutUser() {
  const token = sessionToken();
  if (token) await createClientServer().rpc("app_logout", { p_token: token });
  clearSessionCookie();
  redirect("/login");
}

export async function saveEntry(input: SaveEntryInput) {
  await requireUser();
  const token = sessionToken();
  if (!token) return { success: false, error: "Sessão inválida." };

  const kmInitial = Math.max(0, Number(input.km_initial) || 0);
  const kmFinal = Math.max(0, Number(input.km_final) || 0);
  if (kmFinal < kmInitial) return { success: false, error: "O km final não pode ser menor que o km inicial." };

  const hoursWorked = Math.max(0, Number(input.hours_worked) || 0);
  const gasCost = Math.max(0, Number(input.gas_expense) || 0);
  const alcoholCost = Math.max(0, Number(input.alcohol_expense) || 0);
  const gasPrice = Math.max(0, Number(input.gasoline_price_per_liter) || 0);
  const alcoholPrice = Math.max(0, Number(input.alcohol_price_per_liter) || 0);
  if (gasCost > 0 && gasPrice <= 0) return { success: false, error: "Informe o preço por litro da gasolina." };
  if (alcoholCost > 0 && alcoholPrice <= 0) return { success: false, error: "Informe o preço por litro do álcool." };

  const maintenanceDetails = (input.maintenance_details ?? []).filter((item) => item.description.trim() !== "").map((item) => ({ description: item.description.trim(), value: Number(item.value) || 0 }));
  const kmDriven = kmFinal - kmInitial;
  const gasolineLiters = gasPrice > 0 ? gasCost / gasPrice : 0;
  const alcoholLiters = alcoholPrice > 0 ? alcoholCost / alcoholPrice : 0;
  const row = {
    date: input.date,
    gross_amount: input.gross_amount,
    fee_percent: input.fee_percent,
    net_fare: input.net_fare,
    gas_expense: gasCost,
    alcohol_expense: alcoholCost,
    gasoline_price_per_liter: gasPrice,
    alcohol_price_per_liter: alcoholPrice,
    gasoline_liters: gasolineLiters,
    alcohol_liters: alcoholLiters,
    km_initial: kmInitial,
    km_final: kmFinal,
    km_driven: kmDriven,
    hours_worked: hoursWorked,
    maintenance_expense: maintenanceDetails.reduce((sum, item) => sum + item.value, 0),
    maintenance_details: maintenanceDetails,
    extra_expenses: input.extra_expenses ?? [],
  };

  const supabase = createClientServer();
  const { error } = await supabase.rpc("app_save_entry", { p_token: token, p_entry: row });
  if (error) return { success: false, error: error.message };
  const monthProfit = await getMonthProfit(input.date);
  revalidatePath("/"); revalidatePath("/relatorios");
  return { success: true, monthProfit };
}

export async function getMonthProfit(dateISO: string): Promise<number> {
  await requireUser();
  const token = sessionToken();
  if (!token) return 0;
  const [y, m] = dateISO.split("-");
  const from = `${y}-${m}-01`;
  const last = new Date(Number(y), Number(m), 0).getDate();
  const to = `${y}-${m}-${String(last).padStart(2, "0")}`;
  const { data, error } = await createClientServer().rpc("app_get_month_profit", { p_token: token, p_from: from, p_to: to });
  if (error || data == null) return 0;
  return Number(data) || 0;
}

export async function getEntriesInRange(from: string, to: string) {
  await requireUser();
  const token = sessionToken();
  if (!token) return [];
  const { data, error } = await createClientServer().rpc("app_get_entries", { p_token: token, p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}
