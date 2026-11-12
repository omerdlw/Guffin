"use client";

import {
  Select as UiSelect,
  type SelectProps,
} from "@omerdlw/base-framework/design";

const FLOATING = { "data-cinematic": "" } as const;

export function Select<T extends string = string>(props: SelectProps<T>) {
  return (
    <UiSelect
      collisionPadding={12}
      floatingProps={FLOATING}
      offset={6}
      {...props}
    />
  );
}
