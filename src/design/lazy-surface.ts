"use client";

import { useEffect, useState } from "react";
import {
  type DockActions,
  type SurfaceDescriptor,
  type SurfaceResult,
} from "@omerdlw/base-framework/dock";
import type { Surface } from "./surface-definition";

type Opener = DockActions["openSurface"];

interface LazySurface<P extends object> {
  preload(): Promise<Surface<P>>;
  open(
    openSurface: Opener,
    props?: P,
    overrides?: Partial<SurfaceDescriptor>,
  ): Promise<SurfaceResult>;
  shows(component: unknown): boolean;
}

export function lazySurface<P extends object>(
  load: () => Promise<Surface<P>>,
): LazySurface<P> {
  let pending: Promise<Surface<P>> | null = null;
  let own: unknown = null;
  const preload = () => {
    pending ??= load().then(
      (surface) => {
        own = surface.config.component ?? null;
        return surface;
      },
      (error: unknown) => {
        pending = null;
        throw error;
      },
    );
    return pending;
  };
  return {
    preload,
    shows: (component) => own !== null && component === own,
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

export function preloadOnIntent(
  surfaces: readonly { preload(): Promise<unknown> }[],
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

export function useSurfacePreload(
  ...surfaces: Pick<LazySurface<never>, "preload">[]
): void {
  useEffect(
    () => preloadOnIntent(surfaces, window),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

function whenIdle(run: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(run, { timeout: 1000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(run, 200);
  return () => clearTimeout(id);
}

export function useAheadOfOpen(): boolean {
  const [ahead, setAhead] = useState(false);
  useEffect(() => {
    if (ahead) return;
    let cancelIdle: (() => void) | null = null;
    const stop = preloadOnIntent(
      [
        {
          preload: async () => {
            cancelIdle = whenIdle(() => setAhead(true));
          },
        },
      ],
      window,
    );
    return () => {
      stop();
      cancelIdle?.();
    };
  }, [ahead]);
  return ahead;
}
