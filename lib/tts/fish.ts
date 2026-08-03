import { config } from "@/lib/config";
import { requireTTSConfig, throwProviderError, TTSProviderError } from "@/lib/tts/http";
import type { SynthesizeSpeechInput, SynthesizeSpeechResult } from "@/lib/tts/types";

export async function synthesizeFish(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
  const apiKey = requireTTSConfig(config.fishAudioApiKey, "FISH_AUDIO_API_KEY");
  const voiceId = requireTTSConfig(config.fishAudioVoiceId, "FISH_AUDIO_VOICE_ID");
  const response = await fetch(`${config.fishAudioBaseUrl.replace(/\/$/, "")}/api/open/v1/speech/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: input.text,
      voiceId,
      modelId: config.fishAudioModelId,
      format: "mp3",
      latency: "balanced"
    })
  });

  if (!response.ok) await throwProviderError("Fish Audio", response);
  if (!response.body) throw new TTSProviderError("Fish Audio TTS returned no audio body", 502);
  const body = response.body;

  return {
    provider: "fish",
    contentType: response.headers.get("content-type") || "audio/mpeg",
    body
  };
}
