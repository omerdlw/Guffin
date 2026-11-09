"use client";

import { type ReactNode, useRef, useState } from "react";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../foundations/cn";
import { TOOLTIP } from "./classes";

const SLATE = /^(.*\S)\s+\((\d{4})\)(?:,\s*(.+))?$/;

function Ink({ text }: { text: ReactNode }) {
  const slate = typeof text === "string" ? SLATE.exec(text) : null;
  return (
    <span className={TOOLTIP.ink}>
      {slate ? (
        <>
          {slate[1]}
          <span className={TOOLTIP.meta}>
            {slate[3] ? `${slate[2]} · ${slate[3]}` : slate[2]}
          </span>
        </>
      ) : (
        text
      )}
    </span>
  );
}

export interface TooltipProps {
  children: ReactNode;
  "data-cursor-owned"?: string;
  position?: "top" | "right" | "bottom" | "left";
  text: ReactNode;
}

/**
 * A frosted label on hover and focus. A string such as "Title (1999), Note"
 * is set as a slate: the title, then the year and note in muted ink.
 * `data-cursor-owned` lets the reticle draw the label instead, outside a
 * dock module.
 */
export function Tooltip({
  children,
  position = "top",
  text,
  ...props
}: TooltipProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [inModule, setInModule] = useState(false);
  const owned = "data-cursor-owned" in props;

  return (
    <TooltipPrimitive.Root
      onOpenChange={(open) => {
        if (open && owned) {
          setInModule(Boolean(trigger.current?.closest(".ui-motion")));
        }
      }}
    >
      <TooltipPrimitive.Trigger asChild ref={trigger}>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={position}
          align="center"
          sideOffset={10}
          collisionPadding={8}
          className={cn(TOOLTIP.content, "pointer-events-none select-none")}
          style={{ zIndex: Z_INDEX.TOOLTIP }}
          data-cursor-owned={owned && !inModule ? "" : undefined}
        >
          <Ink text={text} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
