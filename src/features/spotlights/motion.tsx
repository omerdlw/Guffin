"use client";

import type { ReactNode } from "react";
import type { Curve, Moves } from "@/motion/choreo";
import { MotionConfig } from "@/motion/lib";
import { Room } from "@/design/components/room";
import { defineStage } from "@/motion/stage";

// The spotlights' choreography. Each spotlight is a scene first (a WebGL
// tunnel, a ring of laureates, a wall of posters), so the page moves little
// of its own and never blurs.
//
// Directors: the wall is the director. Their portrait develops out of the
// dark at the centre and the films they made are hung around it from the
// nearest outwards, 34ms apart, each a little small and faint and settling.
// Choosing another director, the wall fades a beat before the next is hung.

const PHI = 1.618034;
// φⁿ seconds: 0.146, 0.236, 0.382, 0.618, 1, 1.618.
export const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
// Fibonacci: stagger in ms.
const STAGGER = { char: 0.034 };

// Settle: gathers softly, never with a jolt, and spends its long tail coming to rest.
export const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
// Develop: a slow start and a long, even resolve, for pictures.
export const DEVELOP: Curve = [0.382, 0, 0.146, 1];
// Leave: gathers, then goes.
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
// Touch: eased at both ends, so a touch never starts with a jolt (the same curve as --soft-ease).
const TOUCH: Curve = [0.382, 0.236, 0.146, 1];
// Press: direct.
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
