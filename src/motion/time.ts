import { defineMotion } from "@omerdlw/base-framework/utils";
import type { Shade } from "./color";
import type { TOUCH } from "./forces";
import { clamp, PHI, within } from "./math";

export type Curve = (t: number) => number;

export interface TimeSpring {
  period: number;
  damping: number;
  mass: number;
}

export type TouchVerb = keyof typeof TOUCH;

export type CurveName = keyof typeof POINTS;

export type EnterVerb = keyof typeof ENTER;

export type LeaveVerb = keyof typeof LEAVE;

export interface Matter {
  rung: number;
  mass: number;
  damping: number;
  curve: CurveName;
  enter: EnterVerb;
  leave: LeaveVerb;
}

export type MatterName = keyof typeof MATTER;

export type Verb = (progress: number) => Shade;

type Ease = readonly [number, number, number, number];

export const QUIET_RUNG = -1;

const BEAT = 0.5;

const TRAVEL = 24;

const TEMPO_RANGE = 3;

const EPSILON = 1e-6;

export const POINTS = {
  linear: [0, 0, 1, 1],
  fade: [0.45, 0, 0.15, 1],
  silk: [0.5, 0.05, 0.1, 1],
  pour: [0.45, 0.08, 0.08, 1],
  expo: [0.36, 0.08, 0.08, 1],
  glide: [0.65, 0, 0.35, 1],
  dolly: [0.5, 0, 0.12, 1],
  fall: [0.45, 0, 0.55, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export const MATTER = {
  light: {
    rung: 2,
    mass: PHI ** -2,
    damping: 1,
    curve: "fade",
    enter: "glow",
    leave: "fade",
  },
  ink: {
    rung: 3,
    mass: PHI ** -1,
    damping: 0.9,
    curve: "silk",
    enter: "rise",
    leave: "fade",
  },
  paper: {
    rung: 3,
    mass: 1,
    damping: 0.86,
    curve: "pour",
    enter: "lift",
    leave: "sink",
  },
  glass: {
    rung: 2,
    mass: PHI ** -1,
    damping: 1,
    curve: "expo",
    enter: "clear",
    leave: "fog",
  },
  plate: {
    rung: 4,
    mass: PHI ** 2,
    damping: 1,
    curve: "pour",
    enter: "develop",
    leave: "cool",
  },
  metal: {
    rung: 4,
    mass: PHI ** 3,
    damping: 0.72,
    curve: "expo",
    enter: "settle",
    leave: "sink",
  },
} as const satisfies Record<string, Matter>;

const UNVEIL_OPEN = [0, 0.7] as const;

const LEAVE_DROP = 2;

const LEAVE_CAP = 2;

const RESPONSE_DROP = 3;

export const SHARP = { opacity: 1, filter: "none" } as const;

export const PAGE_TEMPO = -0.5;

export const step = (rung: number) => BEAT * PHI ** rung;

export const haze = (rung: number) => PHI ** rung;

export const reach = (rung: number) => TRAVEL * PHI ** rung;

export const tempo = (value: number) => clamp(value, -TEMPO_RANGE, TEMPO_RANGE);

function bezier(x1: number, y1: number, x2: number, y2: number): Curve {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const y = (t: number) => ((ay * t + by) * t + cy) * t;
  const slope = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  function solve(v: number) {
    let t = v;
    for (let i = 0; i < 8; i++) {
      const error = x(t) - v;
      if (Math.abs(error) < EPSILON) return t;
      const d = slope(t);
      if (Math.abs(d) < EPSILON) break;
      t -= error / d;
    }
    let lo = 0;
    let hi = 1;
    t = v;
    for (let i = 0; i < 40; i++) {
      const at = x(t);
      if (Math.abs(at - v) < EPSILON) return t;
      if (v > at) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  }

  return (v) => (v <= 0 ? 0 : v >= 1 ? 1 : y(solve(v)));
}

export function elapsed(curve: Curve, eased: number) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (curve(mid) < eased) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function springForce({ period, damping, mass }: TimeSpring) {
  const omega = (2 * Math.PI) / period;
  return {
    type: "spring",
    stiffness: mass * omega ** 2,
    damping: 2 * damping * mass * omega,
    mass,
  } as const;
}

const lit = (p: number) => clamp(p * PHI, 0, 1);

export const left = (p: number) => 1 - p;

const veil = (_rung: number) => "none";

export const hazy = (rung = 3) => ({ opacity: 0, filter: veil(rung) }) as const;

export const tween = (duration: number, ease: Ease, delay = 0) =>
  ({
    type: "tween",
    duration,
    ease,
    ...(delay > 0 ? { delay } : {}),
  }) as const;

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
  crisp: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-2),
    scale: 1 + left(p) * PHI ** -7,
  }),
  unveil: (p) => ({
    opacity: lit(p),
    clipBottom: 1 - within(p, UNVEIL_OPEN),
    scale: 1 + left(p) * PHI ** -5,
    brightness: 1 - left(p) * (1 - PHI ** -2),
  }),
  emerge: (p) => ({
    opacity: lit(p),
    y: left(p) * reach(-2),
    scale: 1 - left(p) * PHI ** -6,
    blur: left(p) * haze(3),
  }),
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
  still: { type: "tween", duration: 0.08, ease: "linear" },
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
