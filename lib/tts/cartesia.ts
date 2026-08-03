import { config } from "@/lib/config";
import { requireTTSConfig, throwProviderError, TTSProviderError } from "@/lib/tts/http";
import type { SynthesizeSpeechInput, SynthesizeSpeechResult } from "@/lib/tts/types";

export async function synthesizeCartesia(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
  const apiKey = requireTTSConfig(config.cartesiaApiKey, "CARTESIA_API_KEY");
  const voiceId = requireTTSConfig(config.cartesiaVoiceId, "CARTESIA_VOICE_ID");
  const response = await fetch(`${config.cartesiaBaseUrl.replace(/\/$/, "")}/tts/bytes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Cartesia-Version": config.cartesiaVersion,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model_id: config.cartesiaModelId,
      transcript: input.text,
      voice: {
        mode: "id",
        id: voiceId
      },
      output_format: {
        container: "mp3",
        bit_rate: 64000
      }
    })
  });

  if (!response.ok) await throwProviderError("Cartesia", response);
  if (!response.body) throw new TTSProviderError("Cartesia TTS returned no audio body", 502);
  const body = response.body;

  return {
    provider: "cartesia",
    contentType: response.headers.get("content-type") || "audio/mpeg",
    body
  };
}
