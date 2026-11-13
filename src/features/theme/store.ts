"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

export type ThemeChoice = "system" | "light" | "dark";
export type Theme = "light" | "dark";

import { THEME_KEY } from "./script";

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

function paint(theme: Theme) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  root.dataset.themeSwitching = "";
  void getComputedStyle(root).color;
  root.dataset.theme = theme;
  void getComputedStyle(root).color;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => delete root.dataset.themeSwitching),
  );
}

function apply() {
  paint(resolve(read()));
  for (const listener of listeners) listener();
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {}
  paint(resolve(choice));
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

export function ThemeSync() {
  useThemeChoice();
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolve(read());
  });
  return null;
}
