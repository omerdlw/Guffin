"use client";

import { COMPACT_SEARCH_WIDTH } from "@/design/theme/dock-motion";
import type { ReactNode } from "react";
import type { Curve, Enter, Look, Moves } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";
import { cn } from "@/design/ui";

const PHI = 1.618034;
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = { char: 0.021, item: 0.034, row: 0.055 };

const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
const SWEEP: Curve = [0.618, 0, 0.382, 1];
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
const TOUCH: Curve = [0.382, 0.236, 0.146, 1];
const PRESS: Curve = [0.382, 0, 0.236, 1];

const show = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "load",
  from,
  duration: beat(-1),
  ease: SETTLE,
  ...more,
});

const press = { scale: 0.96, duration: beat(-3), ease: PRESS };

const button: Moves = {
  hover: { scale: 1.034, duration: beat(-2), ease: TOUCH },
  rest: { duration: beat(-1), ease: SETTLE },
  press,
};

const SEARCH = defineStage({
  scope: "search",
  tempo: 1.236,
  reach: 1.272,
  motion: {
    parts: {
      drawer: {
        follow: {
          of: ["grid-template-rows", "opacity"],
          duration: beat(-1),
          ease: SWEEP,
        },
      },
      scopes: {
        follow: {
          of: ["translate", "scale"],
          duration: beat(-1),
          ease: SETTLE,
        },
      },
      label: {
        text: {
          by: "char",
          order: "random",
          stagger: STAGGER.char,
          line: STAGGER.row,
          enter: show({ opacity: 0 }),
        },
      },
      count: {
        enter: show(
          { opacity: 0, y: 5 },
          { delay: beat(-3), stagger: STAGGER.row },
        ),
      },
      row: {
        enter: show({ opacity: 0, y: 8 }, { stagger: STAGGER.row }),
        press: { scale: 0.98, duration: beat(-3), ease: PRESS },
        rest: { duration: beat(-2), ease: SETTLE },
        slots: {
          thumb: { follow: { of: ["scale"], duration: beat(-2), ease: TOUCH } },
        },
      },
      tile: {
        enter: show(
          { opacity: 0, y: 13, scale: 0.944 },
          { stagger: STAGGER.row },
        ),
      },
      results: {
        follow: { of: ["opacity"], duration: beat(-2), ease: SWEEP },
      },
      sheet: {
        follow: {
          of: ["transform", "width", "height", "opacity"],
          duration: beat(-2),
          ease: TOUCH,
        },
      },
      footer: {
        enter: show({ opacity: 0, y: 8 }, { stagger: STAGGER.row }),
      },
      note: {
        enter: show({ opacity: 0, y: 5 }),
      },
    },
    sections: {
      rows: {
        leave: { to: { opacity: 0, y: -5 }, duration: beat(-4), ease: LEAVE },
      },
    },
    kinds: {
      media: {
        press,
        rest: { duration: beat(-1), ease: SETTLE },
        slots: {
          image: {
            hover: { scale: 1.146, duration: beat(0), ease: SETTLE },
            rest: { duration: beat(0), ease: SETTLE },
          },
        },
      },
      button,
      segmented: {
        slots: {
          tab: {
            follow: { of: ["color"], duration: beat(-2), ease: SWEEP },
            press,
          },
        },
      },
    },
  },
  parts: [
    "drawer",
    "scopes",
    "label",
    "count",
    "row",
    "tile",
    "results",
    "sheet",
    "footer",
    "note",
  ],
  sections: ["rows"],
});

const SearchRoot = SEARCH.SurfaceRoot;
export const SearchPart = SEARCH.Part;
export const SearchText = SEARCH.Text;
export const SearchSwap = SEARCH.Swap;
export const useSearchPart = SEARCH.usePart;
export const SearchStyle = SEARCH.Style;

export function SearchStage({
  children,
  className,
  compact = false,
}: {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <SearchRoot>
      <div
        className={cn("ui-scene w-full", className)}
        data-cinematic=""
        data-part={compact ? "compact-search" : undefined}
        style={compact ? { width: COMPACT_SEARCH_WIDTH } : undefined}
      >
        {children}
      </div>
    </SearchRoot>
  );
}
