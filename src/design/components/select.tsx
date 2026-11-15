"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import {
  Select as UiSelect,
  type SelectProps,
} from "@omerdlw/base-framework/ui";

const FLOATING = { "data-cinematic": "" } as const;

// Like any select box, a menu opens on its chosen option, centred in view,
// not at the top of a long list.
function revealChosen(event: KeyboardEvent | MouseEvent) {
  const trigger = (event.target as Element).closest('[role="combobox"]');
  if (!trigger || trigger.getAttribute("aria-expanded") === "true") return;
  const id = trigger.getAttribute("aria-controls");
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const menu = id ? document.getElementById(id) : null;
      const chosen = menu?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!menu || !chosen) return;
      menu.scrollTop =
        chosen.offsetTop - (menu.clientHeight - chosen.offsetHeight) / 2;
    }),
  );
}

export function Select<T extends string = string>(props: SelectProps<T>) {
  return (
    <div
      className="contents"
      onClickCapture={revealChosen}
      onKeyDownCapture={revealChosen}
    >
      <UiSelect
        collisionPadding={12}
        floatingProps={FLOATING}
        offset={6}
        {...props}
      />
    </div>
  );
}
