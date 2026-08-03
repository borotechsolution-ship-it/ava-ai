import { NextRequest, NextResponse } from "next/server";
import { getDemoCookie } from "@/lib/demo-cookie";
import { reconnectDemo } from "@/lib/invites";
import { rateLimit, requestIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const allowed = rateLimit(`reconnect:${requestIp(request.headers)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many reconnect attempts." }, { status: 429 });
  }

  const session = await reconnectDemo(await getDemoCookie()).catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Session unavailable." }, { status: 401 });
  }

  return NextResponse.json(session);
}
