import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Faça login para consultar sua contribuição." }, { status: 401 });
    }

    const { data, error } = await createAdminClient()
      .from("contributions")
      .select("id,amount,currency,status,provider_status,payer_email,next_payment_at,canceled_at,created_at")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ contribution: data });
  } catch (error) {
    console.error("Erro ao consultar contribuição:", error);
    return NextResponse.json({ error: "Não foi possível consultar sua contribuição." }, { status: 500 });
  }
}
