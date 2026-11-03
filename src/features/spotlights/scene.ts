"use client";

import { mountScene, type Stage } from "@/motion/engine";
import type { LoopFactory } from "./gl/loop";

// A spotlight renderer as the page's `scene` part: its frames come from the
// engine's clock instead of a loop of its own, so it idles, slows and leaves
// with everything else. It keeps its own time base, and whatever wakes it (a
// picture loaded, a new one chosen) asks the scene for a draw.
export function mountSpotlight<R extends { dispose(): void }>(
  stage: Stage<string, string>,
  canvas: HTMLCanvasElement,
  build: (canvas: HTMLCanvasElement, loop: LoopFactory) => R | null,
  // The renderer's own cap, so the engine sizes the canvas as it would.
  pixelRatio: number,
): { renderer: R | null; dispose: () => void } {
  const built: { renderer: R | null } = { renderer: null };
  const dispose = mountScene(
    stage,
    "scene",
    canvas,
    (element, wake) => {
      let step: ((now: number, dt: number) => boolean) | null = null;
      const renderer = build(element, (next) => {
        step = next;
        return {
          dispose: () => {
            step = null;
          },
          wake,
        };
      });
      built.renderer = renderer;
      if (!renderer) return null;
      return {
        draw: ({ delta }) => step?.(performance.now() / 1000, delta) ?? false,
        dispose: () => renderer.dispose(),
      };
    },
    { css: true, pixelRatio },
  );
  return { renderer: built.renderer, dispose };
}
