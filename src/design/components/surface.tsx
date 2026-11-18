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

const PHI = 1.618034;
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
const LINE = 0.055;
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
  focus: "hover" as const,
});

const lift = { to: { opacity: 0, y: -5 }, duration: beat(-4), ease: LEAVE };

const SURFACE = defineStage({
  scope: "surface",
  tempo: 1.236,
  reach: 1.272,
  motion: {
    parts: {
      item: { enter: rise({ opacity: 0, y: 8 }) },
      row: { enter: rise({ opacity: 0, y: 8 }, { wrap: 8 }) },
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
