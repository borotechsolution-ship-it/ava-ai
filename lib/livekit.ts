import { config } from "@/lib/config";
import { AccessToken, AgentDispatchClient, RoomServiceClient } from "livekit-server-sdk";

export const AVA_AGENT_NAME = "ava";

export async function createLiveKitToken(params: {
  roomName: string;
  participantIdentity: string;
  ttlSeconds: number;
}) {
  const token = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
    identity: params.participantIdentity,
    ttl: params.ttlSeconds
  });

  token.addGrant({
    room: params.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  return token.toJwt();
}

export async function dispatchAvaAgent(
  roomName: string,
  metadata: {
    companyName?: string | null;
    prospectName?: string | null;
    industry?: string | null;
    salesAccountId?: string | null;
    inviteId?: string | null;
    sessionId?: string | null;
    geminiKeySlot?: string | null;
    companyContext?: unknown;
  } = {}
) {
  const dispatcher = new AgentDispatchClient(
    normalizeLiveKitHost(config.livekitUrl),
    config.livekitApiKey,
    config.livekitApiSecret
  );

  return dispatcher.createDispatch(roomName, AVA_AGENT_NAME, {
    metadata: JSON.stringify({
      product: "private_voice_demo",
      companyName: metadata.companyName || "your company",
      prospectName: metadata.prospectName || "",
      industry: metadata.industry || "",
      salesAccountId: metadata.salesAccountId || "",
      inviteId: metadata.inviteId || "",
      sessionId: metadata.sessionId || "",
      geminiKeySlot: metadata.geminiKeySlot || "",
      companyContext: metadata.companyContext || null
    })
  });
}

export async function endLiveKitRoom(roomName: string) {
  if (!roomName) return;

  const rooms = new RoomServiceClient(
    normalizeLiveKitHost(config.livekitUrl),
    config.livekitApiKey,
    config.livekitApiSecret
  );

  await rooms.deleteRoom(roomName).catch((error) => {
    console.error("Failed to delete LiveKit room", error);
  });
}

function normalizeLiveKitHost(url: string) {
  return url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}
