"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function secondsUntil(expiresAt: string) {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function CallCountdown({ expiresAt, totalSeconds = 150 }: { expiresAt: string; totalSeconds?: number }) {
  const timeoutSentRef = useRef(false);
  const [phase, setPhase] = useState<"waiting" | "live" | "ended" | "failed">("waiting");
  const [activeExpiresAt, setActiveExpiresAt] = useState(expiresAt);
  const [remaining, setRemaining] = useState(totalSeconds);
  const progress = useMemo(() => Math.max(0, Math.min(1, remaining / totalSeconds)), [remaining, totalSeconds]);

  useEffect(() => {
    const handleStarted = (event: Event) => {
      const detail = (event as CustomEvent<{ expiresAt?: string }>).detail;
      const nextExpiresAt = detail?.expiresAt || new Date(Date.now() + totalSeconds * 1000).toISOString();
      timeoutSentRef.current = false;
      setActiveExpiresAt(nextExpiresAt);
      setRemaining(totalSeconds);
      setPhase("live");
    };

    const handleEnded = () => {
      setRemaining(0);
      setPhase("ended");
    };

    const handleFailed = () => {
      setRemaining(0);
      setPhase("failed");
    };

    window.addEventListener("ava-call-started", handleStarted);
    window.addEventListener("ava-call-ended", handleEnded);
    window.addEventListener("ava-call-failed", handleFailed);
    return () => {
      window.removeEventListener("ava-call-started", handleStarted);
      window.removeEventListener("ava-call-ended", handleEnded);
      window.removeEventListener("ava-call-failed", handleFailed);
    };
  }, [totalSeconds]);

  useEffect(() => {
    if (phase !== "live") return;

    const timer = window.setInterval(() => {
      const nextRemaining = secondsUntil(activeExpiresAt);
      setRemaining(nextRemaining);

      if (nextRemaining <= 0 && !timeoutSentRef.current) {
        timeoutSentRef.current = true;
        window.dispatchEvent(new CustomEvent("ava-call-ended", { detail: { reason: "timed_out" } }));
        void fetch("/api/demo/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event: "timed_out" })
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeExpiresAt, phase]);

  const label = phase === "live" ? "Time left" : phase === "ended" ? "Call ended" : phase === "failed" ? "Could not start" : "Starting Ava";
  const value = phase === "live" ? formatTime(remaining) : phase === "ended" ? "0:00" : phase === "failed" ? "!" : "--";

  return (
    <div className={`call-countdown ${phase}`} aria-live="polite">
      <span>{label}</span>
      <strong suppressHydrationWarning>{value}</strong>
      <div className="countdown-track">
        <i suppressHydrationWarning style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  );
}
