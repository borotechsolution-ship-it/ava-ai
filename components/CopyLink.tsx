"use client";

import { useState } from "react";

export function CopyLink({
  value,
  label = "Copy invitation URL",
  copiedLabel = "Copied",
  className = "button secondary"
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className={className}
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
