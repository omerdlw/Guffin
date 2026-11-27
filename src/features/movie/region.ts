"use client";

import { useSyncExternalStore } from "react";

const FALLBACK_REGION = "US";
const REGION_KEY = "guffin:watch-region";

let regionNames: Intl.DisplayNames | undefined;

// One formatter for every lookup: the region picker sorts by name, which
// calls this a few hundred times per render.
export const regionName = (code: string): string => {
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

export const flagOf = (code: string): string =>
  String.fromCodePoint(
    ...code.split("").map((char) => 127397 + char.charCodeAt(0)),
  );

let picked: string | null | undefined;
const listeners = new Set<() => void>();

function readPicked(): string | null {
  if (picked === undefined) {
    try {
      picked = localStorage.getItem(REGION_KEY);
    } catch {
      picked = null;
    }
  }
  return picked;
}

export function pickRegion(code: string): void {
  picked = code;
  try {
    localStorage.setItem(REGION_KEY, code);
  } catch {}
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWatchRegion(codes: readonly string[]): string {
  const chosen = useSyncExternalStore(subscribe, readPicked, () => null);
  if (chosen && codes.includes(chosen)) return chosen;
  const language = typeof navigator === "undefined" ? "" : navigator.language;
  const own = language.split("-")[1]?.toUpperCase();
  if (own && codes.includes(own)) return own;
  return codes.includes(FALLBACK_REGION) ? FALLBACK_REGION : (codes[0] ?? "");
}
