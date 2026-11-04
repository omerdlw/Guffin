import { defineMotion } from "@omerdlw/base-framework/tokens";
import {
  LEAVE_CAP,
  LEAVE_DROP,
  MATTER,
  PHI,
  POINTS,
  RESPONSE_DROP,
} from "./constants";
import type { Curve, CurveName, Matter, TimeSpring, Verb } from "./types";
import { bezier, haze, left, lit, reach, springForce, step } from "./utils";
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
