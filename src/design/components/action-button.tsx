"use client";

import type { JSX, ReactNode } from "react";
import { Button } from "@omerdlw/base-framework/ui";
import { cn } from "@/design/ui";
import { Magnet } from "@/motion/tilt";
import { Icon } from "./icon";

interface ActionButtonProps {
  active: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  hoverLabel?: string;
  icon: { off: string; on: string };
  iconSize?: number;
  label: ReactNode;
  loading?: boolean;
  mark?: string;
  onClick: () => void;
}

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
  mark,
  onClick,
}: ActionButtonProps): JSX.Element {
  return (
    <Button
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        "cine-card group w-full gap-2.5 overflow-hidden",
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
            "inline-flex shrink-0",
            active ? ["scale-108", mark] : "group-hover:scale-108",
          )}
        >
          <Icon icon={active ? icon.on : icon.off} size={iconSize} />
        </span>
        <span className="grid justify-items-center whitespace-nowrap">
          <span
            className={cn(
              "col-start-1 row-start-1",
              hoverLabel && "group-hover:opacity-0",
            )}
          >
            {label}
          </span>
          {hoverLabel ? (
            <span className="col-start-1 row-start-1 opacity-0 group-hover:opacity-100 ">
              {hoverLabel}
            </span>
          ) : null}
        </span>
      </Magnet>
    </Button>
  );
}
