"use client";

import type { ReactNode } from "react";
import { bindScore, defineScore } from "@/motion/engine";
import { cn } from "@/ui/cn";
import { Unfold } from "@/ui/unfold";

// The search surface: a tool in the hand, so it answers at the pace of one,
// on the same rung as every dock surface. Typing is a conversation: what
// leaves goes in a blink and what comes takes half a second, so the list is
// already there by the time the eye returns to it. Posters come out of the
// soft where they stand and follow one another at an even pace; rows and the
// notes that stand in for them lift in as paper and glass.
const SEARCH = defineScore({
  tempo: -3,
  cast: {
    item: "paper",
    row: "paper",
    tile: { matter: "paper", enter: "clear", cadence: "even" },
    note: "glass",
  },
  opening: [{ rest: 0 }, ["item", "note"]],
  sections: {
    rows: [["row", "tile", "note"]],
  },
});

// Named one by one: a client module's exports must be plain declarations for
// server components to reach them.
const bound = bindScore(SEARCH);

const SearchRoot = bound.SurfaceRoot;
export const SearchPart = bound.Part;
export const SearchSwap = bound.Swap;

export function SearchStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SearchRoot>
      <Unfold>
        <div className={cn("ui-scene w-full", className)} data-cinematic="">
          {children}
        </div>
      </Unfold>
    </SearchRoot>
  );
}
