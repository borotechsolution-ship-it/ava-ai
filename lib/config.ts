function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const config = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  salesPassword: process.env.INTERNAL_SALES_PASSWORD || "",
  ttsProvider: process.env.TTS_PROVIDER || "cartesia",
  cartesiaApiKey: process.env.CARTESIA_API_KEY || "",
  cartesiaBaseUrl: process.env.CARTESIA_BASE_URL || "https://api.cartesia.ai",
  cartesiaVersion: process.env.CARTESIA_VERSION || "2026-03-01",
  cartesiaModelId: process.env.CARTESIA_MODEL_ID || "sonic-3.5",
  cartesiaVoiceId: process.env.CARTESIA_VOICE_ID || "",
  fishAudioApiKey: process.env.FISH_AUDIO_API_KEY || "",
  fishAudioBaseUrl: process.env.FISH_AUDIO_BASE_URL || "https://api.fish.audio",
  fishAudioModelId: process.env.FISH_AUDIO_MODEL_ID || "fishaudio-s21pro-flash",
  fishAudioVoiceId: process.env.FISH_AUDIO_VOICE_ID || "",
  defaultExpiryHours: numberEnv("DEMO_INVITE_DEFAULT_EXPIRY_HOURS", 24),
  defaultMaxSessions: numberEnv("DEMO_INVITE_DEFAULT_MAX_SESSIONS", 1),
  reconnectGraceSeconds: numberEnv("DEMO_RECONNECT_GRACE_SECONDS", 300),
  maxActiveSessionsPerInvite: numberEnv("DEMO_MAX_ACTIVE_SESSIONS_PER_INVITE", 1),
  globalDailyLimit: numberEnv("DEMO_GLOBAL_DAILY_LIMIT", 10),
  globalMonthlyLimit: numberEnv("DEMO_GLOBAL_MONTHLY_LIMIT", 20),
  demoSessionSeconds: numberEnv("DEMO_SESSION_SECONDS", 150),
  aiSpeechSeconds: numberEnv("DEMO_AI_SPEECH_SECONDS", 75),
  livekitUrl: process.env.LIVEKIT_URL || "",
  livekitApiKey: process.env.LIVEKIT_API_KEY || "",
  livekitApiSecret: process.env.LIVEKIT_API_SECRET || ""
};

export function assertConfigured() {
  const missing = [
    ["SUPABASE_URL", process.env.SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
    ["LIVEKIT_API_KEY", config.livekitApiKey],
    ["LIVEKIT_API_SECRET", config.livekitApiSecret],
    ["LIVEKIT_URL", config.livekitUrl]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
