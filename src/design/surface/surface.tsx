"use client";

import { type ReactNode, useMemo, useState } from "react";
import { Button } from "@omerdlw/base-framework/ui";
import { cn } from "@/design/ui";
import { SWELL_REACH } from "../glass/spring";
import type {
  Curve,
  Enter,
  Followed,
  Look,
} from "@/motion/choreography/choreo";
import { useAheadOfOpen } from "@/design/surface/lazy";
import { defineStage } from "@/motion/choreography/stage";
import { Icon } from "../components/icon";
import { Input } from "../components/input";

const PHI = 1.618034;
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
const LINE = 0.055;
const STAGGER_METER = 0.089;
const AFTER_GLASS = beat(-3);

const rise = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "load",
  from,
  duration: beat(-1),
  ease: SETTLE,
  delay: AFTER_GLASS,
  stagger: LINE,
  ...more,
});

const GLIDE: Curve = [0.382, 0, 0.382, 1];
const glow = (of: Followed[]) => ({
  follow: { of, duration: beat(0), ease: GLIDE },
  hover: { duration: beat(-1), ease: GLIDE },
});

const lift = { to: { opacity: 0, y: -5 }, duration: beat(-4), ease: LEAVE };

const REST = { duration: beat(0), ease: GLIDE };
const lifted = (y: number, scale = 1) => ({
  hover: { y, scale, duration: beat(-1), ease: GLIDE },
  rest: REST,
});
const fan = {
  hover: {
    x: "calc(var(--fan, 0) * 78%)",
    y: "calc(var(--fan-lift, 0) * -4%)",
    rotate: "calc(var(--fan, 0) * 11deg)",
    duration: beat(-1),
    ease: GLIDE,
  },
  rest: REST,
};
const nudge = {
  hover: { x: 2, y: -2, opacity: 1, duration: beat(-1), ease: GLIDE },
  rest: REST,
};

const SURFACE = defineStage({
  scope: "surface",
  tempo: 1.236,
  reach: 1.272,
  motion: {
    parts: {
      item: { enter: rise({ opacity: 0, y: 8 }) },
      row: {
        enter: rise({ opacity: 0, y: 8 }, { wrap: 8 }),
        slots: { leaf: fan },
      },
      tile: {
        enter: rise({ opacity: 0, y: 8, scale: 0.96 }, { wrap: 9 }),
        ...glow(["background-color"]),
        slots: {
          caption: glow(["color"]),
          icon: nudge,
          frame: lifted(-3, 1.04),
        },
      },
      note: { enter: rise({ opacity: 0, y: 5 }) },
      meter: {
        enter: rise(
          { clip: "inset(0 100% 0 0 round 999px)" },
          { duration: beat(0), stagger: STAGGER_METER },
        ),
      },
    },
    sections: {
      items: { leave: lift },
      rows: { leave: lift },
    },
  },
  parts: ["item", "row", "tile", "note", "meter"],
  sections: ["items", "rows"],
});

const SurfaceRoot = SURFACE.SurfaceRoot;

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
        className={cn("dock-surface ui-scene flow-root w-full", className)}
        data-cinematic=""
      >
        <SurfaceAnchor />
        {children}
      </div>
    </SurfaceRoot>
  );
}

const TOOLBAR_GAP = "0.625rem";

export function SurfaceToolbar({
  children,
  stacked = false,
}: {
  children: ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className="flex min-w-0 shrink-0 items-center select-none"
      data-kind="toolbar"
      style={{
        margin: -SWELL_REACH,
        marginBottom: stacked
          ? -SWELL_REACH
          : `calc(${TOOLBAR_GAP} - ${SWELL_REACH}px)`,
        padding: SWELL_REACH,
        width: `calc(100% + ${SWELL_REACH * 2}px)`,
      }}
    >
      {children}
    </div>
  );
}

function SurfaceAnchor() {
  return <span className="sr-only" data-dock-autofocus="" tabIndex={-1} />;
}

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
