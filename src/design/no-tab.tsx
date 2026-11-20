"use client";

import { useEffect } from "react";

export function NoTab(): null {
  useEffect(() => {
    const block = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", block, { capture: true });
    return () =>
      window.removeEventListener("keydown", block, { capture: true });
  }, []);
  return null;
}
