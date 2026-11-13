"use client";

import { type ReactNode, useRef, useState } from "react";
import { Tooltip as UiTooltip } from "@omerdlw/base-framework/ui";
import { TOOLTIP } from "./classes";

const SLATE = /^(.*\S)\s+\((\d{4})\)(?:,\s*(.+))?$/;

function Slate({ text }: { text: ReactNode }) {
  const slate = typeof text === "string" ? SLATE.exec(text) : null;
  if (!slate) return text;
  return (
    <>
      {slate[1]}
      <span className={TOOLTIP.meta}>
        {slate[3] ? `${slate[2]} · ${slate[3]}` : slate[2]}
      </span>
    </>
  );
}

export interface TooltipProps {
  children: ReactNode;
  "data-cursor-owned"?: string;
  position?: "top" | "right" | "bottom" | "left";
  text: ReactNode;
}

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
    <UiTooltip
      contentProps={{
        "data-cursor-owned": owned && !inModule ? "" : undefined,
      }}
      onOpenChange={(open) => {
        if (open && owned) {
          setInModule(Boolean(trigger.current?.closest(".ui-motion")));
        }
      }}
      collisionPadding={8}
      position={position}
      sideOffset={10}
      text={<Slate text={text} />}
      triggerRef={trigger}
    >
      {children}
    </UiTooltip>
  );
}
