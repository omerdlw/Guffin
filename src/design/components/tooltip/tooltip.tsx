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
  /**
   * Renders the trigger span here, on the client. Server components must use
   * this instead of passing their own element: during SSR such a child can be
   * a lazy reference, so the UI Tooltip wraps it in an extra span and
   * hydration mismatches.
   */
  triggerClassName?: string;
}

export function Tooltip({
  children,
  position = "top",
  text,
  triggerClassName,
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
      {triggerClassName === undefined ? (
        children
      ) : (
        <span className={triggerClassName}>{children}</span>
      )}
    </UiTooltip>
  );
}
