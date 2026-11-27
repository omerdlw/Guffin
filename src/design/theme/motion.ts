import { defineMotion, gpuTransform } from "@omerdlw/base-framework/utils";

export const INSTANT = { type: "tween", duration: 0 } as const;

export const moduleMotion = defineMotion({
  reducedMotion: "user",
  still: INSTANT,
});

const PHI = 1.618034;
export const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
export const STAGGER = { item: 0.034, line: 0.055, step: 0.089 } as const;
export const TRAVEL = {
  hair: 3,
  nudge: 5,
  step: 8,
  rise: 13,
  reach: 21,
  stride: 34,
} as const;

type Ease = [number, number, number, number];

export const SETTLE: Ease = [0.236, 0.382, 0.146, 1];
export const DEVELOP: Ease = [0.382, 0, 0.146, 1];
export const LEAVE: Ease = [0.618, 0, 0.854, 0.382];
export const TOUCH: Ease = [0.382, 0.236, 0.146, 1];

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
