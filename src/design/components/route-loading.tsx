"use client";

import { type JSX, type ReactNode, useLayoutEffect, useRef } from "react";
import { ghost } from "./loading-ghost";

// When the page arrives, a detached copy of the route skeleton fades out over
// it, so the skeleton never hard-cuts to an empty scene. The skeleton itself
// appears at once: the leaving page is already gone, and a fade-in would only
// show the bare backdrop first. After hydration React unmounts the skeleton
// (this cleanup); on a first load the root layout's LOADING_HANDOFF_SCRIPT
// does the same before hydration.
export function RouteLoading({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    element.dataset.hydrated = "";
    return () => {
      if (!element.isConnected) return;
      const boxes = Array.from(element.children, (child) =>
        child.getBoundingClientRect(),
      );
      const remove = ghost(element, boxes);
      // Strict-mode remount: the skeleton is still on the page, no hand-off.
      requestAnimationFrame(() => {
        if (element.isConnected) remove();
      });
    };
  }, []);
  return (
    <div className="contents" data-loading="" ref={root}>
      {children}
    </div>
  );
}
