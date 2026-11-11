"use client";

import {
  Select as UiSelect,
  type SelectProps,
} from "@omerdlw/base-framework/ui";

const FLOATING = { "data-cinematic": "" } as const;

export function Select<T extends string = string>(props: SelectProps<T>) {
  return <UiSelect floatingProps={FLOATING} {...props} />;
}
