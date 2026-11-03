import { defineMotion } from "@omerdlw/base-framework/tokens";
import { POINTS } from "@/motion/engine/curve";
import { step } from "@/motion/engine/ladder";
import { MATTER, response } from "@/motion/engine/matter";
import { springForce } from "@/motion/engine/spring";

// The chrome's hands on the engine's ladder. A highlight carried across a
// control answers like ink; a press is the engine's own press on light, one
// rung quicker than its hover.
export const SPRING = {
  follow: springForce(response(MATTER.ink, 0)),
  press: springForce(response(MATTER.light, -1)),
};

export const motion = defineMotion({
  tempo: 1,
  reducedMotion: "user",
  durations: {
    step: step(-5),
    touch: step(-3),
    leave: step(-2),
    light: step(-1),
    reveal: step(0),
    move: step(1),
  },
  easings: {
    pour: POINTS.pour,
    fade: POINTS.fade,
    dolly: POINTS.dolly,
    glide: POINTS.glide,
  },
  springs: SPRING,
});

type Ease = readonly [number, number, number, number];

export const tween = (duration: number, ease: Ease, delay = 0) =>
  ({
    type: "tween",
    duration,
    ease,
    ...(delay > 0 ? { delay } : {}),
  }) as const;
