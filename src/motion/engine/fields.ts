import { PHI, clamp, reach } from "./ladder";
import type { Shade } from "./look";

// Forces turned into space. A part is placed at a depth and the scroll does the
// rest: each step of depth divides its speed on screen by √φ, and once it has
// been scrolled past it dims and softens. A fixed part keeps the same speed, so
// depth reads the same whether the part scrolls with the page or not.

export interface Placement {
  top: number;
  fixed: boolean;
}

export const speed = (depth: number) => PHI ** (-depth / 2);

export const parallax = (depth: number) => 1 - speed(depth);

export function depthShade(
  depth: number,
  scroll: number,
  viewport: number,
  { top, fixed }: Placement,
): Shade {
  if (depth === 0 || viewport === 0) return {};
  const y = fixed
    ? -scroll * speed(depth)
    : Math.max(0, scroll - Math.max(0, top - viewport)) * parallax(depth);
  if (depth < 0) return { y };
  const passed = clamp((scroll - (fixed ? 0 : top)) / viewport, 0, 1);
  return {
    y,
    brightness: 1 - passed * (1 - PHI ** -depth),
    blur: passed * depth * PHI,
  };
}

// How far a part leans toward the hand at the edge of the window.
export const driftReach = (drift: number) => reach(-2) * drift;
