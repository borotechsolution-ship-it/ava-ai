import { getDemoCookie } from "@/lib/demo-cookie";
import { sha256 } from "@/lib/crypto";
import { config } from "@/lib/config";
import { buildCompanyContext } from "@/lib/company-context";
import { dispatchAvaAgent, endLiveKitRoom } from "@/lib/livekit";
import { supabaseAdmin } from "@/lib/supabase";

type DispatchInviteRow = {
  id: string;
  sales_account_id: string | null;
  prospect_name: string | null;
  company_name: string | null;
  industry: string | null;
  skill_slug?: string | null;
};

function isMissingColumn(error: { code?: string; message?: string } | null, column: string) {
  return ["42703", "PGRST204"].includes(error?.code || "") && error?.message?.includes(column);
}

function inviteSkillSlug(invite: unknown) {
  if (!invite || typeof invite !== "object" || !("skill_slug" in invite)) return null;
  const value = (invite as { skill_slug?: unknown }).skill_slug;
  return typeof value === "string" && value ? value : null;
}

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

export async function dispatchAvaForCurrentSession() {
  const sessionId = await sessionIdFromCookie();
  if (!sessionId) {
    console.error("Ava dispatch blocked: missing or expired demo session cookie");
    return false;
  }

  const { data: session, error: sessionError } = await supabaseAdmin()
    .from("demo_sessions")
    .select("id,invite_id,livekit_room_name,status")
    .eq("id", sessionId)
    .in("status", ["created", "started"])
    .maybeSingle();

  if (sessionError) {
    console.error("Ava dispatch blocked: could not load demo session", {
      sessionId,
      message: sessionError.message,
      code: sessionError.code
    });
    return false;
  }

  if (!session?.livekit_room_name) {
    console.error("Ava dispatch blocked: no active LiveKit room for session", { sessionId });
    return false;
  }

  const inviteResult = await supabaseAdmin()
    .from("demo_invites")
    .select("id,sales_account_id,prospect_name,company_name,industry,skill_slug")
    .eq("id", session.invite_id)
    .maybeSingle();
  let invite = inviteResult.data as DispatchInviteRow | null;
  let inviteError = inviteResult.error;

  if (isMissingColumn(inviteError, "skill_slug")) {
    const fallbackInvite = await supabaseAdmin()
      .from("demo_invites")
      .select("id,sales_account_id,prospect_name,company_name,industry")
      .eq("id", session.invite_id)
      .maybeSingle();
    invite = fallbackInvite.data as DispatchInviteRow | null;
    inviteError = fallbackInvite.error;
  }

  if (inviteError) {
    console.error("Ava dispatch continuing without invite metadata", {
      sessionId,
      inviteId: session.invite_id,
      message: inviteError.message,
      code: inviteError.code
    });
  }

  const { data: salesAccount } = invite?.sales_account_id
    ? await supabaseAdmin()
        .from("sales_accounts")
        .select("gemini_key_slot")
        .eq("id", invite.sales_account_id)
        .maybeSingle()
    : { data: null };

  const companyContext = await buildCompanyContext({
    prospectName: invite?.prospect_name,
    companyName: invite?.company_name,
    industry: invite?.industry,
    skillSlug: inviteSkillSlug(invite)
  }).catch((error) => {
    console.error("Ava dispatch continuing without generated company context", {
      sessionId,
      inviteId: invite?.id,
      message: error instanceof Error ? error.message : String(error)
    });
    return null;
  });

  await dispatchAvaAgent(session.livekit_room_name as string, {
    prospectName: invite?.prospect_name,
    companyName: invite?.company_name,
    industry: invite?.industry,
    skillSlug: inviteSkillSlug(invite),
    salesAccountId: invite?.sales_account_id,
    inviteId: invite?.id,
    sessionId: session.id,
    geminiKeySlot: salesAccount?.gemini_key_slot,
    companyContext
  });

  console.log("Ava dispatch created", {
    sessionId: session.id,
    roomName: session.livekit_room_name,
    inviteId: invite?.id || null,
    salesAccountId: invite?.sales_account_id || null,
    geminiKeySlot: salesAccount?.gemini_key_slot || null
  });

  return true;
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
