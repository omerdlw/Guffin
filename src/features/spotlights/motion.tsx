"use client";

import type { ReactNode } from "react";
import type { Curve, Moves } from "@/motion/choreo";
import { MotionConfig } from "@/motion/lib";
import { Room } from "@/design/components/room";
import { defineStage } from "@/motion/stage";
import { TEMPO } from "@/motion/pace";

const PHI = 1.618034;
export const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = { char: 0.021 };

const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
export const DEVELOP: Curve = [0.382, 0, 0.146, 1];
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
const TOUCH: Curve = [0.382, 0.236, 0.146, 1];
const PRESS: Curve = [0.382, 0, 0.236, 1];

const media: Moves = {
  press: { scale: 0.96, duration: beat(-3), ease: PRESS },
  rest: { duration: beat(-1), ease: SETTLE },
  slots: {
    image: {
      hover: { scale: 1.055, duration: beat(-1), ease: TOUCH },
      rest: { duration: beat(-1), ease: SETTLE },
    },
  },
};

const DIRECTORS = defineStage({
  scope: "directors",
  tempo: TEMPO,
  parts: ["portrait", "poster"],
  sections: ["director"],
  motion: {
    parts: {
      portrait: {
        enter: {
          on: "load",
          from: { opacity: 0, blur: 12, bright: 0.382 },
          duration: beat(0),
          ease: DEVELOP,
        },
      },
      poster: {
        enter: {
          on: "load",
          from: { opacity: 0, blur: 8 },
          delay: beat(-3),
          stagger: STAGGER.char,
          duration: beat(-1),
          ease: SETTLE,
        },
      },
    },
    sections: {
      director: {
        leave: { to: { opacity: 0, blur: 8 }, duration: beat(-3), ease: LEAVE },
      },
    },
    kinds: { media },
  },
});

const DirectorsStageRoot = DIRECTORS.StageRoot;
export const DirectorsPart = DIRECTORS.Part;
export const DirectorsSwap = DIRECTORS.Swap;

export function DirectorsStage({ children }: { children: ReactNode }) {
  return (
    <DirectorsStageRoot light={null}>
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
