"use client";

import type { ReactNode } from "react";
import type { Curve, Moves } from "@/motion/choreo";
import { MotionConfig } from "@/motion/lib";
import { Room } from "@/design/components/room";
import { defineStage } from "@/motion/stage";

const PHI = 1.618034;
export const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = { char: 0.034 };

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
      hover: { scale: 1.055, duration: beat(0), ease: TOUCH },
      rest: { duration: beat(1), ease: SETTLE },
      focus: "hover",
    },
  },
};

const DIRECTORS = defineStage({
  scope: "directors",
  tempo: 1.272,
  reach: 1.618,
  parts: ["portrait", "poster"],
  sections: ["director"],
  motion: {
    parts: {
      portrait: {
        enter: {
          on: "load",
          from: { opacity: 0, scale: 1.055, bright: 0.382 },
          duration: beat(2),
          ease: DEVELOP,
        },
      },
      poster: {
        enter: {
          on: "load",
          from: { opacity: 0, y: 13, scale: 0.944 },
          delay: beat(-2),
          stagger: STAGGER.char,
          duration: beat(0),
          ease: SETTLE,
        },
      },
    },
    sections: {
      director: {
        leave: { to: { opacity: 0 }, duration: beat(-2), ease: LEAVE },
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
