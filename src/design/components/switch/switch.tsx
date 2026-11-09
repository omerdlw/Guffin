"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "../../foundations/cn";
import {
  type SwitchVariants,
  switchThumbVariants,
  switchVariants,
} from "./variants";

export interface SwitchProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange">,
    SwitchVariants {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
}

/** An on/off setting that applies at once (no submit). */
export function Switch({
  checked = false,
  className,
  disabled = false,
  onCheckedChange,
  onClick,
  ref,
  size,
  type = "button",
  ...props
}: SwitchProps) {
  const state = checked ? "checked" : "unchecked";

  return (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      data-state={state}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) onCheckedChange?.(!checked);
      }}
      className={cn(switchVariants({ size }), className)}
      {...props}
    >
      <span data-state={state} className={switchThumbVariants({ size })} />
    </button>
  );
}
