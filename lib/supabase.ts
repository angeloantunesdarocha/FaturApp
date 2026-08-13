import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_xWKZMSatiw8X54ZqQm0LuQ_hiiLTD0k";

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
