const MERCADO_PAGO_API = "https://api.mercadopago.com";

export function requireMercadoPagoToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return token;
}

export async function mercadoPagoRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = requireMercadoPagoToken();
  const response = await fetch(MERCADO_PAGO_API + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const body = await response.text();
  let payload: unknown = null;
  try {
    payload = body ? JSON.parse(body) : null;
  } catch {
    payload = body;
  }

  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload
      ? String((payload as { message?: unknown }).message)
      : "Mercado Pago recusou a solicitação.";
    throw new Error(message);
  }

  return payload as T;
}