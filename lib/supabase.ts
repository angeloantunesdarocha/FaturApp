import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e uma chave pública Supabase válida são obrigatórias.");
}

export function createClientBrowser() {
  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: { flowType: "pkce" },
  });
}

export function createClientServer() {
  return createClient(supabaseUrl, supabaseKey);
}
