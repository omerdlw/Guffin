"use client";

import type { InputHTMLAttributes, Ref, TextareaHTMLAttributes } from "react";
import { cn } from "../../foundations/cn";
import { type InputVariants, inputVariants } from "./variants";

export interface InputProps
  extends
    Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    Omit<InputVariants, "size"> {
  ref?: Ref<HTMLInputElement>;
  size?: Exclude<InputVariants["size"], "area">;
}

/** A single-line field. `<Input placeholder="Name" />` is a 40px card field. */
export function Input({
  appearance,
  className,
  ref,
  shape,
  size = "md",
  type = "text",
  ...props
}: InputProps) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(inputVariants({ appearance, shape, size }), className)}
      {...props}
    />
  );
}

export interface TextareaProps
  extends
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    Omit<InputVariants, "size"> {
  maxHeight?: number;
  minHeight?: number;
  ref?: Ref<HTMLTextAreaElement>;
}

/** A multi-line field, bounded by `minHeight` and `maxHeight` in px. */
export function Textarea({
  appearance,
  className,
  maxHeight,
  minHeight,
  ref,
  shape,
  style,
  ...props
}: TextareaProps) {
  return (
    <textarea
      ref={ref}
      className={cn(
        inputVariants({ appearance, shape, size: "area" }),
        className,
      )}
      style={{ maxHeight, minHeight, ...style }}
      {...props}
    />
  );
}
