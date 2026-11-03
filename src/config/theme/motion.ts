import { defineMotion } from "@omerdlw/base-framework/tokens";
import { POINTS } from "@/motion/engine/curve";
import { haze, step } from "@/motion/engine/ladder";
import { MATTER, response } from "@/motion/engine/matter";
import { springForce } from "@/motion/engine/spring";

// The chrome's hands on the engine's ladder. A highlight carried across a
// control answers like ink; a press is the engine's own press on light, one
// rung quicker than its hover. Both are tools in the hand, so they sit below
// the page's tempo: the control follows at the speed it always did.
export const SPRING = {
  follow: springForce(response(MATTER.ink, 0)),
  press: springForce(response(MATTER.light, -2)),
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
    silk: POINTS.silk,
  },
  springs: SPRING,
});

// Layers come out of the soft. Content (text, icons, rows) arrives from a
// blur of `haze(rung)` px and leaves into one; the glass around it does not,
// because a filter on an ancestor takes the backdrop away from every
// `backdrop-filter` below it: the glass animates by opacity and scale alone.
const veil = (rung: number) => `blur(${haze(rung).toFixed(2)}px)`;

export const hazy = (rung = 3) => ({ opacity: 0, filter: veil(rung) }) as const;

export const SHARP = { opacity: 1, filter: "none" } as const;

type Ease = readonly [number, number, number, number];

export const tween = (duration: number, ease: Ease, delay = 0) =>
  ({
    type: "tween",
    duration,
    ease,
    ...(delay > 0 ? { delay } : {}),
  }) as const;
