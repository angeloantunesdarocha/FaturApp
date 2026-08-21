import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClientServer } from "@/lib/supabase";

const COOKIE_NAME = "faturapp_session";

export async function POST(request: NextRequest) {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const path = typeof body.path === "string" ? body.path.slice(0, 240) : null;
  const event = body.event === "access" ? "access" : "heartbeat";
  const { error } = await createClientServer().rpc(
    event === "access" ? "app_track_access" : "app_heartbeat",
    { p_token: token, p_path: path },
  );

  if (error) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
