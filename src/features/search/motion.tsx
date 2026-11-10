"use client";

import { type ReactNode } from "react";
import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";
import { Unfold } from "@/design/components/surface";
import { cn } from "@/design/foundations/cn";

const SEARCH = defineScore({
  tempo: -3,
  cast: {
    item: "paper",
    row: "paper",
    tile: { matter: "paper", enter: "surface", cadence: "even" },
    note: "glass",
  },
  opening: [{ rest: 0 }, ["item", "note"]],
  sections: {
    rows: [["row", "tile", "note"]],
  },
});

const bound = bindScore(SEARCH);

export const SearchRoot = bound.SurfaceRoot;
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
