"use client";

import { useState } from "react";

export function StartVoiceDemoButton({ token }: { token: string }) {
  const [isStarting, setIsStarting] = useState(false);

  return (
    <form
      action={`/api/invite/${token}/redeem`}
      method="post"
      className="call-actions"
      onSubmit={() => setIsStarting(true)}
    >
      <button
        className="call-button"
        type="submit"
        aria-label="Call Ava and start voice demo"
        disabled={isStarting}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.3-.3.75-.4 1.14-.27 1.25.41 2.6.63 3.95.63.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.83 21 3 13.17 3 3.5c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.35.22 2.7.63 3.95.13.39.03.84-.27 1.14l-2.24 2.2Z" />
        </svg>
      </button>
      <p>{isStarting ? "Starting your secure call with Ava..." : "Tap to call Ava. Your invite is consumed only when the call starts."}</p>
    </form>
  );
}
