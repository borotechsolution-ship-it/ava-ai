import { NextRequest, NextResponse } from "next/server";
import { completeSession, failBeforeUse, markMeaningfulInteraction, startSessionClock } from "@/lib/session-events";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    event?: string;
    reason?: string;
    aiSpeechSeconds?: number;
  };

  if (body.event === "meaningful_interaction") {
    return NextResponse.json({ ok: await markMeaningfulInteraction() });
  }

  if (body.event === "call_started") {
    const expiresAt = await startSessionClock();
    return NextResponse.json({ ok: Boolean(expiresAt), expiresAt });
  }

  if (body.event === "completed") {
    return NextResponse.json({ ok: await completeSession("completed", Number(body.aiSpeechSeconds || 0)) });
  }

  if (body.event === "timed_out") {
    return NextResponse.json({ ok: await completeSession("timed_out", Number(body.aiSpeechSeconds || 0)) });
  }

  if (body.event === "infrastructure_failed_before_use") {
    return NextResponse.json({ ok: await failBeforeUse(body.reason || "infrastructure failure before use") });
  }

  return NextResponse.json({ error: "Unsupported event." }, { status: 400 });
}
