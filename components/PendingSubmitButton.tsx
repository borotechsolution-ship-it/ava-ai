"use client";

import { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  children,
  pendingChildren,
  className,
  ariaLabel
}: {
  children: ReactNode;
  pendingChildren?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      aria-label={ariaLabel}
      className={className}
      data-pending={pending ? "true" : undefined}
      disabled={pending}
      type="submit"
    >
      {pending && pendingChildren ? pendingChildren : children}
    </button>
  );
}

export function PendingSubmitMessage({
  idle,
  pending
}: {
  idle: ReactNode;
  pending: ReactNode;
}) {
  const status = useFormStatus();
  return <>{status.pending ? pending : idle}</>;
}
