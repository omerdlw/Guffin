import { defineMotion } from "@omerdlw/base-framework/tokens";
import {
  LEAVE_CAP,
  LEAVE_DROP,
  MATTER,
  PHI,
  POINTS,
  RESPONSE_DROP,
  UNVEIL_OPEN,
} from "./constants";
import type { Curve, CurveName, Matter, TimeSpring, Verb } from "./types";
import {
  bezier,
  haze,
  left,
  lit,
  reach,
  springForce,
  step,
  within,
} from "./utils";
export const HAZE_CAP = haze(6);

export const CURVE = Object.fromEntries(
  Object.entries(POINTS).map(([name, [x1, y1, x2, y2]]) => [
    name,
    name === "linear" ? (t: number) => t : bezier(x1, y1, x2, y2),
  ]),
) as Record<CurveName, Curve>;

export const ENTER = {
  glow: (p) => ({ opacity: lit(p), blur: left(p) * haze(3) }),
  rise: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-1),
    blur: left(p) * haze(4),
    scale: 1 + left(p) * PHI ** -7,
  }),
  focus: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-2),
    blur: left(p) * haze(5),
    scale: 1 + left(p) * PHI ** -5,
  }),
  read: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-3),
    blur: left(p) * haze(2),
  }),
  descend: (p) => ({
    opacity: lit(p),
    x: -left(p) * reach(-2),
    y: -left(p) * reach(-1),
    blur: left(p) * haze(3),
  }),
  along: (p) => ({
    opacity: lit(p),
    x: -left(p) * reach(-2),
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
  /*
   * For display type. A blur is measured in pixels, and the condensed display
   * face has strokes and counters thinner than the haze, so the letters melt
   * into one grey slab. Crisp type moves and fades but is never softened.
   */
  crisp: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-2),
    scale: 1 + left(p) * PHI ** -7,
  }),
  /*
   * For a picture in a frame: it is uncovered from the top down like a print
   * coming up under the enlarger, then the lens eases back from a close crop
   * while the exposure comes up to full. The frame clips the crop.
   */
  unveil: (p) => ({
    opacity: lit(p),
    clipBottom: 1 - within(p, UNVEIL_OPEN),
    scale: 1 + left(p) * PHI ** -5,
    brightness: 1 - left(p) * (1 - PHI ** -2),
  }),
  /* For a control: it comes up from just below and settles to its size. */
  emerge: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-2),
    scale: 1 - left(p) * PHI ** -6,
    blur: left(p) * haze(3),
  }),
  /*
   * For a card in a grid: it rises from just below at a slightly smaller
   * size, and comes up from underexposed. The opacity is full early, so the
   * second half of the move is the card settling and the light coming up
   * on it, not a fade.
   */
  surface: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-1),
    scale: 1 - left(p) * PHI ** -5,
    brightness: 1 - left(p) * (1 - PHI ** -2),
  }),
  wipe: (p) => ({ clipRight: left(p) }),
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
  dim: (p) => ({ opacity: left(p) }),
  still: () => ({}),
} satisfies Record<string, Verb>;

export const arrival = (matter: Matter, tempo: number) =>
  step(matter.rung + tempo);

export const departure = (matter: Matter, tempo: number) =>
  step(Math.min(matter.rung + tempo - LEAVE_DROP, LEAVE_CAP));

export const response = (matter: Matter, tempo: number): TimeSpring => ({
  period: step(matter.rung + tempo - RESPONSE_DROP),
  damping: matter.damping,
  mass: matter.mass,
});

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
