"use client";

import { useState } from "react";

export function EndCallButton() {
  const [isEnding, setIsEnding] = useState(false);

  const endCall = async () => {
    if (isEnding) return;
    setIsEnding(true);

    window.dispatchEvent(new CustomEvent("ava-call-ended", { detail: { reason: "completed" } }));
    await fetch("/api/demo/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "completed" })
    }).catch(() => undefined);
  };

  return (
    <button
      type="button"
      className="phone-end-call-button"
      onClick={endCall}
      disabled={isEnding}
      aria-label="End call"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.1-2.1c.3-.3.7-.4 1.1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1.1l-2.2 2.1Z" />
      </svg>
    </button>
  );
}
