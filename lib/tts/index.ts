import { config } from "@/lib/config";
import { synthesizeCartesia } from "@/lib/tts/cartesia";
import { synthesizeFish } from "@/lib/tts/fish";
import { TTSProviderError } from "@/lib/tts/http";
import type { SynthesizeSpeechInput, SynthesizeSpeechResult, TTSProviderName } from "@/lib/tts/types";

export function selectedTTSProvider(provider = config.ttsProvider): TTSProviderName {
  if (provider === "cartesia" || provider === "fish") return provider;
  throw new TTSProviderError(`Unsupported TTS_PROVIDER: ${provider}`, 400);
}

export async function synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
  const provider = selectedTTSProvider(input.provider);

  if (provider === "fish") {
    return synthesizeFish(input);
  }

  return synthesizeCartesia(input);
}

export type { SynthesizeSpeechInput, SynthesizeSpeechResult, TTSProviderName };
export { TTSProviderError };
