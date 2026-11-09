"use client";

import type { MouseEvent } from "react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";

/**
 * A plain left click on a link navigates through the dock, which waits for the
 * stage to leave before the route changes. Modified clicks (new tab, new
 * window) keep the browser's behaviour.
 */
export function useDockLinkClick(href: string, onNavigated?: () => void) {
  const { navigate } = useDockActions();

  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
      return;
    event.preventDefault();
    void navigate(href).then((committed) => {
      if (committed) onNavigated?.();
    });
  };
}
