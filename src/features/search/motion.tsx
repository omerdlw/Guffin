"use client";

import type { ReactNode } from "react";
import { defineStage } from "@/motion/stage";
import { cn } from "@/design/ui";

const SEARCH = defineStage({
  parts: ["item", "row", "tile", "note"],
  sections: ["rows"],
});

const bound = SEARCH;

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
      <div className={cn("ui-scene w-full", className)} data-cinematic="">
        {children}
      </div>
    </SearchRoot>
  );
}
