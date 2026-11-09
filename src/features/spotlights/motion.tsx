"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Room } from "@/motion/kit";
import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";

/*
 * The directors page is a still life: one photograph standing on the floor
 * and the films laid above and beside it. Each director is its own scene, so
 * a change of director is a change of scope. The posters are numbered from
 * the photograph outwards, so they arrive as one ripple.
 */
const DIRECTORS = defineScore({
  cast: {
    portrait: "plate",
    poster: { matter: "paper", enter: "lift", cadence: "trail" },
  },
  opening: ["portrait"],
  sections: {
    director: ["portrait", "poster"],
  },
});

const bound = bindScore(DIRECTORS);

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
