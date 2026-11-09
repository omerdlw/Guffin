"use client";

import type { ReactNode } from "react";
import { BouncingDots } from "loading-dev";
import { cn } from "../../foundations/cn";
import { Icon } from "../icon";

const LOADER = "pointer-events-none shrink-0 leading-none select-none";
const LAYER = "col-start-1 row-start-1";

export interface LoaderProps {
  /** Content whose size the loader keeps while it plays over it. */
  children?: ReactNode;
  className?: string;
  color?: string;
  size?: number;
}

/** Three bouncing dots, inline at 1em, or laid over `children`. */
export function Loader({ children, className, color, size = 14 }: LoaderProps) {
  const dots = <BouncingDots size={size} color={color} />;

  if (children) {
    return (
      <span
        aria-label="Loading"
        className={cn(LOADER, "inline-grid place-items-center", className)}
        role="status"
      >
        <span className={cn("invisible select-none", LAYER)}>{children}</span>
        <span className={cn("center", LAYER)}>{dots}</span>
      </span>
    );
  }

  return (
    <span
      aria-label="Loading"
      className={cn(
        LOADER,
        "inline-flex h-[1em] items-center justify-center",
        className,
      )}
      role="status"
    >
      {dots}
    </span>
  );
}

/** A spinning glyph, for a loader that sits beside text. */
export function Spinner({
  className,
  size = 15,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      aria-label="Loading"
      className={cn(
        "inline-flex animate-spin items-center justify-center align-middle leading-none",
        className,
      )}
      role="status"
    >
      <Icon icon="mingcute:loading-3-fill" size={size} />
    </div>
  );
}
