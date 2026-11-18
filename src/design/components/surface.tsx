"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  DockSurfaceExtension,
  useDockSelector,
  useSurfaceId,
} from "@omerdlw/base-framework/dock";
import { Button } from "@omerdlw/base-framework/ui";
import { cn } from "@/design/ui";
import type { Curve, Enter, Followed, Look } from "@/motion/choreo";
import { useAheadOfOpen } from "@/design/lazy-surface";
import { defineStage } from "@/motion/stage";
import { Icon } from "./icon";
import { Input } from "./input";

// A surface's choreography: what it shows rises into the glass as the dock
// opens it, from below, one block after another and its rows in turn; what a
// tab or a state replaces lifts away before the next is dealt. It speaks the
// dock's proportion (design/theme/dock-motion.ts): φ beats, Fibonacci
// staggers and travel. Blocks need no index: their turn is their place among
// their siblings (dock.css). Nothing blurs.

const PHI = 1.618034;
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
/** Between blocks and between rows (s). */
const LINE = 0.055;
/** The glass blooms to its new size first (dock-motion: SURFACE_IN). */
const AFTER_GLASS = beat(-3);

// The surface mounts as the dock opens it, and every swapped view mounts
// fresh, so `load` plays each time something new is shown.
const rise = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "load",
  from,
  duration: beat(-1),
  ease: SETTLE,
  delay: AFTER_GLASS,
  stagger: LINE,
  ...more,
});

// A hover that eases in on a slow, even curve (φ⁻¹ s) and lets go slower
// still (1 s): light coming up on a screen, not a switch.
const GLIDE: Curve = [0.382, 0, 0.382, 1];
const glow = (of: Followed[]) => ({
  follow: { of, duration: beat(0), ease: GLIDE },
  hover: { duration: beat(-1), ease: GLIDE },
  focus: "hover" as const,
});

const lift = { to: { opacity: 0, y: -5 }, duration: beat(-4), ease: LEAVE };

const SURFACE = defineStage({
  scope: "surface",
  // The hand's pace: slower than a click, quicker than a page.
  tempo: 1.236,
  reach: 1.272,
  motion: {
    parts: {
      item: { enter: rise({ opacity: 0, y: 8 }) },
      // A long list restarts its count every eight rows, so a page loaded
      // by scrolling arrives at once instead of a second late.
      row: { enter: rise({ opacity: 0, y: 8 }, { wrap: 8 }) },
      // A row drawn as a hairline ring that fills under the pointer itself
      // (no sliding highlight): it rises like a row, and its fill, its
      // caption and its icons glow in together and fade out slower still.
      tile: {
        enter: rise({ opacity: 0, y: 8 }, { wrap: 8 }),
        ...glow(["background-color"]),
        slots: { caption: glow(["color"]), icon: glow(["color"]) },
      },
      note: { enter: rise({ opacity: 0, y: 5 }) },
    },
    sections: {
      items: { leave: lift },
      rows: { leave: lift },
    },
  },
  parts: ["item", "row", "tile", "note"],
  sections: ["items", "rows"],
});

const SurfaceRoot = SURFACE.SurfaceRoot;

/**
 * The surfaces' stylesheet, put in ahead of the first surface that opens
 * (see useAheadOfOpen). Mounted once, by the app's providers.
 */
export function SurfaceStyle() {
  return useAheadOfOpen() ? <SURFACE.Style /> : null;
}
export const SurfacePart = SURFACE.Part;
export const SurfaceSwap = SURFACE.Swap;
export const useSurfacePart = SURFACE.usePart;

export function SurfaceStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SurfaceRoot>
      <div
        className={cn("dock-surface ui-scene w-full", className)}
        data-cinematic=""
      >
        <SurfaceAnchor />
        {children}
      </div>
    </SurfaceRoot>
  );
}

/**
 * Content for the dock's shelf, shown only while its surface is the one in
 * front. A surface opened over another (a picker, a sub-step) keeps the one
 * below mounted, and the dock would otherwise shelve both surfaces' pieces
 * side by side.
 */
export function SurfaceExtension({
  align = "center",
  children,
  id,
}: {
  align?: "center" | "left" | "right";
  children: ReactNode;
  id: string;
}) {
  const surfaceId = useSurfaceId();
  const front = useDockSelector(
    (state) => surfaceId == null || state.activeSurfaceEntry?.id === surfaceId,
  );
  if (!front) return null;
  return (
    <DockSurfaceExtension align={align} id={id}>
      {children}
    </DockSurfaceExtension>
  );
}

function SurfaceAnchor() {
  return (
    <span
      className="sr-only"
      data-dock-autofocus=""
      data-own-focus=""
      tabIndex={-1}
    />
  );
}

/**
 * A dock card's action. Not a surface block: its buttons rise on their own
 * (dock.css, `dock-action`), and rising with the block too they would rise
 * twice.
 */
export function DockAction({ children }: { children: ReactNode }) {
  return <SurfaceStage>{children}</SurfaceStage>;
}

const SURFACE_SEARCH_MIN = 30;

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .toLowerCase();
}

export function useSurfaceSearch<T>(
  items: readonly T[],
  textOf: (item: T) => string,
  total: number = items.length,
) {
  const [query, setQuery] = useState("");
  const enabled = total >= SURFACE_SEARCH_MIN;
  const words = enabled ? fold(query).split(/\s+/).filter(Boolean) : [];
  const key = words.join(" ");

  const matches = useMemo(() => {
    if (!key) return items;
    const terms = key.split(" ");
    return items.filter((item) => {
      const text = fold(textOf(item));
      return terms.every((term) => text.includes(term));
    });
  }, [items, key, textOf]);

  return {
    enabled,
    matches,
    query,
    searching: key !== "",
    setQuery,
  };
}

export function SurfaceSearch({
  className,
  label,
  onChange,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className={cn("relative w-full", className)} role="search">
      <Input
        aria-label={label}
        autoCapitalize="off"
        autoComplete="off"
        className="px-10"
        enterKeyHint="search"
        maxLength={80}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            event.stopPropagation();
            onChange("");
          }
        }}
        placeholder={label}
        spellCheck={false}
        value={value}
      />
      <Icon
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
        icon="solar:magnifer-linear"
        size={16}
      />
      {value ? (
        <Button
          aria-label="Clear search"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          icon
          intent="ghost"
          onClick={() => onChange("")}
          shape="thumb"
          size="sm"
        >
          <Icon icon="solar:close-circle-bold" size={16} />
        </Button>
      ) : null}
    </div>
  );
}
