"use client";

import { useEffect } from "react";
import {
  type DockActions,
  type SurfaceDescriptor,
  type SurfaceResult,
} from "@omerdlw/base-framework/dock";
import type { Surface } from "./surface-definition";

type Opener = DockActions["openSurface"];

/** A surface whose module loads on first intent (hover, focus, touch) or first open. */
export interface LazySurface<P extends object> {
  preload(): Promise<Surface<P>>;
  open(
    openSurface: Opener,
    props?: P,
    overrides?: Partial<SurfaceDescriptor>,
  ): Promise<SurfaceResult>;
}

export function lazySurface<P extends object>(
  load: () => Promise<Surface<P>>,
): LazySurface<P> {
  let pending: Promise<Surface<P>> | null = null;
  const preload = () => {
    pending ??= load().catch((error: unknown) => {
      pending = null;
      throw error;
    });
    return pending;
  };
  return {
    preload,
    async open(openSurface, ...args) {
      const surface = await preload();
      return (
        surface.open as unknown as (
          open: Opener,
          ...args: unknown[]
        ) => Promise<SurfaceResult>
      )(openSurface, ...args);
    },
  };
}

const INTENT_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "touchstart",
  "focusin",
] as const;

/**
 * Preloads `surfaces` on the first interaction with `target`; returns a cancel function.
 * Pointer movement, a touch or a key always comes before the click that opens a surface.
 */
export function preloadOnIntent(
  surfaces: readonly Pick<LazySurface<never>, "preload">[],
  target: EventTarget,
): () => void {
  const options = { capture: true, passive: true };
  const stop = () => {
    for (const type of INTENT_EVENTS)
      target.removeEventListener(type, warm, options);
  };
  function warm() {
    stop();
    for (const surface of surfaces) void surface.preload().catch(() => {});
  }
  for (const type of INTENT_EVENTS)
    target.addEventListener(type, warm, options);
  return stop;
}

/** Loads these lazy surfaces as soon as the person starts interacting with the page. */
export function useSurfacePreload(
  ...surfaces: Pick<LazySurface<never>, "preload">[]
): void {
  useEffect(
    () => preloadOnIntent(surfaces, window),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handles are module constants
    [],
  );
}
