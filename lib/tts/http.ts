export class TTSProviderError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}

export function requireTTSConfig(value: string, name: string) {
  if (!value) throw new TTSProviderError(`Missing ${name}`, 503);
  return value;
}

export async function throwProviderError(provider: string, response: Response): Promise<never> {
  const body = await response.text().catch(() => "");
  throw new TTSProviderError(`${provider} TTS failed (${response.status}): ${body || response.statusText}`, response.status);
}
