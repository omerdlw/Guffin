"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../foundations/cn";
import { Icon } from "../icon";
import { Loader } from "../loader";
import {
  type CheckboxVariants,
  checkboxVariants,
  checkGlyphVariants,
} from "./variants";

const GLYPH = { md: 16, sm: 14 } as const;

export interface CheckboxIndicatorProps extends Omit<
  CheckboxVariants,
  "checked"
> {
  checked: boolean;
  className?: string;
  /** Plays the loader in place of the check while a change is saving. */
  pending?: boolean;
}

/**
 * The check alone, for a row that is itself the checkbox (it carries
 * `role="checkbox"` or `aria-pressed` and the `group` class).
 */
export function CheckboxIndicator({
  checked,
  className,
  pending = false,
  reveal,
  size = "md",
}: CheckboxIndicatorProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(checkboxVariants({ checked, reveal, size }), className)}
    >
      {pending ? (
        <Loader />
      ) : (
        <Icon
          className={checkGlyphVariants({ checked, reveal })}
          icon="material-symbols:check-rounded"
          size={GLYPH[size ?? "md"]}
        />
      )}
    </span>
  );
}

export interface CheckboxProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange">,
    Omit<CheckboxIndicatorProps, "className"> {
  children?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
}

/** A labelled checkbox: the check, then `children` as its label. */
export function Checkbox({
  checked,
  children,
  className,
  disabled,
  onCheckedChange,
  onClick,
  pending,
  ref,
  reveal,
  size,
  type = "button",
  ...props
}: CheckboxProps) {
  return (
    <button
      ref={ref}
      type={type}
      role="checkbox"
      aria-checked={checked}
      aria-busy={pending || undefined}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) onCheckedChange?.(!checked);
      }}
      className={cn(
        "group inline-flex cursor-pointer items-center gap-2.5 type-body text-ink-body select-none hover:text-ink focus-visible:text-ink disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxIndicator
        checked={checked}
        pending={pending}
        reveal={reveal}
        size={size}
      />
      {children}
    </button>
  );
}
