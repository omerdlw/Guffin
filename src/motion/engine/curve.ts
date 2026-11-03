export type Curve = (t: number) => number;

const EPSILON = 1e-6;

export function bezier(x1: number, y1: number, x2: number, y2: number): Curve {
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

// Every curve starts gently and keeps moving to the end: the eye can follow a
// part from its first frame to its last. Measured as the share of the time a
// curve has used when it reaches 50% / 90% of the way:
//   fade 35 / 62   silk 35 / 60   pour 32 / 58   expo 28 / 57
//   dolly 36 / 61  glide 50 / 71  fall 50 / 77
// The arrival curves leave a little slower and are still gaining on the last
// frames: a part is let go of softly, never dropped into place.
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

export type CurveName = keyof typeof POINTS;

export const CURVE = Object.fromEntries(
  Object.entries(POINTS).map(([name, [x1, y1, x2, y2]]) => [
    name,
    name === "linear" ? (t: number) => t : bezier(x1, y1, x2, y2),
  ]),
) as Record<CurveName, Curve>;

// The time a curve has spent when it has covered `eased` of the way: the
// inverse of the curve. A part's progress is its arrival already eased by its
// matter, so a movement laid on the clock (a sweep, a wipe) takes it back to
// time first and plays its own curve over real time.
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

export const cubic = (name: CurveName) =>
  `cubic-bezier(${POINTS[name].join(", ")})`;
