"use client";

import { type JSX, type ReactNode, useEffect, useMemo } from "react";
import { useDockRegistration } from "@omerdlw/base-framework/dock";
import { Room } from "@/design/components/room";
import { DEVELOP, TEMPO, beat } from "@/motion/choreography/pace";
import { defineStage } from "@/motion/choreography/stage";
import type { Engine } from "@/motion/core/engine";
import { mountScene } from "@/motion/core/scene";
import { MotionConfig } from "@/motion/lib";
import type { LoopFactory } from "../model";

const URL_SYNC_DELAY_MS = 500;

const SALON = defineStage({
  scope: "salon",
  tempo: TEMPO,
  reach: 1.618,
  parts: ["scene", "chrome"],
  motion: {
    parts: {
      chrome: {
        enter: {
          on: "load",
          from: { opacity: 0, blur: 8 },
          delay: beat(-2),
          duration: beat(1),
          ease: DEVELOP,
        },
      },
    },
  },
});

const SalonStageRoot = SALON.StageRoot;
export const SalonPart = SALON.Part;

export function SalonStage({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <SalonStageRoot>
      <Room black />
      <MotionConfig reducedMotion="user">
        <main
          id="main"
          className={`${className} ui-scene overflow-x-clip`}
          data-cinematic=""
        >
          {children}
        </main>
      </MotionConfig>
    </SalonStageRoot>
  );
}

export function mountSpotlight<
  R extends {
    dispose(): void;
    resize?(width: number, height: number, ratio: number): void;
  },
>(
  engine: Engine,
  canvas: HTMLCanvasElement,
  build: (canvas: HTMLCanvasElement, loop: LoopFactory) => R | null,
  pixelRatio: number,
): { renderer: R | null; dispose: () => void } {
  const built: { renderer: R | null } = { renderer: null };
  const dispose = mountScene(
    engine,
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
        resize: (width, height, ratio) =>
          renderer.resize?.(width, height, ratio),
      };
    },
    { pixelRatio },
  );
  return { renderer: built.renderer, dispose };
}

export function useSyncedSearchParam(key: string, value: string | null): void {
  useEffect(() => {
    if (value === null) return;
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set(key, value);
      window.history.replaceState(window.history.state, "", url);
    }, URL_SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key, value]);
}

export function SpotlightDock({
  control,
  description,
  icon,
  path,
  title,
}: {
  control: JSX.Element;
  description: string;
  icon: string;
  path: string;
  title: string;
}): null {
  const config = useMemo(
    () => ({ action: control, description, icon, path, title }),
    [control, description, icon, path, title],
  );
  useDockRegistration(config);
  return null;
}
