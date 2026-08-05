"use client";

import { ReactNode, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PendingLink({
  children,
  href,
  className,
  disabled = false,
  pendingChildren = "Loading..."
}: {
  children: ReactNode;
  href: string;
  className?: string;
  disabled?: boolean;
  pendingChildren?: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <a
      aria-busy={pending}
      aria-disabled={disabled || pending}
      className={className}
      data-pending={pending ? "true" : undefined}
      href={disabled ? undefined : href}
      onClick={(event) => {
        if (disabled || pending) {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        startTransition(() => {
          router.push(href);
        });
      }}
    >
      {pending ? pendingChildren : children}
    </a>
  );
}
