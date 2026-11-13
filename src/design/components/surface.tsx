"use client";

import { type ReactNode, useMemo, useRef, useState } from "react";
import { Button } from "@omerdlw/base-framework/ui";
import { cn } from "@/design/ui";
import { motion, useReducedMotion } from "@/motion/lib";
import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";
import { POINTS, step, tween } from "@/motion/time";
import { Icon } from "./icon";
import { Input } from "./input";

const SURFACE = defineScore({
  tempo: -3,
  cast: {
    item: "paper",
    row: "paper",
    note: "glass",
  },
  opening: [{ rest: 0 }, ["item", "note"]],
  sections: {
    items: [["item", "note"]],
    rows: [["row", "note"]],
  },
});

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
        <SurfaceAnchor />
        {children}
      </div>
    </SurfaceRoot>
  );
}

export function SurfaceAnchor() {
  return (
    <span
      className="sr-only"
      data-dock-autofocus=""
      data-own-focus=""
      tabIndex={-1}
    />
  );
}

const UNFOLD = tween(step(-0.5), POINTS.fade);

export function Unfold({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      animate={{ height: "auto" }}
      initial={{ height: 0 }}
      onAnimationComplete={() => {
        if (box.current) box.current.style.overflow = "visible";
      }}
      ref={box}
      style={{ overflow: "clip" }}
      transition={reduced ? { duration: 0 } : UNFOLD}
    >
      {children}
    </motion.div>
  );
}

export function DockAction({ children }: { children: ReactNode }) {
  return (
    <SurfaceStage>
      <Unfold>
        <SurfacePart name="item">{children}</SurfacePart>
      </Unfold>
    </SurfaceStage>
  );
}

export const SURFACE_SEARCH_MIN = 30;

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
