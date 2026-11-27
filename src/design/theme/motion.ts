import { defineMotion, gpuTransform } from "@omerdlw/base-framework/utils";
import type { Curve } from "@/motion/choreography/choreo";

export {
  beat,
  DEVELOP,
  LEAVE,
  SETTLE,
  TOUCH,
} from "@/motion/choreography/pace";

export const INSTANT = { type: "tween", duration: 0 } as const;

export const moduleMotion = defineMotion({
  reducedMotion: "user",
  still: INSTANT,
});

export const STAGGER = { item: 0.034, line: 0.055, step: 0.089 } as const;
export const TRAVEL = {
  hair: 3,
  nudge: 5,
  step: 8,
  rise: 13,
  reach: 21,
  stride: 34,
} as const;

type Ease = Curve;

export const tween = (duration: number, ease: Ease, delay = 0) => ({
  type: "tween" as const,
  duration,
  ease,
  delay,
});

export const spring = (visualDuration: number, bounce = 0) => ({
  type: "spring" as const,
  visualDuration,
  bounce,
});

export const at = (y = 0, scale = 1, x = 0) => gpuTransform(y, scale, x);

export const away = (y = 0, scale = 1) => ({
  opacity: 0,
  transform: at(y, scale),
});
export const here = (opacity = 1) => ({ opacity, transform: at() });
