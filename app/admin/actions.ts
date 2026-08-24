"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClientServer } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { hojeBrasilia } from "@/lib/utils";

function sessionToken() {
  return cookies().get("faturapp_session")?.value ?? null;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");
  const token = sessionToken();
  if (!token) redirect("/login");
  return token;
}

export async function getAdminDashboard(from?: string, to?: string) {
  const token = await requireAdmin();
  const today = hojeBrasilia();
  const { data, error } = await createClientServer().rpc("app_admin_dashboard", {
    p_token: token,
    p_from: from || today,
    p_to: to || today,
  });
  if (error) throw new Error("Não foi possível carregar o painel administrativo.");
  return data;
}

export async function createAdminUser(input: { login: string; password: string; email?: string }) {
  const token = await requireAdmin();
  const { error } = await createClientServer().rpc("app_admin_create_user", {
    p_token: token,
    p_login: input.login,
    p_password: input.password,
    p_email: input.email || null,
  });
  if (error) return { ok: false, error: "Não foi possível criar o usuário. Verifique os dados e tente novamente." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteAdminUser(userId: string) {
  const token = await requireAdmin();
  const { error } = await createClientServer().rpc("app_admin_delete_user", {
    p_token: token,
    p_target_user_id: userId,
  });
  if (error) return { ok: false, error: "Não foi possível excluir este usuário." };
  revalidatePath("/admin");
  return { ok: true };
}
