"use client";

import { useEffect, useState } from "react";

export function CallStatusText() {
  const [label, setLabel] = useState("Loading");

  useEffect(() => {
    const handleStarted = () => setLabel("Live");
    const handleEnded = () => setLabel("Ended");
    const handleFailed = () => setLabel("Issue");

    window.addEventListener("ava-call-started", handleStarted);
    window.addEventListener("ava-call-ended", handleEnded);
    window.addEventListener("ava-call-failed", handleFailed);
    return () => {
      window.removeEventListener("ava-call-started", handleStarted);
      window.removeEventListener("ava-call-ended", handleEnded);
      window.removeEventListener("ava-call-failed", handleFailed);
    };
  }, []);

  return <strong>{label}</strong>;
}
