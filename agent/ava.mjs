import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import {
  WorkerOptions,
  cli,
  defineAgent,
  voice
} from "@livekit/agents";
import { RoomServiceClient } from "livekit-server-sdk";
import * as cartesia from "@livekit/agents-plugin-cartesia";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as google from "@livekit/agents-plugin-google";
import * as silero from "@livekit/agents-plugin-silero";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BUSY_MESSAGE = "Ava is temporarily busy. Please try again in about one minute.";
const providerCooldowns = new Map();
const geminiHealthCache = new Map();
const CARTESIA_PAYMENT_COOLDOWN_SECONDS = 60 * 60;
const FILLER_PHRASES = [
  "Sure, one second.",
  "Of course.",
  "Got it.",
  "One moment."
];

const AVA_BASE_INSTRUCTIONS = `
You are Ava, a premium AI receptionist.

You are speaking live on a short private demo call. Keep every response brief, natural, and useful.
Sound warm, polished, and professional, not salesy or robotic.

Conversation rules:
- Start with the exact provided greeting.
- Act as the receptionist for the provided company, not as BoroTech's assistant.
- Ask one question at a time.
- Default to one or two natural receptionist sentences.
- Keep answers concise, usually 10 to 28 words, but do not sound clipped or abrupt.
- Answer immediately from the provided context; do not pause to reason aloud.
- Use light conversational acknowledgements when they help the call feel human.
- Use the provided industry playbook for likely caller intents and intake questions.
- If the caller asks about capabilities, answer from general receptionist knowledge and the provided playbook.
- If the caller asks for pricing, availability, or exact operational details, say the team can confirm and offer to collect details.
- If the caller wants a human follow-up, ask for their name, company, email, and what they need.
- Never claim you can access private systems, calendars, or CRM records unless the tool exists.
- Do not mention internal provider names such as LiveKit, Deepgram, Gemini, or Cartesia.
- Do not mention BoroTech unless the caller asks who built this demo.
- Do not browse, research, or claim live knowledge about the company.
- If audio is unclear, politely ask them to repeat.
`;

function parseDispatchMetadata(ctx) {
  const raw = ctx.job?.metadata || ctx.info?.job?.metadata || "";
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeSlot(value, fallback = "") {
  return cleanText(value, fallback).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

function cleanCompanyName(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || "your company";
}

function cleanText(value, fallback = "") {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return text || fallback;
}

function stringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()).slice(0, 6) : [];
}

function companyContextFromMetadata(metadata) {
  const fallbackCompanyName = cleanCompanyName(metadata.companyName);
  const fallbackIndustry = cleanText(metadata.industry, "general business");
  const context = metadata.companyContext && typeof metadata.companyContext === "object" ? metadata.companyContext : {};

  return {
    companyName: cleanCompanyName(context.companyName || fallbackCompanyName),
    prospectName: cleanText(context.prospectName || metadata.prospectName, ""),
    industry: cleanText(context.industry || fallbackIndustry, "general business"),
    greeting: cleanText(context.greeting, `Hello, this is Ava from ${fallbackCompanyName}. How may I help you today?`),
    role: cleanText(context.role, `Receptionist for ${fallbackCompanyName}`),
    tone: cleanText(context.tone, "Warm, calm, polished, concise, and helpful. Ask one question at a time."),
    commonCallerIntents: stringList(context.commonCallerIntents),
    goodQuestions: stringList(context.goodQuestions),
    boundaries: stringList(context.boundaries)
  };
}

function instructionsForCompany(context) {
  const intents = context.commonCallerIntents.length ? context.commonCallerIntents : ["General service inquiry", "Pricing question", "Availability question", "Human follow-up"];
  const questions = context.goodQuestions.length ? context.goodQuestions : ["What can I help you with today?", "Is this a new request or an existing one?", "What is the best way for the team to follow up?"];
  const boundaries = context.boundaries.length ? context.boundaries : ["Do not invent exact pricing, availability, or internal company details."];

  return `${AVA_BASE_INSTRUCTIONS}

Company context:
- Company: ${context.companyName}
- Prospect: ${context.prospectName || "unknown"}
- Industry/category: ${context.industry}
- Your role: ${context.role}
- Tone: ${context.tone}

Likely caller intents:
${intents.map((intent) => `- ${intent}`).join("\n")}

Good intake questions:
${questions.map((question) => `- ${question}`).join("\n")}

Boundaries:
${boundaries.map((boundary) => `- ${boundary}`).join("\n")}
`;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required Ava agent environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
}

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function booleanEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

function cancelFillerSpeech(fillerRef) {
  if (fillerRef.timer) {
    clearTimeout(fillerRef.timer);
    fillerRef.timer = null;
  }

  if (fillerRef.handle) {
    try {
      fillerRef.handle.interrupt(true);
    } catch {
      // The handle may already be done; either way, the real answer should continue.
    }

    fillerRef.handle = null;
  }
}

function scheduleFillerSpeech(session, turnIndexRef, enabledRef, fillerRef) {
  if (!booleanEnv("AVA_FILLER_ENABLED", false)) return;
  if (!enabledRef.value) return;

  cancelFillerSpeech(fillerRef);

  const delayMs = numberEnv("AVA_FILLER_DELAY_MS", 650);
  const turnIndex = ++turnIndexRef.value;
  const timer = setTimeout(() => {
    fillerRef.timer = null;
    if (turnIndex !== turnIndexRef.value || session.agentState !== "thinking") return;

    const phrase = FILLER_PHRASES[turnIndex % FILLER_PHRASES.length];
    const handle = session.say(phrase, {
      allowInterruptions: true,
      addToChatCtx: false
    });
    fillerRef.handle = handle;

    void handle.waitForPlayout().catch(() => undefined).finally(() => {
      if (fillerRef.handle === handle) {
        fillerRef.handle = null;
      }
    });
  }, delayMs);

  fillerRef.timer = timer;
  timer.unref?.();
}

function cartesiaModelName() {
  return (process.env.CARTESIA_MODEL_ID || "sonic-3.5").replace(/^cartesia\//, "");
}

function geminiModelName() {
  return process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
}

function slotEnvName(prefix, slot) {
  const suffix = normalizeSlot(slot).toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return suffix ? `${prefix}_${suffix}` : "";
}

function isSlotCoolingDown(provider, slot) {
  const until = providerCooldowns.get(`${provider}:${slot}`);
  return typeof until === "number" && until > Date.now();
}

function setSlotCooldown(provider, slot, seconds = 60) {
  if (!slot) return;
  providerCooldowns.set(`${provider}:${slot}`, Date.now() + Math.max(10, seconds) * 1000);
}

async function selectGeminiKey(metadata) {
  const requestedSlot = normalizeSlot(metadata.geminiKeySlot, "default");
  const slotEnv = slotEnvName("GEMINI_API_KEY", requestedSlot);
  const slotKey = slotEnv ? optionalEnv(slotEnv) : "";
  const backupKey = optionalEnv("GEMINI_API_KEY_GLOBAL_BACKUP");
  const candidates = [];

  if (slotKey && !isSlotCoolingDown("gemini", requestedSlot)) {
    candidates.push({ apiKey: slotKey, slot: requestedSlot, role: "primary" });
  }

  if (backupKey && !isSlotCoolingDown("gemini", "global_backup")) {
    candidates.push({ apiKey: backupKey, slot: "global_backup", role: "backup" });
  }

  if (candidates.length) {
    const winner = await firstHealthyGeminiKey(candidates);
    if (winner) return winner;
  }

  if (slotKey) {
    return { apiKey: slotKey, slot: requestedSlot, role: "primary_unverified" };
  }

  if (backupKey) {
    return { apiKey: backupKey, slot: "global_backup", role: "backup_unverified" };
  }

  return { apiKey: requiredEnv("GOOGLE_API_KEY"), slot: "default", role: "default" };
}

async function firstHealthyGeminiKey(candidates) {
  const checks = candidates.map((candidate) => (
    isGeminiKeyHealthy(candidate.slot, candidate.apiKey).then((ok) => {
      if (!ok) {
        setSlotCooldown("gemini", candidate.slot, numberEnv("GEMINI_UNHEALTHY_COOLDOWN_SECONDS", 120));
        return null;
      }

      return candidate;
    })
  ));

  while (checks.length) {
    const result = await Promise.race(checks.map((check, index) => check.then((value) => ({ index, value }))));
    checks.splice(result.index, 1);
    if (result.value) return result.value;
  }

  return null;
}

async function isGeminiKeyHealthy(slot, apiKey) {
  const cacheKey = `${slot}:${geminiModelName()}`;
  const cached = geminiHealthCache.get(cacheKey);
  if (cached && cached.until > Date.now()) return cached.ok;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), numberEnv("GEMINI_KEY_HEALTH_TIMEOUT_MS", 3500));
  const checkedAt = Date.now();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModelName())}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply OK." }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 4
          }
        })
      }
    );
    const ok = response.ok;
    geminiHealthCache.set(cacheKey, {
      ok,
      until: checkedAt + numberEnv(ok ? "GEMINI_KEY_HEALTH_TTL_MS" : "GEMINI_KEY_FAILURE_TTL_MS", ok ? 300_000 : 120_000)
    });
    return ok;
  } catch {
    geminiHealthCache.set(cacheKey, {
      ok: false,
      until: checkedAt + numberEnv("GEMINI_KEY_FAILURE_TTL_MS", 120_000)
    });
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function selectCartesiaKey() {
  const primaryKey = optionalEnv("CARTESIA_API_KEY_PRIMARY") || optionalEnv("CARTESIA_API_KEY");
  const backupKey = optionalEnv("CARTESIA_API_KEY_GLOBAL_BACKUP");

  if (primaryKey && !isSlotCoolingDown("cartesia", "primary")) {
    return { apiKey: primaryKey, slot: "primary", role: "primary" };
  }

  if (backupKey && !isSlotCoolingDown("cartesia", "global_backup")) {
    return { apiKey: backupKey, slot: "global_backup", role: "backup" };
  }

  return { apiKey: requiredEnv("CARTESIA_API_KEY"), slot: "primary", role: "default" };
}

function errorMessage(error) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    return error.message || error.error?.message || JSON.stringify(error).slice(0, 500);
  }
  return String(error);
}

function isParticipantWaitDisconnect(error) {
  return errorMessage(error).toLowerCase().includes("room disconnected while waiting for participant");
}

function isRateLimitError(error) {
  const message = errorMessage(error).toLowerCase();
  return message.includes("429") || message.includes("rate limit") || message.includes("resource_exhausted") || message.includes("quota");
}

function isPaymentRequiredError(error) {
  const message = errorMessage(error).toLowerCase();
  return message.includes("402") || message.includes("payment required") || message.includes("credit limit") || message.includes("out of credits");
}

function retryAfterSeconds(error) {
  const message = errorMessage(error);
  const retryDelay = message.match(/retryDelay["']?\s*:\s*["']?(\d+(?:\.\d+)?)s/i);
  if (retryDelay?.[1]) return Math.ceil(Number(retryDelay[1]));

  const retryAfter = message.match(/retry(?:\s|-)?after\s*(\d+)/i);
  if (retryAfter?.[1]) return Math.ceil(Number(retryAfter[1]));

  return isRateLimitError(error) ? 60 : null;
}

function supabaseForAgent() {
  const url = optionalEnv("SUPABASE_URL");
  const key = optionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

async function logProviderEvent(metadata, event) {
  const db = supabaseForAgent();
  if (!db) return;

  try {
    const { error } = await db.from("demo_provider_events").insert({
      provider: event.provider,
      key_slot: event.keySlot || null,
      sales_account_id: metadata.salesAccountId || null,
      invite_id: metadata.inviteId || null,
      session_id: metadata.sessionId || null,
      room_name: event.roomName || null,
      event_type: event.eventType,
      error_type: event.errorType || null,
      retry_after_seconds: event.retryAfterSeconds || null,
      message: (event.message || "").slice(0, 500),
      detail: event.detail || {}
    });

    if (error) throw error;
  } catch (error) {
    console.error("Failed to log provider event", error);
  }
}

function demoSessionMs() {
  const seconds = Number(process.env.DEMO_SESSION_SECONDS || 150);
  return Math.max(1, Number.isFinite(seconds) ? seconds : 150) * 1000;
}

function liveKitHost() {
  return requiredEnv("LIVEKIT_URL").replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

async function closeRoom(roomName) {
  const rooms = new RoomServiceClient(liveKitHost(), requiredEnv("LIVEKIT_API_KEY"), requiredEnv("LIVEKIT_API_SECRET"));
  await rooms.deleteRoom(roomName).catch((error) => {
    if (isLiveKitRoomNotFound(error)) return;
    console.error("Failed to close demo room", error);
  });
}

function isLiveKitRoomNotFound(error) {
  return errorMessage(error).toLowerCase().includes("not found") || errorMessage(error).toLowerCase().includes("does not exist");
}

function maxConcurrentJobs() {
  return Math.max(1, numberEnv("AVA_MAX_CONCURRENT_JOBS", 3));
}

export default defineAgent({
  prewarm: async (proc) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx) => {
    await ctx.connect();
    const participant = await ctx.waitForParticipant().catch((error) => {
      if (isParticipantWaitDisconnect(error)) {
        console.warn("Ava job ended before a participant joined", {
          roomName: ctx.room?.name,
          reason: "room_disconnected_before_participant"
        });
        return null;
      }

      throw error;
    });

    if (!participant) return;

    const metadata = parseDispatchMetadata(ctx);
    const companyContext = companyContextFromMetadata(metadata);
    const geminiKey = await selectGeminiKey(metadata);
    const cartesiaKey = selectCartesiaKey();
    let handledProviderFailure = false;

    void logProviderEvent(metadata, {
      provider: "agent",
      eventType: "provider_slots_selected",
      roomName: ctx.room.name,
      detail: {
        geminiSlot: geminiKey.slot,
        geminiRole: geminiKey.role,
        cartesiaSlot: cartesiaKey.slot,
        cartesiaRole: cartesiaKey.role
      }
    });

    const fillerTurnIndex = { value: 0 };
    const fillerEnabled = { value: false };
    const fillerSpeech = { timer: null, handle: null };
    const agent = voice.Agent.create({
      instructions: instructionsForCompany(companyContext),
      onUserTurnCompleted(ctx) {
        scheduleFillerSpeech(ctx.session, fillerTurnIndex, fillerEnabled, fillerSpeech);
      }
    });

    const session = new voice.AgentSession({
      stt: new deepgram.STT({
        model: process.env.DEEPGRAM_MODEL || "nova-3",
        language: process.env.DEEPGRAM_LANGUAGE || "en",
        noDelay: true,
        interimResults: true,
        endpointing: numberEnv("DEEPGRAM_ENDPOINTING_MS", 10)
      }),
      llm: new google.LLM({
        model: geminiModelName(),
        apiKey: geminiKey.apiKey,
        temperature: numberEnv("GEMINI_TEMPERATURE", 0.2),
        maxOutputTokens: numberEnv("GEMINI_MAX_OUTPUT_TOKENS", 140)
      }),
      tts: new cartesia.TTS({
        model: cartesiaModelName(),
        voice: requiredEnv("CARTESIA_VOICE_ID"),
        apiKey: cartesiaKey.apiKey,
        language: "en",
        speed: numberEnv("CARTESIA_SPEED", 1.05),
        volume: numberEnv("CARTESIA_VOLUME", 1)
      }),
      vad: ctx.proc.userData.vad,
      turnDetection: "vad",
      turnHandling: {
        endpointing: {
          mode: "fixed",
          minDelay: numberEnv("AVA_MIN_ENDPOINTING_MS", 30),
          maxDelay: numberEnv("AVA_MAX_ENDPOINTING_MS", 220)
        },
        interruption: {
          mode: "vad"
        },
        preemptiveGeneration: {
          enabled: true,
          preemptiveTts: process.env.AVA_PREEMPTIVE_TTS !== "false",
          maxSpeechDuration: 12000,
          maxRetries: 4
        }
      }
    });

    session.on("error", (event) => {
      if (handledProviderFailure) return;
      const provider = providerName(event?.source, event?.error);
      const activeSlot = provider === "gemini" ? geminiKey.slot : provider === "cartesia" ? cartesiaKey.slot : provider;
      const paymentRequired = isPaymentRequiredError(event?.error);
      const retrySeconds = paymentRequired ? CARTESIA_PAYMENT_COOLDOWN_SECONDS : retryAfterSeconds(event?.error) || 60;
      const rateLimited = isRateLimitError(event?.error);
      handledProviderFailure = true;

      if (provider === "gemini" && activeSlot) {
        setSlotCooldown(provider, activeSlot, retrySeconds);
      } else if ((rateLimited || paymentRequired) && activeSlot) {
        setSlotCooldown(provider, activeSlot, retrySeconds);
      }

      void logProviderEvent(metadata, {
        provider,
        keySlot: activeSlot,
        roomName: ctx.room.name,
        eventType: "provider_error",
        errorType: paymentRequired ? "payment_required" : rateLimited ? "rate_limited" : event?.error?.type || "provider_error",
        retryAfterSeconds: retrySeconds,
        message: errorMessage(event?.error),
        detail: {
          sourceProvider: event?.source?.provider,
          sourceModel: event?.source?.model,
          errorType: event?.error?.type
        }
      });

      const fallbackSpeech = session.say(BUSY_MESSAGE, {
        allowInterruptions: false,
        addToChatCtx: false
      });

      void fallbackSpeech.waitForPlayout().catch(() => undefined).finally(() => {
        void closeRoom(ctx.room.name);
      });
    });

    session.on("agent_state_changed", (event) => {
      if (event.newState !== "thinking" && !fillerSpeech.handle) {
        cancelFillerSpeech(fillerSpeech);
      }
    });

    session.on("speech_created", (event) => {
      if (event.source === "generate_reply") {
        fillerTurnIndex.value++;
        cancelFillerSpeech(fillerSpeech);
      }
    });

    await session.start({
      agent,
      room: ctx.room
    });

    const greeting = session.say(companyContext.greeting, {
      allowInterruptions: false,
      addToChatCtx: true
    });
    await greeting.waitForPlayout();
    fillerEnabled.value = true;

    const roomName = ctx.room.name;
    setTimeout(() => {
      void closeRoom(roomName);
    }, demoSessionMs()).unref?.();
  }
});

function providerName(source, error) {
  const provider = String(source?.provider || source?.label || "").toLowerCase();
  const message = errorMessage(error).toLowerCase();
  if (provider.includes("google") || message.includes("google llm") || message.includes("gemini")) return "gemini";
  if (provider.includes("cartesia") || message.includes("cartesia")) return "cartesia";
  if (provider.includes("deepgram") || message.includes("deepgram")) return "deepgram";
  return "agent";
}

cli.runApp(new WorkerOptions({
  agent: fileURLToPath(import.meta.url),
  agentName: "ava",
  host: "127.0.0.1",
  initializeProcessTimeout: 120_000,
  numIdleProcesses: numberEnv("AVA_IDLE_WORKERS", 3),
  loadThreshold: Math.min(0.95, Math.max(0.1, numberEnv("AVA_LOAD_THRESHOLD", 0.8))),
  loadFunc: async (worker) => Math.min(1, worker.activeJobs.length / maxConcurrentJobs())
}));
