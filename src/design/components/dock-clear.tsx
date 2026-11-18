"use client";

import { type JSX, useLayoutEffect, useRef } from "react";
import { useDockSelector } from "@omerdlw/base-framework/dock";

/**
 * Keeps its parent clear of the dock: the parent's `padding-bottom` (or
 * `bottom`, for a bar fixed above the dock) becomes the dock's height plus
 * `extra`. The parent's class carries the same edge with a resting height
 * for the first paint; this takes over once the dock has measured itself.
 *
 * The height is written on the parent itself, never as a variable on the
 * page: a variable on `<html>` or a page root restyles every element under
 * it each time the dock changes height (twice per surface open, ~22ms on
 * home). A padding or an offset restyles the one element. The dock theme
 * sets `deck.heightVar: false` so the framework writes no variable either.
 */
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
