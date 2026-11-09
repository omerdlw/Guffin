"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

export type ThemeChoice = "system" | "light" | "dark";
export type Theme = "light" | "dark";

import { THEME_KEY } from "./theme-script";

export const THEME_CHOICES: readonly ThemeChoice[] = [
  "system",
  "light",
  "dark",
];

const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function resolve(choice: ThemeChoice): Theme {
  if (choice !== "system") return choice;
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply() {
  document.documentElement.dataset.theme = resolve(read());
  for (const listener of listeners) listener();
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* storage can be blocked; the choice then lasts until reload */
  }
  document.documentElement.dataset.theme = resolve(choice);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const query = matchMedia("(prefers-color-scheme: light)");
  query.addEventListener("change", apply);
  window.addEventListener("storage", apply);
  return () => {
    listeners.delete(listener);
    query.removeEventListener("change", apply);
    window.removeEventListener("storage", apply);
  };
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, read, () => "system");
}

/** Puts the chosen theme back on <html> after hydration, in case React reset it. */
export function ThemeSync() {
  useThemeChoice();
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolve(read());
  });
  return null;
}
