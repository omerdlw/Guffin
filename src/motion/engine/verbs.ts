import { PHI, clamp, haze, reach } from "./ladder";
import type { Shade } from "./look";

// A verb is the shape of a movement, never its timing: progress in, shade out.
// Entering runs 0 (absent) → 1 (present); leaving runs 0 (present) → 1 (gone).
//
// Depth comes from focus. A part does not only fade and move: it comes out of
// the soft, a little larger than it will be, and takes its true size and edge
// together. Opacity lands first (φ⁻¹ of the way, so a part reads before it has
// settled), scale and blur finish with the movement, so the last thing the eye
// sees is the part coming into focus.
export type Verb = (progress: number) => Shade;

const lit = (p: number) => clamp(p * PHI, 0, 1);

// How far a part still has to travel, 1 → 0.
const left = (p: number) => 1 - p;

export const ENTER = {
  glow: (p) => ({ opacity: lit(p), blur: left(p) * haze(3) }),
  rise: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-1),
    blur: left(p) * haze(4),
    scale: 1 + left(p) * PHI ** -7,
  }),
  // A line of display type pulled into focus: the most it is ever asked to do.
  focus: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-2),
    blur: left(p) * haze(5),
    scale: 1 + left(p) * PHI ** -5,
  }),
  // Words of a paragraph: each one comes up out of a slight blur, so a line
  // of prose is read as a wave and never lands as a block.
  read: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-3),
    blur: left(p) * haze(2),
  }),
  // A step taken down a staircase: from above and a little behind, into place.
  descend: (p) => ({
    opacity: lit(p),
    x: -left(p) * reach(-2),
    y: -left(p) * reach(-1),
    blur: left(p) * haze(3),
  }),
  lift: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-1),
    scale: 1 - left(p) * PHI ** -6,
    blur: left(p) * haze(4),
  }),
  clear: (p) => ({
    opacity: lit(p),
    blur: left(p) * haze(4),
    scale: 1 - left(p) * PHI ** -7,
  }),
  develop: (p) => ({
    opacity: lit(p),
    scale: 1 + left(p) * PHI ** -2,
    blur: left(p) * haze(6),
    brightness: 1 - left(p) * (1 - PHI ** -3),
  }),
  settle: (p) => ({
    opacity: lit(p),
    y: -left(p) * reach(0),
    scale: 1 + left(p) * PHI ** -4,
    blur: left(p) * haze(4),
  }),
  wipe: (p) => ({ clipRight: left(p) }),
  // A door opening upward over a picture that settles back from a zoom; the
  // part should sit in a frame that clips its overflow.
  door: (p) => ({ clipTop: left(p), scale: 1 + left(p) * PHI ** -4 }),
  still: () => ({}),
} satisfies Record<string, Verb>;

export const LEAVE = {
  fade: (p) => ({ opacity: left(p), blur: p * haze(3) }),
  sink: (p) => ({
    opacity: left(p),
    y: p * reach(-1),
    blur: p * haze(4),
    scale: 1 - p * PHI ** -7,
  }),
  fog: (p) => ({
    opacity: left(p),
    blur: p * haze(5),
    scale: 1 + p * PHI ** -7,
  }),
  cool: (p) => ({
    opacity: 1 - p * p,
    blur: p * haze(5),
    brightness: 1 - p * (1 - PHI ** -3),
  }),
  burn: (p) => ({ opacity: 1 - p * p, brightness: 1 + p * PHI }),
  still: () => ({}),
} satisfies Record<string, Verb>;

// With reduced motion every part only fades: no travel, no blur, no scale.
export const QUIET = {
  enter: (p) => ({ opacity: p }),
  leave: (p) => ({ opacity: 1 - p }),
} satisfies Record<string, Verb>;

export type EnterVerb = keyof typeof ENTER;
export type LeaveVerb = keyof typeof LEAVE;
