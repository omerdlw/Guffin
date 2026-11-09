"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "../../foundations/cn";
import { Loader } from "../loader";
import { type ButtonVariants, buttonVariants } from "./variants";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {
  /** Keeps the label's width and lays the loader over it. */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** Disabled and busy for a bare button, which draws no surface of its own. */
const BARE =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:aria-busy:cursor-wait disabled:aria-busy:opacity-100";

const LAYER = "col-start-1 row-start-1";

/**
 * The button. Give it an `intent` to draw it from `buttonVariants`; without one
 * it is bare, for a caller that composes its own surface (a card, a tab).
 *
 *   <Button intent="primary">Save</Button>
 *   <Button intent="ghost" icon shape="pill" size="sm" aria-label="Close">
 *     <Icon icon="…" />
 *   </Button>
 */
export function Button({
  children,
  className,
  disabled = false,
  icon,
  intent,
  loading = false,
  ref,
  shape,
  size,
  type = "button",
  width,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
      className={cn(
        intent == null
          ? BARE
          : buttonVariants({ icon, intent, shape, size, width }),
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-grid place-items-center">
          <span className={cn("invisible select-none", LAYER)}>{children}</span>
          <span className={cn("center", LAYER)}>
            <Loader />
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
