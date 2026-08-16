import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import { mercadoPagoRequest } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

type Subscription = {
  id?: string;
  status?: string;
  auto_recurring?: { transaction_amount?: number; next_payment_date?: string };
};

function parseSignature(value: string) {
  const parts = value.split(",").map((part) => part.trim());
  return {
    ts: parts.find((part) => part.startsWith("ts="))?.slice(3) || "",
    v1: parts.find((part) => part.startsWith("v1="))?.slice(3) || "",
  };
}

function signatureIsValid(request: Request, dataId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id") || "";
  if (!secret || !signature) return false;

  const { ts, v1 } = parseSignature(signature);
  if (!ts || !v1) return false;

  const manifest = "id:" + dataId + ";request-id:" + requestId + ";ts:" + ts + ";";
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(v1);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function mapStatus(status: string | undefined) {
  switch (status) {
    case "authorized":
      return "active";
    case "paused":
      return "paused";
    case "cancelled":
    case "canceled":
      return "canceled";
    case "rejected":
      return "failed";
    default:
      return "pending";
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const dataId = url.searchParams.get("data.id") || body?.data?.id || body?.id;

  if (!dataId || !signatureIsValid(request, String(dataId))) {
    return NextResponse.json({ error: "Notificação inválida." }, { status: 401 });
  }

  try {
    const subscription = await mercadoPagoRequest<Subscription>("/preapproval/" + encodeURIComponent(String(dataId)));
    const admin = createAdminClient();
    const { error } = await admin
      .from("contributions")
      .update({
        provider_status: subscription.status || "unknown",
        status: mapStatus(subscription.status),
        amount: subscription.auto_recurring?.transaction_amount,
        next_payment_at: subscription.auto_recurring?.next_payment_date || null,
        canceled_at: mapStatus(subscription.status) === "canceled" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("provider_subscription_id", String(dataId));

    if (error) throw error;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro no webhook de contribuição:", error);
    return NextResponse.json({ error: "Não foi possível sincronizar a assinatura." }, { status: 500 });
  }
}