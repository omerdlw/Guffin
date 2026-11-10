"use client";

import { useMemo, useState } from "react";
import { cn } from "../../foundations/cn";
import { Button } from "../button";
import { Icon } from "../icon";
import { Input } from "../input";

/**
 * A list in a surface gets a search field once it holds this many rows; a
 * shorter one is read at a glance.
 */
export const SURFACE_SEARCH_MIN = 30;

/** Folds case, accents and the Turkish dotless i, so "pinar" finds "Pınar". */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .toLowerCase();
}

/**
 * The search state of one list. `total` is how many rows the list holds (it
 * may be more than `items` while pages are still loading); the field shows
 * from `SURFACE_SEARCH_MIN` up. `textOf` must be a stable function.
 */
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

/** The search field at the head of a long list in a surface. */
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
