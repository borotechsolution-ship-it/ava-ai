import { supabaseAdmin } from "@/lib/supabase";

type CompanyContextInput = {
  prospectName?: string | null;
  companyName?: string | null;
  industry?: string | null;
};

export type CompanyContext = {
  companyName: string;
  prospectName: string;
  industry: string;
  greeting: string;
  role: string;
  tone: string;
  commonCallerIntents: string[];
  goodQuestions: string[];
  boundaries: string[];
  knowledgeSnippets: string[];
  source: "skill" | "built_in" | "generated" | "fallback";
};

const DEFAULT_TONE = "Warm, calm, polished, concise, and helpful. Ask one question at a time.";
const CONTEXT_GENERATION_TIMEOUT_MS = Number(process.env.GEMINI_CONTEXT_TIMEOUT_MS || 2500);
const INDUSTRY_KNOWLEDGE_BUDGET_CHARS = Number(process.env.INDUSTRY_KNOWLEDGE_BUDGET_CHARS || 7600);

type Playbook = Pick<CompanyContext, "commonCallerIntents" | "goodQuestions" | "boundaries">;

const BUILT_IN_PLAYBOOKS: Record<
  string,
  Playbook
> = {
  hvac: {
    commonCallerIntents: [
      "AC or heating repair",
      "Maintenance plan",
      "Emergency service",
      "New installation",
      "Pricing estimate",
      "Service availability"
    ],
    goodQuestions: [
      "What type of system are you calling about?",
      "Is this urgent or routine?",
      "What city or area are you located in?",
      "Is this residential or commercial?"
    ],
    boundaries: ["Do not diagnose dangerous electrical or gas issues. Collect details and recommend a technician follow-up."]
  },
  medical: {
    commonCallerIntents: ["Book an appointment", "Ask about services", "Insurance or payment questions", "Clinic hours", "Follow-up request"],
    goodQuestions: [
      "What type of appointment or service are you looking for?",
      "Is this a new visit or a follow-up?",
      "What day or time range works best?",
      "What is the best number or email for the team to contact you?"
    ],
    boundaries: ["Do not provide medical advice, diagnosis, medication guidance, or emergency triage."]
  },
  medspa: {
    commonCallerIntents: ["Treatment inquiry", "Consultation booking", "Pricing range", "Skin concern", "Availability"],
    goodQuestions: [
      "Which treatment are you interested in?",
      "Is this your first time considering that service?",
      "What result are you hoping for?",
      "Would you like the team to follow up with availability?"
    ],
    boundaries: ["Do not give clinical promises or medical advice. Offer a consultation with the team."]
  },
  dental: {
    commonCallerIntents: [
      "New-patient exam, routine checkup, cleaning, or family appointment",
      "Emergency dental concern such as severe pain, swelling, broken tooth, lost crown, or knocked-out tooth",
      "Implant, Invisalign, whitening, denture, or cosmetic consultation",
      "Insurance, self-pay estimate, financing, cancellation, late arrival, or clinic policy question",
      "Existing-patient appointment change, post-treatment concern, records request, or human callback"
    ],
    goodQuestions: [
      "Are you a new or existing patient?",
      "What is the reason for the visit in your own words?",
      "Are you having severe pain, swelling, bleeding, trouble breathing or swallowing, or a knocked-out permanent tooth?",
      "Is this for an adult or a child, and will a parent or guardian attend if the patient is a minor?",
      "What day or time range works best, and do you have a preferred dentist or hygienist?",
      "Would you like the team to review insurance or self-pay options before confirming details?"
    ],
    boundaries: [
      "Ava schedules and informs only. Do not diagnose, prescribe, recommend medication, give dosage guidance, or decide what treatment is clinically necessary.",
      "For trouble breathing or swallowing, uncontrolled bleeding, severe trauma, loss of consciousness, or life-threatening symptoms, tell the caller to call emergency services or go to the nearest emergency department.",
      "For spreading facial or neck swelling, fever with swelling, knocked-out permanent tooth, severe post-treatment issue, or medication request, stop routine booking and route to clinical staff or urgent callback.",
      "New dental patients usually need an exam before cleaning. Same-day cleaning or treatment is never guaranteed and depends on clinical evaluation and availability.",
      "Insurance and prices are estimates only. Do not guarantee coverage, copays, deductibles, claim payment, exact final cost, or that every plan is accepted.",
      "Do not collect SSN, full payment-card details, detailed medical history, images, or private records by voice. Use secure forms and transfer when unsure."
    ]
  },
  solar: {
    commonCallerIntents: ["Solar installation", "Savings estimate", "Battery storage", "Commercial solar", "Financing", "Site visit"],
    goodQuestions: [
      "Is this for a home or business?",
      "Do you already have a recent electricity bill?",
      "Are you interested in panels only or battery storage too?",
      "What city or service area is the project in?"
    ],
    boundaries: ["Do not promise exact savings without a site and bill review."]
  },
  manufacturing: {
    commonCallerIntents: ["Production inquiry", "Custom order", "Lead time", "Bulk pricing", "Capabilities", "Supplier discussion"],
    goodQuestions: [
      "What product or component are you asking about?",
      "Is this a prototype, one-time order, or recurring requirement?",
      "Do you have a target quantity or timeline?",
      "Should the team follow up with technical or purchasing details?"
    ],
    boundaries: ["Do not confirm exact pricing, capacity, or lead times without a human follow-up."]
  },
  it: {
    commonCallerIntents: ["Support request", "Software project", "Automation inquiry", "Website or app build", "System integration"],
    goodQuestions: [
      "What system or workflow are you trying to improve?",
      "Is this for internal operations or customer-facing use?",
      "Do you have a current tool stack in place?",
      "What timeline are you hoping for?"
    ],
    boundaries: ["Do not claim access to client systems or make security guarantees without an assessment."]
  }
};

export async function buildCompanyContext(input: CompanyContextInput): Promise<CompanyContext> {
  const companyName = cleanText(input.companyName, "your company");
  const prospectName = cleanText(input.prospectName, "there");
  const industry = cleanText(input.industry, "general business");
  const cacheKey = contextCacheKey(companyName, industry);
  const builtIn = builtInPlaybook(industry);

  if (builtIn) {
    const knowledgeSnippets = await readIndustrySkillSnippets(builtIn.skillSlug, companyName, industry).catch(() => []);

    return withCommonContext({
      companyName,
      prospectName,
      industry,
      source: knowledgeSnippets.length ? "skill" : "built_in",
      knowledgeSnippets,
      ...builtIn.playbook
    });
  }

  const cached = await readCachedContext(cacheKey);
  if (cached) {
    return withCommonContext({ companyName, prospectName, industry, source: "generated", knowledgeSnippets: [], ...cached });
  }

  const generated = await generateIndustryPlaybook({ companyName, industry }).catch(() => null);
  const playbook = generated || fallbackPlaybook(industry);
  await writeCachedContext(cacheKey, companyName, industry, playbook).catch(() => undefined);

  return withCommonContext({
    companyName,
    prospectName,
    industry,
    source: generated ? "generated" : "fallback",
    knowledgeSnippets: [],
    ...playbook
  });
}

function withCommonContext(
  context: Pick<
    CompanyContext,
    "companyName" | "prospectName" | "industry" | "commonCallerIntents" | "goodQuestions" | "boundaries" | "knowledgeSnippets" | "source"
  >
): CompanyContext {
  return {
    ...context,
    greeting: `Hello, this is Ava from ${context.companyName}. How may I help you today?`,
    role: `Receptionist for ${context.companyName}`,
    tone: DEFAULT_TONE
  };
}

function builtInPlaybook(industry: string) {
  const normalized = normalizeIndustry(industry);
  if (normalized.includes("hvac")) return { skillSlug: "hvac", playbook: BUILT_IN_PLAYBOOKS.hvac };
  if (
    normalized.includes("dental") ||
    normalized.includes("dentist") ||
    normalized.includes("orthodont") ||
    normalized.includes("oral surgery")
  ) {
    return { skillSlug: "dental", playbook: BUILT_IN_PLAYBOOKS.dental };
  }
  if (normalized.includes("medical") || normalized.includes("hospital") || normalized.includes("clinic")) {
    return { skillSlug: "medical", playbook: BUILT_IN_PLAYBOOKS.medical };
  }
  if (normalized.includes("medspa") || normalized.includes("spa")) return { skillSlug: "medspa", playbook: BUILT_IN_PLAYBOOKS.medspa };
  if (normalized.includes("solar")) return { skillSlug: "solar", playbook: BUILT_IN_PLAYBOOKS.solar };
  if (normalized.includes("manufactur")) return { skillSlug: "manufacturing", playbook: BUILT_IN_PLAYBOOKS.manufacturing };
  if (normalized === "it" || normalized.includes("software") || normalized.includes("technology")) {
    return { skillSlug: "it", playbook: BUILT_IN_PLAYBOOKS.it };
  }
  return null;
}

async function readIndustrySkillSnippets(skillSlug: string, companyName: string, industry: string) {
  const query = [
    companyName,
    industry,
    "booking appointment provider doctor hygienist calendar availability slot cleaning six month recall bad prior experience after work evening emergency insurance pricing PPO HMO Medicaid cancellation rescheduling late arrival traffic phone email confirm spell objection anxious nervous caller uninsured waitlist family appointment pain swelling callback handoff new patient existing patient"
  ].join(" ");

  const [mandatoryResult, relevantResult] = await Promise.all([
    supabaseAdmin()
      .from("industry_skill_chunks")
      .select("chunk_key,title,content,priority")
      .eq("skill_slug", skillSlug)
      .lte("priority", Number(process.env.INDUSTRY_SKILL_MANDATORY_PRIORITY || 4))
      .order("priority", { ascending: true })
      .order("chunk_key", { ascending: true }),
    supabaseAdmin().rpc("match_industry_skill_chunks", {
      p_skill_slug: skillSlug,
      p_query: query,
      p_limit: Number(process.env.INDUSTRY_SKILL_SNIPPET_LIMIT || 9)
    })
  ]);

  const rows = [
    ...(Array.isArray(mandatoryResult.data) ? mandatoryResult.data : []),
    ...(Array.isArray(relevantResult.data) ? relevantResult.data : [])
  ];

  if ((!rows.length && mandatoryResult.error) || (!rows.length && relevantResult.error)) return [];

  return compactKnowledgeRows(rows, INDUSTRY_KNOWLEDGE_BUDGET_CHARS);
}

function compactKnowledgeRows(rows: unknown[], budgetChars: number) {
  const seen = new Set<string>();
  const snippets: string[] = [];
  let used = 0;
  const maxBudget = Number.isFinite(budgetChars) && budgetChars > 1200 ? budgetChars : 5200;

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;

    const record = row as { chunk_key?: unknown; title?: unknown; content?: unknown };
    const key = typeof record.chunk_key === "string" ? record.chunk_key : "";
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);

    const title = typeof record.title === "string" ? record.title.trim() : "";
    const content = typeof record.content === "string" ? record.content.trim().replace(/\s+/g, " ") : "";
    if (!content) continue;

    const snippet = title ? `${title}: ${content}` : content;
    const nextUsed = used + snippet.length + 2;
    if (nextUsed > maxBudget && snippets.length >= 4) break;

    snippets.push(snippet);
    used = nextUsed;
  }

  return snippets.slice(0, 12);
}

async function readCachedContext(cacheKey: string) {
  const { data, error } = await supabaseAdmin()
    .from("demo_company_context_cache")
    .select("common_caller_intents,good_questions,boundaries")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error || !data) return null;

  return {
    commonCallerIntents: stringArray(data.common_caller_intents),
    goodQuestions: stringArray(data.good_questions),
    boundaries: stringArray(data.boundaries)
  };
}

async function writeCachedContext(
  cacheKey: string,
  companyName: string,
  industry: string,
  playbook: Playbook
) {
  await supabaseAdmin().from("demo_company_context_cache").upsert(
    {
      cache_key: cacheKey,
      company_name: companyName,
      industry,
      common_caller_intents: playbook.commonCallerIntents,
      good_questions: playbook.goodQuestions,
      boundaries: playbook.boundaries,
      updated_at: new Date().toISOString()
    },
    { onConflict: "cache_key" }
  );
}

async function generateIndustryPlaybook({ companyName, industry }: { companyName: string; industry: string }) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_CONTEXT_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const abortSignal = AbortSignal.timeout(
    Number.isFinite(CONTEXT_GENERATION_TIMEOUT_MS) && CONTEXT_GENERATION_TIMEOUT_MS > 0
      ? CONTEXT_GENERATION_TIMEOUT_MS
      : 2500
  );
  const prompt = [
    `Create a compact receptionist playbook for a company named "${companyName}" in this industry/category: "${industry}".`,
    "Do not browse. Use general business knowledge only.",
    "Return strict JSON with keys: commonCallerIntents, goodQuestions, boundaries.",
    "Each key must be an array of 4 to 6 short strings.",
    "Focus on call routing, intake, safe handoff triggers, and what a receptionist should ask next.",
    "Avoid long explanations. Make each item useful for a low-latency live voice call."
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      signal: abortSignal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 600,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  const parsed = JSON.parse(text) as Partial<Pick<CompanyContext, "commonCallerIntents" | "goodQuestions" | "boundaries">>;
  return {
    commonCallerIntents: stringArray(parsed.commonCallerIntents).slice(0, 6),
    goodQuestions: stringArray(parsed.goodQuestions).slice(0, 6),
    boundaries: stringArray(parsed.boundaries).slice(0, 6)
  };
}

function fallbackPlaybook(industry: string) {
  return {
    commonCallerIntents: [
      `${industry} service inquiry`,
      "Pricing or estimate request",
      "Availability question",
      "Project or appointment request",
      "Human follow-up"
    ],
    goodQuestions: [
      "What can I help you with today?",
      "Is this for a new request or an existing one?",
      "What timeline are you hoping for?",
      "What is the best way for the team to follow up?"
    ],
    boundaries: [
      "Do not invent exact pricing, availability, legal advice, medical advice, or internal company details.",
      "For urgent, sensitive, billing, safety, or account-specific questions, collect details and offer human follow-up.",
      "Keep responses brief, answer the direct question, then ask one relevant next question."
    ]
  };
}

function cleanText(value: string | null | undefined, fallback: string) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return text || fallback;
}

function normalizeIndustry(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function contextCacheKey(companyName: string, industry: string) {
  return `${normalizeIndustry(companyName)}::${normalizeIndustry(industry)}`;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}
