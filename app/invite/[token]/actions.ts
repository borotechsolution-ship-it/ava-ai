"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDemoCookie } from "@/lib/demo-cookie";
import { sha256 } from "@/lib/crypto";
import { reconnectDemo, redeemInviteToken } from "@/lib/invites";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";

export async function startInviteCallAction(token: string) {
  const requestHeaders = await headers();
  const ip = requestIp(requestHeaders);
  const allowed = rateLimit(`redeem:${ip}:${token}`, 5, 60_000);

  if (!allowed) {
    redirect(`/invite/${encodeURIComponent(token)}?error=rate`);
  }

  const session = await redeemInviteToken(token).catch((error) => {
    console.error("Rejected invite redemption", { reason: error?.message, ip });
    return null;
  });

  if (session) {
    redirect("/demo");
  }

  const existingSession = await reconnectDemo(await getDemoCookie()).catch(() => null);
  if (existingSession) {
    redirect("/demo");
  }

  const reason = await latestRedeemFailure(token).catch(() => "invalid");
  console.warn("Rejected token replay or invalid redemption", { ip });
  redirect(`/invite/${encodeURIComponent(token)}?error=${reason}`);
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
