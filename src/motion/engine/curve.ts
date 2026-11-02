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

export const POINTS = {
  linear: [0, 0, 1, 1],
  fade: [0.4, 0, 0.2, 1],
  silk: [0.22, 1, 0.36, 1],
  pour: [0.33, 0.35, 0.15, 1],
  expo: [0.16, 1, 0.3, 1],
  glide: [0.65, 0, 0.35, 1],
  dolly: [0.45, 0, 0.15, 1],
  fall: [0.5, 0, 0.75, 0],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type CurveName = keyof typeof POINTS;

export const CURVE = Object.fromEntries(
  Object.entries(POINTS).map(([name, [x1, y1, x2, y2]]) => [
    name,
    name === "linear" ? (t: number) => t : bezier(x1, y1, x2, y2),
  ]),
) as Record<CurveName, Curve>;

export const cubic = (name: CurveName) =>
  `cubic-bezier(${POINTS[name].join(", ")})`;
