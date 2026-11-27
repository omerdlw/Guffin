import type { JSX } from "react";
import { TONES } from "@/design/foundations/tones";
import { cn } from "@/design/ui";

const SHAPE = "rounded-full px-fib-4 h-control-sm type-control font-medium";

export function ShowMore({
  className = SHAPE,
  onClick,
  pending,
}: {
  className?: string;
  onClick: () => void;
  pending: boolean;
}): JSX.Element {
  return (
    <button
      aria-busy={pending || undefined}
      className={cn(
        TONES.outline,
        className,
        "self-center disabled:opacity-50",
      )}
      disabled={pending}
      onClick={onClick}
      type="button"
    >
      {pending ? "Loading…" : "Show more"}
    </button>
  );
}
