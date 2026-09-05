import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClientServer } from "@/lib/supabase";

const ALLOWED_EVENTS = new Set(["report_pdf", "report_excel", "report_shared", "contribution_started", "contribution_active"]);

export async function POST(request: NextRequest) {
  const token = (await cookies()).get("faturapp_session")?.value;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!ALLOWED_EVENTS.has(body.event)) return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await createClientServer().rpc("app_track_event", {
    p_token: token,
    p_event_type: body.event,
    p_path: typeof body.path === "string" ? body.path.slice(0, 240) : null,
    p_metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : {},
  });

  if (error) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
