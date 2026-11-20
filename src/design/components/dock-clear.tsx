"use client";

import { type JSX, useLayoutEffect, useRef } from "react";
import { useDockSelector } from "@omerdlw/base-framework/dock";

export function DockClear({
  edge = "padding",
  extra,
}: {
  edge?: "padding" | "bottom";
  extra: string;
}): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const height = useDockSelector((state) => state.dockHeight);

  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent || height <= 0) return;
    parent.style.setProperty(
      edge === "padding" ? "padding-bottom" : "bottom",
      `calc(${Math.round(height)}px + ${extra})`,
    );
  }, [edge, extra, height]);

  return <span hidden ref={ref} />;
}
