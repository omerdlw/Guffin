"use client";

import type { JSX, ReactNode } from "react";
import { Magnet } from "@/motion/tilt";
import { cn } from "../../foundations/cn";
import { Icon } from "../icon";
import { Button } from "./button";

export interface ActionButtonProps {
  active: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  /** A second label that replaces the first while the button is pointed at. */
  hoverLabel?: string;
  icon: { off: string; on: string };
  iconSize?: number;
  label: ReactNode;
  loading?: boolean;
  onClick: () => void;
}

/**
 * A toggle on a detail page (watched, liked, listed): a pill that turns
 * chosen when active, its glyph swelling and following the pointer.
 */
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
}: ActionButtonProps): JSX.Element {
  return (
    <Button
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        "cine-card cine-fade group w-full gap-2.5 overflow-hidden",
        className,
      )}
      disabled={disabled}
      intent={active ? "chosen" : "neutral"}
      loading={loading}
      onClick={onClick}
      shape="pill"
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
            <span className="cine-fade absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-has-focus-visible:opacity-100">
              {hoverLabel}
            </span>
          ) : null}
        </span>
      </Magnet>
    </Button>
  );
}
