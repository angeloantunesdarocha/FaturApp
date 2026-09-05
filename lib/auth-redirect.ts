/** Redirects are limited to this deployment or explicitly configured origins. */
export function trustedAppOrigin(requestUrl?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || "https://fatur-app.vercel.app";
  const allowed = new Set([new URL(configured).origin, "https://fatur-app.vercel.app"]);
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    if (host) allowed.add(new URL(`https://${host}`).origin);
  }
  if (requestUrl) {
    const url = new URL(requestUrl);
    if (allowed.has(url.origin)) return url.origin;
    if (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname)) return url.origin;
  }
  return new URL(configured).origin;
}

export function safeAuthPath(value: string, origin: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\\\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    const target = new URL(value, origin);
    return target.origin === origin ? target.pathname + target.search + target.hash : "/";
  } catch { return "/"; }
}
