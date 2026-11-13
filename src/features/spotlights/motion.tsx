"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "@/motion/lib";
import { Room } from "@/design/components/room";
import { defineStage } from "@/motion/stage";

const DIRECTORS = defineStage({
  parts: ["portrait", "poster"],
  sections: ["director"],
});

const bound = DIRECTORS;

const DirectorsStageRoot = bound.StageRoot;
export const DirectorsPart = bound.Part;
export const DirectorsSwap = bound.Swap;

export function DirectorsStage({ children }: { children: ReactNode }) {
  return (
    <DirectorsStageRoot grade={null}>
      <Room black />
      <MotionConfig reducedMotion="user">
        <main
          className="relative h-dvh overflow-hidden overflow-x-clip ui-scene"
          data-cinematic=""
        >
          {children}
        </main>
      </MotionConfig>
    </DirectorsStageRoot>
  );
}
