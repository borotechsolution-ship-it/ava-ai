import { config } from "@/lib/config";
import { buildCompanyContext } from "@/lib/company-context";
import { decryptSecret, encryptSecret, randomToken, sha256 } from "@/lib/crypto";
import { createLiveKitToken, dispatchAvaAgent } from "@/lib/livekit";
import { setDemoCookie } from "@/lib/demo-cookie";
import { supabaseAdmin } from "@/lib/supabase";
import type { DemoInvite, DemoSession } from "@/lib/types";

export type InviteWithLatestSession = DemoInvite & {
  demo_sessions?: Pick<DemoSession, "status" | "started_at" | "ended_at" | "failure_reason">[];
};

export const INVITES_PAGE_SIZE = 5;
const MAX_EXPIRY_HOURS = 72;
const MAX_INVITE_SESSIONS = 3;
const INVITE_SELECT_COLUMNS =
  "id,sales_account_id,token_hash,prospect_name,company_name,industry,prospect_email,expires_at,max_sessions,sessions_used,status,created_by,created_at,redeemed_at,revoked_at,infrastructure_retry_count,demo_sessions(status,started_at,ended_at,failure_reason)";
const INVITE_SELECT_COLUMNS_WITH_TOKEN =
  "id,sales_account_id,token_hash,prospect_name,company_name,industry,token_ciphertext,prospect_email,expires_at,max_sessions,sessions_used,status,created_by,created_at,redeemed_at,revoked_at,infrastructure_retry_count,demo_sessions(status,started_at,ended_at,failure_reason)";

function isMissingTokenCiphertext(error: { code?: string; message?: string } | null) {
  return ["42703", "PGRST204"].includes(error?.code || "") && error?.message?.includes("token_ciphertext");
}

function tokenEncryptionSecret() {
  const secret = process.env.INVITE_TOKEN_ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing INVITE_TOKEN_ENCRYPTION_SECRET or SUPABASE_SERVICE_ROLE_KEY");
  return secret;
}

export function inviteUrl(token: string) {
  return `${config.appUrl.replace(/\/$/, "")}/invite/${token}`;
}

function tokenFromInviteUrl(url: string | undefined) {
  if (!url) return null;

  try {
    const token = new URL(url).pathname.split("/invite/")[1]?.split("/")[0];
    return token && /^[A-Za-z0-9_-]{32,}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number) {
  if (!value || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

export async function createInvite(input: {
  prospectName: string;
  companyName: string;
  industry: string;
  prospectEmail?: string;
  expiryHours?: number;
  maxSessions?: number;
  salesAccountId: string;
  createdBy?: string;
}) {
  const token = randomToken();
  const tokenHash = sha256(token);
  const expiryHours = clampNumber(input.expiryHours, config.defaultExpiryHours, 1, MAX_EXPIRY_HOURS);
  const maxSessions = clampNumber(input.maxSessions, config.defaultMaxSessions, 1, MAX_INVITE_SESSIONS);
  const expiresAt = new Date(
    Date.now() + expiryHours * 60 * 60 * 1000
  ).toISOString();

  const insertPayload = {
    token_hash: tokenHash,
    token_ciphertext: encryptSecret(token, tokenEncryptionSecret()),
    prospect_name: input.prospectName,
    company_name: input.companyName,
    industry: input.industry,
    prospect_email: input.prospectEmail || null,
    expires_at: expiresAt,
    max_sessions: maxSessions,
    sales_account_id: input.salesAccountId,
    created_by: input.createdBy || "sales"
  };

  const { data, error } = await supabaseAdmin()
    .from("demo_invites")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Invite was not created");
  return { id: data.id as string, token, url: inviteUrl(token), expiresAt };
}

export async function listInvites(salesAccountId: string, page = 1, latestCreatedUrl?: string) {
  const safePage = Math.max(1, Math.trunc(page));
  const from = (safePage - 1) * INVITES_PAGE_SIZE;
  const to = from + INVITES_PAGE_SIZE - 1;
  const latestCreatedToken = tokenFromInviteUrl(latestCreatedUrl);
  const latestCreatedTokenHash = latestCreatedToken ? sha256(latestCreatedToken) : null;

  const result = await supabaseAdmin()
    .from("demo_invites")
    .select(INVITE_SELECT_COLUMNS_WITH_TOKEN, { count: "exact" })
    .eq("sales_account_id", salesAccountId)
    .order("created_at", { ascending: false })
    .range(from, to);
  let data: unknown = result.data;
  let error = result.error;
  let count = result.count;

  if (isMissingTokenCiphertext(error)) {
    const fallbackResult = await supabaseAdmin()
      .from("demo_invites")
      .select(INVITE_SELECT_COLUMNS, { count: "exact" })
      .eq("sales_account_id", salesAccountId)
      .order("created_at", { ascending: false })
      .range(from, to);
    data = fallbackResult.data;
    error = fallbackResult.error;
    count = fallbackResult.count;
  }

  if (error) throw error;
  const secret = tokenEncryptionSecret();
  const invites = ((data || []) as InviteWithLatestSession[]).map((invite) => {
    const token = decryptSecret(invite.token_ciphertext, secret);
    const latestUrl = latestCreatedTokenHash === invite.token_hash ? latestCreatedUrl || null : null;
    return {
      ...invite,
      invite_url: token ? inviteUrl(token) : latestUrl
    };
  });

  return {
    invites,
    page: safePage,
    pageSize: INVITES_PAGE_SIZE,
    totalCount: count || 0
  };
}

export async function revokeInvite(id: string, salesAccountId: string) {
  const { error } = await supabaseAdmin()
    .from("demo_invites")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("sales_account_id", salesAccountId)
    .in("status", ["active", "redeemed"]);

  if (error) throw error;
}

export async function replaceInvite(id: string, salesAccountId: string) {
  const db = supabaseAdmin();
  const { data: existing, error: findError } = await db
    .from("demo_invites")
    .select("prospect_name,company_name,industry,prospect_email,max_sessions,created_by,sales_account_id")
    .eq("id", id)
    .eq("sales_account_id", salesAccountId)
    .single();

  if (findError) throw findError;
  await revokeInvite(id, salesAccountId);

  return createInvite({
    prospectName: existing.prospect_name,
    companyName: existing.company_name,
    industry: existing.industry,
    prospectEmail: existing.prospect_email || undefined,
    maxSessions: existing.max_sessions,
    salesAccountId,
    createdBy: existing.created_by || "sales"
  });
}

export async function validateInviteToken(token: string) {
  if (!/^[A-Za-z0-9_-]{32,}$/.test(token)) return null;

  const { data, error } = await supabaseAdmin()
    .rpc("validate_demo_invite", { p_token_hash: sha256(token) })
    .maybeSingle();

  if (error) throw error;
  return data as
    | null
    | {
        invite_id: string;
        prospect_name: string;
        company_name: string;
        industry: string;
        expires_at: string;
        max_sessions: number;
        sessions_used: number;
      };
}

export async function redeemInviteToken(token: string) {
  const reconnectSecret = randomToken();
  const cookieSecret = randomToken();

  const { data, error } = await supabaseAdmin()
    .rpc("redeem_demo_invite", {
      p_token_hash: sha256(token),
      p_reconnect_secret_hash: sha256(reconnectSecret),
      p_daily_limit: config.globalDailyLimit,
      p_monthly_limit: config.globalMonthlyLimit,
      p_session_seconds: config.demoSessionSeconds,
      p_max_active_sessions_per_invite: config.maxActiveSessionsPerInvite
    })
    .maybeSingle();

  if (error) throw error;
  const session = data as DemoSession | null;
  if (!isUsableDemoSession(session)) return null;

  const cookieHash = sha256(cookieSecret);
  const expiresAt = new Date(Date.now() + config.reconnectGraceSeconds * 1000).toISOString();
  const { error: authError } = await supabaseAdmin().from("demo_session_auth").insert({
    session_id: session.id,
    cookie_hash: cookieHash,
    expires_at: expiresAt
  });

  if (authError) throw authError;
  await setDemoCookie(cookieSecret);
  const { data: inviteForAgent } = await supabaseAdmin()
    .from("demo_invites")
    .select("id,sales_account_id,prospect_name,company_name,industry")
    .eq("id", session.invite_id)
    .maybeSingle();

  const { data: salesAccount } = inviteForAgent?.sales_account_id
    ? await supabaseAdmin()
        .from("sales_accounts")
        .select("gemini_key_slot")
        .eq("id", inviteForAgent.sales_account_id)
        .maybeSingle()
    : { data: null };

  const companyContext = await buildCompanyContext({
    prospectName: inviteForAgent?.prospect_name,
    companyName: inviteForAgent?.company_name,
    industry: inviteForAgent?.industry
  });

  await dispatchAvaAgent(session.livekit_room_name, {
    prospectName: inviteForAgent?.prospect_name,
    companyName: inviteForAgent?.company_name,
    industry: inviteForAgent?.industry,
    salesAccountId: inviteForAgent?.sales_account_id,
    inviteId: inviteForAgent?.id,
    sessionId: session.id,
    geminiKeySlot: salesAccount?.gemini_key_slot,
    companyContext
  }).catch((error) => {
    console.error("Failed to dispatch Ava agent", error);
  });

  return authorizedSession(session, reconnectSecret);
}

export async function reconnectDemo(cookieSecret: string) {
  if (!cookieSecret) return null;

  const { data, error } = await supabaseAdmin()
    .rpc("reconnect_demo_session", {
      p_cookie_hash: sha256(cookieSecret),
      p_grace_seconds: config.reconnectGraceSeconds
    })
    .maybeSingle();

  if (error) throw error;
  const session = data as DemoSession | null;
  if (!isUsableDemoSession(session)) return null;

  return authorizedSession(session);
}

function isUsableDemoSession(session: DemoSession | null): session is DemoSession {
  return Boolean(session?.id && session.livekit_room_name && session.expires_at);
}

async function authorizedSession(session: DemoSession, reconnectSecret?: string) {
  const ttl = Math.max(
    1,
    Math.min(config.demoSessionSeconds, Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000))
  );

  return {
    sessionId: session.id,
    livekitUrl: config.livekitUrl,
    roomName: session.livekit_room_name,
    token: await createLiveKitToken({
      roomName: session.livekit_room_name,
      participantIdentity: `prospect-${session.id}-${randomToken().slice(0, 8)}`,
      ttlSeconds: ttl
    }),
    expiresAt: session.expires_at,
    aiSpeechLimitSeconds: config.aiSpeechSeconds,
    reconnectSecret
  };
}
