import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { mercadoPagoRequest } from "@/lib/mercadopago";

export async function DELETE() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Faça login para cancelar sua contribuição." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: contribution, error } = await admin
      .from("contributions")
      .select("id,provider_subscription_id")
      .eq("user_id", user.user_id)
      .in("status", ["pending", "active", "past_due", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!contribution?.provider_subscription_id) {
      return NextResponse.json({ error: "Nenhuma contribuição ativa foi encontrada." }, { status: 404 });
    }

    await mercadoPagoRequest("/preapproval/" + contribution.provider_subscription_id, {
      method: "PUT",
      body: JSON.stringify({ status: "cancelled" }),
    });

    await admin
      .from("contributions")
      .update({
        status: "canceled",
        provider_status: "cancelled",
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao cancelar contribuição:", error);
    return NextResponse.json({ error: "Não foi possível cancelar a contribuição." }, { status: 500 });
  }
}
