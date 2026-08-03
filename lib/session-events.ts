import { getDemoCookie } from "@/lib/demo-cookie";
import { sha256 } from "@/lib/crypto";
import { config } from "@/lib/config";
import { endLiveKitRoom } from "@/lib/livekit";
import { supabaseAdmin } from "@/lib/supabase";

export async function sessionIdFromCookie() {
  const cookie = await getDemoCookie();
  if (!cookie) return null;

  const { data, error } = await supabaseAdmin()
    .from("demo_session_auth")
    .select("session_id,expires_at")
    .eq("cookie_hash", sha256(cookie))
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) return null;
  return data.session_id as string;
}

export async function markMeaningfulInteraction() {
  const sessionId = await sessionIdFromCookie();
  if (!sessionId) return false;

  const { error } = await supabaseAdmin()
    .from("demo_sessions")
    .update({ meaningful_interaction_started: true })
    .eq("id", sessionId)
    .in("status", ["created", "started"]);

  return !error;
}

export async function startSessionClock() {
  const sessionId = await sessionIdFromCookie();
  if (!sessionId) return null;

  const expiresAt = new Date(Date.now() + config.demoSessionSeconds * 1000).toISOString();
  const authExpiresAt = new Date(Date.now() + Math.max(config.demoSessionSeconds, config.reconnectGraceSeconds) * 1000).toISOString();

  const { data, error } = await supabaseAdmin()
    .from("demo_sessions")
    .update({
      status: "started",
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
      meaningful_interaction_started: true
    })
    .eq("id", sessionId)
    .in("status", ["created", "started"])
    .select("expires_at")
    .single();

  if (error || !data) return null;

  await supabaseAdmin().from("demo_session_auth").update({ expires_at: authExpiresAt }).eq("session_id", sessionId);

  return data.expires_at as string;
}

export async function completeSession(status: "completed" | "timed_out", aiSpeechSeconds: number) {
  const sessionId = await sessionIdFromCookie();
  if (!sessionId) return false;

  const { data, error } = await supabaseAdmin()
    .from("demo_sessions")
    .update({
      status,
      ended_at: new Date().toISOString(),
      ai_speech_seconds: aiSpeechSeconds,
      active_connection_id: null,
      active_connection_lease_until: null
    })
    .eq("id", sessionId)
    .in("status", ["created", "started"])
    .select("livekit_room_name")
    .single();

  if (error || !data) return false;

  await endLiveKitRoom(data.livekit_room_name as string);
  return true;
}

export async function failBeforeUse(reason: string) {
  const sessionId = await sessionIdFromCookie();
  if (!sessionId) return false;

  const { data: session } = await supabaseAdmin()
    .from("demo_sessions")
    .select("livekit_room_name")
    .eq("id", sessionId)
    .maybeSingle();

  const { data, error } = await supabaseAdmin()
    .rpc("mark_demo_session_failed_before_use", {
      p_session_id: sessionId,
      p_failure_reason: reason.slice(0, 500)
    })
    .single();

  const ok = !error && data === true;
  if (ok) await endLiveKitRoom(session?.livekit_room_name as string);
  return ok;
}
