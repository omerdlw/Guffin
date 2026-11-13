"use client";

import { Icon as UiIcon, type IconProps } from "@omerdlw/base-framework/ui";

export type { IconProps };

export function Icon({ className = "center", size = 20, ...props }: IconProps) {
  return <UiIcon className={className} size={size} {...props} />;
}
