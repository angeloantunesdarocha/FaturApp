import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClientServer } from "@/lib/supabase";

const COOKIE_NAME = "faturapp_session";

export type AppUser = {
  user_id: string;
  login: string;
  role: "admin" | "user";
};

export async function getCurrentUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const supabase = createClientServer();
  const { data, error } = await supabase.rpc("app_get_session", {
    p_token: token,
  });

  if (error || !data?.[0]) return null;
  return data[0] as AppUser;
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
