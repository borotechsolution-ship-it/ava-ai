export type TTSProviderName = "cartesia" | "fish";

export type SynthesizeSpeechInput = {
  text: string;
  provider?: TTSProviderName;
};

export type SynthesizeSpeechResult = {
  provider: TTSProviderName;
  contentType: string;
  body: ReadableStream<Uint8Array>;
};
