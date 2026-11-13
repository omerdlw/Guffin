import type { Curve } from "./engine";

const EPSILON = 1e-6;

export const linear: Curve = (t) => t;

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
