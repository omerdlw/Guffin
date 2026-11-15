// The physics shared by the controls whose thumb turns to liquid glass (the
// segmented control's indicator, the switch's knob): springs stepped at a
// fixed rate on one animation frame loop that stops when everything rests.

export interface Spring {
  v: number;
  x: number;
}

export interface Feel {
  damping: number;
  stiffness: number;
}

/** A goal for one frame: pull `spring` towards `to` with `feel`. */
export type Goal = readonly [spring: Spring, to: number, feel: Feel];

export const spring = (x = 0): Spring => ({ v: 0, x });

export const feel = (stiffness: number, ratio: number): Feel => ({
  damping: 2 * ratio * Math.sqrt(stiffness),
  stiffness,
});

const STEP = 1 / 240;
const MOST = 1 / 20;
const STILL = 0.01;

/**
 * Runs `goals` (read afresh every frame) until every spring rests, calling
 * `draw` after each frame. `instant` snaps the springs (reduced motion).
 */
export function drive(
  goals: () => readonly Goal[],
  draw: (dt: number) => void,
  instant: () => boolean,
) {
  let raf = 0;
  let last = 0;
  let owed = 0;

  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, MOST);
    last = now;
    const list = goals();
    if (instant()) {
      for (const [state, to] of list) {
        state.x = to;
        state.v = 0;
      }
    } else {
      owed += dt;
      while (owed >= STEP) {
        owed -= STEP;
        for (const [state, to, { damping, stiffness }] of list) {
          state.v += ((to - state.x) * stiffness - state.v * damping) * STEP;
          state.x += state.v * STEP;
        }
      }
    }
    draw(dt);
    const resting = list.every(
      ([state, to]) =>
        Math.abs(state.v) < STILL && Math.abs(state.x - to) < STILL,
    );
    raf = resting ? 0 : requestAnimationFrame(frame);
  };

  return {
    stop: () => cancelAnimationFrame(raf),
    wake: () => {
      if (raf) return;
      last = performance.now();
      owed = 0;
      raf = requestAnimationFrame(frame);
    },
  };
}

export const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(n, high));

/** Pointer travel (px) before a press becomes a drag. */
export const DRAG_SLOP = 3;

/**
 * The thumb's transform: moved along by `x`, swelled by `sx`, `sy`. A swell
 * all but gone (the springs stop within a hair of rest) is dropped, so the
 * thumb at rest draws one to one.
 */
export function thumbTransform(x: number, sx: number, sy: number) {
  const moved = `translateX(${x.toFixed(2)}px)`;
  return Math.abs(sx - 1) < 0.004 && Math.abs(sy - 1) < 0.004
    ? moved
    : `${moved} scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
}
