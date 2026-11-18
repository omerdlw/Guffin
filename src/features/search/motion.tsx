"use client";

import type { ReactNode } from "react";
import type { Curve, Enter, Look, Moves } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";
import { cn } from "@/design/ui";

// The search action's choreography. Everything in the action that moves is
// written here; a role left out renders still.
//
// It speaks the dock's proportion, the golden ratio, at the dock's pace:
// quicker than a page, because it answers typing, but it never snaps.
//
// The scopes open under the field on the first letter: the drawer unfolds
// and the control drops into it. Results arrive in reading order: a group's
// label flickers in letter by letter and its count after it, rows surface
// one after another, posters are dealt across the grid, the pager comes last.
// While the next answer loads the old results dim in place; when they
// change, the old ones lift away before the new ones are dealt. The highlight glides from option to option instead of jumping.
//
// Nothing blurs: a blurring animation repaints on every frame it plays.

const PHI = 1.618034;
// φⁿ seconds: 0.146, 0.236, 0.382, 0.618, 1.
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = { char: 0.021, item: 0.034, row: 0.055 };

const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
const SWEEP: Curve = [0.618, 0, 0.382, 1];
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
const TOUCH: Curve = [0.382, 0.236, 0.146, 1];
const PRESS: Curve = [0.382, 0, 0.236, 1];

// The action mounts as the dock opens it and every swapped view mounts
// fresh, so `load` plays each time something new is shown.
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
  // The hand's pace: slower than a click, quicker than a page.
  tempo: 1.236,
  reach: 1.272,
  motion: {
    parts: {
      // The drawer under the field unfolds on the first letter and folds
      // away when the field is cleared.
      drawer: {
        follow: {
          of: ["grid-template-rows", "opacity"],
          duration: beat(-1),
          ease: SWEEP,
        },
      },
      // The scopes drop into the drawer as it opens.
      scopes: {
        follow: {
          of: ["translate", "scale"],
          duration: beat(-1),
          ease: SETTLE,
        },
      },
      // A group's label flickers in letter by letter, in the group's turn.
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
      // Rows surface one after another; the thumbnail swells a hair under
      // the highlight.
      row: {
        enter: show({ opacity: 0, y: 8 }, { stagger: STAGGER.row }),
        press: { scale: 0.98, duration: beat(-3), ease: PRESS },
        rest: { duration: beat(-2), ease: SETTLE },
        slots: {
          thumb: { follow: { of: ["scale"], duration: beat(-2), ease: TOUCH } },
        },
      },
      // Posters are dealt across the grid.
      tile: {
        enter: show(
          { opacity: 0, y: 13, scale: 0.944 },
          { stagger: STAGGER.row },
        ),
      },
      // Results stay up while the next answer loads, dimmed until it lands.
      results: {
        follow: { of: ["opacity"], duration: beat(-2), ease: SWEEP },
      },
      // The highlight glides between options.
      sheet: {
        follow: {
          of: ["transform", "width", "height", "opacity"],
          duration: beat(-2),
          ease: TOUCH,
        },
      },
      // The pager arrives after the last result.
      footer: {
        enter: show({ opacity: 0, y: 8 }, { stagger: STAGGER.row }),
      },
      // Loading, empty and failed states settle in.
      note: {
        enter: show({ opacity: 0, y: 5 }),
      },
    },
    sections: {
      // Results that are replaced lift away before the next ones are dealt.
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
            focus: "hover",
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
