"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  ConnectionCheck,
  LogLevel,
  RemoteTrack,
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  setLogExtension,
  setLogLevel
} from "livekit-client";

type VoiceState = "connecting" | "ready" | "listening" | "needs-interaction" | "ended" | "error";

export function LiveKitVoiceSession({
  livekitUrl,
  token,
  totalSeconds = 150
}: {
  livekitUrl: string;
  token: string;
  totalSeconds?: number;
}) {
  const roomRef = useRef<Room | null>(null);
  const audioHostRef = useRef<HTMLDivElement | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const [state, setState] = useState<VoiceState>("connecting");
  const [message, setMessage] = useState("Connecting secure audio room...");
  const [detail, setDetail] = useState("");
  const [hasAvaAudio, setHasAvaAudio] = useState(false);
  const [isAvaAudioPlaying, setIsAvaAudioPlaying] = useState(false);
  const clockStartedRef = useRef(false);
  const endRequestedRef = useRef(false);
  const avaAudioReceivedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    setLogLevel(LogLevel.debug);
    setLogExtension((level, msg, context) => {
      if (endRequestedRef.current) return;
      if (!mounted || level < LogLevel.warn || !msg.toLowerCase().includes("websocket")) return;
      setDetail((current) => {
        const line = compactLiveKitLog(msg, context);
        if (!line || current.includes(line)) return current;
        return current ? `${current}\n${line}` : line;
      });
    });

    const room = new Room({
      adaptiveStream: false,
      dynacast: false,
      singlePeerConnection: false
    });
    roomRef.current = room;

    const checkAvaAudioPlayback = () => {
      const isPlaying = audioElementsRef.current.some((element) => {
        return !element.paused && !element.ended && element.readyState > HTMLMediaElement.HAVE_CURRENT_DATA;
      });

      setIsAvaAudioPlaying(isPlaying);
      if (isPlaying) {
        void startCallClockOnce(clockStartedRef, totalSeconds);
        setDetail("");
        setMessage("Ava audio connected. Speak naturally.");
        return;
      }

      setState("needs-interaction");
      setMessage("Tap enable audio so your browser can play Ava's voice.");
    };

    const playAvaAudio = async () => {
      const elements = audioElementsRef.current;
      if (!elements.length) return;

      await room.startAudio().catch(() => undefined);
      await Promise.all(
        elements.map(async (element) => {
          element.muted = false;
          element.volume = 1;
          await element.play();
        })
      );

      window.setTimeout(() => {
        if (mounted) checkAvaAudioPlayback();
      }, 250);
    };

    const attachAudio = (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio || !audioHostRef.current) return;
      avaAudioReceivedRef.current = true;

      const element = track.attach();
      element.autoplay = true;
      element.muted = false;
      element.setAttribute("playsinline", "true");
      element.volume = 1;
      element.dataset.livekitAudio = "ava";
      element.addEventListener("playing", () => {
        if (!mounted) return;
        void startCallClockOnce(clockStartedRef, totalSeconds);
        setIsAvaAudioPlaying(true);
        setState("listening");
        setDetail("");
        setMessage("Ava audio connected. Speak naturally.");
      });
      element.addEventListener("canplay", () => {
        if (!mounted) return;
        void playAvaAudio().catch(() => {
          if (!mounted) return;
          setState("needs-interaction");
          setMessage("Tap enable audio so your browser can play Ava's voice.");
        });
      });
      audioHostRef.current.appendChild(element);
      audioElementsRef.current.push(element);
      setHasAvaAudio(true);

      void playAvaAudio()
        .then(() => {
          window.setTimeout(() => {
            if (mounted) checkAvaAudioPlayback();
          }, 800);
        })
        .catch(() => {
          if (!mounted) return;
          setState("needs-interaction");
          setMessage("Tap enable audio so your browser can play Ava's voice.");
        });
    };

    const connect = async () => {
      try {
        room.on(RoomEvent.TrackSubscribed, attachAudio);
        room.on(RoomEvent.Disconnected, () => {
          if (!mounted) return;
          if (endRequestedRef.current) {
            setState("ended");
            setMessage("Call ended.");
            setDetail("");
            return;
          }
          setState("error");
          setMessage("Ava is temporarily busy. Please try again in about one minute.");
          window.dispatchEvent(new CustomEvent("ava-call-failed", { detail: { reason: "provider_temporarily_busy" } }));
        });

        const connectUrl = normalizeLiveKitUrl(livekitUrl);
        await room.connect(connectUrl, token, {
          websocketTimeout: 20_000
        });
        if (!mounted) return;

        const mic = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        });
        await room.localParticipant.publishTrack(mic);

        if (!mounted) return;
        setState("ready");
        setMessage("Microphone ready. Ava is joining now...");

        const dispatchResponse = await fetch("/api/demo/dispatch", { method: "POST" });
        if (!dispatchResponse.ok) {
          endRequestedRef.current = true;
          room.disconnect();
          setState("error");
          setMessage("Ava is temporarily busy. Please try again in about one minute.");
          window.dispatchEvent(new CustomEvent("ava-call-failed", { detail: { reason: "ava_dispatch_failed" } }));
          return;
        }

        if (!mounted) return;
        setMessage("Ava is joining. Keep this page open.");

        window.setTimeout(() => {
          if (!mounted || endRequestedRef.current || clockStartedRef.current || avaAudioReceivedRef.current) return;
          endRequestedRef.current = true;
          room.disconnect();
          setState("error");
          setMessage("Ava did not join the room. This invite was restored so you can try again.");
          window.dispatchEvent(new CustomEvent("ava-call-failed", { detail: { reason: "ava_audio_timeout" } }));
          void fetch("/api/demo/events", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              event: "infrastructure_failed_before_use",
              reason: "Ava did not publish audio within 45 seconds."
            })
          });
        }, 45_000);
      } catch (error) {
        if (!mounted) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "Could not connect microphone audio.");
        const diagnostic = await runLiveKitDiagnostic(normalizeLiveKitUrl(livekitUrl), token);
        if (mounted) setDetail(diagnostic);
      }
    };

    void connect();

    return () => {
      mounted = false;
      room.off(RoomEvent.TrackSubscribed, attachAudio);
      audioElementsRef.current.forEach((element) => {
        element.pause();
        element.remove();
      });
      audioElementsRef.current = [];
      room.disconnect();
      roomRef.current = null;
    };
  }, [livekitUrl, token, totalSeconds]);

  useEffect(() => {
    const handleEnd = () => {
      endRequestedRef.current = true;
      roomRef.current?.disconnect();
      setIsAvaAudioPlaying(false);
      setState("ended");
      setMessage("Call ended.");
      setDetail("");
    };

    window.addEventListener("ava-call-ended", handleEnd);
    return () => window.removeEventListener("ava-call-ended", handleEnd);
  }, []);

  const enableAudio = async () => {
    await roomRef.current?.startAudio().catch(() => undefined);

    const audioElements = audioElementsRef.current.length
      ? audioElementsRef.current
      : Array.from(audioHostRef.current?.querySelectorAll("audio") || []);

    await Promise.all(
      audioElements.map(async (element) => {
        element.muted = false;
        element.volume = 1;
        await element.play().catch(() => undefined);
      })
    );

    const isPlaying = audioElements.some((element) => {
      return !element.paused && !element.ended && element.readyState > HTMLMediaElement.HAVE_CURRENT_DATA;
    });

    setIsAvaAudioPlaying(isPlaying);
    setState(isPlaying ? "listening" : "needs-interaction");
    setMessage(isPlaying ? "Audio enabled. Ava can speak now." : "Audio is still blocked. Tap again after the page is focused.");
  };

  return (
    <div className={`voice-session-bridge ${state}`}>
      <div>
        <span>{state === "error" ? "Audio issue" : state === "ended" ? "Voice room ended" : "Voice room"}</span>
        <strong>{message}</strong>
        {hasAvaAudio && state !== "error" && state !== "ended" ? (
          <p>{isAvaAudioPlaying ? "Ava voice stream is playing." : "Ava voice stream is waiting for browser playback."}</p>
        ) : null}
        {detail ? <p>{detail}</p> : null}
      </div>
      {(state === "needs-interaction" || (hasAvaAudio && !isAvaAudioPlaying && state !== "error" && state !== "ended")) ? (
        <button type="button" onClick={enableAudio}>
          Enable Ava audio
        </button>
      ) : null}
      <div ref={audioHostRef} className="voice-session-audio" aria-hidden="true" />
    </div>
  );
}

function compactLiveKitLog(message: string, context?: object) {
  const payload = context ? safeStringify(context) : "";
  return payload ? `${message}: ${payload}` : message;
}

function safeStringify(value: object) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function normalizeLiveKitUrl(url: string) {
  return url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

async function runLiveKitDiagnostic(livekitUrl: string, token: string) {
  try {
    const check = new ConnectionCheck(livekitUrl, token);
    const result = await check.checkWebsocket();
    const messages = result.logs
      .filter((log) => log.level === "error" || log.level === "warning")
      .map((log) => log.message);

    return messages[0] || `LiveKit websocket check finished with status: ${result.status}.`;
  } catch (error) {
    return error instanceof Error ? `LiveKit diagnostic failed: ${error.message}` : "LiveKit diagnostic failed.";
  }
}

async function startCallClockOnce(clockStartedRef: MutableRefObject<boolean>, totalSeconds: number) {
  if (clockStartedRef.current) return;
  clockStartedRef.current = true;

  window.dispatchEvent(
    new CustomEvent("ava-call-started", {
      detail: {
        expiresAt: new Date(Date.now() + totalSeconds * 1000).toISOString()
      }
    })
  );

  const response = await fetch("/api/demo/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event: "call_started" })
  }).catch(() => null);

  const payload = (await response?.json().catch(() => null)) as { expiresAt?: string } | null;
  if (payload?.expiresAt) {
    window.dispatchEvent(new CustomEvent("ava-call-started", { detail: { expiresAt: payload.expiresAt } }));
  }
}
