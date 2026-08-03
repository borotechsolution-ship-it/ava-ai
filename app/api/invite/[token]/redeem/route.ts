import { NextRequest, NextResponse } from "next/server";
import { getDemoCookie } from "@/lib/demo-cookie";
import { sha256 } from "@/lib/crypto";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { reconnectDemo, redeemInviteToken } from "@/lib/invites";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const params = await context.params;
  return NextResponse.redirect(new URL(`/invite/${params.token}`, request.url), 303);
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const params = await context.params;
  const ip = requestIp(request.headers);
  const allowed = rateLimit(`redeem:${ip}:${params.token}`, 5, 60_000);

  if (!allowed) {
    return NextResponse.redirect(new URL(`/invite/${params.token}?error=rate`, request.url), 303);
  }

  const session = await redeemInviteToken(params.token).catch((error) => {
    console.error("Rejected invite redemption", { reason: error?.message, ip });
    return null;
  });

  if (!session) {
    const existingSession = await reconnectDemo(await getDemoCookie()).catch(() => null);
    if (existingSession) {
      return NextResponse.redirect(new URL("/demo", request.url), 303);
    }

    const reason = await latestRedeemFailure(params.token).catch(() => "invalid");
    console.warn("Rejected token replay or invalid redemption", { ip });
    return NextResponse.redirect(new URL(`/invite/${params.token}?error=${reason}`, request.url), 303);
  }

  return NextResponse.redirect(new URL("/demo", request.url), 303);
}

async function latestRedeemFailure(token: string) {
  const { data } = await supabaseAdmin()
    .from("demo_security_events")
    .select("event_type")
    .eq("token_hash", sha256(token))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.event_type === "global_demo_limit_redeem") return "limit";
  if (data?.event_type === "active_session_limit_redeem") return "active";
  if (data?.event_type === "completed_invite_replay") return "used";
  if (data?.event_type === "invalid_invite_redeem") return "invalid";

  return "invalid";
}
