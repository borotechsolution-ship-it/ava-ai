import { NextResponse } from "next/server";
import { isSalesAuthorized } from "@/lib/sales-auth";
import { synthesizeSpeech, TTSProviderError, TTSProviderName } from "@/lib/tts";

type PreviewRequest = {
  text?: string;
  provider?: TTSProviderName;
};

export async function POST(request: Request) {
  if (!(await isSalesAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PreviewRequest;
  try {
    payload = (await request.json()) as PreviewRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = payload.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  try {
    const audio = await synthesizeSpeech({
      text: text.slice(0, 600),
      provider: payload.provider
    });

    return new Response(audio.body, {
      headers: {
        "Content-Type": audio.contentType,
        "Cache-Control": "no-store",
        "X-TTS-Provider": audio.provider
      }
    });
  } catch (error) {
    if (error instanceof TTSProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("TTS preview failed", error);
    return NextResponse.json({ error: "TTS preview failed" }, { status: 500 });
  }
}
