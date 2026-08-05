export type InviteStatus = "active" | "redeemed" | "expired" | "revoked";
export type SessionStatus = "created" | "started" | "completed" | "failed" | "timed_out";

export type DemoInvite = {
  id: string;
  sales_account_id: string | null;
  token_hash?: string;
  prospect_name: string;
  company_name: string;
  industry: string;
  skill_slug: string | null;
  token_ciphertext: string | null;
  invite_url?: string | null;
  prospect_email: string | null;
  expires_at: string;
  max_sessions: number;
  sessions_used: number;
  status: InviteStatus;
  created_by: string | null;
  created_at: string;
  redeemed_at: string | null;
  revoked_at: string | null;
  infrastructure_retry_count: number;
};

export type SalesAccount = {
  id: string;
  login_slug: string;
  display_name: string;
  password_hash: string;
  gemini_key_slot: string | null;
  active: boolean;
};

export type DemoSession = {
  id: string;
  invite_id: string;
  status: SessionStatus;
  started_at: string | null;
  expires_at: string;
  ended_at: string | null;
  ai_speech_seconds: number;
  livekit_room_name: string;
  reconnect_secret_hash: string;
  failure_reason: string | null;
  created_at: string;
};
