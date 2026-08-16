import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { mercadoPagoRequest } from "@/lib/mercadopago";
import crypto from "node:crypto";

type MercadoPagoSubscription = {
  id?: string;
  status?: string;
  init_point?: string;
  sandbox_init_point?: string;
  auto_recurring?: { transaction_amount?: number };
};

function normalizeAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  const rounded = Math.round(amount * 100) / 100;
  return rounded >= 3 && rounded <= 500 ? rounded : null;
}

function validEmail(value: unknown): value is string {
  return typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Faça login para iniciar uma contribuição." }, { status: 401 });
    }

    const body = await request.json();
    const amount = normalizeAmount(body?.amount);
    const payerEmail = validEmail(body?.payerEmail) ? body.payerEmail.trim().toLowerCase() : null;

    if (!amount) {
      return NextResponse.json({ error: "Escolha um valor mensal entre R$ 3 e R$ 500." }, { status: 400 });
    }
    if (!payerEmail) {
      return NextResponse.json({ error: "Informe um e-mail válido para o pagamento." }, { status: 400 });
    }

    const externalReference = "faturapp:" + user.user_id + ":" + crypto.randomUUID();
    const admin = createAdminClient();
    const { data: contribution, error: insertError } = await admin
      .from("contributions")
      .insert({
        user_id: user.user_id,
        external_reference: externalReference,
        payer_email: payerEmail,
        amount,
        currency: "BRL",
        provider: "mercadopago",
        status: "pending",
        provider_status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !contribution) throw insertError || new Error("Não foi possível iniciar a contribuição.");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fatur-app.vercel.app";
    let subscription: MercadoPagoSubscription;

    try {
      subscription = await mercadoPagoRequest<MercadoPagoSubscription>("/preapproval", {
        method: "POST",
        headers: { "X-Idempotency-Key": contribution.id },
        body: JSON.stringify({
          reason: "Contribuição mensal para manter o FaturApp",
          external_reference: externalReference,
          payer_email: payerEmail,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: amount,
            currency_id: "BRL",
          },
          notification_url: appUrl + "/api/contributions/webhook",
          back_url: appUrl + "/apoie?status=retorno",
          status: "pending",
        }),
      });
    } catch (error) {
      await admin.from("contributions").delete().eq("id", contribution.id);
      throw error;
    }

    const checkoutUrl = subscription.init_point || subscription.sandbox_init_point;
    if (!subscription.id || !checkoutUrl) {
      await admin.from("contributions").delete().eq("id", contribution.id);
      throw new Error("O Mercado Pago não retornou um link de checkout.");
    }

    await admin
      .from("contributions")
      .update({
        provider_subscription_id: subscription.id,
        provider_status: subscription.status || "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("Erro ao criar contribuição:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("MERCADOPAGO_ACCESS_TOKEN")) {
      return NextResponse.json({ error: "O pagamento ainda não está configurado no ambiente." }, { status: 503 });
    }
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json({ error: "O armazenamento seguro do pagamento ainda não está configurado." }, { status: 503 });
    }
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento. Tente novamente." }, { status: 500 });
  }
}
