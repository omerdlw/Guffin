import { defineMotion, gpuTransform } from "@omerdlw/base-framework/utils";

// The modules' shared vocabulary: the dock, modal, context menu, toast and
// the select's menu all speak the site's proportion, the golden ratio.
// Durations are powers of φ seconds, staggers Fibonacci milliseconds, travel
// Fibonacci pixels, curves drawn from φ's fractions. Modules answer the hand,
// so they are quicker than a page, but they never snap. Nothing blurs.
//
// Motion follows the visitor's reduced-motion setting: reduced, every module
// transition becomes `still`.
export const INSTANT = { type: "tween", duration: 0 } as const;

export const moduleMotion = defineMotion({
  reducedMotion: "user",
  still: INSTANT,
});

const PHI = 1.618034;
/** φⁿ seconds: 0.146, 0.236, 0.382, 0.618, 1, 1.618. */
export const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
/** Fibonacci: staggers in seconds, travel in px. */
export const STAGGER = { item: 0.034, line: 0.055, step: 0.089 } as const;
export const TRAVEL = {
  hair: 3,
  nudge: 5,
  step: 8,
  rise: 13,
  reach: 21,
  stride: 34,
} as const;

export type Ease = [number, number, number, number];

/** Settle: gathers softly, never with a jolt, and spends its long tail coming to rest. */
export const SETTLE: Ease = [0.236, 0.382, 0.146, 1];
/** Develop: a slow start and a long, even resolve, for pictures and shade. */
export const DEVELOP: Ease = [0.382, 0, 0.146, 1];
/** Leave: gathers, then goes. */
export const LEAVE: Ease = [0.618, 0, 0.854, 0.382];
/** Touch: eased at both ends, so a touch never starts with a jolt (the same curve as --soft-ease). */
export const TOUCH: Ease = [0.382, 0.236, 0.146, 1];

export const tween = (duration: number, ease: Ease, delay = 0) => ({
  type: "tween" as const,
  duration,
  ease,
  delay,
});

/**
 * visualDuration: the time the eye reads as the move; bounce 0 is critically
 * damped (no overshoot). Only small things that pop get a little bounce.
 */
export const spring = (visualDuration: number, bounce = 0) => ({
  type: "spring" as const,
  visualDuration,
  bounce,
});

export const at = (y = 0, scale = 1) => gpuTransform(y, scale);

/** Offset and gone; and in place. */
export const away = (y = 0, scale = 1) => ({
  opacity: 0,
  transform: at(y, scale),
});
export const here = (opacity = 1) => ({ opacity, transform: at() });
