"use client";

import type { ReactNode } from "react";
import { useAccountPart } from "../motion";

// The member's avatar, developed beside their name.
export function AvatarStage({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div
      {...useAccountPart("avatar")}
      aria-label={label}
      className={className}
      role="img"
    >
      {children}
    </div>
  );
}
