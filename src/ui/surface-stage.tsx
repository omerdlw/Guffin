"use client";

import type { ReactNode } from "react";
import { bindScore, defineScore } from "@/motion/engine";
import { cn } from "./cn";

// A dock surface: a short rest while the dock opens its panel, then the
// surface's fields and rows, one after another. Two rungs quicker than a
// page; it is a tool in the hand, not a scene. Content that changes in place
// (a loaded list, another tab) is a swap: what was there leaves, the new rows
// come up from the dark.
const SURFACE = defineScore({
  tempo: -2,
  cast: {
    item: "paper",
    row: "paper",
    // What stands in for content: a loader, an empty or failed state.
    note: "glass",
  },
  opening: [{ rest: 0 }, ["item", "note"]],
  // A swapped instance holds either content or the note standing in for it.
  sections: {
    items: [["item", "note"]],
    rows: [["row", "note"]],
  },
});

// Named one by one: a client module's exports must be plain declarations for
// server components to reach them.
const bound = bindScore(SURFACE);

const SurfaceRoot = bound.SurfaceRoot;
export const SurfacePart = bound.Part;
export const SurfaceSwap = bound.Swap;

export function SurfaceStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SurfaceRoot>
      <div className={cn("ui-scene w-full", className)} data-cinematic="">
        {children}
      </div>
    </SurfaceRoot>
  );
}
