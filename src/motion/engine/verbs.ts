import { PHI, clamp, reach } from "./ladder";
import type { Shade } from "./look";

// A verb is the shape of a movement, never its timing: progress in, shade out.
// Entering runs 0 (absent) → 1 (present); leaving runs 0 (present) → 1 (gone).
export type Verb = (progress: number) => Shade;

// Light lands at φ⁻¹ of the way, so a part is legible before it has settled.
const lit = (p: number) => clamp(p * PHI, 0, 1);

export const ENTER = {
  glow: (p) => ({ opacity: p }),
  rise: (p) => ({ opacity: lit(p), y: (1 - p) * reach(0) }),
  lift: (p) => ({
    opacity: lit(p),
    y: (1 - p) * reach(-1),
    scale: 1 - (1 - p) * PHI ** -6,
  }),
  clear: (p) => ({ opacity: lit(p), blur: (1 - p) * PHI ** 4 }),
  develop: (p) => ({
    opacity: lit(p),
    scale: 1 + (1 - p) * PHI ** -2,
    blur: (1 - p) * PHI ** 6,
    brightness: 1 - (1 - p) * (1 - PHI ** -3),
  }),
  settle: (p) => ({
    opacity: lit(p),
    y: -(1 - p) * reach(0),
    scale: 1 + (1 - p) * PHI ** -4,
  }),
  wipe: (p) => ({ clipRight: 1 - p }),
  // A door opening upward over a picture that settles back from a zoom; the
  // part should sit in a frame that clips its overflow.
  door: (p) => ({ clipTop: 1 - p, scale: 1 + (1 - p) * PHI ** -4 }),
  still: () => ({}),
} satisfies Record<string, Verb>;

export const LEAVE = {
  fade: (p) => ({ opacity: 1 - p }),
  sink: (p) => ({ opacity: 1 - p, y: p * reach(-1) }),
  fog: (p) => ({ opacity: 1 - p, blur: p * PHI ** 4 }),
  cool: (p) => ({
    opacity: 1 - p * p,
    blur: p * PHI ** 4,
    brightness: 1 - p * (1 - PHI ** -3),
  }),
  burn: (p) => ({ opacity: 1 - p * p, brightness: 1 + p * PHI }),
  still: () => ({}),
} satisfies Record<string, Verb>;

export type EnterVerb = keyof typeof ENTER;
export type LeaveVerb = keyof typeof LEAVE;
