"use client";

import { useCallback } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useSurfacePreload } from "@/design/lazy-surface";
import { ui } from "@/design/ui";
import { signInSurface } from "./surfaces";

export const AUTH_INPUT_CLASS = ui.parts.input.field({
  className: "h-10 w-full px-4 type-body",
});

export function useOpenSignIn(): () => void {
  const { openSurface } = useDockActions();
  useSurfacePreload(signInSurface);
  return useCallback(() => {
    void signInSurface.open(openSurface, {
      data: { next: window.location.pathname + window.location.search },
    });
  }, [openSurface]);
}
