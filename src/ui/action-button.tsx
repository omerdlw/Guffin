"use client";

import type { JSX, ReactNode } from "react";
import { cn } from "@/ui/cn";
import { Magnet } from "@/motion/effects/magnet";
import { Button } from "./button";
import { Icon } from "./icon";
import { TONE } from "./page";

const BASE =
  "cine-card cine-fade group center relative w-full cursor-pointer gap-2.5 overflow-hidden rounded-full type-control font-medium select-none";

// A toggle in the hand: its icon fills when it is on, and a second label
// (Unlike, Remove) shows on hover where pressing would undo it.
export function ActionButton({
  active,
  ariaLabel,
  className,
  disabled = false,
  hoverLabel,
  icon,
  iconSize = 16,
  label,
  loading,
  onClick,
}: {
  active: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  hoverLabel?: string;
  icon: { off: string; on: string };
  iconSize?: number;
  label: ReactNode;
  loading?: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <Button
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(BASE, className, active ? TONE.chosen : TONE.surface)}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
    >
      <Magnet className="gap-2.5">
        <span
          className={cn(
            "inline-flex shrink-0 transition-[scale] duration-reveal ease-out-expo",
            active ? "scale-108" : "group-hover:scale-108",
          )}
        >
          <Icon icon={active ? icon.on : icon.off} size={iconSize} />
        </span>
        <span className="relative">
          <span
            className={cn(
              hoverLabel &&
                "cine-fade group-hover:opacity-0 group-focus-visible:opacity-0 group-has-focus-visible:opacity-0",
            )}
          >
            {label}
          </span>
          {hoverLabel ? (
            <span className="cine-fade absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
              {hoverLabel}
            </span>
          ) : null}
        </span>
      </Magnet>
    </Button>
  );
}
