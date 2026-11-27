"use client";

import { cloneElement, isValidElement, type ReactNode } from "react";
import { ui } from "@/design/ui";
import { tipProps, type TipSide as Side } from "./tip-props";
import styles from "./tooltip.module.css";

export const TOOLTIP = {
  content: ui.parts.tooltip.content(),
  dock: styles.dock,
  ink: ui.parts.tooltip.label(),
  meta: styles.meta,
} as const;

interface TooltipProps {
  children: ReactNode;
  "data-cursor-owned"?: string;
  position?: Side;
  text: string;
  triggerClassName?: string;
}

export function Tooltip({
  children,
  position = "top",
  text,
  triggerClassName,
  ...props
}: TooltipProps) {
  const tip = tipProps(text, {
    owned: "data-cursor-owned" in props,
    side: position,
  });
  if (triggerClassName === undefined && isValidElement(children)) {
    return cloneElement(children as React.ReactElement<object>, tip);
  }
  return (
    <span className={triggerClassName} {...tip}>
      {children}
    </span>
  );
}
