"use client";

import { Input as UiInput, type InputProps } from "@omerdlw/base-framework/ui";

export function Input({ size = "md", ...props }: InputProps) {
  return <UiInput size={size} {...props} />;
}
