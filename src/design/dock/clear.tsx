"use client";

import { type JSX, useLayoutEffect, useRef } from "react";
import { useDockSelector } from "@omerdlw/base-framework/dock";

// A surface floats over the page behind its veil; the page keeps the room it
// had for the resting dock. Following the open surface's height re-laid the
// page out 2–4 times per open, and layers moving in different frames made the
// background jump and tear.
export function DockClear({
  edge = "padding",
  extra,
}: {
  edge?: "padding" | "bottom";
  extra: string;
}): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const written = useRef(false);
  const height = useDockSelector((state) => state.dockHeight);
  const surface = useDockSelector(
    (state) =>
      state.isSurfaceOpen ||
      (state.surfaceLifecycle !== "" && state.surfaceLifecycle !== "idle"),
  );

  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent || height <= 0) return;
    if (surface && written.current) return;
    written.current = true;
    parent.style.setProperty(
      edge === "padding" ? "padding-bottom" : "bottom",
      `calc(${Math.round(height)}px + ${extra})`,
    );
  }, [edge, extra, height, surface]);

  return <span hidden ref={ref} />;
}
