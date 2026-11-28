import type { Curve, Enter, Look } from "./choreo";

// One pace for every page stage. TEMPO scales every enter (duration, delay,
// stagger, cue cadence); OPENING is how long view-gated roles wait for the
// hero's load timeline (unscaled seconds, ×TEMPO at runtime). Every hero's
// last load part starts at HERO, so all openings finish together.
export const TEMPO = 1.5;
export const HERO = 0.618;
export const OPENING = HERO + 0.236;

// Durations come from powers of the golden ratio, rounded to the millisecond:
// beat(0) = 1s, beat(-1) ≈ 0.618s, beat(-2) ≈ 0.382s …
const PHI = 1.618034;
export const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;

// The shared easing vocabulary (cubic-bezier control points).
export const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
export const DEVELOP: Curve = [0.382, 0, 0.146, 1];
export const SWEEP: Curve = [0.618, 0, 0.382, 1];
export const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
export const TOUCH: Curve = [0.382, 0.236, 0.146, 1];
export const PRESS: Curve = [0.382, 0, 0.236, 1];
export const SPRING: Curve = [0.382, 0.618, 0.236, 1.146];
export const FOCUS: Curve = [0.236, 0, 0.146, 1];
// Backdrop opening: the camera pulls back from a dark close-up (dolly, most
// travel early, long settle) while the lens racks into focus and the frame
// develops from grey to full colour.
export const DOLLY: Curve = [0.146, 0.618, 0.146, 1];

// A part that enters with the page's opening timeline, or when scrolled into view.
export const load = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "load",
  from,
  duration: beat(-1),
  ease: SETTLE,
  ...more,
});

/**
 * How much a role weighs on the page, and so how it reveals: the heavier it
 * is, the longer it develops and the deeper it starts out of focus.
 *   1 block: sections, cards, slides, posters, avatars
 *   2 line: headings, rows, text blocks, controls, values
 *   3 mark: labels, rules, icons, tags, stars, ticks
 * Duration is beat(−w); blur is the Fibonacci number F(8 − w): 13, 8, 5 px.
 */
export type Weight = 1 | 2 | 3;
const FOCUS_PX: Record<Weight, number> = { 1: 13, 2: 8, 3: 5 };

export const rise = (
  weight: Weight,
  more: Omit<Partial<Enter>, "duration" | "from"> = {},
): Enter =>
  reveal(
    { opacity: 0, blur: FOCUS_PX[weight] },
    { duration: beat(-weight), ...more },
  );

export const reveal = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "view",
  from,
  duration: beat(-1),
  ease: SETTLE,
  ...more,
});
