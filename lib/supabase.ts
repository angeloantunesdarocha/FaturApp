import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

function isValidSupabaseKey(value: string) {
  const key = value.trim();
  // Supabase publishable keys use the sb_publishable_ prefix. Legacy anon
  // keys are JWTs and contain exactly three dot-separated segments.
  return key.startsWith("sb_publishable_") || (key.startsWith("eyJ") && key.split(".").length === 3);
}

// A variável pode existir na Vercel e ainda assim conter um valor antigo,
// truncado ou placeholder. Nesse caso, não a deixa quebrar todo o OAuth.
const supabaseKey = isValidSupabaseKey(configuredKey)
  ? configuredKey.trim()
  : "sb_publishable_xWKZMSatiw8X54ZqQm0LuQ_hiiLTD0k";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e uma chave pública Supabase válida são obrigatórias.");
}

export const configuredSupabaseUrl: string = supabaseUrl;
export const configuredSupabaseKey: string = supabaseKey;

export function createClientBrowser() {
  return createBrowserClient(configuredSupabaseUrl, configuredSupabaseKey, {
    auth: { flowType: "pkce" },
  });
}

export function createClientServer() {
  return createClient(configuredSupabaseUrl, configuredSupabaseKey);
}
